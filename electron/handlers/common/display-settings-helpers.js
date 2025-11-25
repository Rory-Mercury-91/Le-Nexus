const { getUserIdByName } = require('../common-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Crée un handler générique pour récupérer les display settings globaux depuis user_preferences
 * @param {Object} config - Configuration
 * @param {string} config.contentType - Type de contenu ('mangas', 'animes', 'movies', 'tv_shows', 'adulte_game')
 * @param {Object} config.defaultDisplay - Objet avec les valeurs par défaut
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @param {string} config.storeKey - Clé dans electron-store pour migration (ex: 'movies.displaySettings')
 * @returns {Function} Handler IPC
 */
function createGetGlobalDisplaySettingsHandler(config) {
  const { contentType, defaultDisplay = {}, getDb, store, storeKey = null } = config;
  
  return () => {
    const db = getDb();
    const currentUser = store.get('currentUser', '');
    
    // Si pas de DB ou pas d'utilisateur, essayer electron-store (pour migration)
    if (!db || !currentUser) {
      if (storeKey) {
        const saved = store.get(storeKey, {});
        return {
          ...defaultDisplay,
          ...saved
        };
      }
      return defaultDisplay;
    }

    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      // Fallback sur electron-store si disponible
      if (storeKey) {
        const saved = store.get(storeKey, {});
        return {
          ...defaultDisplay,
          ...saved
        };
      }
      return defaultDisplay;
    }

    // Récupérer les préférences depuis user_preferences avec content_type
    const prefs = db.prepare(`
      SELECT key, value FROM user_preferences 
      WHERE user_id = ? AND content_type = ? AND type = 'display_settings'
    `).all(userId, contentType);

    const saved = {};
    for (const pref of prefs) {
      const parsed = safeJsonParse(pref.value, {});
      // Gérer deux formats : { visible: boolean } ou valeur directe
      if (parsed && typeof parsed === 'object' && 'visible' in parsed) {
        saved[pref.key] = parsed.visible === true;
      } else if (parsed && typeof parsed !== 'object') {
        saved[pref.key] = parsed;
      } else {
        saved[pref.key] = parsed;
      }
    }

    // Si aucune préférence en DB et qu'on a une clé store, essayer de migrer
    if (Object.keys(saved).length === 0 && storeKey) {
      const storePrefs = store.get(storeKey, {});
      if (Object.keys(storePrefs).length > 0) {
        // Migrer automatiquement
        const tx = db.transaction(() => {
          for (const [key, value] of Object.entries(storePrefs)) {
            const valueJson = JSON.stringify(value);
            db.prepare(`
              INSERT INTO user_preferences (user_id, content_type, type, key, value, platform, created_at, updated_at)
              VALUES (?, ?, 'display_settings', ?, ?, NULL, datetime('now'), datetime('now'))
            `).run(userId, contentType, key, valueJson);
          }
        });
        tx();
        
        // Supprimer de electron-store après migration
        store.delete(storeKey);
        return {
          ...defaultDisplay,
          ...storePrefs
        };
      }
    }

    return {
      ...defaultDisplay,
      ...saved
    };
  };
}

/**
 * Crée un handler générique pour sauvegarder les display settings globaux dans user_preferences
 * @param {Object} config - Configuration
 * @param {string} config.contentType - Type de contenu ('mangas', 'animes', 'movies', 'tv_shows', 'adulte_game')
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @param {boolean} config.useVisibleFormat - Si true, enveloppe la valeur dans { visible: boolean }
 * @returns {Function} Handler IPC
 */
function createSaveGlobalDisplaySettingsHandler(config) {
  const { contentType, getDb, store, useVisibleFormat = false } = config;
  
  return (event, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };

    const stmt = db.prepare(`
      INSERT INTO user_preferences (user_id, content_type, type, key, value, created_at, updated_at)
      VALUES (?, ?, 'display_settings', ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, COALESCE(content_type, ''), type, key, COALESCE(platform, '')) 
      DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(prefs || {})) {
        let valueJson;
        if (useVisibleFormat) {
          // Format { visible: boolean }
          valueJson = JSON.stringify({ visible: value === true });
        } else {
          // Format valeur directe (pour movies/series qui stockent des objets)
          valueJson = JSON.stringify(value);
        }
        stmt.run(userId, contentType, key, valueJson);
      }
    });
    tx();
    
    return { success: true };
  };
}

module.exports = {
  createGetGlobalDisplaySettingsHandler,
  createSaveGlobalDisplaySettingsHandler
};
