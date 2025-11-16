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
      existingGame = db.prepare('SELECT * FROM adulte_game_games WHERE f95_thread_id = ? AND plateforme = ?').get(gameData.f95_thread_id, plateforme);
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

      db.prepare(`
        UPDATE adulte_game_games 
        SET version = ?,
            statut_jeu = ?,
            moteur = ?,
            developpeur = ?,
            couverture_url = ?,
            tags = ?,
            lien_f95 = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        gameData.version,
        gameData.statut_jeu,
        gameData.moteur,
        gameData.developpeur,
        effectiveCover,
        JSON.stringify(gameData.tags),
        gameData.lien_f95,
        existingGame.id
      );

      console.log(`✅ Jeu adulte mis à jour: "${gameData.titre}" (ID: ${existingGame.id})`);

      sendSuccessResponse(res, {
        message: `Jeu mis à jour: ${gameData.titre}`,
        id: existingGame.id,
        action: 'updated'
      });
    } else {
      // Créer un nouveau jeu
      const result = db.prepare(`
        INSERT INTO adulte_game_games (
          f95_thread_id, titre, version, statut_jeu, moteur, developpeur, plateforme,
          couverture_url, tags, lien_f95, lien_traduction, lien_jeu,
          statut_perso, notes_privees, chemin_executable,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        gameData.f95_thread_id,
        gameData.titre,
        gameData.version,
        gameData.statut_jeu,
        gameData.moteur,
        gameData.developpeur,
        plateforme,
        gameData.couverture_url,
        JSON.stringify(gameData.tags),
        gameData.lien_f95,
        gameData.lien_traduction,
        gameData.lien_jeu,
        gameData.statut_perso,
        gameData.notes_privees,
        gameData.chemin_executable
      );

      const gameId = result.lastInsertRowid;

      // Ajouter le propriétaire actuel (convertir le nom d'utilisateur en ID)
      const user = db.prepare('SELECT id FROM users WHERE name = ?').get(currentUser);
      if (user) {
        db.prepare(`
          INSERT INTO adulte_game_proprietaires (game_id, user_id)
          VALUES (?, ?)
        `).run(gameId, user.id);
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
