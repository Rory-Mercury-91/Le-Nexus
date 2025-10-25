/**
 * Handlers IPC pour la synchronisation MyAnimeList
 */

const { startOAuthFlow, getUserInfo } = require('../apis/myanimelist-oauth');
const { performFullSync } = require('../services/mal-sync');

/**
 * Enregistre tous les handlers IPC pour MAL sync
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerMalSyncHandlers(ipcMain, getDb, store) {
  
  // Démarrer le flow OAuth pour connecter MAL
  ipcMain.handle('mal-connect', () => {
    return new Promise((resolve, reject) => {
      console.log('🔐 Démarrage OAuth MAL...');
      
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
      store.delete('mal_access_token');
      store.delete('mal_refresh_token');
      store.delete('mal_token_expires_at');
      store.delete('mal_user_info');
      store.delete('mal_connected');
      store.delete('mal_connected_at');
      store.delete('mal_last_sync');
      
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
      
      return {
        connected,
        user: userInfo,
        connectedAt,
        lastSync
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
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }
      
      const connected = store.get('mal_connected', false);
      if (!connected) {
        throw new Error('Non connecté à MyAnimeList. Veuillez vous connecter d\'abord.');
      }
      
      console.log(`🔄 Synchronisation manuelle MAL pour l'utilisateur: ${currentUser}`);
      
      const result = await performFullSync(db, store, currentUser);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur synchronisation manuelle MAL:', error);
      throw error;
    }
  });
  
  // Activer/désactiver la synchronisation automatique
  ipcMain.handle('mal-set-auto-sync', (event, enabled, intervalHours = 6) => {
    try {
      store.set('mal_auto_sync_enabled', enabled);
      store.set('mal_auto_sync_interval', intervalHours);
      
      console.log(`✅ Sync auto MAL ${enabled ? 'activée' : 'désactivée'} (intervalle: ${intervalHours}h)`);
      
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

