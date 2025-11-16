/**
 * Service de synchronisation avec MyAnimeList
 * Orchestration principale de la synchronisation MAL
 */

const { getUserMangaList, getUserAnimeList } = require('./mal-api');
const { transformMangaData, transformAnimeData } = require('./mal-transformers');
const { syncMangaSeries, syncAnimeSeries } = require('./mal-sync-core');
const { updateMangaUserStatus, updateAnimeUserStatus } = require('./mal-user-status');
const { getValidAccessToken } = require('./mal-token');
const { translateSynopsisInBackground } = require('./mal-translation');
const sessionLogger = require('../../utils/session-logger');

/**
 * Effectue une synchronisation complète avec MyAnimeList
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @param {Function} onProgress - Callback pour notifier la progression (optionnel)
 * @param {Function} getDb - Fonction pour obtenir une connexion à la base de données (optionnel, pour l'enrichissement)
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel, pour l'enrichissement manga)
 * @returns {Promise<Object>} Résultat de la synchronisation
 */
async function performFullSync(db, store, currentUser, onProgress = null, getDb = null, getPathManager = null, getMainWindow = null) {
  const syncStart = Date.now();
  try {
    console.log('🔄 Début synchronisation MAL pour utilisateur:', currentUser);
    
    // Récupérer un token d'accès valide (rafraîchit si nécessaire)
    const accessToken = await getValidAccessToken(store);
    
    // Récupérer les listes depuis MAL
    console.log('📚 Récupération liste manga depuis MAL...');
    const mangas = await getUserMangaList(accessToken);
    console.log(`✅ ${mangas.length} manga(s) récupéré(s)`);
    
    console.log('🎬 Récupération liste anime depuis MAL...');
    const animes = await getUserAnimeList(accessToken);
    console.log(`✅ ${animes.length} anime(s) récupéré(s)`);
    
    // Synchroniser les mangas
    let mangasSynced = 0;
    let mangasUpdated = 0;
    let mangasCreated = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < mangas.length; i++) {
      const malManga = mangas[i];
      
      try {
        const mangaData = transformMangaData(malManga);
        
        // Vérifier si la série existe
        const existingSerie = db.prepare('SELECT id FROM series WHERE mal_id = ?').get(mangaData.mal_id);
        const isUpdate = !!existingSerie;
        
        // syncMangaSeries attend l'entrée complète (avec node et list_status)
        const serieId = await syncMangaSeries(db, currentUser, malManga);
        updateMangaUserStatus(db, currentUser, serieId, mangaData);
        
        mangasSynced++;
        if (isUpdate) {
          mangasUpdated++;
        } else {
          mangasCreated++;
        }
      } catch (error) {
        console.error(`❌ Erreur sync manga ${malManga.id}:`, error.message);
      }
      
      // Notifier la progression avec les statistiques
      if (onProgress) {
        const elapsedMs = Date.now() - startTime;
        const remainingCount = mangas.length - (i + 1);
        const speed = (i + 1) / (elapsedMs / 60000); // items par minute
        const etaMs = isFinite(speed) && speed > 0 ? (remainingCount / speed) * 60000 : null;
        
        onProgress({
          type: 'manga',
          current: i + 1,
          total: mangas.length,
          item: (malManga.node || malManga).title,
          imported: mangasCreated,
          updated: mangasUpdated,
          elapsedMs: elapsedMs,
          etaMs: etaMs,
          speed: isFinite(speed) ? speed : null
        });
      }
      
      // Permettre à l'event loop de traiter les événements de l'interface tous les 5 items
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    // Synchroniser les animes
    let animesSynced = 0;
    let animesUpdated = 0;
    let animesCreated = 0;
    const animeStartTime = Date.now();
    
    const ANIME_BATCH_SIZE = 5;
    const ANIME_BATCH_DELAY_MS = 35;

    for (let i = 0; i < animes.length; i++) {
      const malAnime = animes[i];
      
      try {
        const animeData = transformAnimeData(malAnime);
        
        // Vérifier si l'anime existe
        const existingAnime = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(animeData.mal_id);
        const isUpdate = !!existingAnime;
        
        // syncAnimeSeries attend l'entrée complète (avec node et list_status)
        const animeId = await syncAnimeSeries(db, currentUser, malAnime);
        updateAnimeUserStatus(db, currentUser, animeId, animeData);
        
        animesSynced++;
        if (isUpdate) {
          animesUpdated++;
        } else {
          animesCreated++;
        }
      } catch (error) {
        console.error(`❌ Erreur sync anime ${malAnime.id}:`, error.message);
      }
      
      const shouldEmitBatch = ((i + 1) % ANIME_BATCH_SIZE === 0) || i === animes.length - 1;

      // Notifier la progression avec les statistiques par lot
      if (onProgress && shouldEmitBatch) {
        const elapsedMs = Date.now() - animeStartTime;
        const processedCount = i + 1;
        const remainingCount = animes.length - processedCount;
        const speed = processedCount / (elapsedMs / 60000); // items par minute
        const etaMs = isFinite(speed) && speed > 0 ? (remainingCount / speed) * 60000 : null;

        onProgress({
          type: 'anime',
          current: processedCount,
          total: animes.length,
          item: (malAnime.node || malAnime).title,
          imported: animesCreated,
          updated: animesUpdated,
          elapsedMs,
          etaMs,
          speed: isFinite(speed) ? speed : null
        });
      }

      if (shouldEmitBatch && (i + 1) % ANIME_BATCH_SIZE === 0) {
        await new Promise(resolve => setTimeout(resolve, ANIME_BATCH_DELAY_MS));
      }
    }
    
    // Enregistrer la date de dernière sync
    store.set('mal_last_sync', {
      timestamp: new Date().toISOString(),
      user: currentUser,
      mangas: mangasSynced,
      animes: animesSynced
    });
    store.set('mal_last_status_sync', {
      timestamp: new Date().toISOString(),
      user: currentUser,
      mangas: {
        updated: mangasSynced,
        missing: 0
      },
      animes: {
        updated: animesSynced,
        missing: 0
      },
      durationMs: Date.now() - syncStart
    });
    
    console.log('✅ Synchronisation MAL terminée');
    console.log(`   📚 Mangas: ${mangasCreated} créé(s), ${mangasUpdated} mis à jour, ${mangasSynced} total`);
    console.log(`   🎬 Animes: ${animesCreated} créé(s), ${animesUpdated} mis à jour, ${animesSynced} total`);
    
    // Démarrer l'enrichissement des mangas et animes en arrière-plan (sans bloquer)
    if (getDb) {
      // Enrichissement des mangas
      const { processEnrichmentQueue: processMangaEnrichmentQueue } = require('../mangas/manga-enrichment-queue');
      const mangaEnrichmentConfig = store.get('mangaEnrichmentConfig', {});
      if (mangaEnrichmentConfig.enabled) {
        console.log('🚀 Démarrage de l\'enrichissement des mangas en arrière-plan...');
        // Lancer l'enrichissement de manière asynchrone sans attendre
        processMangaEnrichmentQueue(
          getDb,
          currentUser,
          null, // Ne pas utiliser le callback onProgress de mal-sync, utiliser les événements IPC directs
          getPathManager,
          getMainWindow // Passer getMainWindow pour envoyer les événements IPC
        ).then((stats) => {
          console.log(`✅ Enrichissement manga terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);
        }).catch((error) => {
          console.error('❌ Erreur enrichissement manga:', error);
        });
      }
      
      // Enrichissement des animes
      const { processEnrichmentQueue: processAnimeEnrichmentQueue } = require('../animes/anime-enrichment-queue');
      const animeEnrichmentConfig = store.get('animeEnrichmentConfig', {});
      if (animeEnrichmentConfig.enabled) {
        console.log('🚀 Démarrage de l\'enrichissement des animes en arrière-plan...');
        // Lancer l'enrichissement de manière asynchrone sans attendre
        processAnimeEnrichmentQueue(
          getDb,
          currentUser,
          null, // Ne pas utiliser le callback onProgress de mal-sync, utiliser les événements IPC directs
          getMainWindow // Passer getMainWindow pour envoyer les événements IPC
        ).then((stats) => {
          console.log(`✅ Enrichissement anime terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);
        }).catch((error) => {
          console.error('❌ Erreur enrichissement anime:', error);
        });
      }
    }
    
    const durationMs = Date.now() - syncStart;
    sessionLogger.record('malSync', 'success', {
      durationMs,
      mangas: {
        total: mangasSynced,
        created: mangasCreated,
        updated: mangasUpdated
      },
      animes: {
        total: animesSynced,
        created: animesCreated,
        updated: animesUpdated
      }
    });

    return {
      success: true,
      mangas: {
        total: mangasSynced,
        created: mangasCreated,
        updated: mangasUpdated
      },
      animes: {
        total: animesSynced,
        created: animesCreated,
        updated: animesUpdated
      }
    };
    
  } catch (error) {
    console.error('❌ Erreur synchronisation MAL:', error);
    sessionLogger.record('malSync', 'error', {
      message: error?.message || 'Erreur inconnue'
    });
    throw error;
  }
}

