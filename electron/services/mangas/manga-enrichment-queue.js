/**
 * Service de file d'attente pour l'enrichissement des mangas en arrière-plan
 * Gère le rate limiting pour éviter les erreurs 429 de Jikan API
 */

const fetch = require('node-fetch');
const coverManager = require('../cover/cover-manager');
const Store = require('electron-store');
const { translateText: translateWithGroq } = require('../../apis/groq');
const { recordSyncError } = require('../../utils/sync-error-reporter');
const sessionLogger = require('../../utils/session-logger');
const {
  isEntityEnriched,
  markEntityAsEnriched,
  updateFieldIfNotUserModified
} = require('../../utils/enrichment-helpers');
const {
  propagateMangaRelations,
  propagateAllMangaRelations
} = require('../relations/relation-propagator');

// Constantes de rate limiting
const JIKAN_DELAY = 1000; // 1 seconde entre les appels Jikan
const GROQ_DELAY = 1500; // 1.5 secondes entre les traductions (augmenté pour éviter les rate limits)
const BATCH_DELAY = 2000; // 2 secondes entre chaque manga complet

let currentRunToken = null;
let cancelRequested = false;
let paused = false;

const createRunToken = () => Symbol('manga-enrichment-run');

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
  console.log('⏸️ [File d\'attente] Enrichissement manga mis en pause.');
  return { success: true };
}

function resumeEnrichment() {
  if (!currentRunToken) {
    return { success: false, reason: 'no-run' };
  }
  paused = false;
  console.log('▶️ [File d\'attente] Reprise de l\'enrichissement manga.');
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
        console.warn('[manga-enrichment] Connexion principale invalide, tentative fallback:', testError.message);
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
          console.warn('[manga-enrichment] Connexion fallback invalide:', testError.message);
        }
      }
    }
  } catch (error) {
    console.warn('[manga-enrichment] Impossible de récupérer la base active:', error.message || error);
  }
  throw new Error('Database connection not available');
}

/**
 * Helper : Récupérer les données depuis Jikan API avec retry
 */
