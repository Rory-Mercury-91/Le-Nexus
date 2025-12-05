/**
 * Service de synchronisation avec AniList
 * Orchestration principale de la synchronisation AniList
 */

const { getUserMangaList, getUserAnimeList } = require('./anilist-api');
const { transformMangaData, transformAnimeData } = require('./anilist-transformers');
const { syncMangaSeries, syncAnimeSeries } = require('./anilist-sync-core');
const { updateMangaUserStatus, updateAnimeUserStatus } = require('./anilist-user-status');
const { getValidAccessToken } = require('./anilist-token');
const sessionLogger = require('../../utils/session-logger');
const { generateReport } = require('../../utils/report-generator');

/**
 * Effectue une synchronisation complète avec AniList
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
    console.log('🔄 Début synchronisation AniList pour utilisateur:', currentUser);

    // Récupérer un token d'accès valide (rafraîchit si nécessaire)
    const accessToken = await getValidAccessToken(store);

    // Récupérer les listes depuis AniList
    console.log('📚 Récupération liste manga depuis AniList...');
    const mangas = await getUserMangaList(accessToken);
    console.log(`✅ ${mangas.length} manga(s) récupéré(s)`);

    console.log('🎬 Récupération liste anime depuis AniList...');
    const animes = await getUserAnimeList(accessToken);
    console.log(`✅ ${animes.length} anime(s) récupéré(s)`);

    // Synchroniser les mangas
    let mangasSynced = 0;
    let mangasUpdated = 0;
    let mangasCreated = 0;
    const mangaReportData = {
      created: [],
      updated: [],
      failed: [],
      ignored: [],
      matched: []
    };
    const startTime = Date.now();

    const MANGA_BATCH_SIZE = 5;
    const MANGA_BATCH_DELAY_MS = 100; // AniList a des rate limits, on ralentit un peu

    for (let i = 0; i < mangas.length; i++) {
      const anilistManga = mangas[i];

      try {
        const mangaData = transformMangaData(anilistManga);

        // Vérifier si la série existe et récupérer ses informations
        const existingSerie = db.prepare('SELECT id, source_url FROM manga_series WHERE anilist_id = ? OR (mal_id = ? AND mal_id IS NOT NULL)').get(mangaData.anilist_id, mangaData.mal_id);
        const isUpdate = !!existingSerie;

        // syncMangaSeries attend l'entrée complète
        const mangaSyncResult = await syncMangaSeries(db, currentUser, anilistManga);
        const serieId = mangaSyncResult.id;
        updateMangaUserStatus(db, currentUser, serieId, mangaData);

        // Récupérer les informations complètes de la série après sync pour le rapport
        const serieInfo = db.prepare('SELECT source_url FROM manga_series WHERE id = ?').get(serieId);

        mangasSynced++;
        if (isUpdate) {
          mangasUpdated++;
          mangaReportData.updated.push({
            titre: mangaData.titre,
            serieId: serieId,
            anilist_id: mangaData.anilist_id,
            mal_id: mangaData.mal_id,
            source_url: serieInfo?.source_url || null,
            changes: mangaSyncResult.changes || []
          });
        } else {
          mangasCreated++;
          mangaReportData.created.push({
            titre: mangaData.titre,
            serieId: serieId,
            anilist_id: mangaData.anilist_id,
            mal_id: mangaData.mal_id,
            source_url: serieInfo?.source_url || null
          });
        }
      } catch (error) {
        console.error(`❌ Erreur sync manga ${anilistManga.media?.id}:`, error.message);
        mangaReportData.failed.push({
          titre: anilistManga.media?.title?.english || anilistManga.media?.title?.romaji || 'Sans titre',
          error: error.message || String(error),
          anilist_id: anilistManga.media?.id
        });
      }

      const shouldEmitBatch = ((i + 1) % MANGA_BATCH_SIZE === 0) || i === mangas.length - 1;

      // Notifier la progression avec les statistiques par lot
      if (onProgress && shouldEmitBatch) {
        const elapsedMs = Date.now() - startTime;
        const processedCount = i + 1;
        const remainingCount = mangas.length - processedCount;
        const speed = processedCount / (elapsedMs / 60000); // items par minute
        const etaMs = isFinite(speed) && speed > 0 ? (remainingCount / speed) * 60000 : null;

        onProgress({
          type: 'manga',
          current: processedCount,
          total: mangas.length,
          item: anilistManga.media?.title?.english || anilistManga.media?.title?.romaji || 'Sans titre',
          imported: mangasCreated,
          updated: mangasUpdated,
          elapsedMs: elapsedMs,
          etaMs: etaMs,
          speed: isFinite(speed) ? speed : null
        });
      }

      if (shouldEmitBatch && (i + 1) % MANGA_BATCH_SIZE === 0) {
        await new Promise(resolve => setTimeout(resolve, MANGA_BATCH_DELAY_MS));
      }
    }

    // Synchroniser les animes
    let animesSynced = 0;
    let animesUpdated = 0;
    let animesCreated = 0;
    const animeReportData = {
      created: [],
      updated: [],
      failed: [],
      ignored: [],
      matched: []
    };
    const animeStartTime = Date.now();

    const ANIME_BATCH_SIZE = 5;
    const ANIME_BATCH_DELAY_MS = 100;

    for (let i = 0; i < animes.length; i++) {
      const anilistAnime = animes[i];

      try {
        const animeData = transformAnimeData(anilistAnime);

        // Vérifier si l'anime existe et récupérer ses informations
        const existingAnime = db.prepare('SELECT id FROM anime_series WHERE anilist_id = ? OR (mal_id = ? AND mal_id IS NOT NULL)').get(animeData.anilist_id, animeData.mal_id);
        const isUpdate = !!existingAnime;

        // syncAnimeSeries attend l'entrée complète
        const animeSyncResult = await syncAnimeSeries(db, currentUser, anilistAnime);
        const animeId = animeSyncResult.id;
        updateAnimeUserStatus(db, currentUser, animeId, animeData);

        animesSynced++;
        if (isUpdate) {
          animesUpdated++;
          animeReportData.updated.push({
            titre: animeData.titre,
            animeId: animeId,
            anilist_id: animeData.anilist_id,
            mal_id: animeData.mal_id,
            changes: animeSyncResult.changes || []
          });
        } else {
          animesCreated++;
          animeReportData.created.push({
            titre: animeData.titre,
            animeId: animeId,
            anilist_id: animeData.anilist_id,
            mal_id: animeData.mal_id
          });
        }
      } catch (error) {
        console.error(`❌ Erreur sync anime ${anilistAnime.media?.id}:`, error.message);
        animeReportData.failed.push({
          titre: anilistAnime.media?.title?.english || anilistAnime.media?.title?.romaji || 'Sans titre',
          error: error.message || String(error),
          anilist_id: anilistAnime.media?.id
        });
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
          item: anilistAnime.media?.title?.english || anilistAnime.media?.title?.romaji || 'Sans titre',
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
    store.set('anilist_last_sync', {
      timestamp: new Date().toISOString(),
      user: currentUser,
      mangas: mangasSynced,
      animes: animesSynced
    });
    store.set('anilist_last_status_sync', {
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

    console.log('✅ Synchronisation AniList terminée');
    console.log(`   📚 Mangas: ${mangasCreated} créé(s), ${mangasUpdated} mis à jour, ${mangasSynced} total`);
    console.log(`   🎬 Animes: ${animesCreated} créé(s), ${animesUpdated} mis à jour, ${animesSynced} total`);

    // Démarrer l'enrichissement des mangas et animes en arrière-plan (séquentiellement, non-bloquant)
    if (getDb) {
      // Enrichissement des mangas
      const { processEnrichmentQueue: processMangaEnrichmentQueue } = require('../mangas/manga-enrichment-queue');
      const mangaEnrichmentConfig = store.get('mangaEnrichmentConfig', {});
      if (mangaEnrichmentConfig.enabled) {
        console.log('🚀 Démarrage de l\'enrichissement des mangas en arrière-plan...');
        processMangaEnrichmentQueue(
          getDb,
          currentUser,
          null,
          getPathManager,
          getMainWindow
        ).then((stats) => {
          console.log(`✅ Enrichissement manga terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);

          // Enrichissement des animes (après les mangas)
          const { processEnrichmentQueue: processAnimeEnrichmentQueue } = require('../animes/anime-enrichment-queue');
          const animeEnrichmentConfig = store.get('animeEnrichmentConfig', {});
          if (animeEnrichmentConfig.enabled) {
            console.log('🚀 Démarrage de l\'enrichissement des animes en arrière-plan...');
            return processAnimeEnrichmentQueue(
              getDb,
              currentUser,
              null,
              getMainWindow,
              getPathManager
            );
          }
        }).then((stats) => {
          if (stats) {
            console.log(`✅ Enrichissement anime terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);
          }
        }).catch((error) => {
          console.error('❌ Erreur enrichissement:', error);
        });
      } else {
        // Si l'enrichissement manga est désactivé, lancer directement l'enrichissement anime
        const { processEnrichmentQueue: processAnimeEnrichmentQueue } = require('../animes/anime-enrichment-queue');
        const animeEnrichmentConfig = store.get('animeEnrichmentConfig', {});
        if (animeEnrichmentConfig.enabled) {
          console.log('🚀 Démarrage de l\'enrichissement des animes en arrière-plan...');
          processAnimeEnrichmentQueue(
            getDb,
            currentUser,
            null,
            getMainWindow,
            getPathManager
          ).then((stats) => {
            console.log(`✅ Enrichissement anime terminé: ${stats.enriched} enrichis, ${stats.errors} erreurs`);
          }).catch((error) => {
            console.error('❌ Erreur enrichissement anime:', error);
          });
        }
      }
    }

    const durationMs = Date.now() - syncStart;
    sessionLogger.record('anilistSync', 'success', {
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

    // Générer le rapport d'état unifié
    if (getPathManager) {
      generateReport(getPathManager, {
        type: 'anilist-sync',
        stats: {
          total: mangas.length + animes.length,
          created: mangasCreated + animesCreated,
          updated: mangasUpdated + animesUpdated,
          errors: mangaReportData.failed.length + animeReportData.failed.length,
          matched: mangasSynced + animesSynced,
          ignored: (mangaReportData.ignored || []).length + (animeReportData.ignored || []).length
        },
        created: [...mangaReportData.created, ...animeReportData.created],
        updated: [...mangaReportData.updated, ...animeReportData.updated],
        failed: [...mangaReportData.failed, ...animeReportData.failed],
        ignored: [...(mangaReportData.ignored || []), ...(animeReportData.ignored || [])],
        matched: [...(mangaReportData.matched || []), ...(animeReportData.matched || [])],
        metadata: {
          user: currentUser,
          duration: durationMs,
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
        }
      });
    }

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
    console.error('❌ Erreur synchronisation AniList:', error);
    sessionLogger.record('anilistSync', 'error', {
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
async function performStatusSync(db, store, currentUser, getPathManager = null) {
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
  const reportData = {
    updated: [],
    missing: [],
    failed: [],
    ignored: [],
    matched: []
  };

  try {
    if (!currentUser) {
      throw new Error('Aucun utilisateur actuel sélectionné');
    }

    console.log('🔁 Synchronisation des statuts AniList (progression uniquement)');

    const accessToken = await getValidAccessToken(store);

    const mangas = await getUserMangaList(accessToken);
    const animes = await getUserAnimeList(accessToken);

    const getSerieByAnilistId = db.prepare('SELECT id FROM manga_series WHERE anilist_id = ?');
    const getAnimeByAnilistId = db.prepare('SELECT id FROM anime_series WHERE anilist_id = ?');

    let processedMangas = 0;
    for (const anilistManga of mangas) {
      const media = anilistManga.media || {};
      const existingSerie = getSerieByAnilistId.get(media.id);

      if (!existingSerie) {
        resultSummary.mangas.missing += 1;
        reportData.missing.push({
          titre: media.title?.english || media.title?.romaji || 'Sans titre',
          anilist_id: media.id
        });
        continue;
      }

      try {
        const mangaData = transformMangaData(anilistManga);
        updateMangaUserStatus(db, currentUser, existingSerie.id, mangaData);
        resultSummary.mangas.updated += 1;
        reportData.updated.push({
          titre: media.title?.english || media.title?.romaji || 'Sans titre',
          serieId: existingSerie.id,
          anilist_id: media.id
        });
      } catch (error) {
        console.error(`❌ Erreur mise à jour statut manga ${media.id}:`, error);
        reportData.failed.push({
          titre: media.title?.english || media.title?.romaji || 'Sans titre',
          error: error.message || String(error),
          anilist_id: media.id
        });
      }

      processedMangas += 1;
      if (processedMangas % 25 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    let processedAnimes = 0;
    for (const anilistAnime of animes) {
      const media = anilistAnime.media || {};
      const existingAnime = getAnimeByAnilistId.get(media.id);

      if (!existingAnime) {
        resultSummary.animes.missing += 1;
        reportData.missing.push({
          titre: media.title?.english || media.title?.romaji || 'Sans titre',
          anilist_id: media.id
        });
        continue;
      }

      try {
        const animeData = transformAnimeData(anilistAnime);
        updateAnimeUserStatus(db, currentUser, existingAnime.id, animeData);
        resultSummary.animes.updated += 1;
        reportData.updated.push({
          titre: media.title?.english || media.title?.romaji || 'Sans titre',
          animeId: existingAnime.id,
          anilist_id: media.id
        });
      } catch (error) {
        console.error(`❌ Erreur mise à jour statut anime ${media.id}:`, error);
        reportData.failed.push({
          titre: media.title?.english || media.title?.romaji || 'Sans titre',
          error: error.message || String(error),
          anilist_id: media.id
        });
      }

      processedAnimes += 1;
      if (processedAnimes % 25 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    const durationMs = Date.now() - syncStart;

    store.set('anilist_last_status_sync', {
      timestamp: new Date().toISOString(),
      user: currentUser,
      mangas: resultSummary.mangas,
      animes: resultSummary.animes,
      durationMs
    });

    sessionLogger.record('anilistStatusSync', 'success', {
      durationMs,
      ...resultSummary
    });

    console.log(`✅ Statuts AniList synchronisés (mangas: ${resultSummary.mangas.updated}, animes: ${resultSummary.animes.updated})`);

    // Générer le rapport d'état
    if (getPathManager) {
      generateReport(getPathManager, {
        type: 'anilist-status-sync',
        stats: {
          total: mangas.length + animes.length,
          updated: resultSummary.mangas.updated + resultSummary.animes.updated,
          missing: resultSummary.mangas.missing + resultSummary.animes.missing,
          errors: reportData.failed.length,
          ignored: (reportData.ignored || []).length,
          matched: (reportData.matched || []).length
        },
        updated: reportData.updated,
        failed: reportData.failed,
        ignored: reportData.ignored || [],
        matched: reportData.matched || [],
        metadata: {
          user: currentUser,
          duration: durationMs,
          missing: reportData.missing
        }
      });
    }

    return {
      success: true,
      ...resultSummary,
      durationMs
    };
  } catch (error) {
    sessionLogger.record('anilistStatusSync', 'error', {
      message: error?.message || 'Erreur inconnue'
    });
    console.error('❌ Erreur synchronisation statuts AniList:', error);
    throw error;
  }
}

// Ré-exporter les fonctions nécessaires pour compatibilité
module.exports = {
  performFullSync,
  performStatusSync,
  getValidAccessToken
};
