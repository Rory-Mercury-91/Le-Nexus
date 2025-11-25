const { getMergePreview, mergeEntities } = require('../../services/merge/merge-service');

function registerDevMergeHandlers(ipcMain, getDb, getPathManager) {
  ipcMain.handle('dev-merge-preview', (event, payload) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const { type, sourceId, targetId } = payload || {};
      if (!type) {
        return { success: false, error: 'Type de contenu requis' };
      }

      return getMergePreview(db, type, sourceId, targetId);
    } catch (error) {
      console.error('❌ Erreur dev-merge-preview:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dev-merge-apply', (event, payload) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non disponible' };
      }

      const { type } = payload || {};
      if (!type) {
        return { success: false, error: 'Type de contenu requis' };
      }

      return mergeEntities(db, type, payload, getPathManager);
    } catch (error) {
      console.error('❌ Erreur dev-merge-apply:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDevMergeHandlers };
