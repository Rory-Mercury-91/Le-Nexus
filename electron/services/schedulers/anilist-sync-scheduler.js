/**
 * Scheduler pour la synchronisation automatique avec AniList
 * Exécute des synchronisations périodiques en arrière-plan
 */

const cron = require('node-cron');
const { performFullSync } = require('../anilist/anilist-sync');

const MIN_STARTUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes

let cronJob = null;
let isRunning = false;

/**
 * Démarre le scheduler de synchronisation automatique
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {BrowserWindow} mainWindow - Fenêtre principale (pour notifications)
 * @param {Function} getDb - Fonction pour obtenir une connexion à la base de données (optionnel)
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel)
 */
function startScheduler(db, store, mainWindow, getDb = null, getPathManager = null, getMainWindow = null) {
  // Arrêter le job existant s'il y en a un
  stopScheduler();

  const enabled = store.get('anilist_auto_sync_enabled', false);
  const intervalHours = store.get('anilist_auto_sync_interval', 6);

  if (!enabled) {
    console.log('⏸️  Scheduler AniList désactivé');
    return;
  }

  // Convertir l'intervalle en expression cron
  // Toutes les X heures
  const cronExpression = `0 */${intervalHours} * * *`;

  console.log(`⏰ Démarrage du scheduler AniList (toutes les ${intervalHours}h)`);

  cronJob = cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('⏭️  Synchronisation AniList déjà en cours, skip...');
      return;
    }

    const connected = store.get('anilist_connected', false);
    if (!connected) {
      console.log('⏭️  Non connecté à AniList, skip synchronisation automatique');
      return;
    }

    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      console.log('⏭️  Aucun utilisateur actuel, skip synchronisation automatique');
      return;
    }

    try {
      isRunning = true;
      console.log('🔄 Synchronisation automatique AniList démarrée...');

      const result = await performFullSync(db, store, currentUser, null, getDb, getPathManager, getMainWindow || (() => mainWindow));

      // Notifier la fenêtre principale si elle existe
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('anilist-sync-completed', result);
      }

      console.log('✅ Synchronisation automatique AniList terminée');

    } catch (error) {
      console.error('❌ Erreur synchronisation automatique AniList:', error);

      // Notifier l'erreur
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('anilist-sync-error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      isRunning = false;
    }
  });

  // Démarrer le job
  cronJob.start();
  console.log(`✅ Scheduler AniList démarré (expression cron: ${cronExpression})`);
}

/**
 * Arrête le scheduler
 */
function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob.destroy();
    cronJob = null;
    console.log('⏹️  Scheduler AniList arrêté');
  }
}

/**
 * Redémarre le scheduler (pour appliquer de nouveaux paramètres)
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {BrowserWindow} mainWindow - Fenêtre principale
 * @param {Function} getDb - Fonction pour obtenir une connexion à la base de données (optionnel)
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel)
 */
function restartScheduler(db, store, mainWindow, getDb = null, getPathManager = null, getMainWindow = null) {
  console.log('🔄 Redémarrage du scheduler AniList...');
  stopScheduler();
  startScheduler(db, store, mainWindow, getDb, getPathManager, getMainWindow);
}

/**
 * Effectue une synchronisation au démarrage si activé
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getDb - Fonction pour obtenir une connexion à la base de données (optionnel)
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel)
 */
function isDatabaseOpen(candidate) {
  if (!candidate) {
    return false;
  }

  try {
    // better-sqlite3 expose la propriété .open, mais on vérifie aussi via pragma
    if (candidate.open === false) {
      return false;
    }
    candidate.pragma('user_version'); // détection simple d'une connexion valide
    return true;
  } catch {
    return false;
  }
}

async function waitForDatabase(initialDb, getDb, timeoutMs = 10000, pollIntervalMs = 200) {
  const start = Date.now();
  let candidate = initialDb;

  while (Date.now() - start <= timeoutMs) {
    if (isDatabaseOpen(candidate)) {
      return candidate;
    }

    if (typeof getDb === 'function') {
      candidate = getDb();
      if (isDatabaseOpen(candidate)) {
        return candidate;
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}

async function syncOnStartup(db, store, getDb = null, getPathManager = null, getMainWindow = null) {
  const enabled = store.get('anilist_auto_sync_enabled', false);
  const connected = store.get('anilist_connected', false);
  const currentUser = store.get('currentUser', '');

  if (!enabled || !connected || !currentUser) {
    return;
  }

  // Vérifier quand a eu lieu la dernière sync
  const lastSync = store.get('anilist_last_sync', null);
  const intervalHours = store.get('anilist_auto_sync_interval', 6);

  if (lastSync && lastSync.timestamp) {
    const lastSyncTime = new Date(lastSync.timestamp).getTime();
    const now = Date.now();
    const hoursSinceLastSync = (now - lastSyncTime) / (1000 * 60 * 60);

    if (hoursSinceLastSync < intervalHours) {
      console.log(`⏭️  Dernière sync il y a ${hoursSinceLastSync.toFixed(1)}h, pas besoin de sync au démarrage`);
      return;
    }
  }

  console.log('🚀 Synchronisation AniList au démarrage...');

  try {
    let startupDelayMs = store.get('anilist_auto_sync_startup_delay_ms', MIN_STARTUP_DELAY_MS);
    if (typeof startupDelayMs !== 'number' || startupDelayMs < MIN_STARTUP_DELAY_MS) {
      startupDelayMs = MIN_STARTUP_DELAY_MS;
      store.set('anilist_auto_sync_startup_delay_ms', startupDelayMs);
    }

    if (startupDelayMs > 0) {
      console.log(`⏳ Attente de ${(startupDelayMs / 60000).toFixed(1)} minute(s) avant la synchronisation au démarrage.`);
      await new Promise(resolve => setTimeout(resolve, startupDelayMs));
    }

    const readyDb = await waitForDatabase(db, getDb, store.get('anilist_auto_sync_startup_timeout_ms', 15000));

    if (!readyDb) {
      console.warn('⚠️ Base de données indisponible après l\'attente configurée, synchronisation au démarrage annulée.');
      return;
    }

    await performFullSync(readyDb, store, currentUser, null, getDb, getPathManager, getMainWindow);
  } catch (error) {
    console.error('❌ Erreur sync AniList au démarrage:', error);
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  restartScheduler,
  syncOnStartup
};
