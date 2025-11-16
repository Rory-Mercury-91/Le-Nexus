/**
 * Enregistre les handlers IPC pour la gestion de la visibilité des séries (masquer/démasquer)
 */
function registerMangaSeriesVisibilityHandlers(ipcMain, getDb, store) {
  // Masquer une série (supprime les données de lecture + cache de l'interface)
  ipcMain.handle('masquer-serie', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      // 1. Supprimer les données de lecture de l'utilisateur
      db.prepare(`
        DELETE FROM lecture_tomes 
        WHERE tome_id IN (SELECT id FROM tomes WHERE serie_id = ?) 
        AND user_id = ?
      `).run(serieId, userId);

      // 2. Ajouter dans la table series_masquees
      db.prepare(`
        INSERT OR IGNORE INTO series_masquees (serie_id, user_id) 
        VALUES (?, ?)
      `).run(serieId, userId);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur masquer-serie:', error);
      throw error;
    }
  });

  // Démasquer une série (réaffiche dans l'interface)
  ipcMain.handle('demasquer-serie', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      // Retirer de la table series_masquees
      db.prepare(`
        DELETE FROM series_masquees 
        WHERE serie_id = ? AND user_id = ?
      `).run(serieId, userId);

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur demasquer-serie:', error);
      throw error;
    }
  });

  // Vérifier si une série est masquée pour l'utilisateur actuel
  ipcMain.handle('is-serie-masquee', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        return false;
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return false;
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return false;
      }

      const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM series_masquees 
        WHERE serie_id = ? AND user_id = ?
      `).get(serieId, userId);

      return result && result.count > 0;
    } catch (error) {
      console.error('❌ Erreur is-serie-masquee:', error);
      return false;
    }
  });
}

module.exports = { registerMangaSeriesVisibilityHandlers };
