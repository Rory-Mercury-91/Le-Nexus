/**
 * Handlers IPC pour la synchronisation AniList
 */

const { startOAuthFlow, getUserInfo } = require('../../apis/anilist-oauth');
const { performFullSync, performStatusSync } = require('../../services/anilist/anilist-sync');

function resetAniListConnection(store) {
  store.delete('anilist_access_token');
  store.delete('anilist_refresh_token');
  store.delete('anilist_token_expires_at');
  store.delete('anilist_user_info');
  store.delete('anilist_connected');
  store.delete('anilist_connected_at');
  store.delete('anilist_last_sync');
}

/**
 * Enregistre tous les handlers IPC pour AniList sync
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager (optionnel)
 */
function registerAniListSyncHandlers(ipcMain, getDb, store, getMainWindow = null, getPathManager = null) {
  ipcMain.handle('anilist-get-credentials', () => {
    return {
      clientId: store.get('anilist.clientId', ''),
      clientSecret: store.get('anilist.clientSecret', ''),
      redirectUri: store.get('anilist.redirectUri', `http://localhost:8888/anilist-callback`)
    };
  });

  ipcMain.handle('anilist-set-credentials', (event, { clientId, clientSecret, redirectUri }) => {
    const previousClientId = store.get('anilist.clientId', '');
    const previousClientSecret = store.get('anilist.clientSecret', '');
    const previousRedirectUri = store.get('anilist.redirectUri', `http://localhost:8888/anilist-callback`);

    const normalizedClientId = clientId !== undefined ? (clientId || '') : previousClientId;
    const normalizedClientSecret = clientSecret !== undefined ? (clientSecret || '') : previousClientSecret;
    const normalizedRedirectUri = redirectUri !== undefined ? (redirectUri || `http://localhost:8888/anilist-callback`) : previousRedirectUri;

    const clientIdChanged = normalizedClientId !== previousClientId;
    const clientSecretChanged = normalizedClientSecret !== previousClientSecret;
    const redirectChanged = normalizedRedirectUri !== previousRedirectUri;

    if (clientId !== undefined) {
      store.set('anilist.clientId', normalizedClientId);
      console.log('[AniList] Client ID mis à jour');
    }
    if (clientSecret !== undefined) {
      store.set('anilist.clientSecret', normalizedClientSecret);
      console.log('[AniList] Client Secret mis à jour');
    }
    if (redirectUri !== undefined) {
      store.set('anilist.redirectUri', normalizedRedirectUri);
      console.log('[AniList] Redirect URI mise à jour:', normalizedRedirectUri);
    }

    if (clientIdChanged || clientSecretChanged || redirectChanged) {
      console.log('[AniList] Les identifiants ont changé, réinitialisation de la session existante');
      resetAniListConnection(store);
    }

    return { success: true };
  });

  // Démarrer le flow OAuth pour connecter AniList
  ipcMain.handle('anilist-connect', () => {
    return new Promise((resolve, reject) => {
      console.log('🔐 Démarrage OAuth AniList...');
      resetAniListConnection(store);

      const flow = startOAuthFlow(
        async (tokens) => {
          try {
            // Sauvegarder les tokens
            store.set('anilist_access_token', tokens.access_token);
            store.set('anilist_refresh_token', tokens.refresh_token);
            store.set('anilist_token_expires_at', tokens.expires_at);

            // Récupérer les infos utilisateur
            const userInfo = await getUserInfo(tokens.access_token);
            store.set('anilist_user_info', userInfo);
            store.set('anilist_connected', true);
            store.set('anilist_connected_at', new Date().toISOString());

            console.log(`✅ Connecté à AniList en tant que: ${userInfo.name}`);

            resolve({
              success: true,
              user: userInfo
            });
          } catch (error) {
            console.error('❌ Erreur récupération infos utilisateur AniList:', error);
            reject(error);
          }
        },
        (error) => {
          console.error('❌ Erreur OAuth AniList:', error);
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue lors de la connexion OAuth AniList';
          reject(new Error(errorMessage));
        },
        store
      );
    });
  });

  // Déconnecter AniList (supprimer les tokens)
  ipcMain.handle('anilist-disconnect', () => {
    try {
      resetAniListConnection(store);

      console.log('✅ Déconnecté d\'AniList');

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur déconnexion AniList:', error);
      throw error;
    }
  });

  // Récupérer le statut de connexion AniList
  ipcMain.handle('anilist-get-status', () => {
    try {
      const connected = store.get('anilist_connected', false);
      const userInfo = store.get('anilist_user_info', null);
      const connectedAt = store.get('anilist_connected_at', null);
      const lastSync = store.get('anilist_last_sync', null);
      const lastStatusSync = store.get('anilist_last_status_sync', null);

      return {
        connected,
        user: userInfo,
        connectedAt,
        lastSync,
        lastStatusSync
      };
    } catch (error) {
      console.error('❌ Erreur récupération statut AniList:', error);
      throw error;
    }
  });

  // Déclencher une synchronisation manuelle
  ipcMain.handle('anilist-sync-now', async () => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const mainWindow = getMainWindow ? getMainWindow() : null;

      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }

      const connected = store.get('anilist_connected', false);
      if (!connected) {
        throw new Error('Non connecté à AniList. Veuillez vous connecter d\'abord.');
      }

      console.log(`🔄 Synchronisation manuelle AniList pour l'utilisateur: ${currentUser}`);

      // Callback pour notifier la progression
      const onProgress = (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('anilist-sync-progress', progress);
        }
      };

      const result = await performFullSync(db, store, currentUser, onProgress, getDb, getPathManager, getMainWindow);

      // Envoyer les résultats finaux au frontend
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('anilist-sync-completed', result);
      }

      return result;

    } catch (error) {
      console.error('❌ Erreur synchronisation manuelle AniList:', error);

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
  ipcMain.handle('anilist-sync-status', async () => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }

      const connected = store.get('anilist_connected', false);
      if (!connected) {
        throw new Error('Non connecté à AniList. Veuillez vous connecter d\'abord.');
      }

      console.log(`🔁 Synchronisation des statuts AniList pour l'utilisateur: ${currentUser}`);
      const result = await performStatusSync(db, store, currentUser, getPathManager);
      return result;
    } catch (error) {
      console.error('❌ Erreur synchronisation statuts AniList:', error);
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

  // Activer/désactiver la synchronisation automatique
  ipcMain.handle('anilist-set-auto-sync', (event, enabled, intervalHours = 6) => {
    try {
      const { restartScheduler } = require('../../services/schedulers/anilist-sync-scheduler');
      store.set('anilist_auto_sync_enabled', enabled);
      store.set('anilist_auto_sync_interval', intervalHours);

      // Redémarrer le scheduler avec les nouveaux paramètres
      if (getMainWindow) {
        restartScheduler(getDb(), store, getMainWindow(), getDb, getPathManager);
      }

      console.log(`✅ Sync auto AniList ${enabled ? 'activée' : 'désactivée'} (intervalle: ${intervalHours}h)`);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur config sync auto AniList:', error);
      throw error;
    }
  });

  // Récupérer les paramètres de synchronisation automatique
  ipcMain.handle('anilist-get-auto-sync-settings', () => {
    try {
      const enabled = store.get('anilist_auto_sync_enabled', false);
      const intervalHours = store.get('anilist_auto_sync_interval', 6);

      return {
        enabled,
        intervalHours
      };
    } catch (error) {
      console.error('❌ Erreur récupération paramètres sync auto AniList:', error);
      throw error;
    }
  });
}

module.exports = { registerAniListSyncHandlers };
