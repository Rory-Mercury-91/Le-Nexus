const { getUserIdByName } = require('../common-helpers');

/**
 * Configuration pour créer un handler de toggle favorite
 */
function createToggleFavoriteHandler(config) {
  const {
    itemIdParamName = 'itemId', // 'movieId', 'showId', etc.
    statusTableName, // 'movie_user_status', 'tv_show_user_status', etc.
    itemIdColumnName, // 'movie_id', 'show_id', etc.
    ensureStatusRowFn // Fonction pour s'assurer que la ligne existe
  } = config;

  return (event, params) => {
    const itemId = params[itemIdParamName];
    if (!itemId) {
      throw new Error(`${itemIdParamName} est requis`);
    }

    const db = config.getDb();
    const currentUser = config.store.get('currentUser', '');
    if (!currentUser) {
      throw new Error('Aucun utilisateur sélectionné');
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      throw new Error('Utilisateur introuvable');
    }

    // S'assurer que la ligne de statut existe
    if (ensureStatusRowFn) {
      ensureStatusRowFn(db, itemId, userId);
    }

    // Toggle is_favorite
    const current = db.prepare(`SELECT is_favorite FROM ${statusTableName} WHERE ${itemIdColumnName} = ? AND user_id = ?`).get(itemId, userId);
    const newValue = current?.is_favorite === 1 ? 0 : 1;
    // Utiliser updated_at au lieu de date_modification pour movie_user_data
    const dateColumn = statusTableName.includes('user_data') ? 'updated_at' : 'date_modification';
    db.prepare(`UPDATE ${statusTableName} SET is_favorite = ?, ${dateColumn} = CURRENT_TIMESTAMP WHERE ${itemIdColumnName} = ? AND user_id = ?`)
      .run(newValue, itemId, userId);

    return { success: true, isFavorite: !!newValue };
  };
}

/**
 * Configuration pour créer un handler de toggle hidden
 */
function createToggleHiddenHandler(config) {
  const {
    itemIdParamName = 'itemId',
    statusTableName,
    itemIdColumnName,
    ensureStatusRowFn
  } = config;

  return (event, params) => {
    const itemId = params[itemIdParamName];
    if (!itemId) {
      throw new Error(`${itemIdParamName} est requis`);
    }

    const db = config.getDb();
    const currentUser = config.store.get('currentUser', '');
    if (!currentUser) {
      throw new Error('Aucun utilisateur sélectionné');
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      throw new Error('Utilisateur introuvable');
    }

    // S'assurer que la ligne de statut existe
    if (ensureStatusRowFn) {
      ensureStatusRowFn(db, itemId, userId);
    }

    // Toggle is_hidden
    const current = db.prepare(`SELECT is_hidden FROM ${statusTableName} WHERE ${itemIdColumnName} = ? AND user_id = ?`).get(itemId, userId);
    const newValue = current?.is_hidden === 1 ? 0 : 1;
    // Utiliser updated_at au lieu de date_modification pour movie_user_data
    const dateColumn = statusTableName.includes('user_data') ? 'updated_at' : 'date_modification';
    db.prepare(`UPDATE ${statusTableName} SET is_hidden = ?, ${dateColumn} = CURRENT_TIMESTAMP WHERE ${itemIdColumnName} = ? AND user_id = ?`)
      .run(newValue, itemId, userId);

    return { success: true, isHidden: !!newValue };
  };
}

/**
 * Configuration pour créer un handler de set status
 * 
 * @param {Object} config - Configuration
 * @param {string} config.itemIdParamName - Nom du paramètre pour l'ID de l'item ('movieId', 'showId', etc.)
 * @param {string} config.statusTableName - Nom de la table de statut ('movie_user_status', 'tv_show_user_status', etc.)
 * @param {string} config.itemIdColumnName - Nom de la colonne ID dans la table de statut ('movie_id', 'show_id', etc.)
 * @param {Function} config.ensureStatusRowFn - Fonction pour s'assurer que la ligne existe
 * @param {Function} config.buildUpdateQuery - Fonction pour construire la requête UPDATE avec les champs spécifiques
 * @param {Function} config.buildUpdateParams - Fonction pour construire les paramètres de la requête UPDATE
 */
function createSetStatusHandler(config) {
  const {
    itemIdParamName = 'itemId',
    statusTableName,
    itemIdColumnName,
    ensureStatusRowFn,
    buildUpdateQuery,
    buildUpdateParams
  } = config;

  return (event, params) => {
    const itemId = params[itemIdParamName];
    if (!itemId) {
      throw new Error(`${itemIdParamName} est requis`);
    }

    const db = config.getDb();
    const currentUser = config.store.get('currentUser', '');
    if (!currentUser) {
      throw new Error('Aucun utilisateur sélectionné');
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      throw new Error('Utilisateur introuvable');
    }

    // S'assurer que la ligne de statut existe
    if (ensureStatusRowFn) {
      ensureStatusRowFn(db, itemId, userId);
    }

    // Construire et exécuter la requête UPDATE
    const updateQuery = buildUpdateQuery(statusTableName, itemIdColumnName);
    const updateParams = buildUpdateParams(params, itemId, userId);

    db.prepare(updateQuery).run(...updateParams);

    return { success: true, statut: params.statut || 'À regarder' };
  };
}

module.exports = {
  createToggleFavoriteHandler,
  createToggleHiddenHandler,
  createSetStatusHandler
};
