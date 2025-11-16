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
      SELECT id, f95_thread_id, lien_f95, titre
      FROM adulte_game_games
      WHERE id = ?
    `).get(gameId);
    
    if (!game) {
      return { success: false, error: 'Jeu non trouvé' };
    }
    
    // Extraire l'ID F95/LewdCorner
    const gameThreadId = game.f95_thread_id || extractF95Id(game.lien_f95);
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
    
    // Mettre à jour la BDD avec les infos du jeu ET de traduction
    db.prepare(`
      UPDATE adulte_game_games
      SET titre = ?,
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
      activeEntry.version,
      activeEntry.statut,
      activeEntry.moteur,
      JSON.stringify(activeEntry.tags ? activeEntry.tags.split(',').map(t => t.trim()) : []),
      imageUrl,
      activeEntry.versionTraduite,
      activeEntry.lienTraduction,
      activeEntry.typeTraduction,
      activeEntry.traducteur,
      JSON.stringify(traductions),
      gameId
    );
    
    console.log(`✅ Traduction mise à jour pour "${game.titre}" → "${activeEntry.nom}" (traducteur: ${activeEntry.traducteur})`);
    
    return {
      success: true,
      found: true,
      traductions: traductions.length,
      traducteur: activeEntry.traducteur,
      version: activeEntry.versionTraduite
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
