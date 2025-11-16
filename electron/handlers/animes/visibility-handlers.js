// Import des fonctions communes
const { getUserByName } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour masquer/démasquer les animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeVisibilityHandlers(ipcMain, getDb, store) {
  
  /**
   * Masquer un anime pour l'utilisateur actuel
   */
  ipcMain.handle('masquer-anime', async (event, animeId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const user = getUserByName(db, currentUser);

      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Masquer l'anime
      db.prepare(`
        INSERT OR REPLACE INTO anime_masquees (anime_id, user_id, date_masquage)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, user.id);

      // Supprimer les données de lecture de cet utilisateur pour cet anime
      db.prepare('DELETE FROM anime_episodes_vus WHERE anime_id = ? AND user_id = ?').run(animeId, user.id);
      db.prepare('DELETE FROM anime_statut_utilisateur WHERE anime_id = ? AND user_id = ?').run(animeId, user.id);
      db.prepare('DELETE FROM anime_tags WHERE anime_id = ? AND user_id = ?').run(animeId, user.id);

      console.log(`✅ Anime ${animeId} masqué pour ${currentUser}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur masquer-anime:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Démasquer un anime pour l'utilisateur actuel
   */
  ipcMain.handle('demasquer-anime', async (event, animeId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const user = getUserByName(db, currentUser);

      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      db.prepare('DELETE FROM anime_masquees WHERE anime_id = ? AND user_id = ?').run(animeId, user.id);

      console.log(`✅ Anime ${animeId} démasqué pour ${currentUser}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur demasquer-anime:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Vérifier si un anime est masqué pour l'utilisateur actuel
   */
  ipcMain.handle('is-anime-masquee', async (event, animeId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const user = getUserByName(db, currentUser);

      if (!user) return false;

      const result = db.prepare('SELECT 1 FROM anime_masquees WHERE anime_id = ? AND user_id = ?').get(animeId, user.id);
      return !!result;
    } catch (error) {
      console.error('❌ Erreur is-anime-masquee:', error);
      return false;
    }
  });
}

module.exports = { registerAnimeVisibilityHandlers };
