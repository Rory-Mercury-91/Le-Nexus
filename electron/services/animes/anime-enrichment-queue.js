/**
 * Service de file d'attente pour l'enrichissement des animes en arrière-plan
 * Gère le rate limiting pour éviter les erreurs 429 des APIs externes
 */

const fetch = require('node-fetch');
const Store = require('electron-store');
const { fetchAniListCover } = require('../../apis/anilist');
const { translateText: translateWithGroq } = require('../../apis/groq');
const { recordSyncError } = require('../../utils/sync-error-reporter');
const sessionLogger = require('../../utils/session-logger');
const {
  isEntityEnriched,
  markEntityAsEnriched,
  updateFieldIfNotUserModified
} = require('../../utils/enrichment-helpers');
const {
  propagateAnimeRelations,
  propagateAllAnimeRelations
} = require('../relations/relation-propagator');

// Constantes de rate limiting
const JIKAN_DELAY = 1000; // 1 seconde entre les appels Jikan
const ANILIST_DELAY = 1500; // 1.5 secondes entre les appels AniList
const GROQ_DELAY = 1500; // 1.5 secondes entre les traductions (augmenté pour éviter les rate limits)
const BATCH_DELAY = 2000; // 2 secondes entre chaque anime complet

let currentRunToken = null;
let cancelRequested = false;
let paused = false;

const createRunToken = () => Symbol('anime-enrichment-run');

const isCancellationRequested = (runToken) => cancelRequested && currentRunToken === runToken;
const isPaused = () => paused;

function resetRunState(runToken) {
  if (currentRunToken === runToken) {
    currentRunToken = null;
    cancelRequested = false;
    paused = false;
  }
}

function pauseEnrichment() {
  if (!currentRunToken) {
    return { success: false, reason: 'no-run' };
  }
  paused = true;
  console.log('⏸️ [File d\'attente] Enrichissement anime mis en pause.');
  return { success: true };
}

function resumeEnrichment() {
  if (!currentRunToken) {
    return { success: false, reason: 'no-run' };
  }
  paused = false;
  console.log('▶️ [File d\'attente] Reprise de l\'enrichissement anime.');
  return { success: true };
}

function resolveDatabase(getDb) {
  try {
    // Essayer d'obtenir la connexion principale
    const candidate = typeof getDb === 'function' ? getDb() : getDb;
    if (candidate) {
      // Tester si la connexion est valide en exécutant une requête simple
      try {
        candidate.prepare('SELECT 1').get();
        return candidate;
      } catch (testError) {
        // La connexion n'est pas valide, essayer le fallback
        console.warn('[anime-enrichment] Connexion principale invalide, tentative fallback:', testError.message);
      }
    }

    // Fallback : utiliser la connexion globale
    if (global && typeof global.getDbMain === 'function') {
      const fallback = global.getDbMain();
      if (fallback) {
        try {
          fallback.prepare('SELECT 1').get();
          return fallback;
        } catch (testError) {
          console.warn('[anime-enrichment] Connexion fallback invalide:', testError.message);
        }
      }
    }
  } catch (error) {
    console.warn('[anime-enrichment] Impossible de récupérer la base active:', error.message || error);
  }
  throw new Error('Database connection not available');
}

/**
 * Helper : Récupérer les données depuis Jikan API avec retry
 * Utilise l'endpoint /full pour obtenir toutes les données (rank, popularity, background, etc.)
 */
