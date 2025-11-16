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

      db.prepare(`
        INSERT OR REPLACE INTO adulte_game_masquees (adulte_game_id, user_id, date_masquage)
        VALUES (?, ?, CURRENT_TIMESTAMP)
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

      db.prepare('DELETE FROM adulte_game_masquees WHERE adulte_game_id = ? AND user_id = ?').run(adulteGameId, userId);

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

      const result = db.prepare('SELECT 1 FROM adulte_game_masquees WHERE adulte_game_id = ? AND user_id = ?').get(adulteGameId, userId);
      return !!result;
    } catch (error) {
      console.error('❌ Erreur is-adulte-game-masquee:', error);
      return false;
    }
  });
}

module.exports = { registerVisibilityHandlers };
