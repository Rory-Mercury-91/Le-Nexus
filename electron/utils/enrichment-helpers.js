/**
 * Utilitaires pour gérer l'enrichissement et la protection des champs modifiés par l'utilisateur
 */

/**
 * Parse les champs modifiés par l'utilisateur depuis le JSON stocké
 * @param {string|null|undefined} userModifiedFields - JSON string ou null
 * @returns {Set<string>} - Set des noms de champs modifiés
 */
function parseUserModifiedFields(userModifiedFields) {
  if (!userModifiedFields) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(userModifiedFields);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.warn('Erreur parsing user_modified_fields:', error);
    return new Set();
  }
}

/**
 * Sérialise les champs modifiés par l'utilisateur en JSON
 * @param {Set<string>|Array<string>} fields - Set ou array des noms de champs
 * @returns {string|null} - JSON string ou null si vide
 */
function serializeUserModifiedFields(fields) {
  const array = Array.isArray(fields) ? fields : Array.from(fields);
  if (array.length === 0) {
    return null;
  }
  return JSON.stringify(array);
}

/**
 * Marque un champ comme modifié par l'utilisateur
 * @param {Database} db - Instance de la base de données
 * @param {string} tableName - Nom de la table (series, anime_series, movies, tv_shows, adulte_game_games)
 * @param {number} entityId - ID de l'entité
 * @param {string} fieldName - Nom du champ à marquer
 */
function markFieldAsUserModified(db, tableName, entityId, fieldName) {
  try {
    // Vérifier si la colonne user_modified_fields existe
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasUserModifiedFields = tableInfo.some(column => column.name === 'user_modified_fields');
    
    if (!hasUserModifiedFields) {
      // La colonne n'existe pas, l'ajouter
      try {
        db.prepare(`ALTER TABLE ${tableName} ADD COLUMN user_modified_fields TEXT`).run();
        console.log(`✅ Colonne user_modified_fields ajoutée à ${tableName} (fallback)`);
      } catch (alterError) {
        console.warn(`⚠️ Impossible d'ajouter la colonne user_modified_fields à ${tableName}:`, alterError.message);
        return; // Ne pas continuer si on ne peut pas ajouter la colonne
      }
    }

    const entity = db.prepare(`SELECT user_modified_fields FROM ${tableName} WHERE id = ?`).get(entityId);
    if (!entity) {
      console.warn(`Entité ${entityId} introuvable dans ${tableName}`);
      return;
    }

    const modifiedFields = parseUserModifiedFields(entity.user_modified_fields);
    modifiedFields.add(fieldName);

    db.prepare(`
      UPDATE ${tableName}
      SET user_modified_fields = ?
      WHERE id = ?
    `).run(serializeUserModifiedFields(modifiedFields), entityId);
  } catch (error) {
    console.error(`Erreur marquage champ modifié (${tableName}, ${entityId}, ${fieldName}):`, error);
  }
}

/**
 * Vérifie si un champ a été modifié par l'utilisateur
 * @param {string|null|undefined} userModifiedFields - JSON string ou null
 * @param {string} fieldName - Nom du champ à vérifier
 * @returns {boolean} - true si le champ a été modifié par l'utilisateur
 */
function isFieldUserModified(userModifiedFields, fieldName) {
  const modifiedFields = parseUserModifiedFields(userModifiedFields);
  return modifiedFields.has(fieldName);
}

/**
 * Vérifie si une entité a déjà été enrichie
 * @param {Database} db - Instance de la base de données
 * @param {string} tableName - Nom de la table
 * @param {number} entityId - ID de l'entité
 * @returns {boolean} - true si l'entité a déjà été enrichie
 */
function isEntityEnriched(db, tableName, entityId) {
  try {
    const entity = db.prepare(`SELECT enriched_at FROM ${tableName} WHERE id = ?`).get(entityId);
    return entity && entity.enriched_at !== null;
  } catch (error) {
    console.error(`Erreur vérification enrichissement (${tableName}, ${entityId}):`, error);
    return false;
  }
}

/**
 * Marque une entité comme enrichie
 * @param {Database} db - Instance de la base de données
 * @param {string} tableName - Nom de la table
 * @param {number} entityId - ID de l'entité
 */
