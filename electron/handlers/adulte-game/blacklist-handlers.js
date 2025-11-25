const { getUserIdByName } = require('./adulte-game-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour la gestion de la liste noire JEUX ADULTES
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerBlacklistHandlers(ipcMain, getDb, store) {
  
  // Récupérer la liste noire de l'utilisateur actuel
  ipcMain.handle('get-adulte-game-blacklist', () => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        return [];
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return [];
      }
      
      const blacklistRows = db.prepare(`
        SELECT * FROM user_preferences
        WHERE user_id = ? AND content_type = 'adulte_game' AND type = 'blacklist'
        ORDER BY created_at DESC
      `).all(userId);
      
      // Convertir vers le format attendu
      return blacklistRows.map(row => {
        const value = safeJsonParse(row.value || '{}', {});
        
        const platform = row.platform || value.plateforme || 'F95Zone';
        const threadId = row.key ? parseInt(row.key) : null;
        
        return {
          id: row.id,
          f95_thread_id: platform === 'F95Zone' ? threadId : null,
          Lewdcorner_thread_id: platform === 'LewdCorner' ? threadId : null,
          titre: value.titre || '',
          plateforme: platform,
          traducteur: value.traducteur || null,
          date_blacklist: row.created_at,
          raison: value.raison || null
        };
      });
    } catch (error) {
      console.error('Erreur get-adulte-game-blacklist:', error);
      throw error;
    }
  });
  
  // Supprimer une entrée de la liste noire
  ipcMain.handle('remove-from-blacklist', (event, id) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      db.prepare(`
        DELETE FROM user_preferences
        WHERE id = ? AND user_id = ? AND content_type = 'adulte_game' AND type = 'blacklist'
      `).run(id, userId);
      
      console.log(`✅ Entrée retirée de la liste noire (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur remove-from-blacklist:', error);
      throw error;
    }
  });
}

module.exports = { registerBlacklistHandlers };
