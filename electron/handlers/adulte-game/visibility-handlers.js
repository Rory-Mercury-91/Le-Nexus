const { getUserIdByName } = require('./adulte-game-helpers');

/**
 * Enregistre les handlers IPC pour masquer/démasquer les jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerVisibilityHandlers(ipcMain, getDb, store) {
  
  /**
   * Masquer un jeu adulte pour l'utilisateur actuel
   */
  ipcMain.handle('masquer-adulte-game', async (event, adulteGameId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = getUserIdByName(db, currentUser);

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Mettre à jour ou créer l'entrée dans adulte_game_user_data
      db.prepare(`
        INSERT INTO adulte_game_user_data (game_id, user_id, is_hidden, date_masquage, created_at, updated_at)
        VALUES (?, ?, 1, CURRENT_TIMESTAMP, datetime('now'), datetime('now'))
        ON CONFLICT(game_id, user_id) DO UPDATE SET
          is_hidden = 1,
          date_masquage = CURRENT_TIMESTAMP,
          updated_at = datetime('now')
      `).run(adulteGameId, userId);

      console.log(`✅ Jeu adulte ${adulteGameId} masqué pour ${currentUser}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur masquer-adulte-game:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Démasquer un jeu adulte pour l'utilisateur actuel
   */
  ipcMain.handle('demasquer-adulte-game', async (event, adulteGameId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = getUserIdByName(db, currentUser);

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Mettre à jour is_hidden dans adulte_game_user_data
      db.prepare(`
        UPDATE adulte_game_user_data
        SET is_hidden = 0, date_masquage = NULL, updated_at = datetime('now')
        WHERE game_id = ? AND user_id = ?
      `).run(adulteGameId, userId);

      console.log(`✅ Jeu adulte ${adulteGameId} démasqué pour ${currentUser}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur demasquer-adulte-game:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Vérifier si un jeu adulte est masqué pour l'utilisateur actuel
   */
  ipcMain.handle('is-adulte-game-masquee', async (event, adulteGameId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = getUserIdByName(db, currentUser);

      if (!userId) return false;

      const result = db.prepare(`
        SELECT is_hidden FROM adulte_game_user_data 
        WHERE game_id = ? AND user_id = ?
      `).get(adulteGameId, userId);
      return result ? result.is_hidden === 1 : false;
    } catch (error) {
      console.error('❌ Erreur is-adulte-game-masquee:', error);
      return false;
    }
  });
}

module.exports = { registerVisibilityHandlers };
