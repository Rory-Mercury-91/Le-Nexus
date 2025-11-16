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
      db.prepare(`
        INSERT OR REPLACE INTO anime_tags (anime_id, user_id, tag, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, userId, tag);
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
      const current = db.prepare('SELECT is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
      const newValue = current?.is_favorite ? 0 : 1;
      
      db.prepare(`
        INSERT OR REPLACE INTO anime_tags (anime_id, user_id, is_favorite, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(animeId, userId, newValue);
      
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
      const result = db.prepare('SELECT tag, is_favorite FROM anime_tags WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
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
      db.prepare('UPDATE anime_tags SET tag = NULL WHERE anime_id = ? AND user_id = ?').run(animeId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeTagsHandlers };
