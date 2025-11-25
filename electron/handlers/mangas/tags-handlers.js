const { ensureMangaUserDataRow } = require('./manga-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des tags et favoris des séries
 */
function registerMangaTagsHandlers(ipcMain, getDb) {
  // Définir ou modifier le tag d'une série pour un utilisateur
  ipcMain.handle('set-serie-tag', async (event, serieId, userId, tag) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      if (tag && !['a_lire', 'abandonne', 'en_pause', 'en_cours', 'lu'].includes(tag)) {
        throw new Error(`Tag invalide: ${tag}`);
      }

      // S'assurer qu'une entrée manga_user_data existe
      ensureMangaUserDataRow(db, serieId, userId);
      
      // Mettre à jour le tag
      db.prepare(`
        UPDATE manga_user_data 
        SET tag = ?, tag_manual_override = 1, updated_at = datetime('now') 
        WHERE serie_id = ? AND user_id = ?
      `).run(tag, serieId, userId);
      
      return { success: true, tag };
    } catch (error) {
      console.error('❌ Erreur set-serie-tag:', error);
      throw error;
    }
  });

  // Basculer le statut favori d'une série pour un utilisateur
  ipcMain.handle('toggle-serie-favorite', async (event, serieId, userId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // S'assurer qu'une entrée manga_user_data existe
      ensureMangaUserDataRow(db, serieId, userId);
      
      // Récupérer le statut favori actuel
      const existing = db.prepare('SELECT is_favorite FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      // Inverser le statut favori
      const newFavorite = existing && existing.is_favorite ? 0 : 1;
      db.prepare('UPDATE manga_user_data SET is_favorite = ?, updated_at = datetime(\'now\') WHERE serie_id = ? AND user_id = ?')
        .run(newFavorite, serieId, userId);

      return { success: true, is_favorite: newFavorite === 1 };
    } catch (error) {
      console.error('❌ Erreur toggle-serie-favorite:', error);
      throw error;
    }
  });

  // Récupérer le tag d'une série pour un utilisateur
  ipcMain.handle('get-serie-tag', async (event, serieId, userId) => {
    try {
      const db = getDb();
      if (!db) return null;

      const result = db.prepare('SELECT tag, is_favorite FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      return result ? { tag: result.tag, is_favorite: result.is_favorite === 1 } : null;
    } catch (error) {
      console.error('❌ Erreur get-serie-tag:', error);
      return null;
    }
  });

  // Supprimer le tag d'une série pour un utilisateur (mais garder favori si présent)
  ipcMain.handle('remove-serie-tag', async (event, serieId, userId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // S'assurer qu'une entrée manga_user_data existe
      ensureMangaUserDataRow(db, serieId, userId);
      
      // Supprimer juste le tag (garder favori si présent)
      db.prepare(`
        UPDATE manga_user_data 
        SET tag = NULL, tag_manual_override = 0, updated_at = datetime('now') 
        WHERE serie_id = ? AND user_id = ?
      `).run(serieId, userId);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur remove-serie-tag:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaTagsHandlers };
