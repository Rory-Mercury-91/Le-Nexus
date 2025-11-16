/**
 * Opérations de base de données pour les traductions.
 * Gère la création de colonnes et les requêtes SQL.
 */

/**
 * Normalise la version depuis le Google Sheet
 * Transforme "Final", "Completed" ou une version vide en "v1.0"
 * @param {string|null|undefined} version - Version à normaliser
 * @returns {string|null} - Version normalisée ou null
 */
function normalizeVersion(version) {
  if (!version || typeof version !== 'string') {
    return 'v1.0';
  }
  
  const trimmed = version.trim();
  
  // Si vide, retourner v1.0
  if (trimmed === '') {
    return 'v1.0';
  }
  
  // Si "Final" ou "Completed" (insensible à la casse), retourner v1.0
  const upper = trimmed.toUpperCase();
  if (upper === 'FINAL' || upper === 'COMPLETED') {
    return 'v1.0';
  }
  
  // Sinon, retourner la version telle quelle
  return trimmed;
}

/**
 * Crée les colonnes de traduction dans la table adulte_game_games si elles n'existent pas
 * @param {object} db - Instance de la base de données
 */
function ensureTranslationColumns(db) {
  const alterQueries = [
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS traduction_fr_disponible INTEGER DEFAULT 0`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS version_traduite TEXT`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS lien_traduction TEXT`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS statut_traduction TEXT`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS type_traduction TEXT`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS traducteur TEXT`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS f95_trad_id INTEGER`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS derniere_sync_trad TEXT`,
    `ALTER TABLE adulte_game_games ADD COLUMN IF NOT EXISTS traductions_multiples TEXT`
  ];
  
  alterQueries.forEach(query => {
    try {
      db.exec(query);
    } catch (error) {
      // Colonne existe déjà, ignorer
    }
  });
}

/**
 * Met à jour un jeu existant avec les données de traduction
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 * @param {object} activeEntry - Données de l'entrée active
 * @param {Array} traductions - Liste des traductions
 * @param {string|null} imageUrl - URL de la couverture
 */
