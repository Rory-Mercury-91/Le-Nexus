/**
 * Scheduler pour la synchronisation automatique avec Nautiljon
 * Exécute des synchronisations périodiques en arrière-plan pour mettre à jour les séries
 */

const cron = require('node-cron');
const { scrapeNautiljonPage } = require('../mangas/nautiljon-scraper');
const { handleNautiljonImport } = require('../mangas/manga-import-service');
const { generateReport } = require('../../utils/report-generator');

const MIN_STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes

let cronJob = null;
let isRunning = false;

async function performNautiljonSync(db, store, mainWindow, getPathManager) {
  const syncStart = Date.now();
  const currentUser = store.get('currentUser', '');
  if (!currentUser) {
    console.log('⏭️  Aucun utilisateur actuel, synchronisation Nautiljon annulée');
    return null;
  }

  if (!db) {
    console.warn('⚠️ Base de données indisponible, synchronisation Nautiljon annulée');
    return null;
  }

  const manga_seriesWithNautiljon = db
    .prepare(
      `
        SELECT id, titre, relations 
        FROM manga_series 
        WHERE relations IS NOT NULL AND relations != ''
      `
    )
    .all();

  const manga_seriesToSync = [];
  for (const serie of manga_seriesWithNautiljon) {
    try {
      if (!serie.relations) continue;
      const relations = JSON.parse(serie.relations);
      if (relations.nautiljon && relations.nautiljon.url) {
        manga_seriesToSync.push({
          id: serie.id,
          titre: serie.titre,
          url: relations.nautiljon.url,
        });
      }
    } catch (_error) {
      // Ignorer erreurs de parsing pour ne pas bloquer la synchronisation
    }
  }

  console.log(`📚 ${manga_seriesToSync.length} série(s) avec URL Nautiljon trouvée(s)`);

  if (manga_seriesToSync.length === 0) {
    console.log('⏭️  Aucune série à synchroniser');
    return {
      synced: 0,
      errors: 0,
      total: 0,
      timestamp: new Date().toISOString(),
    };
  }

  let synced = 0;
  let errors = 0;
  const includeTomes = store.get('nautiljon_auto_sync_include_tomes', false);
  const reportData = {
    updated: [],
    failed: []
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('nautiljon-sync-started', {
      total: manga_seriesToSync.length,
    });
  }

  for (let i = 0; i < manga_seriesToSync.length; i++) {
    const serie = manga_seriesToSync[i];
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('nautiljon-sync-progress', {
          current: i + 1,
          total: manga_seriesToSync.length,
          currentSerie: serie.titre,
        });
      }

      const mangaData = await scrapeNautiljonPage(serie.url, includeTomes);
      const result = await handleNautiljonImport(db, mangaData, getPathManager, store, includeTomes);
      synced++;
      reportData.updated.push({
        titre: serie.titre,
        serieId: serie.id,
        url: serie.url
      });
      console.log(`✅ "${serie.titre}" synchronisé (${i + 1}/${manga_seriesToSync.length})`);

      if (i < manga_seriesToSync.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      errors++;
      reportData.failed.push({
        titre: serie.titre,
        error: error.message || String(error),
        serieId: serie.id,
        url: serie.url
      });
      console.error(`❌ Erreur synchronisation "${serie.titre}":`, error.message);
    }
  }

  const durationMs = Date.now() - syncStart;
  const result = {
    synced,
    errors,
    total: manga_seriesToSync.length,
    timestamp: new Date().toISOString(),
  };

  store.set('nautiljon_last_sync', result);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('nautiljon-sync-completed', result);
  }

  console.log(`✅ Synchronisation Nautiljon terminée: ${synced} série(s) synchronisée(s), ${errors} erreur(s)`);

  // Générer le rapport d'état
  if (getPathManager) {
    generateReport(getPathManager, {
      type: 'nautiljon-sync',
      stats: {
        total: manga_seriesToSync.length,
        updated: synced,
        errors: errors,
        ignored: ignored,
        matched: synced
      },
      created: reportData.created,
      updated: reportData.updated,
      failed: reportData.failed,
      ignored: reportData.ignored,
      matched: reportData.matched,
      metadata: {
        user: currentUser,
        duration: durationMs,
        includeTomes: includeTomes
      }
    });
  }

  return result;
}