const fetchJikanData = async (malId, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Utiliser l'endpoint /full pour obtenir toutes les données
      const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`);

      if (response.status === 429) {
        // Rate limit atteint, attendre plus longtemps
        const waitTime = attempt * 3000; // 3s, 6s, 9s
        console.log(`⏳ Jikan rate limit atteint pour MAL ${malId}, attente ${waitTime}ms (tentative ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error(`Failed to fetch Jikan data after ${retries} attempts`);
};

/**
 * Enrichir un anime avec les données de Jikan et AniList
 */
function logAnimeEnrichmentError(operation, error, context = {}) {
  try {
    const { animeId, malId, title } = context;
    recordSyncError({
      entityType: 'anime-enrichment',
      entityId: malId || animeId || 'GLOBAL',
      entityName: title || null,
      operation,
      error,
      context
    });
  } catch (reportError) {
    console.warn('[anime-enrichment] Impossible d\'écrire le rapport d\'erreur:', reportError.message || reportError);
  }
}

async function enrichAnime(getDb, animeId, malId, currentUser, enrichmentConfig, runToken = null, force = false) {
  const shouldAbort = (phase) => {
    if (!runToken) {
      return false;
    }
    if (isCancellationRequested(runToken)) {
      console.log(`🛑 [File d'attente] Arrêt demandé (${phase}) pour l'anime ${animeId} (MAL ${malId}).`);
      return true;
    }
    return false;
  };

  try {
    console.log(`🔍 [File d'attente] Enrichissement de l'anime ID ${animeId} (MAL ${malId})${force ? ' (FORCÉ)' : ''}`);

    if (shouldAbort('initialisation')) {
      return { success: false, cancelled: true };
    }

    // Récupérer la connexion juste avant de l'utiliser
    let db = resolveDatabase(getDb);

    if (shouldAbort('lecture base')) {
      return { success: false, cancelled: true };
    }

    const anime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(animeId);
    if (!anime) {
      const error = new Error(`Anime ${animeId} introuvable`);
      console.error(`❌ ${error.message}`);
      logAnimeEnrichmentError('anime-not-found', error, { animeId, malId });
      return { success: false, error: error.message };
    }

    // Vérifier si déjà enrichi (sauf si forcé)
    if (!force && isEntityEnriched(db, 'anime_series', animeId)) {
      console.log(`⏭️ Anime ID ${animeId} (MAL ${malId}) déjà enrichi, ignoré`);
      return { success: true, skipped: true, message: 'Déjà enrichi' };
    }

    let enrichedData = {};
    let couverture_url = anime.couverture_url;
    let description = anime.description;

    if (shouldAbort('préparation Jikan')) {
      return { success: false, cancelled: true };
    }

    // 1. Récupérer les données Jikan
    try {
      console.log(`📡 Jikan API pour MAL ${malId}...`);
      const jikanData = await fetchJikanData(malId);
      if (shouldAbort('réponse Jikan')) {
        return { success: false, cancelled: true };
      }
      await new Promise(resolve => setTimeout(resolve, JIKAN_DELAY));

      if (shouldAbort('traitement Jikan')) {
        return { success: false, cancelled: true };
      }

      // Extraire les champs configurés
      const fields = enrichmentConfig.fields || {};

      // Titres
      if (fields.titre_romaji && jikanData.title) enrichedData.titre_romaji = jikanData.title;
      if (fields.titre_natif && jikanData.title_japanese) enrichedData.titre_natif = jikanData.title_japanese;
      if (fields.titre_anglais && jikanData.title_english) enrichedData.titre_anglais = jikanData.title_english;
      if (fields.titres_alternatifs && jikanData.title_synonyms) {
        const altTitles = Array.isArray(jikanData.title_synonyms)
          ? jikanData.title_synonyms
          : [jikanData.title_synonyms];

        const normalizedMain = (enrichedData.titre_romaji || anime.titre || '').trim().toLowerCase();
        const normalizedNative = (enrichedData.titre_natif || anime.titre_natif || '').trim().toLowerCase();
        const normalizedEnglish = (enrichedData.titre_anglais || anime.titre_anglais || '').trim().toLowerCase();

        const dedupedAltTitles = Array.from(
          new Set(
            altTitles
              .map(title => title.trim())
              .filter(Boolean)
          )
        ).filter(title => {
          const normalized = title.toLowerCase();
          return normalized !== normalizedMain &&
            normalized !== normalizedNative &&
            normalized !== normalizedEnglish;
        });

        if (dedupedAltTitles.length > 0) {
          enrichedData.titres_alternatifs = dedupedAltTitles.join(', ');
        }
      }

      // Métadonnées de base
      if (fields.source && jikanData.source) enrichedData.source = jikanData.source;
      if (fields.duree && jikanData.duration) enrichedData.duree = jikanData.duration;
      if (fields.saison_diffusion && jikanData.season) {
        const seasonMap = {
          'winter': 'Hiver',
          'spring': 'Printemps',
          'summer': 'Été',
          'fall': 'Automne'
        };
        enrichedData.saison_diffusion = seasonMap[jikanData.season?.toLowerCase()] || jikanData.season;
      }
      if (fields.date_debut && jikanData.aired?.from) enrichedData.date_debut = jikanData.aired.from;
      if (fields.date_fin && jikanData.aired?.to) enrichedData.date_fin = jikanData.aired.to;
      if (fields.en_cours_diffusion !== undefined) enrichedData.en_cours_diffusion = jikanData.airing ? 1 : 0;

      // Champs critiques pour détection de mises à jour
      if (jikanData.episodes !== null && jikanData.episodes !== undefined) {
        enrichedData.nb_episodes = jikanData.episodes;
      }
      if (jikanData.status) {
        // Normaliser le statut Jikan vers le format de la base
        const statusMap = {
          'Not yet aired': 'Non diffusé',
          'Currently Airing': 'En cours',
          'Finished Airing': 'Terminé'
        };
        enrichedData.statut_diffusion = statusMap[jikanData.status] || jikanData.status;
      }

      // Classification et contenu
      if (fields.themes && jikanData.themes) enrichedData.themes = jikanData.themes.map(t => t.name).join(', ');
      if (fields.demographics && jikanData.demographics) enrichedData.demographics = jikanData.demographics.map(d => d.name).join(', ');
      if (fields.rating && jikanData.rating) enrichedData.rating = jikanData.rating;

      // Scores et statistiques
      if (fields.score && jikanData.score !== null && jikanData.score !== undefined) enrichedData.score = jikanData.score;
      if (fields.rank && jikanData.rank !== null && jikanData.rank !== undefined) enrichedData.rank_mal = jikanData.rank;
      if (fields.popularity && jikanData.popularity !== null && jikanData.popularity !== undefined) enrichedData.popularity_mal = jikanData.popularity;
      if (fields.scored_by && jikanData.scored_by !== null && jikanData.scored_by !== undefined) enrichedData.scored_by = jikanData.scored_by;
      if (fields.favorites && jikanData.favorites !== null && jikanData.favorites !== undefined) enrichedData.favorites = jikanData.favorites;

      // Producteurs et diffuseurs
      if (fields.producteurs && jikanData.producers) enrichedData.producteurs = jikanData.producers.map(p => p.name).join(', ');
      if (fields.diffuseurs && jikanData.licensors) enrichedData.diffuseurs = jikanData.licensors.map(l => l.name).join(', ');

      // Background (informations contextuelles)
      if (fields.background && jikanData.background) {
        enrichedData.background = jikanData.background;
      }

      // Relations et franchise
      if (fields.franchise && jikanData.relations) {
        const relations = jikanData.relations || [];
        const prequel = relations.find(r => r.relation === 'Prequel');
        const sequel = relations.find(r => r.relation === 'Sequel');
        if (prequel) enrichedData.prequel_mal_id = prequel.entry[0]?.mal_id;
        if (sequel) enrichedData.sequel_mal_id = sequel.entry[0]?.mal_id;

        const simplifiedRelations = relations
          .map(rel => ({
            relation: rel.relation,
            entries: (rel.entry || []).map(entry => ({
              mal_id: entry.mal_id || null,
              name: entry.name || null,
              type: entry.type || null
            }))
          }))
          .filter(rel => rel.entries.length > 0);

        if (simplifiedRelations.length > 0) {
          enrichedData.relations = JSON.stringify(simplifiedRelations);
        }

        const movieRelations = [];
        for (const rel of simplifiedRelations) {
          const relationLabel = rel.relation ? String(rel.relation).toLowerCase() : '';
          if (relationLabel.includes('movie')) {
            for (const entry of rel.entries) {
              movieRelations.push({
                relation: rel.relation,
                mal_id: entry.mal_id || null,
                name: entry.name || null,
                type: entry.type || null
              });
            }
          }
        }

        if (movieRelations.length > 0) {
          enrichedData.movie_relations = JSON.stringify(movieRelations);
        }
      }

      // Genres (fusion/mise à jour)
      if (fields.genres && jikanData.genres) {
        const newGenres = jikanData.genres.map(g => g.name).join(', ');
        if (!anime.genres) enrichedData.genres = newGenres;
        else if (!anime.genres.includes(newGenres)) {
          const set = new Set((anime.genres + ', ' + newGenres).split(',').map(s => s.trim()).filter(Boolean));
          enrichedData.genres = Array.from(set).join(', ');
        }
      }

      // Synopsis (mise à jour uniquement si pas déjà présent)
      if (fields.synopsis && jikanData.synopsis && !anime.description) {
        description = jikanData.synopsis;
      }

      console.log(`✅ Jikan: données récupérées`);
    } catch (jikanError) {
      console.error(`⚠️ Erreur Jikan pour MAL ${malId}:`, jikanError.message);
      logAnimeEnrichmentError('jikan-fetch', jikanError, { animeId, malId, title: anime.titre });
    }

    if (shouldAbort('avant couverture AniList')) {
      return { success: false, cancelled: true };
    }

    // 2. Récupérer la couverture AniList si configuré
    if (enrichmentConfig.imageSource === 'anilist') {
      try {
        console.log(`📡 AniList API pour MAL ${malId}...`);
        const anilistCover = await fetchAniListCover(malId);
        if (shouldAbort('réponse couverture AniList')) {
          return { success: false, cancelled: true };
        }
        await new Promise(resolve => setTimeout(resolve, ANILIST_DELAY));

        if (anilistCover?.coverImage?.extraLarge || anilistCover?.coverImage?.large) {
          couverture_url = anilistCover.coverImage.extraLarge || anilistCover.coverImage.large;
          console.log(`✅ AniList: couverture récupérée`);
        }
      } catch (anilistError) {
        console.error(`⚠️ AniList erreur pour MAL ${malId}:`, anilistError.message);
        logAnimeEnrichmentError('anilist-cover', anilistError, { animeId, malId, title: anime.titre });
      }
    }

    if (shouldAbort('avant liens streaming AniList')) {
      return { success: false, cancelled: true };
    }

    // 2b. Récupérer les liens de streaming depuis AniList (plateformes françaises)
    try {
      const { getStreamingLinksFromAniList } = require('../../apis/anilist');
      const streamingLinks = await getStreamingLinksFromAniList(malId);
      if (shouldAbort('réponse liens streaming AniList')) {
        return { success: false, cancelled: true };
      }
      await new Promise(resolve => setTimeout(resolve, ANILIST_DELAY));

      if (streamingLinks && streamingLinks.length > 0) {
        // Fusionner avec les liens existants
        const existingLinks = anime.liens_streaming ? JSON.parse(anime.liens_streaming) : [];
        const allLinks = [...existingLinks, ...streamingLinks];
        enrichedData.liens_streaming = JSON.stringify(allLinks);
        console.log(`✅ AniList: ${streamingLinks.length} lien(s) de streaming récupéré(s)`);
      }
    } catch (streamingError) {
      console.warn(`⚠️ Erreur récupération liens streaming AniList pour MAL ${malId}:`, streamingError.message);
      logAnimeEnrichmentError('anilist-streaming-links', streamingError, { animeId, malId, title: anime.titre });
    }

    if (shouldAbort('avant traduction synopsis')) {
      return { success: false, cancelled: true };
    }

    // 3. Traduction automatique du synopsis si activée
    if (enrichmentConfig.autoTranslate && description) {
      try {
        console.log(`🌐 Traduction du synopsis...`);
        const translated = await translateWithGroq(description);
        if (shouldAbort('réponse traduction synopsis')) {
          return { success: false, cancelled: true };
        }
        await new Promise(resolve => setTimeout(resolve, GROQ_DELAY));

        if (translated) {
          description = translated;
          console.log(`✅ Synopsis traduit`);
        }
      } catch (translateError) {
        console.error(`⚠️ Erreur traduction pour MAL ${malId}:`, translateError.message);
        logAnimeEnrichmentError('groq-translation', translateError, { animeId, malId, title: anime.titre });
      }
    }

    if (shouldAbort('avant mise à jour base')) {
      return { success: false, cancelled: true };
    }

    // 4. Mettre à jour la base de données avec les données enrichies
    // Recharger l'anime pour avoir les dernières valeurs de user_modified_fields
    db = resolveDatabase(getDb);
    const currentAnime = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(animeId);
    const userModifiedFields = currentAnime?.user_modified_fields || null;

    // Détecter les changements critiques pour signaler une mise à jour
    const currentNbEpisodes = currentAnime?.nb_episodes || 0;
    const newNbEpisodes = enrichedData.nb_episodes !== undefined ? enrichedData.nb_episodes : currentNbEpisodes;
    const nbEpisodesChanged = newNbEpisodes > currentNbEpisodes; // Seulement si augmentation

    const currentStatutDiffusion = currentAnime?.statut_diffusion || '';
    const newStatutDiffusion = enrichedData.statut_diffusion !== undefined ? enrichedData.statut_diffusion : currentStatutDiffusion;
    const statutDiffusionChanged = newStatutDiffusion && newStatutDiffusion !== currentStatutDiffusion;

    // date_debut_streaming peut venir d'AniList ou d'autres sources, vérifier si présent dans enrichedData
    // Note: date_debut_streaming n'est pas récupéré dans l'enrichissement actuel, mais peut être mis à jour ailleurs
    const currentDateDebutStreaming = currentAnime?.date_debut_streaming || null;
    const newDateDebutStreaming = enrichedData.date_debut_streaming !== undefined ? enrichedData.date_debut_streaming : currentDateDebutStreaming;
    const dateDebutStreamingChanged = newDateDebutStreaming && newDateDebutStreaming !== currentDateDebutStreaming;

    // Seuls ces changements déclenchent une notification de mise à jour
    const shouldSignalUpdate = nbEpisodesChanged || statutDiffusionChanged || dateDebutStreamingChanged;

    // Déterminer la valeur de maj_disponible
    const currentMajDisponible = currentAnime?.maj_disponible || 0;
    const majDisponibleValue = shouldSignalUpdate ? 1 : currentMajDisponible;

    if (nbEpisodesChanged) {
      console.log(`  ✅ Nombre d'épisodes augmenté: ${currentNbEpisodes} → ${newNbEpisodes} (mise à jour signalée)`);
    }
    if (statutDiffusionChanged) {
      console.log(`  ✅ Statut de diffusion changé: ${currentStatutDiffusion || 'Aucun'} → ${newStatutDiffusion} (mise à jour signalée)`);
    }
    if (dateDebutStreamingChanged) {
      console.log(`  ✅ Date de début streaming changée: ${currentDateDebutStreaming || 'Aucune'} → ${newDateDebutStreaming} (mise à jour signalée)`);
    }

    let updatedFieldsCount = 0;

    // Mettre à jour la description si elle a changé et n'est pas protégée
    // Vérifier que description est une string valide (pas undefined, null, ou objet vide)
    if (description !== undefined && description !== anime.description) {
      // S'assurer que description est une string valide ou null
      let descriptionToUpdate = null;
      if (description === null) {
        descriptionToUpdate = null;
      } else if (typeof description === 'string') {
        descriptionToUpdate = description.trim().length > 0 ? description : null;
      } else if (typeof description === 'object' && description !== null) {
        // Si c'est un objet, l'ignorer (ne devrait pas arriver)
        console.warn(`⚠️ Description est un objet pour anime ${animeId}, ignoré`);
        descriptionToUpdate = undefined;
      } else {
        // Autre type non valide
        console.warn(`⚠️ Description a un type invalide (${typeof description}) pour anime ${animeId}, ignoré`);
        descriptionToUpdate = undefined;
      }

      // Mettre à jour seulement si descriptionToUpdate n'est pas undefined
      if (descriptionToUpdate !== undefined) {
        if (updateFieldIfNotUserModified(db, 'anime_series', animeId, 'description', descriptionToUpdate, userModifiedFields)) {
          updatedFieldsCount++;
        }
      }
    }

    // Mettre à jour la couverture si elle a changé et n'est pas protégée
    if (couverture_url !== undefined && couverture_url !== anime.couverture_url) {
      if (updateFieldIfNotUserModified(db, 'anime_series', animeId, 'couverture_url', couverture_url, userModifiedFields)) {
        updatedFieldsCount++;
      }
    }

    // Mettre à jour chaque champ enrichi s'il n'est pas protégé
    Object.entries(enrichedData).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      if (key === 'rating' && (value === 'N/A' || value === null)) {
        return;
      }
      if (value === 'N/A') {
        return;
      }
      const currentValue = anime[key];
      if (currentValue === value) {
        return;
      }

      if (updateFieldIfNotUserModified(db, 'anime_series', animeId, key, value, userModifiedFields)) {
        updatedFieldsCount++;
      }
    });

    // Mettre à jour updated_at, maj_disponible, derniere_verif et marquer comme enrichi
    if (updatedFieldsCount > 0 || !isEntityEnriched(db, 'anime_series', animeId) || shouldSignalUpdate) {
      db.prepare(`
        UPDATE anime_series
        SET updated_at = datetime('now'),
            maj_disponible = ?,
            derniere_verif = datetime('now')
        WHERE id = ?
      `).run(majDisponibleValue, animeId);

      // Marquer comme enrichi
      markEntityAsEnriched(db, 'anime_series', animeId);

      if (shouldSignalUpdate) {
        console.log(`✅ [File d'attente] Anime "${anime.titre}" enrichi avec succès (${updatedFieldsCount} champ(s) mis à jour, mise à jour signalée)`);
      } else {
        console.log(`✅ [File d'attente] Anime "${anime.titre}" enrichi avec succès (${updatedFieldsCount} champ(s) mis à jour)`);
      }
    } else {
      // Mettre à jour derniere_verif même si aucun changement
      db.prepare(`
        UPDATE anime_series
        SET derniere_verif = datetime('now')
        WHERE id = ?
      `).run(animeId);

      console.log(`ℹ️ [File d'attente] Aucune donnée à enrichir pour "${anime.titre}" (tous les champs sont protégés ou identiques)`);
      // Marquer quand même comme enrichi si ce n'est pas déjà fait
      if (!isEntityEnriched(db, 'anime_series', animeId)) {
        markEntityAsEnriched(db, 'anime_series', animeId);
      }
    }

    // Propager les relations vers les oeuvres déjà présentes dans la base
    propagateAnimeRelations(db, animeId);

    // Attendre avant le prochain anime
    if (shouldAbort('avant délai inter-anime')) {
      return { success: true, enrichedFields: Object.keys(enrichedData).length, cancelled: true };
    }

    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

    return { success: true, enrichedFields: Object.keys(enrichedData).length };

  } catch (error) {
    console.error(`❌ [File d'attente] Erreur enrichissement anime ${animeId}:`, error.message);
    logAnimeEnrichmentError('enrich-anime', error, { animeId, malId });
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer la configuration d'enrichissement avec valeurs par défaut complètes
 */
function getAnimeEnrichmentConfig(store) {
  const defaultConfig = {
    enabled: true,
    imageSource: 'anilist',
    autoTranslate: false,
    fields: {
      // Titres
      titre_romaji: true,
      titre_natif: true,
      titre_anglais: true,
      titres_alternatifs: true,

      // Métadonnées de base
      source: true,
      duree: true,
      saison_diffusion: true,
      date_debut: true,
      date_fin: true,
      en_cours_diffusion: true,

      // Classification et contenu
      genres: true,
      themes: true,
      demographics: true,
      rating: true,

      // Scores et statistiques
      score: true,
      rank: true,
      popularity: true,
      scored_by: true,
      favorites: true,

      // Producteurs et diffuseurs
      producteurs: true,
      diffuseurs: true,

      // Relations et franchise
      franchise: true,

      // Informations contextuelles
      synopsis: true,
      background: true,
    }
  };

  const savedConfig = store.get('animeEnrichmentConfig', {});

  // Fusionner avec les valeurs par défaut
  return {
    enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : defaultConfig.enabled,
    imageSource: savedConfig.imageSource || defaultConfig.imageSource,
    autoTranslate: savedConfig.autoTranslate !== undefined ? savedConfig.autoTranslate : defaultConfig.autoTranslate,
    fields: {
      ...defaultConfig.fields,
      ...(savedConfig.fields || {})
    }
  };
}

/**
 * Traiter la file d'attente d'enrichissement
 */
async function processEnrichmentQueue(getDb, currentUser, onProgress = null, getMainWindow = null, getPathManager = null, force = false) {
  if (currentRunToken) {
    console.warn('⚠️ [File d\'attente] Enrichissement anime déjà en cours, nouvelle requête ignorée.');
    return {
      processed: 0,
      enriched: 0,
      errors: 0,
      alreadyRunning: true
    };
  }

  const runToken = createRunToken();
  currentRunToken = runToken;
  cancelRequested = false;
  const store = new Store();
  const enrichmentConfig = getAnimeEnrichmentConfig(store);

  if (!enrichmentConfig.enabled) {
    console.log('⏸️ Enrichissement désactivé');
    return { processed: 0, enriched: 0, errors: 0 };
  }

  const queueStart = Date.now();

  try {
    // Obtenir une connexion à la base de données
    const db = resolveDatabase(getDb);

    // Récupérer les animes qui ont un MAL ID mais pas encore enrichis (sauf si on force)
    const animesToEnrich = db.prepare(`
      SELECT id, mal_id, titre
      FROM anime_series
      WHERE mal_id IS NOT NULL
        ${force ? '' : 'AND enriched_at IS NULL'}
        AND (
          themes IS NULL OR themes = ''
          OR demographics IS NULL OR demographics = ''
          OR background IS NULL OR background = ''
          OR producteurs IS NULL OR producteurs = ''
          OR diffuseurs IS NULL OR diffuseurs = ''
        )
      ORDER BY created_at DESC
    `).all();

    if (animesToEnrich.length === 0) {
      console.log('✅ Aucun anime à enrichir');
      sessionLogger.record('animeEnrichment', 'success', {
        batches: 0,
        processed: 0,
        enriched: 0,
        errors: 0,
        durationMs: Date.now() - queueStart
      });
      return { processed: 0, enriched: 0, errors: 0 };
    }

    console.log(`🚀 [File d'attente] Démarrage de l'enrichissement de ${animesToEnrich.length} animes...`);

    const startTime = Date.now();
    const stats = {
      processed: 0,
      enriched: 0,
      errors: 0
    };
    const reportData = {
      enriched: [],
      failed: []
    };

    for (let i = 0; i < animesToEnrich.length; i++) {
      if (isCancellationRequested(runToken)) {
        stats.cancelled = true;
        console.log('⏹️ [File d\'attente] Arrêt demandé, interruption de l\'enrichissement anime.');
        break;
      }

      // Attendre si en pause
      while (isPaused() && !isCancellationRequested(runToken)) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (isCancellationRequested(runToken)) {
        stats.cancelled = true;
        console.log('⏹️ [File d\'attente] Arrêt demandé pendant la pause.');
        break;
      }

      const anime = animesToEnrich[i];
      stats.processed++;

      const elapsedMs = Date.now() - startTime;
      const speed = stats.processed / (elapsedMs / 60000); // items par minute
      const remainingCount = animesToEnrich.length - stats.processed;
      const etaMs = isFinite(speed) && speed > 0 ? (remainingCount / speed) * 60000 : null;

      const progressData = {
        current: stats.processed,
        total: animesToEnrich.length,
        item: anime.titre,
        elapsedMs: elapsedMs,
        etaMs: etaMs,
        speed: isFinite(speed) ? speed : null,
        processed: stats.processed,
        enriched: stats.enriched,
        errors: stats.errors
      };

      if (onProgress) {
        onProgress(progressData);
      }

      if (getMainWindow) {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('anime-enrichment-progress', progressData);
        }
      }

      const result = await enrichAnime(getDb, anime.id, anime.mal_id, currentUser, enrichmentConfig, runToken, force);

      if (result?.cancelled) {
        stats.processed = Math.max(0, stats.processed - 1);
        stats.cancelled = true;
        console.log('⏹️ [File d\'attente] Arrêt confirmé pendant le traitement d\'un anime.');
        break;
      }

      if (result?.success) {
        stats.enriched++;
        reportData.enriched.push({
          titre: anime.titre,
          id: anime.id,
          mal_id: anime.mal_id
        });
      } else {
        stats.errors++;
        reportData.failed.push({
          titre: anime.titre,
          error: result?.error || 'Erreur inconnue',
          id: anime.id,
          mal_id: anime.mal_id
        });
      }

      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    const durationMs = Date.now() - queueStart;
    stats.durationMs = durationMs;

    // S'assurer que toutes les oeuvres présentes restent cohérentes entre elles
    propagateAllAnimeRelations(db);

    if (stats.cancelled) {
      sessionLogger.record('animeEnrichment', 'cancelled', {
        processed: stats.processed,
        enriched: stats.enriched,
        errors: stats.errors,
        durationMs
      });
      stats.message = 'Enrichissement anime interrompu';

      // Envoyer l'événement complete immédiatement pour fermer la barre de progression
      if (getMainWindow) {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('anime-enrichment-complete', stats);
        }
      }

      return stats;
    }

    console.log(`✅ [File d'attente] Enrichissement terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);

    sessionLogger.record('animeEnrichment', 'success', {
      batches: 1,
      processed: stats.processed,
      enriched: stats.enriched,
      errors: stats.errors,
      durationMs
    });

    if (stats.errors > 0) {
      sessionLogger.record('animeEnrichment', 'error', {
        errors: stats.errors
      });
    }

    // Générer le rapport d'état
    if (getPathManager) {
      const { generateReport } = require('../../utils/report-generator');
      generateReport(getPathManager, {
        type: 'enrichment-anime',
        stats: {
          total: animesToEnrich.length,
          enriched: stats.enriched,
          errors: stats.errors,
          skipped: animesToEnrich.length - stats.processed
        },
        updated: reportData.enriched, // Utiliser "updated" car enrichi = mis à jour
        failed: reportData.failed,
        metadata: {
          user: currentUser,
          duration: durationMs,
          force: force
        }
      });
    }

    // Informer le frontend que l'enrichissement est terminé
    if (getMainWindow && !stats.cancelled) {
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('anime-enrichment-complete', stats);
      }
    }

    return stats;
  } catch (error) {
    sessionLogger.record('animeEnrichment', 'error', {
      message: error?.message || 'Erreur inconnue'
    });
    throw error;
  } finally {
    resetRunState(runToken);
  }
}

function cancelEnrichment() {
  if (!currentRunToken) {
    return { success: false, reason: 'no-run' };
  }

  cancelRequested = true;
  console.log('🛑 [File d\'attente] Demande d\'arrêt reçue pour l\'enrichissement anime.');
  return { success: true };
}

function isEnrichmentRunning() {
  return currentRunToken !== null;
}

module.exports = {
  enrichAnime,
  processEnrichmentQueue,
  cancelEnrichment,
  pauseEnrichment,
  resumeEnrichment,
  isEnrichmentRunning
};