function markEntityAsEnriched(db, tableName, entityId) {
  try {
    db.prepare(`
      UPDATE ${tableName}
      SET enriched_at = datetime('now')
      WHERE id = ?
    `).run(entityId);
  } catch (error) {
    console.error(`Erreur marquage enrichissement (${tableName}, ${entityId}):`, error);
  }
}

/**
 * Réinitialise le statut d'enrichissement d'une entité (pour forcer le ré-enrichissement)
 * @param {Database} db - Instance de la base de données
 * @param {string} tableName - Nom de la table
 * @param {number} entityId - ID de l'entité
 */
function resetEnrichmentStatus(db, tableName, entityId) {
  try {
    db.prepare(`
      UPDATE ${tableName}
      SET enriched_at = NULL
      WHERE id = ?
    `).run(entityId);
  } catch (error) {
    console.error(`Erreur réinitialisation enrichissement (${tableName}, ${entityId}):`, error);
  }
}

/**
 * Met à jour un champ seulement s'il n'a pas été modifié par l'utilisateur
 * @param {Database} db - Instance de la base de données
 * @param {string} tableName - Nom de la table
 * @param {number} entityId - ID de l'entité
 * @param {string} fieldName - Nom du champ
 * @param {any} newValue - Nouvelle valeur
 * @param {string|null|undefined} userModifiedFields - JSON string des champs modifiés
 * @param {boolean} force - Si true, ignore la protection user_modified_fields (force vérification)
 * @returns {boolean} - true si la mise à jour a été effectuée
 */
function updateFieldIfNotUserModified(db, tableName, entityId, fieldName, newValue, userModifiedFields, force = false) {
  if (!force && isFieldUserModified(userModifiedFields, fieldName)) {
    console.log(`⏭️ Champ ${fieldName} ignoré (modifié par l'utilisateur) pour ${tableName} ID ${entityId}`);
    return false;
  }
  
  if (force && isFieldUserModified(userModifiedFields, fieldName)) {
    console.log(`🔄 Champ ${fieldName} mis à jour en mode FORCE (protection ignorée) pour ${tableName} ID ${entityId}`);
  }

  try {
    // Échapper le nom du champ pour éviter les injections SQL
    // On vérifie que c'est un identifiant valide (lettres, chiffres, underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
      console.error(`Nom de champ invalide: ${fieldName}`);
      return false;
    }

    // S'assurer que newValue n'est pas undefined (peut être null)
    // Si newValue est undefined, on ne met pas à jour
    if (newValue === undefined) {
      console.log(`⏭️ Champ ${fieldName} ignoré (valeur undefined) pour ${tableName} ID ${entityId}`);
      return false;
    }

    // Vérifier que newValue n'est pas un objet vide ou invalide pour les champs texte
    // Si c'est un objet, on ne peut pas le stocker dans un champ texte
    if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
      // Si c'est un objet vide {}, on l'ignore
      if (Object.keys(newValue).length === 0) {
        console.log(`⏭️ Champ ${fieldName} ignoré (objet vide) pour ${tableName} ID ${entityId}`);
        return false;
      }
      // Sinon, c'est peut-être un objet complexe qui devrait être sérialisé en JSON
      console.warn(`⚠️ Champ ${fieldName} reçoit un objet non-sérialisé pour ${tableName} ID ${entityId}, conversion en JSON`);
      newValue = JSON.stringify(newValue);
    }

    // Pour les champs texte, permettre null mais pas undefined
    // null est une valeur valide en SQL pour indiquer l'absence de valeur
    const stmt = db.prepare(`
      UPDATE ${tableName}
      SET ${fieldName} = ?
      WHERE id = ?
    `);
    stmt.run(newValue, entityId);
    return true;
  } catch (error) {
    console.error(`Erreur mise à jour champ (${tableName}, ${entityId}, ${fieldName}):`, error);
    console.error(`Valeur reçue:`, newValue, `Type:`, typeof newValue);
    return false;
  }
}

module.exports = {
  parseUserModifiedFields,
  serializeUserModifiedFields,
  markFieldAsUserModified,
  isFieldUserModified,
  isEntityEnriched,
  markEntityAsEnriched,
  resetEnrichmentStatus,
  updateFieldIfNotUserModified
};
