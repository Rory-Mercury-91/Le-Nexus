const { getUserIdByName } = require('../common-helpers');
const { safeJsonParse } = require('../common-helpers');
const { ensureBookUserDataRow } = require('./book-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des labels personnalisés livres
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerBookLabelsHandlers(ipcMain, getDb, store) {
  
  // Récupérer tous les labels d'un livre pour l'utilisateur actuel
  ipcMain.handle('get-book-labels', (event, bookId) => {
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
      
      // Récupérer les labels depuis book_user_data
      const userData = db.prepare(`
        SELECT labels FROM book_user_data
        WHERE book_id = ? AND user_id = ?
      `).get(bookId, userId);
      
      if (!userData || !userData.labels) {
        return [];
      }
      
      return safeJsonParse(userData.labels, []);
    } catch (error) {
      console.error('Erreur get-book-labels:', error);
      throw error;
    }
  });
  
  // Récupérer tous les labels existants (pour suggestions)
  ipcMain.handle('get-all-book-labels', () => {
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
        SELECT labels FROM book_user_data
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
      console.error('Erreur get-all-book-labels:', error);
      throw error;
    }
  });
  
  // Ajouter un label à un livre
  ipcMain.handle('add-book-label', (event, bookId, label, color = '#8b5cf6') => {
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
      
      ensureBookUserDataRow(db, bookId, userId);
      
      // Récupérer les labels actuels
      const userData = db.prepare(`
        SELECT labels FROM book_user_data
        WHERE book_id = ? AND user_id = ?
      `).get(bookId, userId);
      
      const currentLabels = safeJsonParse(userData?.labels, []);
      
      // Vérifier si le label existe déjà
      if (currentLabels.some(l => l.label === label)) {
        return { success: true, message: 'Label déjà présent' };
      }
      
      // Ajouter le nouveau label
      currentLabels.push({ label, color });
      
      // Sauvegarder
      db.prepare(`
        UPDATE book_user_data
        SET labels = ?, updated_at = datetime('now')
        WHERE book_id = ? AND user_id = ?
      `).run(JSON.stringify(currentLabels), bookId, userId);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur add-book-label:', error);
      throw error;
    }
  });
  
  // Supprimer un label d'un livre
  ipcMain.handle('remove-book-label', (event, bookId, label) => {
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
      
      // Récupérer les labels actuels
      const userData = db.prepare(`
        SELECT labels FROM book_user_data
        WHERE book_id = ? AND user_id = ?
      `).get(bookId, userId);
      
      if (!userData || !userData.labels) {
        return { success: true, message: 'Aucun label à supprimer' };
      }
      
      const currentLabels = safeJsonParse(userData.labels, []);
      
      // Filtrer le label à supprimer
      const updatedLabels = currentLabels.filter(l => l.label !== label);
      
      // Sauvegarder
      db.prepare(`
        UPDATE book_user_data
        SET labels = ?, updated_at = datetime('now')
        WHERE book_id = ? AND user_id = ?
      `).run(JSON.stringify(updatedLabels), bookId, userId);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur remove-book-label:', error);
      throw error;
    }
  });
  
  // Mettre à jour tous les labels d'un livre
  ipcMain.handle('update-book-labels', (event, bookId, labels) => {
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
      
      ensureBookUserDataRow(db, bookId, userId);
      
      // Sauvegarder les labels
      db.prepare(`
        UPDATE book_user_data
        SET labels = ?, updated_at = datetime('now')
        WHERE book_id = ? AND user_id = ?
      `).run(JSON.stringify(labels || []), bookId, userId);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur update-book-labels:', error);
      throw error;
    }
  });
}

module.exports = { registerBookLabelsHandlers };