function startScheduler(db, store, mainWindow, getPathManager) {
  stopScheduler();

  const enabled = store.get('nautiljon_auto_sync_enabled', false);
  const intervalHours = store.get('nautiljon_auto_sync_interval', 24);

  if (!enabled) {
    console.log('⏸️  Scheduler Nautiljon désactivé');
    return;
  }

  const cronExpression = `0 */${intervalHours} * * *`;
  console.log(`⏰ Démarrage du scheduler Nautiljon (toutes les ${intervalHours}h)`);

  cronJob = cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('⏭️  Synchronisation Nautiljon déjà en cours, skip...');
      return;
    }

    try {
      isRunning = true;
      console.log('🔄 Synchronisation automatique Nautiljon démarrée...');
      await performNautiljonSync(db, store, mainWindow, getPathManager);
    } catch (error) {
      console.error('❌ Erreur synchronisation automatique Nautiljon:', error);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('nautiljon-sync-error', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      isRunning = false;
    }
  });

  cronJob.start();
  console.log(`✅ Scheduler Nautiljon démarré (expression cron: ${cronExpression})`);
}

function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob.destroy();
    cronJob = null;
    console.log('⏹️  Scheduler Nautiljon arrêté');
  }
}

function restartScheduler(db, store, mainWindow, getPathManager) {
  console.log('🔄 Redémarrage du scheduler Nautiljon...');
  stopScheduler();
  startScheduler(db, store, mainWindow, getPathManager);
}

async function syncOnStartup(db, store, mainWindow, getPathManager) {
  try {
    const enabled = store.get('nautiljon_auto_sync_enabled', false);
    const intervalHours = store.get('nautiljon_auto_sync_interval', 24);

    if (!enabled) {
      return;
    }

    const lastSync = store.get('nautiljon_last_sync', null);
    if (lastSync?.timestamp) {
      const lastTime = new Date(lastSync.timestamp).getTime();
      const now = Date.now();
      const intervalMs = intervalHours * 60 * 60 * 1000;
      if (now - lastTime < intervalMs) {
        console.log('⏭️  Dernière sync Nautiljon récente, démarrage ignoré');
        return;
      }
    }

    let startupDelayMs = store.get('nautiljon_auto_sync_startup_delay_ms', MIN_STARTUP_DELAY_MS);
    if (typeof startupDelayMs !== 'number' || startupDelayMs < MIN_STARTUP_DELAY_MS) {
      startupDelayMs = MIN_STARTUP_DELAY_MS;
      store.set('nautiljon_auto_sync_startup_delay_ms', startupDelayMs);
    }

    if (startupDelayMs > 0) {
      console.log(`⏳ Attente de ${(startupDelayMs / 60000).toFixed(1)} minute(s) avant la synchronisation Nautiljon au démarrage.`);
      await new Promise(resolve => setTimeout(resolve, startupDelayMs));
    }

    // Vérifier de nouveau après l'attente
    if (!store.get('nautiljon_auto_sync_enabled', false)) {
      console.log('⏭️  Synchronisation Nautiljon annulée: désactivée pendant l\'attente de démarrage.');
      return;
    }

    if (isRunning) {
      console.log('⏭️  Synchronisation Nautiljon déjà en cours, démarrage ignoré');
      return;
    }

    isRunning = true;
    console.log('🚀 Synchronisation Nautiljon au démarrage...');
    await performNautiljonSync(db, store, mainWindow, getPathManager);
  } catch (error) {
    console.error('❌ Erreur synchronisation Nautiljon au démarrage:', error);
  } finally {
    isRunning = false;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  restartScheduler,
  syncOnStartup,
};
