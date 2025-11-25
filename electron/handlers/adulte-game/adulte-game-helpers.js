/**
 * Fonctions helper pour les handlers des jeux adultes
 */

// Import des fonctions communes
const { getUserIdByName, getUserByName } = require('../common-helpers');

/**
 * Helper pour parser les tags (JSON/CSV -> array)
 * @param {string|Array} tags - Tags à parser
 * @returns {Array} - Tableau de tags
 */
function parseTags(tags) {
  if (!tags) return [];
  
  try {
    if (Array.isArray(tags)) {
      return tags;
    }
    const { safeJsonParse } = require('../common-helpers');
    if (typeof tags === 'string' && tags.trim().startsWith('[')) {
      return safeJsonParse(tags, []);
    }
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
  } catch (e) {
    console.warn(`Erreur parsing tags:`, e.message);
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
  }
  return [];
}

module.exports = {
  getUserIdByName,
  getUserByName,
  parseTags
};
