const { getUserIdByName } = require('../common-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Crée un handler générique pour récupérer les overrides d'affichage depuis une colonne JSON
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table (ex: 'tv_show_user_data', 'movie_user_data')
 * @param {string} config.itemIdColumnName - Nom de la colonne ID (ex: 'show_id', 'movie_id', 'game_id')
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @returns {Function} Handler IPC
 */
function createGetJsonDisplayOverridesHandler(config) {
  const { tableName, itemIdColumnName, getDb, store } = config;
  
  return (event, itemId) => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};

    const row = db.prepare(`
      SELECT display_preferences FROM ${tableName} 
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `).get(itemId, userId);

    if (!row || !row.display_preferences) {
      return {};
    }

    return safeJsonParse(row.display_preferences, {});
  };
}

/**
 * Crée un handler générique pour sauvegarder les overrides d'affichage dans une colonne JSON
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table
 * @param {string} config.itemIdColumnName - Nom de la colonne ID
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @param {Function} config.ensureRowExists - Fonction optionnelle pour s'assurer que la ligne existe
 * @param {boolean} config.useInsertOnConflict - Si true, utilise INSERT ... ON CONFLICT au lieu de UPDATE
 * @returns {Function} Handler IPC
 */
function createSaveJsonDisplayOverridesHandler(config) {
  const { tableName, itemIdColumnName, getDb, store, ensureRowExists, useInsertOnConflict = false } = config;
  
  return (event, itemId, overrides) => {
    const db = getDb();
    if (!db) {
      return { success: false, error: 'DB' };
    }
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      return { success: false, error: 'No user' };
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      return { success: false, error: 'User not found' };
    }

    // Récupérer les overrides existants
    const existingRow = db.prepare(`
      SELECT display_preferences FROM ${tableName} 
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `).get(itemId, userId);

    const existingOverrides = safeJsonParse(existingRow?.display_preferences, {});

    // Fusionner les nouveaux overrides avec les existants
    const merged = { ...existingOverrides, ...overrides };
    const mergedJson = JSON.stringify(merged);

    // Sauvegarder selon la stratégie
    if (useInsertOnConflict) {
      // Utiliser INSERT ... ON CONFLICT pour créer la ligne si elle n'existe pas
      db.prepare(`
        INSERT INTO ${tableName} (${itemIdColumnName}, user_id, display_preferences, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(${itemIdColumnName}, user_id) DO UPDATE SET
          display_preferences = excluded.display_preferences,
          updated_at = datetime('now')
      `).run(itemId, userId, mergedJson);
    } else {
      // S'assurer que la ligne existe si une fonction est fournie
      if (ensureRowExists) {
        ensureRowExists(db, itemId, userId);
      }

      // Utiliser UPDATE
      db.prepare(`
        UPDATE ${tableName} 
        SET display_preferences = ?, updated_at = datetime('now')
        WHERE ${itemIdColumnName} = ? AND user_id = ?
      `).run(mergedJson, itemId, userId);
    }

    return { success: true };
  };
}

/**
 * Crée un handler générique pour supprimer les overrides d'affichage depuis une colonne JSON
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table
 * @param {string} config.itemIdColumnName - Nom de la colonne ID
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @returns {Function} Handler IPC
 */
function createDeleteJsonDisplayOverridesHandler(config) {
  const { tableName, itemIdColumnName, getDb, store } = config;
  
  return (event, itemId, keys) => {
    const db = getDb();
    if (!db) {
      return { success: false, error: 'DB' };
    }
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      return { success: false, error: 'No user' };
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      return { success: false, error: 'User not found' };
    }

    // Récupérer les overrides existants
    const row = db.prepare(`
      SELECT display_preferences FROM ${tableName} 
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `).get(itemId, userId);

    if (!row || !row.display_preferences) {
      return { success: true };
    }

    const existingOverrides = safeJsonParse(row.display_preferences, {});

    // Supprimer les clés spécifiées
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      delete existingOverrides[key];
    });

    // Sauvegarder
    db.prepare(`
      UPDATE ${tableName} 
      SET display_preferences = ?, updated_at = datetime('now')
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `).run(JSON.stringify(existingOverrides), itemId, userId);

    return { success: true };
  };
}

/**
 * Crée un handler générique pour récupérer les overrides d'affichage depuis une table dédiée
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table (ex: 'manga_display_preferences')
 * @param {string} config.itemIdColumnName - Nom de la colonne ID (ex: 'manga_id', 'anime_id')
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @returns {Function} Handler IPC
 */
function createGetTableDisplayOverridesHandler(config) {
  const { tableName, itemIdColumnName, getDb, store } = config;
  
  return (event, itemId) => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    
    const rows = db.prepare(`SELECT champ, visible FROM ${tableName} WHERE ${itemIdColumnName} = ? AND user_id = ?`).all(itemId, userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  };
}

/**
 * Crée un handler générique pour sauvegarder les overrides d'affichage dans une table dédiée
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table
 * @param {string} config.itemIdColumnName - Nom de la colonne ID
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @returns {Function} Handler IPC
 */
function createSaveTableDisplayOverridesHandler(config) {
  const { tableName, itemIdColumnName, getDb, store } = config;
  
  return (event, itemId, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    
    const stmt = db.prepare(`INSERT INTO ${tableName} (${itemIdColumnName}, user_id, champ, visible) VALUES (?, ?, ?, ?)
                             ON CONFLICT(${itemIdColumnName}, user_id, champ) DO UPDATE SET visible=excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(itemId, userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  };
}

/**
 * Crée un handler générique pour supprimer les overrides d'affichage depuis une table dédiée
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table
 * @param {string} config.itemIdColumnName - Nom de la colonne ID
 * @param {Function} config.getDb - Fonction pour récupérer la DB
 * @param {Store} config.store - Instance electron-store
 * @returns {Function} Handler IPC
 */
function createDeleteTableDisplayOverridesHandler(config) {
  const { tableName, itemIdColumnName, getDb, store } = config;
  
  return (event, itemId, champKeys) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    
    if (!Array.isArray(champKeys) || champKeys.length === 0) {
      return { success: true };
    }
    
    const placeholders = champKeys.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM ${tableName} 
                             WHERE ${itemIdColumnName} = ? AND user_id = ? AND champ IN (${placeholders})`);
    stmt.run(itemId, userId, ...champKeys);
    return { success: true };
  };
}

module.exports = {
  createGetJsonDisplayOverridesHandler,
  createSaveJsonDisplayOverridesHandler,
  createDeleteJsonDisplayOverridesHandler,
  createGetTableDisplayOverridesHandler,
  createSaveTableDisplayOverridesHandler,
  createDeleteTableDisplayOverridesHandler
};
