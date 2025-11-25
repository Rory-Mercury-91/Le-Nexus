const { getUserIdByName } = require('./adulte-game-helpers');
const { safeJsonParse } = require('../common-helpers');

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
      
      // Récupérer les labels depuis adulte_game_user_data
      const userData = db.prepare(`
        SELECT labels FROM adulte_game_user_data
        WHERE game_id = ? AND user_id = ?
      `).get(gameId, userId);
      
      if (!userData || !userData.labels) {
        return [];
      }
      
      return safeJsonParse(userData.labels, []);
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
      
      // Récupérer tous les labels distincts de l'utilisateur
      const allUserData = db.prepare(`
        SELECT labels FROM adulte_game_user_data
        WHERE user_id = ? AND labels IS NOT NULL
      `).all(userId);
      
      const labelMap = new Map();
      
      for (const row of allUserData) {
        try {
          const labels = safeJsonParse(row.labels, []);
          for (const label of labels) {
            if (!labelMap.has(label.label)) {
              labelMap.set(label.label, label.color || '#8b5cf6');
            }
          }
        } catch (e) {
          console.warn('Erreur parsing labels:', e);
        }
      }
      
      return Array.from(labelMap.entries()).map(([label, color]) => ({ label, color }))
        .sort((a, b) => a.label.localeCompare(b.label));
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
      
      // Récupérer les labels existants
      const userData = db.prepare(`
        SELECT labels FROM adulte_game_user_data
        WHERE game_id = ? AND user_id = ?
      `).get(gameId, userId);
      
      let labels = [];
      if (userData && userData.labels) {
        labels = safeJsonParse(userData.labels, []);
      }
      
      // Vérifier si le label existe déjà
      const existingIndex = labels.findIndex(l => l.label === label);
      if (existingIndex === -1) {
        labels.push({ label, color });
      } else {
        // Mettre à jour la couleur si différente
        labels[existingIndex].color = color;
      }
      
      // Sauvegarder
      db.prepare(`
        INSERT INTO adulte_game_user_data (game_id, user_id, labels, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(game_id, user_id) DO UPDATE SET
          labels = ?,
          updated_at = datetime('now')
      `).run(gameId, userId, JSON.stringify(labels), JSON.stringify(labels));
      
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
      
      // Récupérer les labels existants
      const userData = db.prepare(`
        SELECT labels FROM adulte_game_user_data
        WHERE game_id = ? AND user_id = ?
      `).get(gameId, userId);
      
      if (!userData || !userData.labels) {
        return { success: true };
      }
      
      try {
        let labels = safeJsonParse(userData.labels, []);
        labels = labels.filter(l => l.label !== label);
        
        // Sauvegarder
        db.prepare(`
          UPDATE adulte_game_user_data
          SET labels = ?, updated_at = datetime('now')
          WHERE game_id = ? AND user_id = ?
        `).run(JSON.stringify(labels), gameId, userId);
        
        console.log(`✅ Label retiré: "${label}" du jeu ID ${gameId}`);
      } catch (e) {
        console.warn('Erreur parsing labels:', e);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur remove-adulte-game-label:', error);
      throw error;
    }
  });
}

module.exports = { registerLabelsHandlers };
