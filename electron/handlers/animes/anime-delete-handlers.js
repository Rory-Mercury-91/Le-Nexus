/**
 * Handlers pour les opérations de suppression (DELETE) sur les séries d'animes
 */

/**
 * Supprime un anime
 */
function handleDeleteAnime(db, animeId) {
  db.prepare('DELETE FROM anime_series WHERE id = ?').run(animeId);
  return { success: true };
}

/**
 * Enregistre les handlers IPC pour les opérations de suppression
 */
function registerAnimeSeriesDeleteHandlers(ipcMain, getDb) {
  // Supprimer un anime
  ipcMain.handle('delete-anime', (event, animeId) => {
    try {
      const db = getDb();
      return handleDeleteAnime(db, animeId);
    } catch (error) {
      console.error('❌ Erreur delete-anime:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeSeriesDeleteHandlers };
