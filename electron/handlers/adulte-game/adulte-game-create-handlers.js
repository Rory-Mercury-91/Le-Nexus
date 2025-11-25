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
  
  // POST - Import depuis JSON (LC Extractor / F95 Extractor)
  ipcMain.handle('import-adulte-game-from-json', async (event, jsonData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }
      
      console.log(`📥 Import JSON jeu adulte:`, jsonData);
      
      const titre = jsonData.name;
      const version = jsonData.version || null;
      const statut_jeu = jsonData.status || 'EN COURS';
      const moteur = jsonData.type || jsonData.engine || null;
      const developpeur = jsonData.developer || jsonData.developpeur || null;
      const tags = typeof jsonData.tags === 'string' 
        ? jsonData.tags.split(',').map(t => t.trim()).filter(t => t)
        : (Array.isArray(jsonData.tags) ? jsonData.tags : []);
      
      // Déterminer la plateforme
      let plateforme = 'F95Zone';
      if (jsonData.domain === 'LewdCorner') {
        plateforme = 'LewdCorner';
      } else if (jsonData.domain === 'F95z' || jsonData.domain === 'F95Zone') {
        plateforme = 'F95Zone';
      }
      
      let couverture_url = null;
      if (jsonData.image) {
        if (jsonData.domain === 'LewdCorner') {
          console.log(`ℹ️ Image LewdCorner détectée: ${jsonData.image.substring(0, 60)}...`);
          console.log(`⚠️ Téléchargement automatique désactivé pour LewdCorner (protection anti-scraping)`);
          console.log(`💡 Ajoutez l'image manuellement via l'édition du jeu si nécessaire`);
          couverture_url = null;
        } else {
          const isF95Image = jsonData.image.includes('f95zone.to') || jsonData.image.includes('attachments.f95zone');
          
          if (isF95Image) {
            console.log(`🔗 Image F95Zone détectée: ${jsonData.image.substring(0, 60)}...`);
            console.log(`🔗 Utilisation de l'URL directe (téléchargement impossible)`);
            couverture_url = jsonData.image;
          } else {
            try {
              const pathManager = typeof getPathManager === 'function' ? getPathManager() : getPathManager;
              const autoDownload = store.get('autoDownloadCovers', false) === true;
              if (autoDownload) {
                console.log(`📥 Téléchargement de l'image...`);
                  const result = await coverManager.downloadCover(
                  pathManager,
                  jsonData.image, 
                  titre,
                  'adulte-game', 
                  null,
                  lien_f95_for_image
                );
                
                if (result.success) {
                  couverture_url = result.localPath;
                  console.log(`✅ Image téléchargée localement: ${couverture_url}`);
                  console.log(`   📝 Type de chemin: ${path.isAbsolute(couverture_url) ? 'ABSOLU' : 'RELATIF'}`);
                  console.log(`   📂 Valeur exacte: "${couverture_url}"`);
                } else {
                  couverture_url = jsonData.image;
                }
              } else {
                couverture_url = jsonData.image;
              }
            } catch (imgError) {
              console.warn(`⚠️ Échec du téléchargement de l'image:`, imgError.message);
              couverture_url = jsonData.image;
              console.log(`🌐 Utilisation de l'URL distante: ${jsonData.image.substring(0, 60)}...`);
            }
          }
        }
      }
      
      // Déterminer les IDs selon la plateforme
      let f95_thread_id = null;
      let Lewdcorner_thread_id = null;
      let lien_f95 = null;
      let lien_lewdcorner = null;
      
      if (plateforme === 'F95Zone' || plateforme === 'F95z') {
        f95_thread_id = jsonData.id;
        lien_f95 = jsonData.link || `https://f95zone.to/threads/${jsonData.id}/`;
      } else if (plateforme === 'LewdCorner') {
        Lewdcorner_thread_id = jsonData.id;
        lien_lewdcorner = jsonData.link || `https://lewdcorner.com/threads/${jsonData.id}/`;
      }
      
      // Utiliser lien_f95 pour la logique de téléchargement d'image (compatibilité)
      const lien_f95_for_image = lien_f95 || lien_lewdcorner;
      
      const existing = db.prepare(`
        SELECT id FROM adulte_game_games 
        WHERE (f95_thread_id = ? AND game_site = ?) 
           OR (Lewdcorner_thread_id = ? AND game_site = ?)
           OR (titre = ? AND (lien_f95 = ? OR lien_lewdcorner = ?))
        LIMIT 1
      `).get(f95_thread_id, plateforme, Lewdcorner_thread_id, plateforme, titre, lien_f95, lien_lewdcorner);
      
      if (existing) {
        db.prepare(`
          UPDATE adulte_game_games SET
            titre = ?,
            game_version = ?,
            game_statut = ?,
            game_engine = ?,
            game_developer = COALESCE(?, game_developer),
            game_site = ?,
            couverture_url = COALESCE(?, couverture_url),
            tags = ?,
            lien_f95 = COALESCE(?, lien_f95),
            lien_lewdcorner = COALESCE(?, lien_lewdcorner),
            f95_thread_id = COALESCE(?, f95_thread_id),
            Lewdcorner_thread_id = COALESCE(?, Lewdcorner_thread_id),
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          titre,
          version,
          statut_jeu,
          moteur,
          developpeur,
          plateforme,
          couverture_url,
          JSON.stringify(tags),
          lien_f95,
          lien_lewdcorner,
          f95_thread_id,
          Lewdcorner_thread_id,
          existing.id
        );
        
        console.log(`✅ Jeu adulte mis à jour: "${titre}" (ID: ${existing.id})`);
        return { success: true, id: existing.id, updated: true };
      } else {
        const result = db.prepare(`
          INSERT INTO adulte_game_games (
            f95_thread_id, Lewdcorner_thread_id, titre, game_version, game_statut, 
            game_engine, game_developer, game_site, couverture_url, tags, 
            lien_f95, lien_lewdcorner, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          f95_thread_id,
          Lewdcorner_thread_id,
          titre,
          version,
          statut_jeu,
          moteur,
          developpeur,
          plateforme,
          couverture_url,
          JSON.stringify(tags),
          lien_f95,
          lien_lewdcorner
        );
        
        const gameId = result.lastInsertRowid;
        
        const { getUserIdByName } = require('./adulte-game-helpers');
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          // Créer l'entrée dans adulte_game_user_data
          db.prepare(`
            INSERT INTO adulte_game_user_data (
              game_id, user_id, completion_perso, created_at, updated_at
            ) VALUES (?, ?, 'À jouer', datetime('now'), datetime('now'))
          `).run(gameId, userId);
        }
        
        console.log(`✅ Jeu adulte créé depuis JSON: "${titre}" (ID: ${gameId})`);
        return { success: true, id: gameId, created: true };
      }
      
    } catch (error) {
      console.error('Erreur import-adulte-game-from-json:', error);
      throw error;
    }
  });
}

module.exports = { registerAdulteGameCreateHandlers };
