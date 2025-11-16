const notificationScheduler = require('../../services/schedulers/notification-scheduler');

/**
 * Enregistre les handlers IPC pour les notifications
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerNotificationHandlers(ipcMain, getDb, store, getMainWindow, getPathManager) {
  
  // Récupérer la configuration des notifications
  ipcMain.handle('get-notification-config', () => {
    const defaults = {
      enabled: false,
      checkAnimes: true,
      checkAdulteGame: true,
      notifyNautiljonSync: true,
      notifyMalSync: true,
      notifyEnrichment: true,
      notifyBackup: true,
      frequency: '12h',
      soundEnabled: true,
      checkOnStartup: false
    };
    const saved = store.get('notificationConfig', {});
    return {
      ...defaults,
      ...saved
    };
  });
  
  // Sauvegarder la configuration des notifications
  ipcMain.handle('save-notification-config', async (event, config) => {
    try {
      const mergedConfig = {
        ...store.get('notificationConfig', {}),
        ...config
      };
      store.set('notificationConfig', mergedConfig);
      
      const db = getDb();
      if (db) {
        notificationScheduler.init(mergedConfig, db, store, {
          getDb,
          getMainWindow,
          getPathManager
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur sauvegarde config notifications:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Vérifier manuellement les mises à jour
  ipcMain.handle('check-notifications-now', async () => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      
      const result = await notificationScheduler.checkForUpdates();
      return result;
    } catch (error) {
      console.error('Erreur vérification manuelle notifications:', error);
      return { success: false, error: error.message };
    }
  });

  // Initialiser le scheduler de notifications au démarrage
  const initNotificationScheduler = () => {
    const config = store.get('notificationConfig', { enabled: false });
    if (config && config.enabled) {
      const db = getDb();
      if (db) {
        notificationScheduler.init(config, db, store, {
          getDb,
          getMainWindow,
          getPathManager
        });
      }
    }
  };
  
  setTimeout(initNotificationScheduler, 3000);
}

module.exports = { registerNotificationHandlers };
