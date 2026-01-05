/**
 * Handlers IPC pour la synchronisation MyAnimeList
 */

const { startOAuthFlow, getUserInfo } = require('../../apis/myanimelist-oauth');
const { performFullSync, performStatusSync, translateSynopsisInBackground } = require('../../services/mal/mal-sync');
const notificationScheduler = require('../../services/schedulers/notification-scheduler');

function resetMalConnection(store) {
  store.delete('mal_access_token');
  store.delete('mal_refresh_token');
  store.delete('mal_token_expires_at');
  store.delete('mal_user_info');
  store.delete('mal_connected');
  store.delete('mal_connected_at');
  store.delete('mal_last_sync');
}

/**
 * Enregistre tous les handlers IPC pour MAL sync
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel)
 */
const { MAL_CONFIG } = require('../../config/constants');

function registerMalSyncHandlers(ipcMain, getDb, store, getMainWindow = null, getPathManager = null) {
  ipcMain.handle('mal-get-credentials', () => {
    return {
      clientId: store.get('mal.clientId', ''),
      redirectUri: store.get('mal.redirectUri', MAL_CONFIG.DEFAULT_REDIRECT_URI)
    };
  });

  ipcMain.handle('mal-set-credentials', (event, { clientId, redirectUri }) => {
    const previousClientId = store.get('mal.clientId', '');
    const previousRedirectUri = store.get('mal.redirectUri', MAL_CONFIG.DEFAULT_REDIRECT_URI);

    const normalizedClientId = clientId !== undefined ? (clientId || '') : previousClientId;
    const normalizedRedirectUri = redirectUri !== undefined ? (redirectUri || MAL_CONFIG.DEFAULT_REDIRECT_URI) : previousRedirectUri;

    const clientIdChanged = normalizedClientId !== previousClientId;
    const redirectChanged = normalizedRedirectUri !== previousRedirectUri;

    if (clientId !== undefined) {
      store.set('mal.clientId', normalizedClientId);
      console.log('[MAL] Client ID mis à jour');
    }
    if (redirectUri !== undefined) {
      store.set('mal.redirectUri', normalizedRedirectUri);
      console.log('[MAL] Redirect URI mise à jour:', normalizedRedirectUri);
    }

    if (clientIdChanged || redirectChanged) {
      console.log('[MAL] Les identifiants ont changé, réinitialisation de la session existante');
      resetMalConnection(store);
    }

    return { success: true };
  });
  
  // Démarrer le flow OAuth pour connecter MAL
  ipcMain.handle('mal-connect', () => {
    return new Promise((resolve, reject) => {
      console.log('🔐 Démarrage OAuth MAL...');
      resetMalConnection(store);
      
      const flow = startOAuthFlow(
        async (tokens) => {
          try {
            // Sauvegarder les tokens
            store.set('mal_access_token', tokens.access_token);
            store.set('mal_refresh_token', tokens.refresh_token);
            store.set('mal_token_expires_at', tokens.expires_at);
            
            // Récupérer les infos utilisateur
            const userInfo = await getUserInfo(tokens.access_token);
            store.set('mal_user_info', userInfo);
            store.set('mal_connected', true);
            store.set('mal_connected_at', new Date().toISOString());
            
            console.log(`✅ Connecté à MAL en tant que: ${userInfo.name}`);
            
            resolve({
              success: true,
              user: userInfo
            });
          } catch (error) {
            console.error('❌ Erreur récupération infos utilisateur MAL:', error);
            reject(error);
          }
        },
        (error) => {
          console.error('❌ Erreur OAuth MAL:', error);
          reject(error);
        }
      );
    });
  });
  
  // Déconnecter MAL (supprimer les tokens)
  ipcMain.handle('mal-disconnect', () => {
    try {
      resetMalConnection(store);
      
      console.log('✅ Déconnecté de MAL');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur déconnexion MAL:', error);
      throw error;
    }
  });
  
  // Récupérer le statut de connexion MAL
  ipcMain.handle('mal-get-status', () => {
    try {
      const connected = store.get('mal_connected', false);
      const userInfo = store.get('mal_user_info', null);
      const connectedAt = store.get('mal_connected_at', null);
      const lastSync = store.get('mal_last_sync', null);
      const lastStatusSync = store.get('mal_last_status_sync', null);
      
      return {
        connected,
        user: userInfo,
        connectedAt,
        lastSync,
        lastStatusSync
      };
    } catch (error) {
      console.error('❌ Erreur récupération statut MAL:', error);
      throw error;
    }
  });
  
  // Déclencher une synchronisation manuelle
  ipcMain.handle('mal-sync-now', async () => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const mainWindow = getMainWindow ? getMainWindow() : null;
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }
      
      const connected = store.get('mal_connected', false);
      if (!connected) {
        throw new Error('Non connecté à MyAnimeList. Veuillez vous connecter d\'abord.');
      }
      
      console.log(`🔄 Synchronisation manuelle MAL pour l'utilisateur: ${currentUser}`);
      
      // Callback pour notifier la progression
      const onProgress = (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('mal-sync-progress', progress);
        }
      };
      
      const result = await performFullSync(db, store, currentUser, onProgress, getDb, getPathManager, getMainWindow);
      
      // Envoyer les résultats finaux au frontend
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mal-sync-completed', result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur synchronisation manuelle MAL:', error);
      
      // Si l'erreur est liée à un token invalide, retourner un message clair
      if (error.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401') || error.message.includes('invalid_request'))) {
        return {
          success: false,
          error: error.message,
          requiresReconnect: true
        };
      }
      
      throw error;
    }
  });

  // Synchronisation des statuts uniquement
  ipcMain.handle('mal-sync-status', async () => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }

      const connected = store.get('mal_connected', false);
      if (!connected) {
        throw new Error('Non connecté à MyAnimeList. Veuillez vous connecter d\'abord.');
      }

      console.log(`🔁 Synchronisation des statuts MAL pour l'utilisateur: ${currentUser}`);
      const result = await performStatusSync(db, store, currentUser, getPathManager);
      return result;
    } catch (error) {
      console.error('❌ Erreur synchronisation statuts MAL:', error);
      if (error.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401') || error.message.includes('invalid_request'))) {
        return {
          success: false,
          error: error.message,
          requiresReconnect: true
        };
      }
      throw error;
    }
  });
  
  // Déclencher la traduction manuelle des synopsis
  ipcMain.handle('mal-translate-synopsis', async () => {
    try {
      const db = getDb();
      const mainWindow = getMainWindow ? getMainWindow() : null;
      
      console.log('🤖 Lancement manuel de la traduction des synopsis...');
      
      // Notifier le frontend du démarrage
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mal-translation-started');
      }
      
      // Callback pour la progression
      const onTranslationProgress = (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('mal-translation-progress', progress);
        }
      };
      
      const translationResult = await translateSynopsisInBackground(db, store, onTranslationProgress);
      
      console.log(`🎉 Traduction terminée: ${translationResult.translated} synopsis traduits`);
      
      // Notifier le frontend
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mal-translation-completed', translationResult);
      }
      
      return translationResult;
      
    } catch (error) {
      console.error('❌ Erreur traduction synopsis:', error);
      
      const mainWindow = getMainWindow ? getMainWindow() : null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mal-translation-error', { error: error.message });
      }
      
      throw error;
    }
  });
  
  // Activer/désactiver la synchronisation automatique
  ipcMain.handle('mal-set-auto-sync', (event, enabled, intervalHours = 6) => {
    try {
      const { restartScheduler } = require('../../services/schedulers/mal-sync-scheduler');
      const previousEnabled = store.get('mal_auto_sync_enabled', false);
      const previousInterval = store.get('mal_auto_sync_interval', 6);
      
      store.set('mal_auto_sync_enabled', enabled);
      store.set('mal_auto_sync_interval', intervalHours);
      
      // Redémarrer le scheduler avec les nouveaux paramètres
      if (getMainWindow) {
        restartScheduler(getDb(), store, getMainWindow(), getDb, getPathManager);
      }
      
      const notificationConfig = store.get('notificationConfig', {});
      if (notificationConfig && notificationConfig.enabled) {
        notificationScheduler.init(notificationConfig, getDb(), store, {
          getDb,
          getMainWindow,
          getPathManager
        });
      }
      
      // Log détaillé selon le type de changement
      if (previousEnabled !== enabled) {
        console.log(`✅ Sync auto MAL ${enabled ? 'activée' : 'désactivée'} (intervalle: ${intervalHours}h)`);
      } else if (previousInterval !== intervalHours) {
        console.log(`✅ Intervalle sync auto MAL modifié: ${previousInterval}h → ${intervalHours}h`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur config sync auto MAL:', error);
      throw error;
    }
  });
  
  // Récupérer les paramètres de synchronisation automatique
  ipcMain.handle('mal-get-auto-sync-settings', () => {
    try {
      const enabled = store.get('mal_auto_sync_enabled', false);
      const intervalHours = store.get('mal_auto_sync_interval', 6);
      
      return {
        enabled,
        intervalHours
      };
    } catch (error) {
      console.error('❌ Erreur récupération paramètres sync auto MAL:', error);
      throw error;
    }
  });
}

module.exports = { registerMalSyncHandlers };
