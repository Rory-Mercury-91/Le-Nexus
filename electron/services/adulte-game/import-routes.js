/**
 * Handlers d'import pour les jeux adultes
 * Route: /import-adulte-game
 */

const { parseRequestBody, sendErrorResponse, sendSuccessResponse, validateDbAndUser } = require('../import-server-common');
const { recordExtractedData } = require('../../utils/sync-error-reporter');

/**
 * Handler: POST /import-adulte-game
 */
async function handleImportAdulteGame(req, res, getDb, store) {
  try {
    const body = await parseRequestBody(req);
    const adulteGameData = JSON.parse(body);
    console.log('🎮 Import jeu adulte:', adulteGameData.titre || adulteGameData.name);

    recordExtractedData({
      entityType: 'adulte-game',
      entityId: adulteGameData.id || adulteGameData.f95_thread_id || adulteGameData.name || adulteGameData.titre || `payload-${Date.now()}`,
      data: adulteGameData
    });

    const { db, currentUser } = validateDbAndUser(getDb, store);

    // Normaliser les données
  const normalizedTags = (() => {
    if (Array.isArray(adulteGameData.tags)) {
      return adulteGameData.tags;
    }
    if (typeof adulteGameData.tags === 'string') {
      return adulteGameData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
    }
    return [];
  })();

  const gameData = {
      f95_thread_id: adulteGameData.id || adulteGameData.f95_thread_id,
      titre: adulteGameData.name || adulteGameData.titre,
      version: adulteGameData.version,
      statut_jeu: adulteGameData.status || adulteGameData.statut_jeu || 'EN COURS',
      moteur: adulteGameData.type || adulteGameData.moteur,
    developpeur: adulteGameData.developer || adulteGameData.developpeur || null,
      couverture_url: adulteGameData.image || adulteGameData.couverture_url,
    tags: normalizedTags,
      lien_f95: adulteGameData.link || adulteGameData.lien_f95,
      lien_traduction: adulteGameData.lien_traduction || null,
      lien_jeu: adulteGameData.lien_jeu || null,
      statut_perso: adulteGameData.statut_perso || 'À jouer',
      notes_privees: adulteGameData.notes_privees || null,
      chemin_executable: adulteGameData.chemin_executable || null
    };

    // Détecter la plateforme
    const isLewdCorner = gameData.lien_f95 && gameData.lien_f95.includes('lewdcorner');
    const plateforme = isLewdCorner ? 'LewdCorner' : 'F95Zone';

    // Vérifier si le jeu existe déjà
    let existingGame = null;
    if (gameData.f95_thread_id) {
      if (plateforme === 'LewdCorner') {
        existingGame = db.prepare('SELECT * FROM adulte_game_games WHERE Lewdcorner_thread_id = ? AND game_site = ?').get(gameData.f95_thread_id, plateforme);
      } else {
        existingGame = db.prepare('SELECT * FROM adulte_game_games WHERE f95_thread_id = ? AND game_site = ?').get(gameData.f95_thread_id, plateforme);
      }
    }

    if (existingGame) {
      // Mise à jour du jeu existant
      // Protection couverture: conserver l'image locale ou protégée par l'utilisateur
      let effectiveCover = gameData.couverture_url;
      try {
        const row = db.prepare('SELECT couverture_url, user_modified_fields FROM adulte_game_games WHERE id = ?').get(existingGame.id);
        const currentCover = row?.couverture_url || '';
        const userModified = row?.user_modified_fields || null;
        const { isFieldUserModified } = require('../../utils/enrichment-helpers');
        const isLocalCover = currentCover && !currentCover.includes('://') && !currentCover.startsWith('data:');
        const isUserProtected = isFieldUserModified(userModified, 'couverture_url');
        if (isLocalCover || isUserProtected) {
          effectiveCover = currentCover; // ne pas écraser
        }
      } catch (e) {
        // ignorer, utiliser effectiveCover tel quel
      }

      // Déterminer les IDs selon la plateforme
      let f95_thread_id = null;
      let Lewdcorner_thread_id = null;
      let lien_f95 = null;
      let lien_lewdcorner = null;
      
      if (plateforme === 'F95Zone' || plateforme === 'F95z') {
        f95_thread_id = gameData.f95_thread_id;
        lien_f95 = gameData.lien_f95;
      } else if (plateforme === 'LewdCorner') {
        Lewdcorner_thread_id = gameData.f95_thread_id;
        lien_lewdcorner = gameData.lien_f95;
      }
      
      db.prepare(`
        UPDATE adulte_game_games 
        SET game_version = ?,
            game_statut = ?,
            game_engine = ?,
            game_developer = ?,
            couverture_url = ?,
            tags = ?,
            f95_thread_id = COALESCE(?, f95_thread_id),
            Lewdcorner_thread_id = COALESCE(?, Lewdcorner_thread_id),
            lien_f95 = COALESCE(?, lien_f95),
            lien_lewdcorner = COALESCE(?, lien_lewdcorner),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        gameData.version,
        gameData.statut_jeu,
        gameData.moteur,
        gameData.developpeur,
        effectiveCover,
        JSON.stringify(gameData.tags),
        f95_thread_id,
        Lewdcorner_thread_id,
        lien_f95,
        lien_lewdcorner,
        existingGame.id
      );

      console.log(`✅ Jeu adulte mis à jour: "${gameData.titre}" (ID: ${existingGame.id})`);

      sendSuccessResponse(res, {
        message: `Jeu mis à jour: ${gameData.titre}`,
        id: existingGame.id,
        action: 'updated'
      });
    } else {
      // Déterminer les IDs selon la plateforme
      let f95_thread_id = null;
      let Lewdcorner_thread_id = null;
      let lien_f95 = null;
      let lien_lewdcorner = null;
      
      if (plateforme === 'F95Zone' || plateforme === 'F95z') {
        f95_thread_id = gameData.f95_thread_id;
        lien_f95 = gameData.lien_f95;
      } else if (plateforme === 'LewdCorner') {
        Lewdcorner_thread_id = gameData.f95_thread_id;
        lien_lewdcorner = gameData.lien_f95;
      }
      
      // Créer un nouveau jeu
      const result = db.prepare(`
        INSERT INTO adulte_game_games (
          f95_thread_id, Lewdcorner_thread_id, titre, game_version, game_statut, 
          game_engine, game_developer, game_site, couverture_url, tags, 
          lien_f95, lien_lewdcorner, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        f95_thread_id,
        Lewdcorner_thread_id,
        gameData.titre,
        gameData.version,
        gameData.statut_jeu,
        gameData.moteur,
        gameData.developpeur,
        plateforme,
        gameData.couverture_url,
        JSON.stringify(gameData.tags),
        lien_f95,
        lien_lewdcorner
      );

      const gameId = result.lastInsertRowid;

      // Créer l'entrée dans adulte_game_user_data pour le propriétaire
      const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
      if (user) {
        db.prepare(`
          INSERT INTO adulte_game_user_data (
            game_id, user_id, completion_perso, notes_privees, 
            chemin_executable, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          gameId,
          user.id,
          gameData.statut_perso || 'À jouer',
          gameData.notes_privees,
          gameData.chemin_executable
        );
      } else {
        console.warn(`⚠️ Utilisateur "${currentUser}" non trouvé, le jeu n'aura pas de propriétaire`);
      }

      console.log(`✅ Jeu adulte créé: "${gameData.titre}" (ID: ${gameId})`);

      sendSuccessResponse(res, {
        message: `Jeu ajouté: ${gameData.titre}`,
        id: gameId,
        action: 'created'
      });
    }

  } catch (error) {
    console.error('❌ Erreur import jeu adulte:', error);
    sendErrorResponse(res, 500, error.message);
  }
}

/**
 * Enregistre les routes jeux adultes
 */
function registerAdulteGameRoutes(req, res, getDb, store) {
  if (req.method === 'POST' && req.url === '/import-adulte-game') {
    handleImportAdulteGame(req, res, getDb, store);
    return true;
  }
  
  return false;
}

module.exports = {
  registerAdulteGameRoutes,
  handleImportAdulteGame
};