const fetchJikanMangaData = async (malId, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Utiliser l'endpoint /full pour obtenir themes, demographics, serializations, titres alternatifs, etc.
      const response = await fetch(`https://api.jikan.moe/v4/manga/${malId}/full`);

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
 * Enrichir un manga avec les données de Jikan
 */
function logMangaEnrichmentError(operation, error, context = {}) {
  try {
    const { mangaId, malId, title } = context;
    recordSyncError({
      entityType: 'manga-enrichment',
      entityId: malId || mangaId || 'GLOBAL',
      entityName: title || null,
      operation,
      error,
      context
    });
  } catch (reportError) {
    console.warn('[manga-enrichment] Impossible d\'écrire le rapport d\'erreur:', reportError.message || reportError);
  }
}

async function enrichManga(getDb, mangaId, malId, currentUser, enrichmentConfig, getPathManager = null, runToken = null, force = false) {
  const shouldAbort = (phase) => {
    if (!runToken) {
      return false;
    }
    if (isCancellationRequested(runToken)) {
      console.log(`🛑 [File d'attente] Arrêt demandé (${phase}) pour le manga ${mangaId} (MAL ${malId}).`);
      return true;
    }
    return false;
  };

  try {
    console.log(`🔍 [File d'attente] Enrichissement du manga ID ${mangaId} (MAL ${malId})${force ? ' (FORCÉ)' : ''}`);

    if (shouldAbort('initialisation')) {
      return { success: false, cancelled: true };
    }

    // Récupérer la connexion juste avant de l'utiliser
    let db = resolveDatabase(getDb);

    if (shouldAbort('lecture base')) {
      return { success: false, cancelled: true };
    }

    const manga = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(mangaId);
    if (!manga) {
      const error = new Error(`Manga ${mangaId} introuvable`);
      console.error(`❌ ${error.message}`);
      logMangaEnrichmentError('manga-not-found', error, { mangaId, malId });
      return { success: false, error: error.message };
    }

    // Vérifier si déjà enrichi (sauf si forcé)
    if (!force && isEntityEnriched(db, 'manga_series', mangaId)) {
      console.log(`⏭️ Manga ID ${mangaId} (MAL ${malId}) déjà enrichi, ignoré`);
      return { success: true, skipped: true, message: 'Déjà enrichi' };
    }

    const store = new Store();
    const groqApiKey = store.get('groqApiKey', '');

    let enrichedData = {};
    let description = manga.description;

    if (shouldAbort('préparation Jikan')) {
      return { success: false, cancelled: true };
    }

    // 1. Récupérer les données Jikan
    try {
      console.log(`📡 Jikan API pour MAL ${malId}...`);
      const jikanData = await fetchJikanMangaData(malId);
      if (shouldAbort('réponse Jikan')) {
        return { success: false, cancelled: true };
      }
      await new Promise(resolve => setTimeout(resolve, JIKAN_DELAY));

      if (shouldAbort('traitement Jikan')) {
        return { success: false, cancelled: true };
      }

      // Logs détaillés de tous les champs récupérés depuis Jikan
      console.log('📋 ========== CHAMPS RÉCUPÉRÉS DEPUIS JIKAN (ENRICHISSEMENT) ==========');
      console.log(`📖 Titre: ${jikanData.title || 'N/A'}`);
      console.log(`📖 Titre (romaji): ${jikanData.title || 'N/A'}`);
      console.log(`📖 Titre (natif): ${jikanData.title_japanese || 'N/A'}`);
      console.log(`📖 Titre (anglais): ${jikanData.title_english || 'N/A'}`);
      console.log(`🏷️ Titres alternatifs: ${jikanData.title_synonyms ? jikanData.title_synonyms.join(', ') : 'N/A'}`);
      console.log(`📝 Synopsis: ${jikanData.synopsis ? (jikanData.synopsis.length > 100 ? jikanData.synopsis.substring(0, 100) + '...' : jikanData.synopsis) : 'N/A'}`);
      console.log(`📊 Nombre de chapitres: ${jikanData.chapters || 'N/A'}`);
      console.log(`📚 Nombre de volumes: ${jikanData.volumes || 'N/A'}`);
      console.log(`📅 Date début: ${jikanData.published?.from || 'N/A'}`);
      console.log(`📅 Date fin: ${jikanData.published?.to || 'N/A'}`);
      console.log(`📊 Statut: ${jikanData.status || 'N/A'}`);
      console.log(`🏷️ Genres: ${jikanData.genres ? jikanData.genres.map(g => g.name).join(', ') : 'N/A'}`);
      console.log(`🎭 Thèmes: ${jikanData.themes ? jikanData.themes.map(t => t.name).join(', ') : 'N/A'}`);
      console.log(`👥 Démographie: ${jikanData.demographics ? jikanData.demographics.map(d => d.name).join(', ') : 'N/A'}`);
      console.log(`📰 Prépublication: ${jikanData.serializations ? jikanData.serializations.map(s => s.name).join(', ') : 'N/A'}`);
      console.log(`⭐ Score MAL: ${jikanData.score || 'N/A'}`);
      console.log(`📊 Rank MAL: ${jikanData.rank || 'N/A'}`);
      console.log(`📈 Popularité MAL: ${jikanData.popularity || 'N/A'}`);
      console.log(`📖 Type: ${jikanData.type || 'N/A'}`);
      console.log(`✍️ Auteurs: ${jikanData.authors ? jikanData.authors.map(a => a.name || `${a.node?.first_name || ''} ${a.node?.last_name || ''}`.trim()).filter(Boolean).join(', ') : 'N/A'}`);
      console.log(`📝 Background: ${jikanData.background ? (jikanData.background.length > 100 ? jikanData.background.substring(0, 100) + '...' : jikanData.background) : 'N/A'}`);
      console.log(`🖼️ URL couverture: ${jikanData.images?.jpg?.large_image_url || jikanData.images?.jpg?.image_url || 'N/A'}`);
      console.log('===================================================================');

      // Extraire les champs configurés
      const fields = enrichmentConfig.fields || {};

      // Titres alternatifs
      if (fields.titre_romaji && jikanData.title) enrichedData.titre_romaji = jikanData.title;
      if (fields.titre_natif && jikanData.title_japanese) enrichedData.titre_natif = jikanData.title_japanese;
      if (fields.titre_anglais && jikanData.title_english) enrichedData.titre_anglais = jikanData.title_english;
      if (fields.titres_alternatifs && jikanData.title_synonyms) {
        // Fusionner les titres alternatifs existants depuis Nautiljon avec ceux de MAL
        const { parseMALAltTitles } = require('./manga-import-matcher');

        // Normaliser pour comparaison (identique à celle utilisée dans prepareMergedAltTitles)
        const normalizeForDedup = (str) => {
          if (!str) return '';
          let normalized = str
            .normalize('NFKC')
            .toLowerCase()
            .trim();
          normalized = normalized
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          normalized = normalized
            .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, '')
            .replace(/[.,;:!?()[\]{}'"`~\-_=+*&^%$#@]/g, '')
            .replace(/[！？。、，；：（）【】「」『』]/g, '');
          normalized = normalized.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/g, '');
          return normalized;
        };

        const allAltTitles = [];
        const seenNormalized = new Set();
        const normalizedMainTitles = new Set(
          [
            manga.titre,
            manga.titre_romaji,
            manga.titre_natif,
            manga.titre_anglais
          ]
            .concat([
              enrichedData.titre_romaji,
              enrichedData.titre_natif,
              enrichedData.titre_anglais
            ])
            .filter(Boolean)
            .map(title => normalizeForDedup(title))
        );

        // Ajouter les titres alternatifs existants depuis Nautiljon (titre_alternatif)
        if (manga.titre_alternatif) {
          const nautiljonTitles = manga.titre_alternatif.split('/').map(t => t.trim()).filter(Boolean);
          for (const title of nautiljonTitles) {
            const normalized = normalizeForDedup(title);
            if (!normalized || normalizedMainTitles.has(normalized) || seenNormalized.has(normalized)) continue;
            seenNormalized.add(normalized);
            allAltTitles.push(title);
          }
        }

        // Ajouter les titres alternatifs existants depuis MAL (titres_alternatifs) s'ils existent déjà
        if (manga.titres_alternatifs) {
          const existingMALTitles = parseMALAltTitles(manga.titres_alternatifs);
          for (const title of existingMALTitles) {
            const normalized = normalizeForDedup(title);
            if (!normalized || normalizedMainTitles.has(normalized) || seenNormalized.has(normalized)) continue;
            seenNormalized.add(normalized);
            allAltTitles.push(title);
          }
        }

        // Ajouter les nouveaux titres alternatifs depuis MAL
        const newMALTitles = jikanData.title_synonyms || [];
        for (const title of newMALTitles) {
          const titleStr = String(title).trim();
          if (!titleStr) continue;
          const normalized = normalizeForDedup(titleStr);
          if (!normalized || normalizedMainTitles.has(normalized) || seenNormalized.has(normalized)) continue;
          seenNormalized.add(normalized);
          allAltTitles.push(titleStr);
        }

        // Stocker dans titres_alternatifs au format JSON array
        if (allAltTitles.length > 0) {
          enrichedData.titres_alternatifs = JSON.stringify(allAltTitles);
        }
      }

      // Métadonnées de publication
      if (fields.date_debut && jikanData.published?.from) enrichedData.date_debut = jikanData.published.from;
      if (fields.date_fin && jikanData.published?.to) enrichedData.date_fin = jikanData.published.to;

      // Champs critiques pour détection de mises à jour
      if (jikanData.volumes !== null && jikanData.volumes !== undefined) {
        enrichedData.nb_volumes = jikanData.volumes;
      }
      if (jikanData.chapters !== null && jikanData.chapters !== undefined) {
        enrichedData.nb_chapitres = jikanData.chapters;
      }
      if (jikanData.status) {
        // Normaliser le statut Jikan vers le format de la base
        const statusMap = {
          'Not yet published': 'Non publié',
          'Publishing': 'En cours',
          'Finished': 'Terminé',
          'On Hiatus': 'En pause',
          'Discontinued': 'Abandonné'
        };
        enrichedData.statut_publication = statusMap[jikanData.status] || jikanData.status;
      }

      // Classification
      if (fields.themes && jikanData.themes) enrichedData.themes = jikanData.themes.map(t => t.name).join(', ');
      if (fields.demographics && jikanData.demographics) enrichedData.demographie = jikanData.demographics.map(d => d.name).join(', ');
      if (fields.score && jikanData.score) enrichedData.score_mal = jikanData.score;
      if (fields.rank && jikanData.rank) enrichedData.rank_mal = jikanData.rank;
      if (fields.popularity && jikanData.popularity) enrichedData.popularity_mal = jikanData.popularity;

      // Type de média (normalisé)
      let normalizedMediaType = null;
      if (jikanData.type) {
        const type = jikanData.type.toLowerCase();
        normalizedMediaType = type === 'manga' ? 'Manga' :
          type === 'manhwa' ? 'Manhwa' :
            type === 'manhua' ? 'Manhua' :
              type === 'novel' || type === 'light novel' ? 'Light Novel' :
                type.charAt(0).toUpperCase() + type.slice(1);
        enrichedData.media_type = normalizedMediaType;
      }

      // Langue originale - DÉDUITE depuis le type de média (si pas déjà définie)
      if (!manga.langue_originale && normalizedMediaType) {
        let langueOriginaleDeduite = 'ja'; // Par défaut japonais
        if (normalizedMediaType === 'Manhwa') {
          langueOriginaleDeduite = 'ko'; // Coréen
        } else if (normalizedMediaType === 'Manhua') {
          langueOriginaleDeduite = 'zh'; // Chinois
        } else if (normalizedMediaType === 'Manga') {
          langueOriginaleDeduite = 'ja'; // Japonais
        }
        enrichedData.langue_originale = langueOriginaleDeduite;
        console.log(`🌍 Langue originale déduite depuis media_type: ${langueOriginaleDeduite} (${normalizedMediaType})`);
      } else if (manga.langue_originale) {
        console.log(`ℹ️ Langue originale déjà définie: ${manga.langue_originale}, pas de déduction`);
      }

      // Auteurs avec rôles
      if (fields.auteurs && jikanData.authors) {
        const auteurs = jikanData.authors.map(a => {
          const name = a.name || `${a.node?.first_name || ''} ${a.node?.last_name || ''}`.trim();
          return name;
        }).filter(Boolean).join(', ');
        if (auteurs) enrichedData.auteurs = auteurs;
      }

      // Sérialisation (magazine de prépublication)
      if (fields.serialization && jikanData.serializations) {
        const serializations = jikanData.serializations.map(s => s.name).join(', ');
        if (serializations) enrichedData.serialization = serializations;
      }

      // Genres (fusion/mise à jour)
      if (fields.genres && jikanData.genres) {
        const newGenres = jikanData.genres.map(g => g.name).join(', ');
        if (!manga.genres) enrichedData.genres = newGenres;
        else if (!manga.genres.includes(newGenres)) {
          const set = new Set((manga.genres + ', ' + newGenres).split(',').map(s => s.trim()).filter(Boolean));
          enrichedData.genres = Array.from(set).join(', ');
        }
      }

      // Rating - définir à "R+" si "Erotica" ou "Hentai" est présent dans les genres/thèmes
      if (fields.rating !== false) {
        const allGenres = enrichedData.genres || manga.genres || '';
        const allThemes = enrichedData.themes || manga.themes || '';
        const allGenresAndThemes = `${allGenres}, ${allThemes}`.toLowerCase();
        if (allGenresAndThemes.includes('erotica') || allGenresAndThemes.includes('hentai')) {
          enrichedData.rating = 'R+';
        } else if (jikanData.rating) {
          // Utiliser le rating MAL si disponible et pas erotica/hentai
          const { convertMALRating } = require('../../handlers/mangas/enrichment-handlers');
          const convertedRating = convertMALRating(jikanData.rating);
          if (convertedRating) {
            // Convertir 'erotica' en 'R+' pour la base de données
            enrichedData.rating = convertedRating === 'erotica' ? 'R+' : convertedRating;
          }
        }
      }

      // Synopsis (mise à jour uniquement si pas déjà présent)
      if (fields.synopsis && jikanData.synopsis && !manga.description) {
        description = jikanData.synopsis;
      }

      // Background (informations contextuelles)
      if (fields.background && jikanData.background) {
        enrichedData.background = jikanData.background;
      }

      // Relations (Prequel, Sequel, Adaptation, etc.)
      if (fields.relations && jikanData.relations) {
        const relations = jikanData.relations || [];
        const prequel = relations.find(r => r.relation === 'Prequel');
        const sequel = relations.find(r => r.relation === 'Sequel');
        if (prequel) enrichedData.prequel_mal_id = prequel.entry[0]?.mal_id;
        if (sequel) enrichedData.sequel_mal_id = sequel.entry[0]?.mal_id;

        // Extraire les adaptations (anime, light novel, etc.)
        const adaptation = relations.find(r => r.relation === 'Adaptation');
        if (adaptation && adaptation.entry) {
          const animeEntry = adaptation.entry.find(e => e.type?.toLowerCase() === 'anime');
          if (animeEntry) enrichedData.anime_adaptation_mal_id = animeEntry.mal_id;
        }

        // Chercher le light novel source dans les relations "Source" ou "Parent story"
        const source = relations.find(r => {
          const relType = r.relation?.toLowerCase() || '';
          return relType === 'source' || relType === 'parent story';
        });
        if (source && source.entry) {
          const lnEntry = source.entry.find(e => {
            const entryType = e.type?.toLowerCase() || '';
            return entryType === 'light novel' || entryType === 'novel';
          });
          if (lnEntry) enrichedData.light_novel_mal_id = lnEntry.mal_id;
        }

        // Si c'est un light novel, chercher aussi les adaptations (manga, anime)
        if (normalizedMediaType === 'Light Novel' && adaptation && adaptation.entry) {
          const mangaEntry = adaptation.entry.find(e => {
            const entryType = e.type?.toLowerCase() || '';
            return entryType === 'manga';
          });
          if (mangaEntry?.mal_id) {
            // Vérifier que ce n'est pas un light novel
            try {
              const { fetchJikanMangaData } = require('../mangas/manga-api-helpers');
              const relatedData = await fetchJikanMangaData(mangaEntry.mal_id);
              const relatedType = relatedData.type?.toLowerCase() || '';
              if (relatedType !== 'light novel' && relatedType !== 'novel') {
                enrichedData.manga_adaptation_mal_id = mangaEntry.mal_id;
              }
            } catch (error) {
              // Si erreur, assumer que c'est un manga
              enrichedData.manga_adaptation_mal_id = mangaEntry.mal_id;
            }
          }
        }

        // Stocker toutes les relations en JSON
        if (relations.length > 0) {
          enrichedData.relations = JSON.stringify(relations.map(rel => ({
            relation: rel.relation,
            entries: rel.entry?.map(e => ({
              mal_id: e.mal_id,
              name: e.name,
              type: e.type
            })) || []
          })));
        }
      }

      // Télécharger la couverture si elle est une URL distante
      const currentCoverUrl = manga.couverture_url || '';
      const coverUrl = jikanData.images?.jpg?.large_image_url || jikanData.images?.jpg?.image_url || '';

      if (shouldAbort('avant téléchargement couverture')) {
        return { success: false, cancelled: true };
      }

      const autoDownload = new Store().get('autoDownloadCovers', false) === true;
      if (autoDownload && coverUrl && getPathManager && (!currentCoverUrl || currentCoverUrl.startsWith('http'))) {
        try {
          const pm = getPathManager();
          if (pm) {
            const coverResult = await coverManager.downloadCover(
              pm,
              coverUrl,
              manga.titre,
              'serie',
              manga.id,
              {
                mediaType: enrichedData.media_type || manga.media_type || jikanData?.type,
                typeVolume: enrichedData.type_volume || manga.type_volume
              }
            );

            if (shouldAbort('réponse téléchargement couverture')) {
              return { success: false, cancelled: true };
            }

            if (coverResult.success && coverResult.localPath) {
              enrichedData.couverture_url = coverResult.localPath;
              console.log(`📸 Couverture téléchargée: ${coverResult.localPath}`);
            }
          }
        } catch (error) {
          console.error('⚠️ Erreur téléchargement couverture:', error.message);
          logMangaEnrichmentError('cover-download', error, { mangaId, malId, title: manga.titre });
        }
      }

      // Logs des données enrichies qui seront sauvegardées
      if (Object.keys(enrichedData).length > 0) {
        console.log('💾 ========== DONNÉES ENRICHIES À SAUVEGARDER ==========');
        Object.keys(enrichedData).forEach(key => {
          const value = enrichedData[key];
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' && value.length > 100) {
              console.log(`  ${key}: ${value.substring(0, 100)}...`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }
        });
        console.log('=======================================================');
      }

      console.log(`✅ Jikan: données récupérées`);
    } catch (jikanError) {
      console.error(`⚠️ Erreur Jikan pour MAL ${malId}:`, jikanError.message);
      logMangaEnrichmentError('jikan-fetch', jikanError, { mangaId, malId, title: manga.titre });
    }

    // 2. Traduction automatique du synopsis si activée
    if (enrichmentConfig.autoTranslate && description && description === manga.description) {
      if (shouldAbort('avant traduction synopsis')) {
        return { success: false, cancelled: true };
      }
      try {
        if (!groqApiKey) {
          console.log(`ℹ️ Traduction Groq ignorée: aucune clé API définie`);
        } else if (description.length < 10) {
          console.log(`ℹ️ Traduction Groq ignorée: synopsis trop court (${description.length} caractères)`);
        } else {
          console.log(`🌐 Traduction du synopsis via Groq...`);
          const translationResult = await translateWithGroq(description, groqApiKey, 'fr', 'manga');
          if (shouldAbort('réponse traduction synopsis')) {
            return { success: false, cancelled: true };
          }
          await new Promise(resolve => setTimeout(resolve, GROQ_DELAY));

          if (translationResult?.success && translationResult.text) {
            description = translationResult.text;
            console.log(`✅ Synopsis traduit (${translationResult.text.length} caractères)`);
          } else {
            const errorMessage = translationResult?.error || 'motif inconnu';
            console.log(`⚠️ Traduction Groq non appliquée: ${errorMessage}`);
          }
        }
      } catch (translateError) {
        console.error(`⚠️ Erreur traduction pour MAL ${malId}:`, translateError.message);
        logMangaEnrichmentError('groq-translation', translateError, { mangaId, malId, title: manga.titre });
      }
    }

    // 2bis. Traduction automatique du background si activée
    if (enrichmentConfig.autoTranslate && enrichedData.background) {
      if (shouldAbort('avant traduction background')) {
        return { success: false, cancelled: true };
      }
      try {
        if (!groqApiKey) {
          console.log(`ℹ️ Traduction du background ignorée: aucune clé API définie`);
        } else if (enrichedData.background.length < 10) {
          console.log(`ℹ️ Traduction du background ignorée: texte trop court (${enrichedData.background.length} caractères)`);
        } else {
          console.log(`🌐 Traduction du background via Groq...`);
          const translationResult = await translateWithGroq(enrichedData.background, groqApiKey, 'fr', 'manga');
          if (shouldAbort('réponse traduction background')) {
            return { success: false, cancelled: true };
          }
          await new Promise(resolve => setTimeout(resolve, GROQ_DELAY));

          if (translationResult?.success && translationResult.text) {
            enrichedData.background = translationResult.text;
            console.log(`✅ Background traduit (${translationResult.text.length} caractères)`);
          } else {
            const errorMessage = translationResult?.error || 'motif inconnu';
            console.log(`⚠️ Traduction du background non appliquée: ${errorMessage}`);
          }
        }
      } catch (backgroundError) {
        console.error(`⚠️ Erreur traduction background pour MAL ${malId}:`, backgroundError.message);
        logMangaEnrichmentError('groq-background-translation', backgroundError, { mangaId, malId, title: manga.titre });
      }
    }

    if (shouldAbort('avant mise à jour base')) {
      return { success: false, cancelled: true };
    }

    // 3. Mettre à jour la base de données avec les données enrichies
    // Récupérer la connexion juste avant la mise à jour (elle peut avoir été fermée entre-temps)
    db = resolveDatabase(getDb);

    // Recharger le manga pour avoir les dernières valeurs de user_modified_fields
    const currentManga = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(mangaId);
    const userModifiedFields = currentManga?.user_modified_fields || null;

    // Détecter les changements critiques pour signaler une mise à jour
    const currentNbVolumes = currentManga?.nb_volumes || 0;
    const newNbVolumes = enrichedData.nb_volumes !== undefined ? enrichedData.nb_volumes : currentNbVolumes;
    const nbVolumesChanged = newNbVolumes > currentNbVolumes; // Seulement si augmentation

    const currentNbChapitres = currentManga?.nb_chapitres || 0;
    const newNbChapitres = enrichedData.nb_chapitres !== undefined ? enrichedData.nb_chapitres : currentNbChapitres;
    const nbChapitresChanged = newNbChapitres > currentNbChapitres; // Seulement si augmentation

    const currentStatutPublication = currentManga?.statut_publication || '';
    const newStatutPublication = enrichedData.statut_publication !== undefined ? enrichedData.statut_publication : currentStatutPublication;
    const statutPublicationChanged = newStatutPublication && newStatutPublication !== currentStatutPublication;

    const currentStatutPublicationVf = currentManga?.statut_publication_vf || '';
    // Note: statut_publication_vf vient de Nautiljon, pas de Jikan, donc pas dans enrichedData ici
    // Il sera géré lors des imports Nautiljon

    const currentNbVolumesVf = currentManga?.nb_volumes_vf || 0;
    // Note: nb_volumes_vf vient de Nautiljon, pas de Jikan
    const currentNbChapitresVf = currentManga?.nb_chapitres_vf || 0;
    // Note: nb_chapitres_vf vient de Nautiljon, pas de Jikan

    // Seuls ces changements déclenchent une notification de mise à jour (pour l'instant, seulement depuis Jikan)
    const shouldSignalUpdate = nbVolumesChanged || nbChapitresChanged || statutPublicationChanged;

    // Déterminer la valeur de maj_disponible
    const currentMajDisponible = currentManga?.maj_disponible || 0;
    const majDisponibleValue = shouldSignalUpdate ? 1 : currentMajDisponible;

    if (nbVolumesChanged) {
      console.log(`  ✅ Nombre de volumes augmenté: ${currentNbVolumes} → ${newNbVolumes} (mise à jour signalée)`);
    }
    if (nbChapitresChanged) {
      console.log(`  ✅ Nombre de chapitres augmenté: ${currentNbChapitres} → ${newNbChapitres} (mise à jour signalée)`);
    }
    if (statutPublicationChanged) {
      console.log(`  ✅ Statut de publication changé: ${currentStatutPublication || 'Aucun'} → ${newStatutPublication} (mise à jour signalée)`);
    }

    let updatedFieldsCount = 0;

    // Mettre à jour la description si elle a changé et n'est pas protégée (ou si force)
    if (description !== undefined && description !== manga.description) {
      if (updateFieldIfNotUserModified(db, 'manga_series', mangaId, 'description', description, userModifiedFields, force)) {
        updatedFieldsCount++;
      }
    }

    // Mettre à jour chaque champ enrichi s'il n'est pas protégé (ou si force)
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
      const currentValue = manga[key];
      if (currentValue === value) {
        return;
      }

      if (updateFieldIfNotUserModified(db, 'manga_series', mangaId, key, value, userModifiedFields, force)) {
        updatedFieldsCount++;
      }
    });

    // Mettre à jour updated_at, maj_disponible, derniere_verif et marquer comme enrichi
    if (updatedFieldsCount > 0 || !isEntityEnriched(db, 'manga_series', mangaId) || shouldSignalUpdate) {
      db.prepare(`
        UPDATE manga_series
        SET updated_at = datetime('now'),
            maj_disponible = ?,
            derniere_verif = datetime('now')
        WHERE id = ?
      `).run(majDisponibleValue, mangaId);

      // Marquer comme enrichi
      markEntityAsEnriched(db, 'manga_series', mangaId);

      if (shouldSignalUpdate) {
        console.log(`✅ [File d'attente] Manga "${manga.titre}" enrichi avec succès (${updatedFieldsCount} champ(s) mis à jour, mise à jour signalée)`);
      } else {
        console.log(`✅ [File d'attente] Manga "${manga.titre}" enrichi avec succès (${updatedFieldsCount} champ(s) mis à jour)`);
      }
    } else {
      // Mettre à jour derniere_verif même si aucun changement
      db.prepare(`
        UPDATE manga_series
        SET derniere_verif = datetime('now')
        WHERE id = ?
      `).run(mangaId);

      console.log(`ℹ️ [File d'attente] Aucune donnée à enrichir pour "${manga.titre}" (tous les champs sont protégés ou identiques)`);
      // Marquer quand même comme enrichi si ce n'est pas déjà fait
      if (!isEntityEnriched(db, 'manga_series', mangaId)) {
        markEntityAsEnriched(db, 'manga_series', mangaId);
      }
    }

    // Propager les relations vers les autres oeuvres connues
    propagateMangaRelations(db, mangaId);

    const enrichedFieldCount = Object.keys(enrichedData).length;

    if (shouldAbort('avant délai inter-manga')) {
      return { success: true, enrichedFields: enrichedFieldCount, cancelled: true };
    }

    // Attendre avant le prochain manga
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

    return { success: true, enrichedFields: enrichedFieldCount };

  } catch (error) {
    console.error(`❌ [File d'attente] Erreur enrichissement manga ${mangaId}:`, error.message);
    logMangaEnrichmentError('enrich-manga', error, { mangaId, malId });
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer la configuration d'enrichissement avec valeurs par défaut complètes
 */
function getMangaEnrichmentConfig(store) {
  const defaultConfig = {
    enabled: true,
    autoTranslate: false,
    fields: {
      titre_romaji: true,
      titre_natif: true,
      titre_anglais: true,
      titres_alternatifs: true,
      date_debut: true,
      date_fin: true,
      serialization: true,
      themes: true,
      demographics: true,
      genres: true,
      score: true,
      rank: true,
      popularity: true,
      auteurs: true,
      synopsis: true,
      background: true,
      relations: true,
    }
  };

  const savedConfig = store.get('mangaEnrichmentConfig', {});

  // Fusionner avec les valeurs par défaut
  return {
    enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : defaultConfig.enabled,
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
async function processEnrichmentQueue(getDb, currentUser, onProgress = null, getPathManager = null, getMainWindow = null, force = false) {
  const store = new Store();
  const enrichmentConfig = getMangaEnrichmentConfig(store);

  if (!enrichmentConfig.enabled) {
    console.log('⏸️ Enrichissement manga désactivé');
    return { processed: 0, enriched: 0, errors: 0 };
  }

  if (currentRunToken) {
    console.warn('⚠️ [File d\'attente] Enrichissement manga déjà en cours, nouvelle requête ignorée.');
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

  const queueStart = Date.now();

  try {
    const db = resolveDatabase(getDb);

    // Exclure les mangas déjà enrichis (sauf si on force)
    const mangasToEnrich = db.prepare(`
      SELECT id, mal_id, titre
      FROM manga_series
      WHERE mal_id IS NOT NULL
        ${force ? '' : 'AND enriched_at IS NULL'}
        AND (
          themes IS NULL OR themes = ''
          OR demographie IS NULL OR demographie = ''
          OR serialization IS NULL OR serialization = ''
          OR background IS NULL OR background = ''
        )
      ORDER BY created_at DESC
    `).all();

    if (mangasToEnrich.length === 0) {
      console.log('✅ Aucun manga à enrichir');
      sessionLogger.record('mangaEnrichment', 'success', {
        batches: 0,
        processed: 0,
        enriched: 0,
        errors: 0,
        durationMs: Date.now() - queueStart
      });
      return { processed: 0, enriched: 0, errors: 0 };
    }

    console.log(`🚀 [File d'attente] Démarrage de l'enrichissement de ${mangasToEnrich.length} mangas...`);

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

    for (let i = 0; i < mangasToEnrich.length; i++) {
      if (isCancellationRequested(runToken)) {
        stats.cancelled = true;
        console.log('⏹️ [File d\'attente] Arrêt demandé, interruption de l\'enrichissement manga.');
        break;
      }

      const manga = mangasToEnrich[i];
      stats.processed++;

      const elapsedMs = Date.now() - startTime;
      const speed = stats.processed / (elapsedMs / 60000); // items par minute
      const remainingCount = mangasToEnrich.length - stats.processed;
      const etaMs = isFinite(speed) && speed > 0 ? (remainingCount / speed) * 60000 : null;

      const progressData = {
        current: stats.processed,
        total: mangasToEnrich.length,
        item: manga.titre,
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
          mainWindow.webContents.send('manga-enrichment-progress', progressData);
        }
      }

      const result = await enrichManga(getDb, manga.id, manga.mal_id, currentUser, enrichmentConfig, getPathManager, runToken, force);

      if (result?.cancelled) {
        stats.processed = Math.max(0, stats.processed - 1);
        stats.cancelled = true;
        console.log('⏹️ [File d\'attente] Arrêt confirmé pendant le traitement d\'un manga.');
        break;
      }

      if (result?.success) {
        stats.enriched++;
        reportData.enriched.push({
          titre: manga.titre,
          id: manga.id,
          mal_id: manga.mal_id
        });
      } else {
        stats.errors++;
        reportData.failed.push({
          titre: manga.titre,
          error: result?.error || 'Erreur inconnue',
          id: manga.id,
          mal_id: manga.mal_id
        });
      }

      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    const durationMs = Date.now() - queueStart;
    stats.durationMs = durationMs;

    // S'assurer que les relations cohérentes sont propagées à toutes les oeuvres existantes
    propagateAllMangaRelations(db);

    if (stats.cancelled) {
      sessionLogger.record('mangaEnrichment', 'cancelled', {
        processed: stats.processed,
        enriched: stats.enriched,
        errors: stats.errors,
        durationMs
      });
      stats.message = 'Enrichissement manga interrompu';

      // Envoyer l'événement complete immédiatement pour fermer la barre de progression
      if (getMainWindow) {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('manga-enrichment-complete', stats);
        }
      }

      return stats;
    }

    console.log(`✅ [File d'attente] Enrichissement terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);

    sessionLogger.record('mangaEnrichment', 'success', {
      batches: 1,
      processed: stats.processed,
      enriched: stats.enriched,
      errors: stats.errors,
      durationMs
    });

    if (stats.errors > 0) {
      sessionLogger.record('mangaEnrichment', 'error', {
        errors: stats.errors
      });
    }

    // Générer le rapport d'état
    if (getPathManager) {
      const { generateReport } = require('../../utils/report-generator');
      generateReport(getPathManager, {
        type: 'enrichment-manga',
        stats: {
          total: mangasToEnrich.length,
          enriched: stats.enriched,
          errors: stats.errors,
          skipped: mangasToEnrich.length - stats.processed
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
        mainWindow.webContents.send('manga-enrichment-complete', stats);
      }
    }

    return stats;
  } catch (error) {
    sessionLogger.record('mangaEnrichment', 'error', {
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
  console.log('🛑 [File d\'attente] Demande d\'arrêt reçue pour l\'enrichissement manga.');
  return { success: true };
}

function isEnrichmentRunning() {
  return currentRunToken !== null;
}

module.exports = {
  enrichManga,
  processEnrichmentQueue,
  getMangaEnrichmentConfig,
  cancelEnrichment,
  pauseEnrichment,
  resumeEnrichment,
  isEnrichmentRunning
};
