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

      // Vérifier si une entrée existe déjà
      const existing = db.prepare('SELECT id FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      if (existing) {
        // Mettre à jour le tag existant
        db.prepare('UPDATE serie_tags SET tag = ?, updated_at = CURRENT_TIMESTAMP WHERE serie_id = ? AND user_id = ?')
          .run(tag, serieId, userId);
      } else {
        // Créer une nouvelle entrée
        db.prepare('INSERT INTO serie_tags (serie_id, user_id, tag, is_favorite) VALUES (?, ?, ?, 0)')
          .run(serieId, userId, tag);
      }
      
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

      // Vérifier si une entrée existe déjà
      const existing = db.prepare('SELECT id, is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      if (existing) {
        // Inverser le statut favori
        const newFavorite = existing.is_favorite ? 0 : 1;
        db.prepare('UPDATE serie_tags SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE serie_id = ? AND user_id = ?')
          .run(newFavorite, serieId, userId);

        return { success: true, is_favorite: newFavorite === 1 };
      } else {
        // Créer une nouvelle entrée avec favori activé
        db.prepare('INSERT INTO serie_tags (serie_id, user_id, tag, is_favorite) VALUES (?, ?, NULL, 1)')
          .run(serieId, userId);

        return { success: true, is_favorite: true };
      }
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

      const result = db.prepare('SELECT tag, is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
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

      // Vérifier si c'est un favori
      const existing = db.prepare('SELECT is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      
      if (existing && existing.is_favorite) {
        // Si c'est un favori, on garde l'entrée mais on supprime juste le tag
        db.prepare('UPDATE serie_tags SET tag = NULL, updated_at = CURRENT_TIMESTAMP WHERE serie_id = ? AND user_id = ?')
          .run(serieId, userId);
      } else {
        // Sinon on supprime l'entrée complète
        db.prepare('DELETE FROM serie_tags WHERE serie_id = ? AND user_id = ?').run(serieId, userId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur remove-serie-tag:', error);
      throw error;
    }
  });
}

module.exports = { registerMangaTagsHandlers };
