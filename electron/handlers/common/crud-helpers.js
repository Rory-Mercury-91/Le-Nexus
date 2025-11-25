const { getUserIdByName } = require('../common-helpers');
const { markFieldAsUserModified } = require('../../utils/enrichment-helpers');

/**
 * Helper pour construire dynamiquement une requête UPDATE
 * @param {Object} config - Configuration
 * @param {string} config.tableName - Nom de la table
 * @param {string} config.idColumnName - Nom de la colonne ID (défaut: 'id')
 * @param {Object} config.data - Données à mettre à jour
 * @param {number} config.itemId - ID de l'item
 * @param {Set} config.fieldsToMarkAsUserModified - Champs à marquer comme modifiés par l'utilisateur
 * @param {Set} config.progressionFields - Champs de progression (ne pas marquer comme modifiés)
 * @param {Function} config.transformValue - Fonction pour transformer une valeur (ex: convertir boolean en 0/1)
 * @returns {Object} - { fields: string[], values: any[], fieldsToMark: string[] }
 */
function buildDynamicUpdateQuery(config) {
  const {
    tableName,
    idColumnName = 'id',
    data,
    itemId,
    fieldsToMarkAsUserModified = new Set(),
    progressionFields = new Set(),
    transformValue = (fieldName, value) => value === undefined ? null : value
  } = config;

  const fields = [];
  const values = [];
  const fieldsToMark = [];

  // Parcourir tous les champs fournis
  for (const [fieldName, value] of Object.entries(data)) {
    if (value === undefined) {
      continue; // Ignorer les champs undefined
    }

    // Transformer la valeur si nécessaire
    const transformedValue = transformValue(fieldName, value);

    // Ignorer le champ si transformValue retourne undefined (pour permettre d'exclure certains champs)
    if (transformedValue === undefined) {
      continue;
    }

    // Ajouter le champ à la requête
    fields.push(`${fieldName} = ?`);
    values.push(transformedValue);

    // Marquer comme modifié par l'utilisateur si nécessaire
    if (fieldsToMarkAsUserModified.has(fieldName) && !progressionFields.has(fieldName)) {
      fieldsToMark.push(fieldName);
    }
  }

  if (fields.length === 0) {
    return { fields: [], values: [], fieldsToMark: [] };
  }

  // Ne pas ajouter updated_at ici, il sera ajouté dans executeUpdateWithMarking si nécessaire
  // (certains handlers peuvent vouloir le gérer manuellement)

  return { fields, values, fieldsToMark };
}

/**
 * Helper pour exécuter une mise à jour avec marquage des champs
 * @param {Database} db - Instance de la base de données
 * @param {string} tableName - Nom de la table
 * @param {string} idColumnName - Nom de la colonne ID
 * @param {number} itemId - ID de l'item
 * @param {string[]} fields - Champs à mettre à jour (format: "field = ?")
 * @param {any[]} values - Valeurs pour les champs
 * @param {string[]} fieldsToMark - Champs à marquer comme modifiés par l'utilisateur
 */
function executeUpdateWithMarking(db, tableName, idColumnName, itemId, fields, values, fieldsToMark = [], options = {}) {
  // Marquer les champs comme modifiés par l'utilisateur
  for (const fieldName of fieldsToMark) {
    try {
      markFieldAsUserModified(db, tableName, itemId, fieldName);
    } catch (e) {
      // Ignorer les erreurs (table peut ne pas exister)
      console.warn(`⚠️ Impossible de marquer ${fieldName} comme modifié:`, e.message);
    }
  }

  // Ajouter updated_at si non spécifié dans les options
  if (options.addUpdatedAt !== false) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
  }

  // Ajouter l'ID à la fin pour le WHERE
  values.push(itemId);

  // Construire et exécuter la requête UPDATE
  const updateQuery = `
    UPDATE ${tableName}
    SET ${fields.join(', ')}
    WHERE ${idColumnName} = ?
  `;
  db.prepare(updateQuery).run(...values);
}

module.exports = {
  buildDynamicUpdateQuery,
  executeUpdateWithMarking
};
