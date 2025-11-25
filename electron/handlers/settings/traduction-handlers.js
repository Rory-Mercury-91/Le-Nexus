const traductionSync = require('../../services/adulte-game/traduction-sync');

/**
 * Enregistre les handlers IPC pour la synchronisation des traductions jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerTraductionHandlers(ipcMain, getDb, store, getPathManager) {
  
  // Récupérer la configuration des traducteurs
  ipcMain.handle('get-traduction-config', () => {
    const config = store.get('traductionConfig', {
      enabled: true,
      traducteurs: [],
      sheetUrl: '',
      syncFrequency: '6h',
      lastSync: null,
      gamesCount: 0,
      discordWebhookUrl: '',
      discordMentions: {},
      discordNotifyGameUpdates: true,
      discordNotifyTranslationUpdates: true
    });
    return {
      ...config,
      discordWebhookUrl: (config.discordWebhookUrl || '').trim(),
      discordMentions: config.discordMentions || {},
      discordNotifyGameUpdates: config.discordNotifyGameUpdates !== false,
      discordNotifyTranslationUpdates: config.discordNotifyTranslationUpdates !== false
    };
  });
  
  // Récupérer la liste des traducteurs depuis le Google Sheet
  ipcMain.handle('fetch-traducteurs', async () => {
    try {
      console.log('📥 Récupération liste des traducteurs...');
      const traducteurs = await traductionSync.fetchTraducteurs();
      console.log(`✅ ${traducteurs.length} traducteurs récupérés`);
      return { success: true, traducteurs };
    } catch (error) {
      console.error('❌ Erreur fetch-traducteurs:', error);
      console.error('Stack:', error.stack);
      return { success: false, error: error.message || 'Impossible de récupérer la liste des traducteurs. Vérifiez votre connexion internet.', traducteurs: [] };
    }
  });
  
  // Sauvegarder la configuration des traducteurs
  ipcMain.handle('save-traduction-config', async (event, config) => {
    try {
      const sanitizedConfig = {
        ...config,
        discordWebhookUrl: (config.discordWebhookUrl || '').trim(),
        discordMentions: Object.fromEntries(
          Object.entries(config.discordMentions || {}).map(([key, value]) => {
            const normalizedKey = key.trim();
            const normalizedValue = String(value || '').replace(/[^0-9]/g, '').trim();
            return [normalizedKey, normalizedValue];
          }).filter(([key, value]) => key.length > 0 && value.length > 0)
        ),
        discordNotifyGameUpdates: config.discordNotifyGameUpdates !== false,
        discordNotifyTranslationUpdates: config.discordNotifyTranslationUpdates !== false
      };

      store.set('traductionConfig', sanitizedConfig);
      
      const db = getDb();
      if (db && sanitizedConfig.enabled) {
        traductionSync.initScheduler(sanitizedConfig, getDb, store, getPathManager);
      } else if (!sanitizedConfig.enabled) {
        traductionSync.stopScheduler();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur sauvegarde config traductions:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Synchroniser les traductions maintenant (uniquement traducteurs suivis)
  ipcMain.handle('sync-traductions-now', async () => {
    try {
      console.log('🔄 Démarrage synchronisation traductions (traducteurs suivis)...');
      const db = getDb();
      if (!db) {
        console.error('❌ Base de données non initialisée');
        return { success: false, error: 'Base de données non initialisée' };
      }
      
      const config = store.get('traductionConfig', {
        traducteurs: [],
        discordWebhookUrl: '',
        discordMentions: {},
        discordNotifyGameUpdates: true,
        discordNotifyTranslationUpdates: true
      });
      console.log('📋 Configuration récupérée:', { 
        traducteursCount: config.traducteurs?.length || 0,
        traducteurs: config.traducteurs 
      });
      
      if (!config.traducteurs || config.traducteurs.length === 0) {
        console.error('❌ Aucun traducteur configuré');
        return { success: false, error: 'Aucun traducteur configuré. Veuillez sélectionner au moins un traducteur dans les paramètres.' };
      }
      
      console.log(`✅ ${config.traducteurs.length} traducteur(s) configuré(s), lancement de la sync...`);
      const result = await traductionSync.syncTraductions(
        db,
        config.traducteurs,
        {
          discordWebhookUrl: (config.discordWebhookUrl || '').trim(),
          discordMentions: config.discordMentions || {},
          notifyGameUpdates: config.discordNotifyGameUpdates !== false,
          notifyTranslationUpdates: config.discordNotifyTranslationUpdates !== false,
          getPathManager
        }
      );
      
      console.log('📊 Résultat sync:', result);
      
      if (result.success) {
        config.lastSync = new Date().toISOString();
        config.gamesCount = result.matched || 0;
        store.set('traductionConfig', config);
        console.log('✅ Sync terminée avec succès');
      } else {
        console.error('❌ Sync échouée:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur sync traductions (catch):', error);
      console.error('Stack:', error.stack);
      return { success: false, error: error.message || 'Erreur inconnue lors de la synchronisation' };
    }
  });
  
  // Mettre à jour manuellement une traduction
  ipcMain.handle('update-traduction-manually', async (event, gameId, tradData) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      
      return traductionSync.updateTraductionManually(db, gameId, tradData);
    } catch (error) {
      console.error('Erreur update traduction manuelle:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Réinitialiser une traduction
  ipcMain.handle('clear-traduction', async (event, gameId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      
      return traductionSync.clearTraduction(db, gameId);
    } catch (error) {
      console.error('Erreur clear traduction:', error);
      return { success: false, error: error.message };
    }
  });

  // Initialiser le scheduler de traductions au démarrage
  const initTraductionScheduler = () => {
    const config = store.get('traductionConfig', { enabled: false });
    if (config && config.enabled) {
      const db = getDb();
      if (db) {
        traductionSync.initScheduler(config, getDb, store);
      }
    }
  };
  
  setTimeout(initTraductionScheduler, 4000);
}

module.exports = { registerTraductionHandlers };
