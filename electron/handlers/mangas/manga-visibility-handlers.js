const { ensureMangaUserDataRow } = require('./manga-helpers');
const { safeJsonParse } = require('../common-helpers');

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

      // S'assurer qu'une entrée manga_user_data existe
      ensureMangaUserDataRow(db, serieId, userId);

      // 1. Supprimer les données de progression (tome_progress, volumes_lus, chapitres_lus, statut_lecture)
      // 2. Marquer comme masquée (is_hidden = 1)
      db.prepare(`
        UPDATE manga_user_data SET
          is_hidden = 1,
          tome_progress = NULL,
          volumes_lus = 0,
          chapitres_lus = 0,
          statut_lecture = 'À lire',
          tag = NULL,
          updated_at = datetime('now')
        WHERE serie_id = ? AND user_id = ?
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

      // S'assurer qu'une entrée manga_user_data existe
      ensureMangaUserDataRow(db, serieId, userId);

      // Retirer le masquage (is_hidden = 0)
      db.prepare(`
        UPDATE manga_user_data SET
          is_hidden = 0,
          updated_at = datetime('now')
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
        SELECT is_hidden 
        FROM manga_user_data 
        WHERE serie_id = ? AND user_id = ?
      `).get(serieId, userId);

      return result && result.is_hidden === 1;
    } catch (error) {
      console.error('❌ Erreur is-serie-masquee:', error);
      return false;
    }
  });
}

module.exports = { registerMangaSeriesVisibilityHandlers };
