const path = require('path');
const coverManager = require('../../services/cover/cover-manager');

/**
 * Enregistre les handlers IPC pour les opérations de création des jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerAdulteGameCreateHandlers(ipcMain, getDb, store, getPathManager) {
  
  // POST - Créer un nouveau jeu adulte
  ipcMain.handle('create-adulte-game-game', async (event, gameData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }
      
      // Normaliser le développeur (gérer les chaînes vides)
      let developpeurValue = null;
      if (gameData.developpeur !== undefined && gameData.developpeur !== null) {
        if (typeof gameData.developpeur === 'string' && gameData.developpeur.trim()) {
          const trimmed = gameData.developpeur.trim();
          // Ignorer "N/A" qui est une valeur par défaut du fallback
          if (trimmed !== 'N/A') {
            developpeurValue = trimmed;
          }
        }
      }
      
      // Si developpeur est absent ou "N/A" et qu'on a un f95_thread_id, essayer de le récupérer
      if (!developpeurValue && gameData.f95_thread_id) {
        try {
          const { parseF95ZoneGameData, fetchWithPuppeteer } = require('./utils');
          const threadUrl = `https://f95zone.to/threads/${gameData.f95_thread_id}/`;
          const html = await fetchWithPuppeteer(threadUrl);
          if (html) {
            const gameDataFromF95 = parseF95ZoneGameData(html);
            if (gameDataFromF95.developer) {
              developpeurValue = gameDataFromF95.developer.trim();
            }
          }
        } catch (error) {
          // Logger l'erreur mais continuer sans bloquer la création du jeu
          console.warn('⚠️ Impossible de récupérer le développeur depuis F95Zone:', error.message);
        }
      }
      
      // Déterminer les IDs selon la plateforme
      let f95_thread_id = null;
      let Lewdcorner_thread_id = null;
      let lien_f95 = null;
      let lien_lewdcorner = null;
      const game_site = gameData.plateforme || gameData.game_site || 'F95Zone';
      
      if (game_site === 'F95Zone' || game_site === 'F95z') {
        f95_thread_id = gameData.f95_thread_id || null;
        if (f95_thread_id) {
          lien_f95 = gameData.lien_f95 || `https://f95zone.to/threads/${f95_thread_id}/`;
        } else if (gameData.lien_f95) {
          lien_f95 = gameData.lien_f95;
          // Extraire l'ID depuis le lien si possible
          const match = gameData.lien_f95.match(/threads\/(\d+)/);
          if (match) {
            f95_thread_id = parseInt(match[1]);
          }
        }
      } else if (game_site === 'LewdCorner' || game_site === 'lewdcorner') {
        Lewdcorner_thread_id = gameData.f95_thread_id || gameData.Lewdcorner_thread_id || null;
        if (Lewdcorner_thread_id) {
          lien_lewdcorner = gameData.lien_lewdcorner || `https://lewdcorner.com/threads/${Lewdcorner_thread_id}/`;
        } else if (gameData.lien_f95 && gameData.lien_f95.includes('lewdcorner')) {
          lien_lewdcorner = gameData.lien_f95;
          const match = gameData.lien_f95.match(/threads\/(\d+)/);
          if (match) {
            Lewdcorner_thread_id = parseInt(match[1]);
          }
        }
      }
      
      // Vérifier si le jeu existe déjà
      const existing = db.prepare(`
        SELECT titre FROM adulte_game_games 
        WHERE (f95_thread_id = ? AND game_site = ?) 
           OR (Lewdcorner_thread_id = ? AND game_site = ?)
        LIMIT 1
      `).get(f95_thread_id, game_site, Lewdcorner_thread_id, game_site);
      
      if (existing) {
        return { 
          success: false, 
          error: `Ce jeu existe déjà : "${existing.titre}"` 
        };
      }
      
      const result = db.prepare(`
        INSERT INTO adulte_game_games (
          f95_thread_id, Lewdcorner_thread_id, titre, game_version, game_statut, 
          game_engine, game_developer, game_site, couverture_url, tags, 
          lien_f95, lien_lewdcorner, statut_traduction, type_traduction,
          maj_disponible, derniere_verif, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        f95_thread_id,
        Lewdcorner_thread_id,
        gameData.titre,
        gameData.version || gameData.game_version || null,
        gameData.statut_jeu || gameData.game_statut || 'EN COURS',
        gameData.moteur || gameData.game_engine || null,
        developpeurValue,
        game_site,
        gameData.couverture_url || null,
        gameData.tags ? JSON.stringify(gameData.tags) : null,
        lien_f95,
        lien_lewdcorner,
        gameData.statut_traduction || null,
        gameData.type_traduction || null,
        0, // maj_disponible toujours à 0 lors de la création (seules les mises à jour réelles le mettent à 1)
        gameData.derniere_verif || null
      );
      
      const gameId = result.lastInsertRowid;
      
      const { getUserIdByName } = require('./adulte-game-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // Créer l'entrée dans adulte_game_user_data pour les propriétaires
      const proprietaires = gameData.proprietaires || [currentUser];
      for (const userName of proprietaires) {
        const propUserId = getUserIdByName(db, userName);
        if (propUserId) {
          // Créer ou mettre à jour l'entrée utilisateur
          db.prepare(`
            INSERT INTO adulte_game_user_data (
              game_id, user_id, completion_perso, notes_privees, 
              chemin_executable, derniere_session, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(game_id, user_id) DO UPDATE SET
              completion_perso = COALESCE(excluded.completion_perso, completion_perso),
              notes_privees = COALESCE(excluded.notes_privees, notes_privees),
              chemin_executable = COALESCE(excluded.chemin_executable, chemin_executable),
              updated_at = datetime('now')
          `).run(
            gameId,
            propUserId,
            gameData.statut_perso || gameData.completion_perso || 'À jouer',
            gameData.notes_privees || null,
            gameData.chemin_executable || null,
            gameData.derniere_session || null
          );
        }
      }
      
      console.log(`✅ Jeu adulte créé: "${gameData.titre}" (ID: ${gameId})`);
      
      return { success: true, id: gameId };
      
    } catch (error) {
      console.error('Erreur create-adulte-game-game:', error);
      throw error;
    }
  });
}

module.exports = { registerAdulteGameCreateHandlers };