function updateGameWithTranslation(db, gameId, activeEntry, traductions, imageUrl) {
  const normalizedVersion = normalizeVersion(activeEntry.version);
  
  // Protection couverture: ne pas écraser une image locale ni un champ protégé par l'utilisateur
  let effectiveImageUrl = imageUrl || null;
  try {
    const current = db.prepare('SELECT couverture_url, user_modified_fields FROM adulte_game_games WHERE id = ?').get(gameId);
    const currentCover = current?.couverture_url || '';
    const userModified = current?.user_modified_fields || null;
    const { isFieldUserModified } = require('../../utils/enrichment-helpers');
    const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
    const isUserProtected = isFieldUserModified(userModified, 'couverture_url');
    if (isLocalCover || isUserProtected) {
      // Annuler la mise à jour de la couverture afin de conserver l'image locale/manuelle
      effectiveImageUrl = null;
    }
  } catch (e) {
    // En cas d'erreur de lecture, on continue avec l'imageUrl fournie
  }
  
  db.prepare(`
    UPDATE adulte_game_games SET
      titre = ?,
      version = ?,
      statut_jeu = ?,
      moteur = ?,
      tags = ?,
      couverture_url = COALESCE(?, couverture_url),
      traduction_fr_disponible = 1,
      version_traduite = ?,
      lien_traduction = ?,
      type_trad_fr = ?,
      traducteur = ?,
      traductions_multiples = ?,
      derniere_sync_trad = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    activeEntry.nom,
    normalizedVersion,
    activeEntry.statut,
    activeEntry.moteur,
    JSON.stringify(activeEntry.tags ? activeEntry.tags.split(',').map(t => t.trim()) : []),
    effectiveImageUrl,
    activeEntry.versionTraduite,
    activeEntry.lienTraduction,
    activeEntry.typeTraduction,
    activeEntry.traducteur,
    JSON.stringify(traductions),
    gameId
  );
}

/**
 * Crée un nouveau jeu avec les données de traduction
 * @param {object} db - Instance de la base de données
 * @param {number} gameThreadId - ID du thread F95/LewdCorner
 * @param {object} activeEntry - Données de l'entrée active
 * @param {string} plateforme - Plateforme (F95Zone ou LewdCorner)
 * @param {string} threadLink - Lien du thread
 * @param {Array} traductions - Liste des traductions
 * @param {string|null} imageUrl - URL de la couverture
 * @returns {number|null} - ID du jeu créé ou null en cas d'erreur
 */
function createGameWithTranslation(db, gameThreadId, activeEntry, plateforme, threadLink, traductions, imageUrl) {
  try {
    const normalizedVersion = normalizeVersion(activeEntry.version);
    
    const result = db.prepare(`
      INSERT INTO adulte_game_games (
        f95_thread_id,
        titre,
        version,
        statut_jeu,
        moteur,
        plateforme,
        lien_f95,
        tags,
        couverture_url,
        traduction_fr_disponible,
        version_traduite,
        lien_traduction,
        type_trad_fr,
        traducteur,
        traductions_multiples,
        derniere_sync_trad,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(
      parseInt(gameThreadId),
      activeEntry.nom,
      normalizedVersion,
      activeEntry.statut,
      activeEntry.moteur,
      plateforme,
      threadLink,
      JSON.stringify(activeEntry.tags ? activeEntry.tags.split(',').map(t => t.trim()) : []),
      imageUrl,
      activeEntry.versionTraduite,
      activeEntry.lienTraduction,
      activeEntry.typeTraduction,
      activeEntry.traducteur,
      JSON.stringify(traductions)
    );
    
    return result.lastInsertRowid;
  } catch (error) {
    if (!error.message.includes('UNIQUE constraint')) {
      console.error(`❌ Erreur création jeu: ${activeEntry.nom}`, error.message);
    }
    return null;
  }
}

/**
 * Met à jour uniquement les traductions d'un jeu existant
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 * @param {object} activeEntry - Données de l'entrée active
 * @param {Array} traductions - Liste des traductions
 */
function updateGameTranslationsOnly(db, gameId, activeEntry, traductions) {
  db.prepare(`
    UPDATE adulte_game_games
    SET traduction_fr_disponible = 1,
        version_traduite = ?,
        lien_traduction = ?,
        type_trad_fr = ?,
        traducteur = ?,
        traductions_multiples = ?,
        derniere_sync_trad = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    activeEntry.versionTraduite,
    activeEntry.lienTraduction,
    activeEntry.typeTraduction,
    activeEntry.traducteur,
    JSON.stringify(traductions),
    gameId
  );
}

/**
 * Met à jour les traductions d'un jeu existant (avec données optionnelles)
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 * @param {object} activeEntry - Données de l'entrée active
 * @param {Array} traductions - Liste des traductions
 * @param {string|null} imageUrl - URL de la couverture
 */
function updateExistingGameTranslations(db, gameId, activeEntry, traductions, imageUrl) {
  const normalizedVersion = activeEntry.version ? normalizeVersion(activeEntry.version) : null;
  
  // Protection couverture: ne pas écraser une image locale ni un champ protégé par l'utilisateur
  let effectiveImageUrl = imageUrl || null;
  try {
    const current = db.prepare('SELECT couverture_url, user_modified_fields FROM adulte_game_games WHERE id = ?').get(gameId);
    const currentCover = current?.couverture_url || '';
    const userModified = current?.user_modified_fields || null;
    const { isFieldUserModified } = require('../../utils/enrichment-helpers');
    const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
    const isUserProtected = isFieldUserModified(userModified, 'couverture_url');
    if (isLocalCover || isUserProtected) {
      effectiveImageUrl = null;
    }
  } catch (e) {
    // Ignorer et utiliser imageUrl tel quel
  }
  
  db.prepare(`
    UPDATE adulte_game_games
    SET titre = COALESCE(?, titre),
        version = COALESCE(?, version),
        statut_jeu = COALESCE(?, statut_jeu),
        moteur = COALESCE(?, moteur),
        tags = CASE WHEN ? IS NOT NULL THEN ? ELSE tags END,
        couverture_url = COALESCE(?, couverture_url),
        traduction_fr_disponible = 1,
        version_traduite = ?,
        lien_traduction = ?,
        type_trad_fr = ?,
        traducteur = ?,
        traductions_multiples = ?,
        derniere_sync_trad = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    activeEntry.nom || null,
    normalizedVersion,
    activeEntry.statut || null,
    activeEntry.moteur || null,
    activeEntry.tags ? JSON.stringify(activeEntry.tags.split(',').map(t => t.trim())) : null,
    activeEntry.tags ? JSON.stringify(activeEntry.tags.split(',').map(t => t.trim())) : null,
    effectiveImageUrl,
    activeEntry.versionTraduite,
    activeEntry.lienTraduction,
    activeEntry.typeTraduction,
    activeEntry.traducteur,
    JSON.stringify(traductions),
    gameId
  );
}

/**
 * Vérifie si un jeu est dans la liste noire
 * @param {object} db - Instance de la base de données
 * @param {number} gameThreadId - ID du thread
 * @param {string} plateforme - Plateforme (F95Zone ou LewdCorner)
 * @returns {boolean} - True si le jeu est dans la liste noire
 */
function isGameBlacklisted(db, gameThreadId, plateforme) {
  const blacklisted = db.prepare(`
    SELECT * FROM adulte_game_blacklist
    WHERE f95_thread_id = ? AND plateforme = ?
  `).all(parseInt(gameThreadId), plateforme);
  
  return blacklisted.length > 0;
}

/**
 * Supprime un jeu de la base de données
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 */
function deleteGame(db, gameId) {
  db.prepare('DELETE FROM adulte_game_games WHERE id = ?').run(gameId);
}

module.exports = {
  ensureTranslationColumns,
  updateGameWithTranslation,
  createGameWithTranslation,
  updateGameTranslationsOnly,
  updateExistingGameTranslations,
  isGameBlacklisted,
  deleteGame
};
