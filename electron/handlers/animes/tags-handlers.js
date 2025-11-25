const { ensureAnimeUserDataRow } = require('./anime-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des tags et favoris d'animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 */
function registerAnimeTagsHandlers(ipcMain, getDb) {
  
  /**
   * Définir un tag pour un anime
   */
  ipcMain.handle('set-anime-tag', async (event, animeId, userId, tag) => {
    try {
      const db = getDb();
      ensureAnimeUserDataRow(db, animeId, userId);
      
      db.prepare(`
        UPDATE anime_user_data 
        SET tag = ?, updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(tag, animeId, userId);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Toggle favori d'un anime
   */
  ipcMain.handle('toggle-anime-favorite', async (event, animeId, userId) => {
    try {
      const db = getDb();
      ensureAnimeUserDataRow(db, animeId, userId);
      
      const current = db.prepare('SELECT is_favorite FROM anime_user_data WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      const newValue = current?.is_favorite === 1 ? 0 : 1;
      
      db.prepare(`
        UPDATE anime_user_data 
        SET is_favorite = ?, updated_at = datetime('now')
        WHERE anime_id = ? AND user_id = ?
      `).run(newValue, animeId, userId);
      
      return { success: true, is_favorite: newValue };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Récupérer le tag d'un anime
   */
  ipcMain.handle('get-anime-tag', async (event, animeId, userId) => {
    try {
      const db = getDb();
      const result = db.prepare('SELECT tag, is_favorite FROM anime_user_data WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      return { success: true, tag: result?.tag || null, is_favorite: result?.is_favorite || 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Supprimer le tag d'un anime
   */
  ipcMain.handle('remove-anime-tag', async (event, animeId, userId) => {
    try {
      const db = getDb();
      db.prepare('UPDATE anime_user_data SET tag = NULL, updated_at = datetime("now") WHERE anime_id = ? AND user_id = ?').run(animeId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeTagsHandlers };
