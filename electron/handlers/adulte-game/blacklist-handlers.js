const { getUserIdByName } = require('./adulte-game-helpers');

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
      
      const blacklist = db.prepare(`
        SELECT * FROM adulte_game_blacklist
        WHERE user_id = ?
        ORDER BY date_blacklist DESC
      `).all(userId);
      
      return blacklist;
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
        DELETE FROM adulte_game_blacklist
        WHERE id = ? AND user_id = ?
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