/**
 * Effectue une synchronisation des statuts uniquement (progressions & notes)
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {string} currentUser - Nom de l'utilisateur actuel
 * @returns {Promise<Object>} Résultat de la synchronisation des statuts
 */
async function performStatusSync(db, store, currentUser) {
  const syncStart = Date.now();
  const resultSummary = {
    mangas: {
      updated: 0,
      missing: 0
    },
    animes: {
      updated: 0,
      missing: 0
    }
  };

  try {
    if (!currentUser) {
      throw new Error('Aucun utilisateur actuel sélectionné');
    }

    console.log('🔁 Synchronisation des statuts MAL (progression uniquement)');

    const accessToken = await getValidAccessToken(store);

    const mangas = await getUserMangaList(accessToken);
    const animes = await getUserAnimeList(accessToken);

    const getSerieByMalId = db.prepare('SELECT id FROM series WHERE mal_id = ?');
    const getAnimeByMalId = db.prepare('SELECT id FROM anime_series WHERE mal_id = ?');

    let processedMangas = 0;
    for (const malManga of mangas) {
      const mangaNode = malManga.node || malManga;
      const existingSerie = getSerieByMalId.get(mangaNode.id);

      if (!existingSerie) {
        resultSummary.mangas.missing += 1;
        continue;
      }

      try {
        const mangaData = transformMangaData(malManga);
        updateMangaUserStatus(db, currentUser, existingSerie.id, mangaData);
        resultSummary.mangas.updated += 1;
      } catch (error) {
        console.error(`❌ Erreur mise à jour statut manga ${mangaNode.id}:`, error);
      }

      processedMangas += 1;
      if (processedMangas % 25 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    let processedAnimes = 0;
    for (const malAnime of animes) {
      const animeNode = malAnime.node || malAnime;
      const existingAnime = getAnimeByMalId.get(animeNode.id);

      if (!existingAnime) {
        resultSummary.animes.missing += 1;
        continue;
      }

      try {
        const animeData = transformAnimeData(malAnime);
        updateAnimeUserStatus(db, currentUser, existingAnime.id, animeData);
        resultSummary.animes.updated += 1;
      } catch (error) {
        console.error(`❌ Erreur mise à jour statut anime ${animeNode.id}:`, error);
      }

      processedAnimes += 1;
      if (processedAnimes % 25 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    const durationMs = Date.now() - syncStart;

    store.set('mal_last_status_sync', {
      timestamp: new Date().toISOString(),
      user: currentUser,
      mangas: resultSummary.mangas,
      animes: resultSummary.animes,
      durationMs
    });

    sessionLogger.record('malStatusSync', 'success', {
      durationMs,
      ...resultSummary
    });

    console.log(`✅ Statuts MAL synchronisés (mangas: ${resultSummary.mangas.updated}, animes: ${resultSummary.animes.updated})`);

    return {
      success: true,
      ...resultSummary,
      durationMs
    };
  } catch (error) {
    sessionLogger.record('malStatusSync', 'error', {
      message: error?.message || 'Erreur inconnue'
    });
    console.error('❌ Erreur synchronisation statuts MAL:', error);
    throw error;
  }
}

// Ré-exporter les fonctions nécessaires pour compatibilité
module.exports = {
  performFullSync,
  performStatusSync,
  translateSynopsisInBackground,
  getValidAccessToken
};
