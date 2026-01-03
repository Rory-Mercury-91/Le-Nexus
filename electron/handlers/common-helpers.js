/**
 * Fonctions helper communes partagées entre tous les handlers
 * Ces fonctions sont utilisées dans plusieurs modules pour éviter la duplication
 */

/**
 * Récupère l'ID d'un utilisateur par son nom
 * @param {Database} db - Instance de la base de données
 * @param {string} userName - Nom de l'utilisateur
 * @returns {number|null} - ID de l'utilisateur ou null
 */
function getUserIdByName(db, userName) {
  if (!db || !userName) return null;
  const user = db.prepare('SELECT id FROM users WHERE name = ?').get(userName);
  return user ? user.id : null;
}

/**
 * Récupère l'utilisateur complet par son nom
 * @param {Database} db - Instance de la base de données
 * @param {string} userName - Nom de l'utilisateur
 * @returns {Object|null} - Utilisateur complet ou null
 */
function getUserByName(db, userName) {
  if (!db || !userName) return null;
  const user = db.prepare('SELECT * FROM users WHERE name = ?').get(userName);
  return user || null;
}

/**
 * Récupère l'UUID d'un utilisateur par son nom (pour la synchronisation cloud)
 * @param {Database} db - Instance de la base de données
 * @param {string} userName - Nom de l'utilisateur
 * @returns {string|null} - UUID de l'utilisateur ou null
 */
function getUserUuidByName(db, userName) {
  if (!db || !userName) return null;
  const user = db.prepare('SELECT id, sync_uuid FROM users WHERE name = ?').get(userName);
  if (!user) return null;
  
  // Si l'utilisateur n'a pas d'UUID, en générer un
  if (!user.sync_uuid) {
    const crypto = require('crypto');
    const uuid = crypto.randomUUID();
    db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, user.id);
    return uuid;
  }
  
  return user.sync_uuid;
}

/**
 * Récupère l'UUID d'un utilisateur par son ID (pour la synchronisation cloud)
 * @param {Database} db - Instance de la base de données
 * @param {number} userId - ID de l'utilisateur
 * @returns {string|null} - UUID de l'utilisateur ou null
 */
function getUserUuidById(db, userId) {
  if (!db || !userId) return null;
  const user = db.prepare('SELECT sync_uuid FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  
  // Si l'utilisateur n'a pas d'UUID, en générer un
  if (!user.sync_uuid) {
    const crypto = require('crypto');
    const uuid = crypto.randomUUID();
    db.prepare('UPDATE users SET sync_uuid = ? WHERE id = ?').run(uuid, userId);
    return uuid;
  }
  
  return user.sync_uuid;
}

/**
 * Parse JSON de manière sécurisée avec fallback
 * @param {string|null|undefined} jsonString - La chaîne JSON à parser
 * @param {any} defaultValue - Valeur par défaut si le parsing échoue
 * @returns {any} L'objet parsé ou la valeur par défaut
 */
function safeJsonParse(jsonString, defaultValue = null) {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('⚠️ Erreur parsing JSON:', error.message, 'Valeur:', jsonString?.substring(0, 100));
    return defaultValue;
  }
}

/**
 * Récupère les chemins depuis le PathManager
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance electron-store (optionnel, pour fallback)
 * @returns {Object} - Objet contenant les chemins
 */
function getPaths(getPathManager, store = null) {
  const pm = typeof getPathManager === 'function' ? getPathManager() : getPathManager;

  // Si PathManager est disponible, l'utiliser
  if (pm) {
    return pm.getPaths();
  }

  // Sinon, essayer de récupérer depuis le store
  if (store) {
    const baseDirectory = store.get('baseDirectory');
    if (baseDirectory) {
      const path = require('path');
      return {
        base: baseDirectory,
        configs: path.join(baseDirectory, 'configs'),
        databases: path.join(baseDirectory, 'databases'),
        profiles: path.join(baseDirectory, 'profiles'),
        covers: path.join(baseDirectory, 'covers'),
        series: path.join(baseDirectory, 'covers', 'series')
      };
    }
  }

  // Fallback : chemins vides
  return { base: '', configs: '', databases: '', profiles: '', covers: '', series: '' };
}

module.exports = {
  getUserIdByName,
  getUserByName,
  getUserUuidByName,
  getUserUuidById,
  getPaths,
  safeJsonParse
};
