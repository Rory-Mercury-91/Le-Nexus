const { getUserIdByName } = require('./adulte-game-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des labels personnalisés jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerLabelsHandlers(ipcMain, getDb, store) {
  
  // Récupérer tous les labels d'un jeu pour l'utilisateur actuel
  ipcMain.handle('get-adulte-game-labels', (event, gameId) => {
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
      
      const labels = db.prepare(`
        SELECT * FROM adulte_game_labels
        WHERE game_id = ? AND user_id = ?
      `).all(gameId, userId);
      
      return labels;
    } catch (error) {
      console.error('Erreur get-adulte-game-labels:', error);
      throw error;
    }
  });
  
  // Récupérer tous les labels existants (pour suggestions)
  ipcMain.handle('get-all-adulte-game-labels', () => {
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
      
      const labels = db.prepare(`
        SELECT DISTINCT label, color FROM adulte_game_labels
        WHERE user_id = ?
        ORDER BY label ASC
      `).all(userId);
      
      return labels;
    } catch (error) {
      console.error('Erreur get-all-adulte-game-labels:', error);
      throw error;
    }
  });
  
  // Ajouter un label à un jeu
  ipcMain.handle('add-adulte-game-label', (event, gameId, label, color = '#8b5cf6') => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel');
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      db.prepare(`
        INSERT OR IGNORE INTO adulte_game_labels (game_id, user_id, label, color)
        VALUES (?, ?, ?, ?)
      `).run(gameId, userId, label, color);
      
      console.log(`✅ Label ajouté: "${label}" au jeu ID ${gameId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur add-adulte-game-label:', error);
      throw error;
    }
  });
  
  // Retirer un label d'un jeu
  ipcMain.handle('remove-adulte-game-label', (event, gameId, label) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel');
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      db.prepare(`
        DELETE FROM adulte_game_labels
        WHERE game_id = ? AND user_id = ? AND label = ?
      `).run(gameId, userId, label);
      
      console.log(`✅ Label retiré: "${label}" du jeu ID ${gameId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur remove-adulte-game-label:', error);
      throw error;
    }
  });
}

module.exports = { registerLabelsHandlers };
