// Import des fonctions communes
const { getUserByName } = require('../common-helpers');
const { ensureAnimeUserDataRow } = require('./anime-helpers');

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

      // S'assurer que la ligne anime_user_data existe
      ensureAnimeUserDataRow(db, animeId, user.id);

      // Masquer l'anime et supprimer toutes les données utilisateur
      db.prepare(`
        UPDATE anime_user_data 
        SET is_hidden = 1,
            statut_visionnage = 'À regarder',
            score = NULL,
            episodes_vus = 0,
            date_debut = NULL,
            date_fin = NULL,
            is_favorite = 0,
            tag = NULL,
            episode_progress = NULL,
            display_preferences = NULL,
            updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(animeId, user.id);

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

      // S'assurer que la ligne anime_user_data existe
      ensureAnimeUserDataRow(db, animeId, user.id);

      db.prepare(`
        UPDATE anime_user_data 
        SET is_hidden = 0, updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(animeId, user.id);

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

      const result = db.prepare('SELECT is_hidden FROM anime_user_data WHERE anime_id = ? AND user_id = ?').get(animeId, user.id);
      return result?.is_hidden === 1;
    } catch (error) {
      console.error('❌ Erreur is-anime-masquee:', error);
      return false;
    }
  });
}

module.exports = { registerAnimeVisibilityHandlers };
