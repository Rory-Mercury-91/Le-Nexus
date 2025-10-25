/**
 * Scheduler pour la synchronisation automatique avec MyAnimeList
 * Exécute des synchronisations périodiques en arrière-plan
 */

const cron = require('node-cron');
const { performFullSync } = require('./mal-sync');

let cronJob = null;
let isRunning = false;

/**
 * Démarre le scheduler de synchronisation automatique
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {BrowserWindow} mainWindow - Fenêtre principale (pour notifications)
 */
function startScheduler(db, store, mainWindow) {
  // Arrêter le job existant s'il y en a un
  stopScheduler();
  
  const enabled = store.get('mal_auto_sync_enabled', false);
  const intervalHours = store.get('mal_auto_sync_interval', 6);
  
  if (!enabled) {
    console.log('⏸️  Scheduler MAL désactivé');
    return;
  }
  
  // Convertir l'intervalle en expression cron
  // Toutes les X heures
  const cronExpression = `0 */${intervalHours} * * *`;
  
  console.log(`⏰ Démarrage du scheduler MAL (toutes les ${intervalHours}h)`);
  
  cronJob = cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('⏭️  Synchronisation MAL déjà en cours, skip...');
      return;
    }
    
    const connected = store.get('mal_connected', false);
    if (!connected) {
      console.log('⏭️  Non connecté à MAL, skip synchronisation automatique');
      return;
    }
    
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      console.log('⏭️  Aucun utilisateur actuel, skip synchronisation automatique');
      return;
    }
    
    try {
      isRunning = true;
      console.log('🔄 Synchronisation automatique MAL démarrée...');
      
      const result = await performFullSync(db, store, currentUser);
      
      // Notifier la fenêtre principale si elle existe
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mal-sync-completed', result);
      }
      
      console.log('✅ Synchronisation automatique MAL terminée');
      
    } catch (error) {
      console.error('❌ Erreur synchronisation automatique MAL:', error);
      
      // Notifier l'erreur
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mal-sync-error', {
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
  console.log(`✅ Scheduler MAL démarré (expression cron: ${cronExpression})`);
}

/**
 * Arrête le scheduler
 */
function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob.destroy();
    cronJob = null;
    console.log('⏹️  Scheduler MAL arrêté');
  }
}

/**
 * Redémarre le scheduler (pour appliquer de nouveaux paramètres)
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {BrowserWindow} mainWindow - Fenêtre principale
 */
function restartScheduler(db, store, mainWindow) {
  console.log('🔄 Redémarrage du scheduler MAL...');
  stopScheduler();
  startScheduler(db, store, mainWindow);
}

/**
 * Effectue une synchronisation au démarrage si activé
 * @param {Object} db - Instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
async function syncOnStartup(db, store) {
  const enabled = store.get('mal_auto_sync_enabled', false);
  const connected = store.get('mal_connected', false);
  const currentUser = store.get('currentUser', '');
  
  if (!enabled || !connected || !currentUser) {
    return;
  }
  
  // Vérifier quand a eu lieu la dernière sync
  const lastSync = store.get('mal_last_sync', null);
  const intervalHours = store.get('mal_auto_sync_interval', 6);
  
  if (lastSync && lastSync.timestamp) {
    const lastSyncTime = new Date(lastSync.timestamp).getTime();
    const now = Date.now();
    const hoursSinceLastSync = (now - lastSyncTime) / (1000 * 60 * 60);
    
    if (hoursSinceLastSync < intervalHours) {
      console.log(`⏭️  Dernière sync il y a ${hoursSinceLastSync.toFixed(1)}h, pas besoin de sync au démarrage`);
      return;
    }
  }
  
  console.log('🚀 Synchronisation MAL au démarrage...');
  
  try {
    await performFullSync(db, store, currentUser);
  } catch (error) {
    console.error('❌ Erreur sync MAL au démarrage:', error);
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  restartScheduler,
  syncOnStartup
};

