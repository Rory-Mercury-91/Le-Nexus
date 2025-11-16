const { fetchAniListCover } = require('../../apis/anilist');
const {
  translateSeason,
  fetchJikanData,
  translateWithGroq,
  prepareAnimeDataFromJikan,
  insertAnimeIntoDatabase
} = require('./anime-helpers');

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractAlternativeTitles(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore, fallback to string split
  }

  return String(rawValue)
    .split(/[;,|]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function findAnimeCandidates(db, titles) {
  const normalizedCandidates = new Set();
  titles
    .filter(Boolean)
    .forEach(title => {
      const normalized = normalizeTitle(title);
      if (normalized) {
        normalizedCandidates.add(normalized);
      }
    });

  if (normalizedCandidates.size === 0) {
    return [];
  }

  const rows = db.prepare(`
    SELECT id, titre, titres_alternatifs, type, statut_diffusion, source_import, mal_id
    FROM anime_series
  `).all();

  const matches = [];
  const seenIds = new Set();

  for (const row of rows) {
    const baseNormalized = normalizeTitle(row.titre);
    let isMatch = normalizedCandidates.has(baseNormalized);

    if (!isMatch && row.titres_alternatifs) {
      const alts = extractAlternativeTitles(row.titres_alternatifs);
      for (const alt of alts) {
        if (normalizedCandidates.has(normalizeTitle(alt))) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch && !seenIds.has(row.id)) {
      matches.push(row);
      seenIds.add(row.id);
    }
  }

  return matches;
}

/**
 * Ajouter un anime par MAL ID ou URL
 */
async function handleAddAnimeByMalId(db, store, malIdOrUrl, options = {}) {
  const currentUser = store.get('currentUser', '');
  if (!currentUser) throw new Error('Aucun utilisateur connecté');

  const targetSerieId = typeof options.targetSerieId === 'number' ? options.targetSerieId : null;
  const forceCreate = options.forceCreate === true;

  // Extraire le MAL ID depuis l'URL si nécessaire
  let malId = malIdOrUrl;
  if (typeof malIdOrUrl === 'string' && malIdOrUrl.includes('myanimelist.net')) {
    const match = malIdOrUrl.match(/anime\/(\d+)/);
    if (!match) throw new Error('URL MyAnimeList invalide');
    malId = parseInt(match[1]);
  } else {
    malId = parseInt(malId);
  }

  if (isNaN(malId)) throw new Error('MAL ID invalide');

  // Vérifier si l'anime existe déjà
  const existing = db.prepare('SELECT * FROM anime_series WHERE mal_id = ?').get(malId);
  let animeToUpdate = null;
  if (existing) {
    if (targetSerieId && existing.id === targetSerieId) {
      animeToUpdate = existing;
    } else if (!targetSerieId) {
      return {
        success: false,
        error: `Cet anime existe déjà : ${existing.titre}`,
        animeId: existing.id
      };
    } else {
      return {
        success: false,
        error: `Cet anime existe déjà : ${existing.titre}`,
        animeId: existing.id
      };
    }
  }

  console.log(`🔍 Récupération des données pour MAL ID ${malId}...`);
  
  const imageSource = store.get('animeImageSource', 'anilist');
  console.log(`📸 Source d'images : ${imageSource}`);
  
  const anime = await fetchJikanData(malId);
  const candidateTitles = new Set([
    anime.title,
    anime.title_english,
    anime.title_japanese,
    ...(Array.isArray(anime.title_synonyms) ? anime.title_synonyms : [])
  ]);

  let potentialMatches = [];
  if (!forceCreate) {
    potentialMatches = findAnimeCandidates(db, Array.from(candidateTitles)).filter(row => {
      if (animeToUpdate && row.id === animeToUpdate.id) {
        return false;
      }
      if (row.mal_id && row.mal_id !== malId) {
        return false;
      }
      return true;
    });
  }

  if (!animeToUpdate && targetSerieId) {
    animeToUpdate = db.prepare('SELECT * FROM anime_series WHERE id = ?').get(targetSerieId);
    if (!animeToUpdate) {
      return {
        success: false,
        error: 'Entrée sélectionnée introuvable'
      };
    }
    if (animeToUpdate.mal_id && animeToUpdate.mal_id !== malId) {
      return {
        success: false,
        error: `Cette entrée est déjà liée au MAL ID ${animeToUpdate.mal_id}`,
        animeId: animeToUpdate.id
      };
    }
  }

  if (!animeToUpdate && !forceCreate && !targetSerieId && potentialMatches.length > 0) {
    return {
      success: false,
      requiresSelection: true,
      malId,
      candidates: potentialMatches.map(match => ({
        id: match.id,
        titre: match.titre,
        media_type: match.type,
        type_volume: null,
        source_donnees: match.source_import,
        statut: match.statut_diffusion,
        mal_id: match.mal_id
      }))
    };
  }
  let anilistCover = null;
  
  if (imageSource === 'anilist') {
    anilistCover = await fetchAniListCover(malId);
  }

  const coverUrl = imageSource === 'anilist' && anilistCover
                  ? (anilistCover?.coverImage?.extraLarge || anilistCover?.coverImage?.large)
                  : (anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '');

  // Traduire le synopsis (en parallèle)
  let description = anime.synopsis || '';
  let translationPromise = null;
  if (description) {
    console.log(`🌐 Traduction du synopsis en arrière-plan...`);
    translationPromise = translateWithGroq(description, store);
  }

  await new Promise(resolve => setTimeout(resolve, 800));

  // Attendre la fin de la traduction
  if (translationPromise) {
    const translated = await translationPromise;
    if (translated) description = translated;
  }

  // Convertir le nom d'utilisateur en ID
  const { getUserIdByName } = require('./anime-helpers');
  const userId = getUserIdByName(db, currentUser);
  if (!userId) {
    throw new Error('Utilisateur non trouvé');
  }

  // Préparer les données avec la fonction partagée
  const animeData = await prepareAnimeDataFromJikan(anime, malId, userId, 'manual');
  animeData.couverture_url = coverUrl || (animeToUpdate?.couverture_url ?? null);
  animeData.description = description || (animeToUpdate?.description ?? null);

  // Récupérer les liens de streaming depuis AniList (plateformes françaises)
  try {
    const { getStreamingLinksFromAniList } = require('../../apis/anilist');
    const streamingLinks = await getStreamingLinksFromAniList(malId);
    if (streamingLinks && streamingLinks.length > 0) {
      // Fusionner avec les liens Jikan existants
      const existingLinks = anime.streaming || [];
      const allLinks = [...existingLinks, ...streamingLinks];
      animeData.liens_streaming = JSON.stringify(allLinks);
      console.log(`✅ ${streamingLinks.length} lien(s) de streaming AniList récupéré(s)`);
    }
  } catch (error) {
    console.warn('⚠️ Erreur récupération liens streaming AniList:', error.message);
  }

  let animeId;
  if (animeToUpdate) {
    const updatePayload = {
      ...animeData,
      couverture_url: animeData.couverture_url ?? animeToUpdate.couverture_url ?? null,
      description: animeData.description ?? animeToUpdate.description ?? null,
      user_id_ajout: animeToUpdate.user_id_ajout || animeData.user_id_ajout,
      source_import: (() => {
        const existingSource = animeToUpdate.source_import || '';
        if (!existingSource) return 'mal';
        if (existingSource.includes('mal')) return existingSource;
        return `${existingSource}+mal`;
      })(),
      id: animeToUpdate.id
    };

    const updateStmt = db.prepare(`
      UPDATE anime_series SET
        mal_id = @mal_id,
        mal_url = @mal_url,
        titre = @titre,
        titre_romaji = @titre_romaji,
        titre_natif = @titre_natif,
        titre_anglais = @titre_anglais,
        titres_alternatifs = @titres_alternatifs,
        type = @type,
        source = @source,
        nb_episodes = @nb_episodes,
        couverture_url = @couverture_url,
        description = @description,
        statut_diffusion = @statut_diffusion,
        en_cours_diffusion = @en_cours_diffusion,
        date_debut = @date_debut,
        date_fin = @date_fin,
        duree = @duree,
        annee = @annee,
        saison_diffusion = @saison_diffusion,
        genres = @genres,
        themes = @themes,
        demographics = @demographics,
        studios = @studios,
        producteurs = @producteurs,
        diffuseurs = @diffuseurs,
        rating = @rating,
        score = @score,
        rank_mal = @rank_mal,
        popularity_mal = @popularity_mal,
        scored_by = @scored_by,
        favorites = @favorites,
        background = @background,
        liens_externes = @liens_externes,
        liens_streaming = @liens_streaming,
        franchise_name = @franchise_name,
        franchise_order = @franchise_order,
        prequel_mal_id = @prequel_mal_id,
        sequel_mal_id = @sequel_mal_id,
        manga_source_mal_id = @manga_source_mal_id,
        light_novel_source_mal_id = @light_novel_source_mal_id,
        relations = @relations,
        movie_relations = @movie_relations,
        source_import = @source_import,
        user_id_ajout = @user_id_ajout,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    updateStmt.run(updatePayload);
    const { logSavedData } = require('../../utils/log-saved-data');
    logSavedData(updatePayload, 'anime');
    animeId = animeToUpdate.id;
    console.log(`🔄 Anime existant mis à jour : ${anime.title} (ID ${animeId})`);
  } else {
    animeId = insertAnimeIntoDatabase(db, animeData);
    console.log(`✅ Anime ajouté : ${anime.title} (MAL ${malId})`);
  }

  // Proposer d'ajouter les relations manquantes
  const relations = anime.relations || [];
  const relatedAnimes = [];
  for (const rel of relations) {
    if (!rel.entry || rel.entry.length === 0) continue;
    
    const relMalId = rel.entry[0].mal_id;
    const relTitle = rel.entry[0].name;
    const relType = rel.relation;
    
    const exists = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(relMalId);
    if (!exists) {
      relatedAnimes.push({
        mal_id: relMalId,
        title: relTitle,
        relation: relType
      });
    }
  }

  const responseAnime = {
    id: animeId,
    titre: animeData.titre || animeToUpdate?.titre || anime.title,
    type: animeData.type || animeToUpdate?.type || 'TV',
    nb_episodes: animeData.nb_episodes || animeToUpdate?.nb_episodes || 0,
    mal_id: malId
  };

  return {
    success: true,
    animeId: animeId,
    anime: responseAnime,
    relatedAnimes: relatedAnimes
  };
}

/**
 * Créer un anime manuellement
 */
function handleCreateAnime(db, store, animeData) {
  const currentUser = store.get('currentUser', '');

  if (!currentUser) {
    return { success: false, error: 'Aucun utilisateur connecté' };
  }

  const { getUserIdByName } = require('./anime-helpers');
  const userId = getUserIdByName(db, currentUser);
  if (!userId) {
    return { success: false, error: 'Utilisateur non trouvé' };
  }

  if (!animeData.titre || !animeData.titre.trim()) {
    return { success: false, error: 'Le titre est obligatoire' };
  }

  console.log('📝 Création manuelle d\'un anime:', animeData.titre);

  // Préparer les données pour les logs
  const animeDataForLog = {
    mal_id: animeData.mal_id || 0,
    mal_url: null,
    titre: animeData.titre.trim(),
    titre_romaji: null,
    titre_natif: null,
    titre_anglais: animeData.titre_en?.trim() || null,
    titres_alternatifs: null,
    type: animeData.type || 'TV',
    source: null,
    nb_episodes: animeData.nb_episodes || 0,
    couverture_url: animeData.image_url?.trim() || null,
    description: animeData.synopsis?.trim() || null,
    statut_diffusion: null,
    en_cours_diffusion: null,
    date_debut: null,
    date_fin: null,
    duree: null,
    annee: animeData.annee || new Date().getFullYear(),
    saison_diffusion: null,
    genres: animeData.genres?.trim() || null,
    themes: null,
    demographics: null,
    studios: null,
    producteurs: null,
    diffuseurs: null,
    rating: null,
    score: animeData.score || 0,
    rank_mal: null,
    popularity_mal: null,
    scored_by: null,
    favorites: null,
    background: null,
    liens_externes: null,
    liens_streaming: null,
    franchise_name: null,
    franchise_order: null,
    prequel_mal_id: null,
    sequel_mal_id: null,
    manga_source_mal_id: null,
    light_novel_source_mal_id: null,
    source_import: 'manual',
    user_id_ajout: userId
  };

  // Logger toutes les données avant insertion
  const { logSavedData } = require('../../utils/log-saved-data');
  logSavedData(animeDataForLog, 'anime');

  const stmt = db.prepare(`
    INSERT INTO anime_series (
      mal_id, titre, titre_anglais, type, nb_episodes, 
      annee, score, description, couverture_url, genres,
      source_import, user_id_ajout, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const result = stmt.run(
    animeData.mal_id || 0,
    animeData.titre.trim(),
    animeData.titre_en?.trim() || null,
    animeData.type || 'TV',
    animeData.nb_episodes || 0,
    animeData.annee || new Date().getFullYear(),
    animeData.score || 0,
    animeData.synopsis?.trim() || null,
    animeData.image_url?.trim() || null,
    animeData.genres?.trim() || null,
    'manual',
    userId
  );

  const animeId = result.lastInsertRowid;

  console.log(`✅ Anime "${animeData.titre}" créé avec l'ID ${animeId}`);

  if (animeData.statut) {
    const statutMap = {
      'watching': 'En cours',
      'completed': 'Terminé',
      'on_hold': 'En attente',
      'dropped': 'Abandonné',
      'plan_to_watch': 'À regarder'
    };

    // Si episodes_vus est à 0, utiliser "À regarder" par défaut au lieu de "En cours"
    const episodesVus = animeData.episodes_vus || 0;
    let statutFr = statutMap[animeData.statut] || (episodesVus === 0 ? 'À regarder' : 'En cours');

    db.prepare(`
      INSERT INTO anime_statut_utilisateur (anime_id, user_id, statut_visionnage, date_modification)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(animeId, userId, statutFr);

    console.log(`📊 Statut défini: ${statutFr}`);
  }

  return { 
    success: true, 
    id: animeId,
    anime: {
      id: animeId,
      titre: animeData.titre,
      type: animeData.type || 'TV',
      nb_episodes: animeData.nb_episodes || 0
    }
  };
}

/**
 * Enregistre les handlers IPC pour les opérations de création
 */
function registerAnimeSeriesCreateHandlers(ipcMain, getDb, store) {
  // Ajouter un anime par MAL ID ou URL
  ipcMain.handle('add-anime-by-mal-id', async (event, malIdOrUrl, options = {}) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');
      return await handleAddAnimeByMalId(db, store, malIdOrUrl, options);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de l\'anime:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Import depuis XML MyAnimeList
  ipcMain.handle('import-anime-xml', async (event, xmlContent) => {
    const sendProgress = (progress) => {
      event.sender.send('anime-import-progress', progress);
    };

    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const currentUser = store.get('currentUser', '');
      if (!currentUser) throw new Error('Aucun utilisateur connecté');

      const animeMatches = [...xmlContent.matchAll(/<anime>([\s\S]*?)<\/anime>/g)];
      const totalAnimes = animeMatches.length;

      const startTime = Date.now();

      console.log(`\n🎬 Début de l'import : ${totalAnimes} animes à importer`);
      sendProgress({ 
        current: 0, 
        total: totalAnimes, 
        currentAnime: 'Initialisation...',
        startTime,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0
      });

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < animeMatches.length; i++) {
        if (i % 5 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
        
        const animeXml = animeMatches[i][1];
        
        const malId = parseInt(animeXml.match(/<series_animedb_id>(\d+)<\/series_animedb_id>/)?.[1]);
        const titre = animeXml.match(/<series_title><!\[CDATA\[(.*?)\]\]><\/series_title>/)?.[1];
        const watchedEpisodes = parseInt(animeXml.match(/<my_watched_episodes>(\d+)<\/my_watched_episodes>/)?.[1] || 0);
        const myStatus = animeXml.match(/<my_status>(.*?)<\/my_status>/)?.[1];

        if (!malId || !titre) {
          skipped++;
          continue;
        }

        const elapsedMs = Date.now() - startTime;
        const elapsedMin = elapsedMs / 60000;
        const processedCount = i + 1;
        const speed = processedCount / elapsedMin;
        const remainingCount = totalAnimes - processedCount;
        const etaMs = (remainingCount / speed) * 60000;

        sendProgress({
          current: processedCount, 
          total: totalAnimes, 
          currentAnime: titre,
          startTime,
          elapsedMs,
          etaMs: isFinite(etaMs) ? etaMs : null,
          speed: isFinite(speed) ? speed : null,
          imported,
          updated,
          skipped,
          errors
        });

        try {
          const existing = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(malId);
          
          if (existing) {
            console.log(`⏭️ ${titre} (MAL ${malId}) déjà présent, ignoré`);
            skipped++;
            continue;
          }

          console.log(`📡 Fetch parallèle pour: ${titre} (MAL ${malId})`);
          
          const imageSource = store.get('animeImageSource', 'anilist');
          
          const anime = await fetchJikanData(malId);
          let anilistCover = null;
          
          if (imageSource === 'anilist') {
            anilistCover = await fetchAniListCover(malId, titre);
          }

          const coverUrl = imageSource === 'anilist' && anilistCover
                          ? (anilistCover?.coverImage?.extraLarge || anilistCover?.coverImage?.large)
                          : (anime.images?.jpg?.large_image_url || '');

          let description = anime.synopsis || '';
          let translationPromise = null;
          if (description) {
            translationPromise = translateWithGroq(description, store);
          }

          await new Promise(resolve => setTimeout(resolve, 800));

          if (translationPromise) {
            const translated = await translationPromise;
            if (translated) description = translated;
          }

          // Préparer les données avec la fonction partagée
          const { getUserIdByName } = require('./anime-helpers');
          const userId = getUserIdByName(db, currentUser);
          if (!userId) {
            throw new Error('Utilisateur non trouvé');
          }
          const animeData = await prepareAnimeDataFromJikan(anime, malId, userId, 'myanimelist');
          animeData.couverture_url = coverUrl;
          animeData.description = description;

          // Insérer dans la base de données avec la fonction partagée
          const animeId = insertAnimeIntoDatabase(db, animeData);

          if (watchedEpisodes > 0) {
            const insertEpisodeVu = db.prepare(`
              INSERT INTO anime_episodes_vus (anime_id, user_id, episode_numero, vu, date_visionnage)
              VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            `);
            
            for (let ep = 1; ep <= watchedEpisodes; ep++) {
              insertEpisodeVu.run(animeId, userId, ep);
            }
          }

          if (myStatus) {
            const statutMap = {
              'Watching': 'En cours',
              'Completed': 'Terminé',
              'On-Hold': 'En attente',
              'Dropped': 'Abandonné',
              'Plan to Watch': 'À regarder'
            };
            
            // Si episodes_vus est à 0, utiliser "À regarder" par défaut au lieu de "En cours"
            const episodesVus = animeData.episodes_vus || 0;
            const statut = statutMap[myStatus] || (episodesVus === 0 ? 'À regarder' : 'En cours');
            db.prepare(`
              INSERT INTO anime_statut_utilisateur (anime_id, user_id, statut_visionnage)
              VALUES (?, ?, ?)
            `).run(animeId, userId, statut);
          }

          imported++;
          console.log(`✅ ${titre} importé avec succès`);

        } catch (error) {
          console.error(`❌ Erreur pour ${titre}:`, error.message);
          errors++;
        }
      }

      const totalTimeMs = Date.now() - startTime;
      const totalTimeSec = totalTimeMs / 1000;
      const totalTimeMin = totalTimeSec / 60;
      const finalSpeed = totalAnimes / totalTimeMin;

      console.log(`\n✅ Import terminé !`);
      console.log(`   📥 Importés : ${imported}`);
      console.log(`   ⏭️ Ignorés : ${skipped}`);
      console.log(`   ❌ Erreurs : ${errors}`);
      console.log(`   ⏱️ Temps total : ${totalTimeMin.toFixed(2)} minutes`);
      console.log(`   ⚡ Vitesse moyenne : ${finalSpeed.toFixed(1)} animes/min`);

      sendProgress({
        current: totalAnimes, 
        total: totalAnimes, 
        currentAnime: 'Terminé !',
        startTime,
        elapsedMs: totalTimeMs,
        speed: finalSpeed,
        imported,
        updated,
        skipped,
        errors
      });

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors,
        totalTimeMs,
        speed: finalSpeed
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'import XML:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Créer un anime manuellement
  ipcMain.handle('create-anime', (event, animeData) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      return handleCreateAnime(db, store, animeData);
    } catch (error) {
      console.error('❌ Erreur create-anime:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeSeriesCreateHandlers };
