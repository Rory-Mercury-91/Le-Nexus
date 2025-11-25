const { getUserIdByName } = require('./manga-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des labels personnalisés mangas
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerMangaLabelsHandlers(ipcMain, getDb, store) {
  
  // Récupérer tous les labels d'une série pour l'utilisateur actuel
  ipcMain.handle('get-manga-labels', (event, serieId) => {
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
      
      // Récupérer les labels depuis manga_user_data
      const userData = db.prepare(`
        SELECT labels FROM manga_user_data
        WHERE serie_id = ? AND user_id = ?
      `).get(serieId, userId);
      
      if (!userData || !userData.labels) {
        return [];
      }
      
      return safeJsonParse(userData.labels, []);
    } catch (error) {
      console.error('Erreur get-manga-labels:', error);
      throw error;
    }
  });
  
  // Récupérer tous les labels existants (pour suggestions)
  ipcMain.handle('get-all-manga-labels', () => {
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
        SELECT labels FROM manga_user_data
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
      console.error('Erreur get-all-manga-labels:', error);
      throw error;
    }
  });
  
  // Ajouter un label à une série
  ipcMain.handle('add-manga-label', (event, serieId, label, color = '#8b5cf6') => {
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
      
      // S'assurer qu'une ligne manga_user_data existe
      const { ensureMangaUserDataRow } = require('./manga-helpers');
      ensureMangaUserDataRow(db, serieId, userId);
      
      // Récupérer les labels existants
      const userData = db.prepare(`
        SELECT labels FROM manga_user_data
        WHERE serie_id = ? AND user_id = ?
      `).get(serieId, userId);
      
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
        UPDATE manga_user_data
        SET labels = ?, updated_at = datetime('now')
        WHERE serie_id = ? AND user_id = ?
      `).run(JSON.stringify(labels), serieId, userId);
      
      console.log(`✅ Label ajouté: "${label}" à la série ID ${serieId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur add-manga-label:', error);
      throw error;
    }
  });
  
  // Retirer un label d'une série
  ipcMain.handle('remove-manga-label', (event, serieId, label) => {
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
        SELECT labels FROM manga_user_data
        WHERE serie_id = ? AND user_id = ?
      `).get(serieId, userId);
      
      if (!userData || !userData.labels) {
        return { success: true };
      }
      
      try {
        let labels = safeJsonParse(userData.labels, []);
        labels = labels.filter(l => l.label !== label);
        
        // Sauvegarder
        db.prepare(`
          UPDATE manga_user_data
          SET labels = ?, updated_at = datetime('now')
          WHERE serie_id = ? AND user_id = ?
        `).run(JSON.stringify(labels), serieId, userId);
        
        console.log(`✅ Label retiré: "${label}" de la série ID ${serieId}`);
      } catch (e) {
        console.warn('Erreur parsing labels:', e);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur remove-manga-label:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaLabelsHandlers };
