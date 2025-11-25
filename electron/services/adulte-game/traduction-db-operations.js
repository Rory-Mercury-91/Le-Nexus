/**
 * Opérations de base de données pour les traductions.
 * Gère la création de colonnes et les requêtes SQL.
 */

/**
 * Normalise la version depuis le Google Sheet
 * Retourne la version telle quelle (sans transformation)
 * @param {string|null|undefined} version - Version à normaliser
 * @returns {string|null} - Version normalisée ou null
 */
function normalizeVersion(version) {
  if (!version || typeof version !== 'string') {
    return null;
  }
  
  const trimmed = version.trim();
  
  // Si vide, retourner null
  if (trimmed === '') {
    return null;
  }
  
  // Retourner la version telle quelle (support de "Final", "Completed", etc.)
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
  // Utiliser la version telle quelle (sans normalisation) pour supporter "Final", "Completed", etc.
  const normalizedVersion = activeEntry.version ? activeEntry.version.trim() : null;
  
  // Protection couverture: ne pas écraser une image locale ni un champ protégé par l'utilisateur
  let effectiveImageUrl = imageUrl || null;
  try {
    const current = db.prepare('SELECT couverture_url, user_modified_fields, version_traduite, maj_disponible, game_version, titre, game_statut FROM adulte_game_games WHERE id = ?').get(gameId);
    const currentCover = current?.couverture_url || '';
    const userModified = current?.user_modified_fields || null;
    const { isFieldUserModified } = require('../../utils/enrichment-helpers');
    const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
    const isUserProtected = isFieldUserModified(userModified, 'couverture_url');
    if (isLocalCover || isUserProtected) {
      // Annuler la mise à jour de la couverture afin de conserver l'image locale/manuelle
      effectiveImageUrl = null;
    }
    
    // Détecter si la version de traduction a changé (déclencheur de mise à jour)
    const currentTranslationVersion = current?.version_traduite || '';
    const newTranslationVersion = activeEntry.versionTraduite || '';
    const translationVersionChanged = newTranslationVersion && newTranslationVersion !== currentTranslationVersion;
    
    // Détecter si la version du jeu a changé (déclencheur de mise à jour)
    const currentGameVersion = current?.game_version || '';
    const gameVersionChanged = normalizedVersion && normalizedVersion !== currentGameVersion;
    
    // Détecter si le titre a changé (déclencheur de mise à jour)
    const currentTitle = current?.titre || '';
    const titleChanged = activeEntry.nom && activeEntry.nom !== currentTitle;
    
    // Détecter si le statut a changé (déclencheur de mise à jour)
    const currentStatus = current?.game_statut || '';
    const statusChanged = activeEntry.statut && activeEntry.statut !== currentStatus;
    
    // Seuls ces changements déclenchent une notification de mise à jour
    const shouldSignalUpdate = translationVersionChanged || gameVersionChanged || titleChanged || statusChanged;
    
    // Déterminer la valeur de maj_disponible
    const currentMajDisponible = current?.maj_disponible || 0;
    const majDisponibleValue = shouldSignalUpdate ? 1 : currentMajDisponible;
    
    if (translationVersionChanged) {
      console.log(`  ✅ Version de traduction changée: ${currentTranslationVersion || 'Aucune'} → ${newTranslationVersion} (mise à jour signalée)`);
    }
    if (gameVersionChanged) {
      console.log(`  ✅ Version du jeu changée: ${currentGameVersion || 'Aucune'} → ${normalizedVersion} (mise à jour signalée)`);
    }
    if (titleChanged) {
      console.log(`  ✅ Titre changé: ${currentTitle} → ${activeEntry.nom} (mise à jour signalée)`);
    }
    if (statusChanged) {
      console.log(`  ✅ Statut changé: ${currentStatus || 'Aucun'} → ${activeEntry.statut} (mise à jour signalée)`);
    }
    
    db.prepare(`
      UPDATE adulte_game_games SET
        titre = ?,
        game_version = ?,
        game_statut = ?,
        game_engine = ?,
        tags = ?,
        couverture_url = COALESCE(?, couverture_url),
        traduction_fr_disponible = 1,
        version_traduite = ?,
        statut_traduction = ?,
        type_traduction = ?,
        traducteur = ?,
        traductions_multiples = ?,
        maj_disponible = ?,
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
      activeEntry.typeTraduction ? 'TERMINÉ' : null, // statut_traduction
      activeEntry.typeTraduction,
      activeEntry.traducteur,
      JSON.stringify(traductions),
      majDisponibleValue,
      gameId
    );
  } catch (e) {
    // En cas d'erreur de lecture, on continue avec l'imageUrl fournie et sans détection de changement
    db.prepare(`
      UPDATE adulte_game_games SET
        titre = ?,
        game_version = ?,
        game_statut = ?,
        game_engine = ?,
        tags = ?,
        couverture_url = COALESCE(?, couverture_url),
        traduction_fr_disponible = 1,
        version_traduite = ?,
        statut_traduction = ?,
        type_traduction = ?,
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
      activeEntry.typeTraduction ? 'TERMINÉ' : null, // statut_traduction
      activeEntry.typeTraduction,
      activeEntry.traducteur,
      JSON.stringify(traductions),
      gameId
    );
  }
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
    
    // Déterminer les IDs selon la plateforme
    let f95_thread_id = null;
    let Lewdcorner_thread_id = null;
    let lien_f95 = null;
    let lien_lewdcorner = null;
    
    if (plateforme === 'F95Zone' || plateforme === 'F95z') {
      f95_thread_id = parseInt(gameThreadId);
      lien_f95 = threadLink;
    } else if (plateforme === 'LewdCorner' || plateforme === 'lewdcorner') {
      Lewdcorner_thread_id = parseInt(gameThreadId);
      lien_lewdcorner = threadLink;
    }
    
    const result = db.prepare(`
      INSERT INTO adulte_game_games (
        f95_thread_id,
        Lewdcorner_thread_id,
        titre,
        game_version,
        game_statut,
        game_engine,
        game_site,
        lien_f95,
        lien_lewdcorner,
        tags,
        couverture_url,
        traduction_fr_disponible,
        version_traduite,
        statut_traduction,
        type_traduction,
        traducteur,
        traductions_multiples,
        derniere_sync_trad,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(
      f95_thread_id,
      Lewdcorner_thread_id,
      activeEntry.nom,
      normalizedVersion,
      activeEntry.statut,
      activeEntry.moteur,
      plateforme,
      lien_f95,
      lien_lewdcorner,
      JSON.stringify(activeEntry.tags ? activeEntry.tags.split(',').map(t => t.trim()) : []),
      imageUrl,
      activeEntry.versionTraduite,
      activeEntry.typeTraduction ? 'TERMINÉ' : null, // statut_traduction
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
  // Utiliser la version telle quelle (sans normalisation) pour supporter "Final", "Completed", etc.
  const versionToUpdate = activeEntry.version ? activeEntry.version.trim() : null;
  
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
  
  // Construire la requête dynamiquement pour forcer la mise à jour de la version si elle existe
  const updateFields = [];
  const updateParams = [];
  
  if (activeEntry.nom) {
    updateFields.push('titre = ?');
    updateParams.push(activeEntry.nom);
  }
  
  if (versionToUpdate !== null) {
    updateFields.push('game_version = ?');
    updateParams.push(versionToUpdate);
  }
  
  if (activeEntry.statut) {
    updateFields.push('game_statut = ?');
    updateParams.push(activeEntry.statut);
  }
  
  if (activeEntry.moteur) {
    updateFields.push('game_engine = ?');
    updateParams.push(activeEntry.moteur);
  }
  
  if (activeEntry.tags) {
    updateFields.push('tags = ?');
    updateParams.push(JSON.stringify(activeEntry.tags.split(',').map(t => t.trim())));
  }
  
  if (effectiveImageUrl) {
    updateFields.push('couverture_url = ?');
    updateParams.push(effectiveImageUrl);
  }
  
  // Toujours mettre à jour les champs de traduction
  updateFields.push('traduction_fr_disponible = 1');
  updateFields.push('version_traduite = ?');
  updateParams.push(activeEntry.versionTraduite || null);
  updateFields.push('statut_traduction = ?');
  updateParams.push(activeEntry.typeTraduction ? 'TERMINÉ' : null);
  updateFields.push('type_traduction = ?');
  updateParams.push(activeEntry.typeTraduction || null);
  updateFields.push('traducteur = ?');
  updateParams.push(activeEntry.traducteur || null);
  updateFields.push('traductions_multiples = ?');
  updateParams.push(JSON.stringify(traductions));
  updateFields.push('derniere_sync_trad = datetime(\'now\')');
  updateFields.push('updated_at = datetime(\'now\')');
  
  updateParams.push(gameId);
  
  if (updateFields.length > 0) {
    db.prepare(`
      UPDATE adulte_game_games
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateParams);
  }
}

/**
 * Vérifie si un jeu est dans la liste noire
 * @param {object} db - Instance de la base de données
 * @param {number} gameThreadId - ID du thread
 * @param {string} plateforme - Plateforme (F95Zone ou LewdCorner)
 * @returns {boolean} - True si le jeu est dans la liste noire
 */
function isGameBlacklisted(db, gameThreadId, plateforme) {
  // Vérifier dans user_preferences (type='blacklist', content_type='adulte_game')
  // Note: Cette fonction ne prend pas en compte l'utilisateur, elle vérifie globalement
  // Pour une vérification par utilisateur, il faudrait passer userId en paramètre
  const blacklisted = db.prepare(`
    SELECT * FROM user_preferences
    WHERE content_type = 'adulte_game' AND type = 'blacklist' AND key = ? AND platform = ?
  `).all(gameThreadId.toString(), plateforme);
  
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
