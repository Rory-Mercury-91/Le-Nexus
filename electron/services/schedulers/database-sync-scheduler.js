const cron = require('node-cron');

let syncInterval = null;

/**
 * Démarre la synchronisation périodique des bases de données
 * Fusionne toutes les bases utilisateur dans la base de l'utilisateur connecté
 * @param {Function} getDb - Fonction pour récupérer la base de données
 * @param {Store} store - Instance d'electron-store
 */
function startDatabaseSyncScheduler(getDb, store) {
  // Vérifier si la synchronisation est activée
  const syncEnabled = store.get('databaseSyncEnabled', true);
  
  if (!syncEnabled) {
    console.log('⏸️  Synchronisation périodique des bases désactivée');
    return;
  }

  // Fusion toutes les 5 minutes
  syncInterval = cron.schedule('*/5 * * * *', () => {
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      return; // Pas d'utilisateur connecté
    }

    try {
      // Utiliser la fonction globale exposée par database-handlers
      if (global.performDatabaseMerge) {
        console.log('🔄 Synchronisation périodique des bases de données...');
        const result = global.performDatabaseMerge();
        if (result.merged && (result.seriesCount > 0 || result.tomesCount > 0 || result.animesCount > 0 || result.gamesCount > 0)) {
          console.log(`✅ Synchronisation: ${result.seriesCount} séries, ${result.tomesCount} tomes, ${result.animesCount} animes, ${result.gamesCount} jeux`);
        }
      } else {
        console.warn('⚠️ Fonction de fusion non disponible');
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation périodique:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Paris"
  });

  console.log('✅ Scheduler de synchronisation des bases démarré (toutes les 5 minutes)');
}

/**
 * Arrête la synchronisation périodique
 */
function stopDatabaseSyncScheduler() {
  if (syncInterval) {
    syncInterval.stop();
    syncInterval = null;
    console.log('⏸️  Synchronisation périodique des bases arrêtée');
  }
}

module.exports = {
  startDatabaseSyncScheduler,
  stopDatabaseSyncScheduler
};
