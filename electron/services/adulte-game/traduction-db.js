/**
 * Opérations base de données pour les traductions jeux adultes
 * Recherche, mise à jour et gestion des traductions dans la BDD
 */

const { fetchGoogleSheet } = require('./traduction-google-sheets');
const { extractF95Id } = require('./traduction-parsers');

/**
 * Recherche une traduction spécifique pour un jeu par son ID
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu dans la BDD
 * @returns {Promise<object>} Résultat de la recherche
 */
async function searchTranslationForGame(db, gameId) {
  try {
    console.log(`🔍 Recherche de traduction pour jeu ${gameId}...`);
    
    // Récupérer les infos du jeu
    const game = db.prepare(`
      SELECT id, f95_thread_id, Lewdcorner_thread_id, lien_f95, lien_lewdcorner, titre
      FROM adulte_game_games
      WHERE id = ?
    `).get(gameId);
    
    if (!game) {
      return { success: false, error: 'Jeu non trouvé' };
    }
    
    // Extraire l'ID F95/LewdCorner (priorité aux IDs stockés, puis extraction depuis les liens)
    const gameThreadId = game.f95_thread_id || game.Lewdcorner_thread_id || extractF95Id(game.lien_f95) || extractF95Id(game.lien_lewdcorner);
    if (!gameThreadId) {
      return { success: false, error: 'Aucun ID F95/LewdCorner trouvé pour ce jeu' };
    }
    
    console.log(`📋 ID du jeu: ${gameThreadId}`);
    
    // Récupérer les données du Sheet
    const sheetData = await fetchGoogleSheet();
    
    // Chercher toutes les traductions pour cet ID (peu importe le traducteur)
    const gameTranslations = sheetData.filter(item => item.id === parseInt(gameThreadId));
    
    if (gameTranslations.length === 0) {
      console.log(`❌ Aucune traduction trouvée pour "${game.titre}" (ID: ${gameThreadId})`);
      return { 
        success: false, 
        found: false,
        message: 'Aucune traduction trouvée dans le Google Sheet' 
      };
    }
    
    console.log(`✅ ${gameTranslations.length} traduction(s) trouvée(s) pour "${game.titre}"`);
    
    // Prendre l'entrée active ou la première
    const activeEntry = gameTranslations.find(t => t.actif === true) || gameTranslations[0];
    const traductions = gameTranslations.map(t => ({
      version: t.versionTraduite,
      type: t.typeTraduction,
      traducteur: t.traducteur,
      lien: t.lienTraduction,
      actif: t.actif
    }));
    
    // Filtrer l'URL de couverture si c'est LewdCorner
    let imageUrl = activeEntry.imageUrl || null;
    if (imageUrl && imageUrl.includes('lewdcorner.com')) {
      console.log(`🚫 URL LewdCorner ignorée pour la couverture`);
      imageUrl = null;
    }
    
    // Récupérer les champs modifiés par l'utilisateur pour respecter la protection
    const current = db.prepare('SELECT user_modified_fields FROM adulte_game_games WHERE id = ?').get(gameId);
    const userModifiedFields = current?.user_modified_fields || null;
    const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');
    
    // Mettre à jour tous les champs en respectant user_modified_fields
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'titre', activeEntry.nom, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'game_version', activeEntry.version, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'game_statut', activeEntry.statut, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'game_engine', activeEntry.moteur, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'tags', activeEntry.tags ? (Array.isArray(activeEntry.tags) ? JSON.stringify(activeEntry.tags) : activeEntry.tags) : null, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'couverture_url', imageUrl, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'version_traduite', activeEntry.versionTraduite, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'lien_traduction', activeEntry.lienTraduction, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'traducteur', activeEntry.traducteur, userModifiedFields);
    updateFieldIfNotUserModified(db, 'adulte_game_games', gameId, 'type_traduction', activeEntry.typeTraduction, userModifiedFields);
    
    // Toujours mettre à jour ces champs (non protégés)
    db.prepare(`
      UPDATE adulte_game_games
      SET traduction_fr_disponible = 1,
          traductions_multiples = ?,
          derniere_sync_trad = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      JSON.stringify(traductions),
      gameId
    );
    
    console.log(`✅ Traduction mise à jour pour "${game.titre}" → "${activeEntry.nom}" (traducteur: ${activeEntry.traducteur}, type: ${activeEntry.typeTraduction || 'N/A'})`);
    
    return {
      success: true,
      found: true,
      traductions: traductions.length,
      traducteur: activeEntry.traducteur,
      version: activeEntry.versionTraduite,
      type: activeEntry.typeTraduction
    };
  } catch (error) {
    console.error('❌ Erreur recherche traduction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Réinitialise les traductions d'un jeu
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 */
function clearTraduction(db, gameId) {
  try {
    db.prepare(`
      UPDATE adulte_game_games
      SET 
        traduction_fr_disponible = 0,
        version_traduite = NULL,
        lien_traduction = NULL,
        statut_traduction = NULL,
        type_traduction = NULL,
        traducteur = NULL,
        f95_trad_id = NULL,
        derniere_sync_trad = NULL
      WHERE id = ?
    `).run(gameId);
    
    console.log(`✅ Traduction réinitialisée pour jeu ${gameId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur clear traduction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour manuellement les informations de traduction
 * @param {object} db - Instance de la base de données
 * @param {number} gameId - ID du jeu
 * @param {object} tradData - Données de traduction
 */
function updateTraductionManually(db, gameId, tradData) {
  try {
    db.prepare(`
      UPDATE adulte_game_games
      SET 
        traduction_fr_disponible = ?,
        version_traduite = ?,
        lien_traduction = ?,
        statut_traduction = ?,
        type_traduction = ?,
        traducteur = ?,
        derniere_sync_trad = datetime('now')
      WHERE id = ?
    `).run(
      tradData.disponible ? 1 : 0,
      tradData.versionTraduite || null,
      tradData.lienTraduction || null,
      tradData.statut || null,
      tradData.typeTraduction || null,
      tradData.traducteur || null,
      gameId
    );
    
    console.log(`✅ Traduction mise à jour manuellement pour jeu ${gameId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur update traduction manuelle:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  searchTranslationForGame,
  clearTraduction,
  updateTraductionManually
};
