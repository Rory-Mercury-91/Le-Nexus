const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { ensureAnimeUserDataRow } = require('./anime-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des labels personnalisés animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeLabelsHandlers(ipcMain, getDb, store) {
  
  // Récupérer tous les labels d'un anime pour l'utilisateur actuel
  ipcMain.handle('get-anime-labels', (event, animeId) => {
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
      
      // Récupérer les labels depuis anime_user_data
      const userData = db.prepare(`
        SELECT labels FROM anime_user_data
        WHERE anime_id = ? AND user_id = ?
      `).get(animeId, userId);
      
      if (!userData || !userData.labels) {
        return [];
      }
      
      return safeJsonParse(userData.labels, []);
    } catch (error) {
      console.error('Erreur get-anime-labels:', error);
      throw error;
    }
  });
  
  // Récupérer tous les labels existants (pour suggestions)
  ipcMain.handle('get-all-anime-labels', () => {
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
        SELECT labels FROM anime_user_data
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
      console.error('Erreur get-all-anime-labels:', error);
      throw error;
    }
  });
  
  // Ajouter un label à un anime
  ipcMain.handle('add-anime-label', (event, animeId, label, color = '#8b5cf6') => {
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
      
      // S'assurer qu'une ligne anime_user_data existe
      ensureAnimeUserDataRow(db, animeId, userId);
      
      // Récupérer les labels existants
      const userData = db.prepare(`
        SELECT labels FROM anime_user_data
        WHERE anime_id = ? AND user_id = ?
      `).get(animeId, userId);
      
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
        UPDATE anime_user_data
        SET labels = ?, updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(JSON.stringify(labels), animeId, userId);
      
      console.log(`✅ Label ajouté: "${label}" à l'anime ID ${animeId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur add-anime-label:', error);
      throw error;
    }
  });
  
  // Retirer un label d'un anime
  ipcMain.handle('remove-anime-label', (event, animeId, label) => {
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
        SELECT labels FROM anime_user_data
        WHERE anime_id = ? AND user_id = ?
      `).get(animeId, userId);
      
      if (!userData || !userData.labels) {
        return { success: true };
      }
      
      try {
        let labels = safeJsonParse(userData.labels, []);
        labels = labels.filter(l => l.label !== label);
        
        // Sauvegarder
        db.prepare(`
          UPDATE anime_user_data
          SET labels = ?, updated_at = datetime('now')
          WHERE anime_id = ? AND user_id = ?
        `).run(JSON.stringify(labels), animeId, userId);
        
        console.log(`✅ Label retiré: "${label}" de l'anime ID ${animeId}`);
      } catch (e) {
        console.warn('Erreur parsing labels:', e);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur remove-anime-label:', error);
      throw error;
    }
  });
}

module.exports = { registerAnimeLabelsHandlers };
