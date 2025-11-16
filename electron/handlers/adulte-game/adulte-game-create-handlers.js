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
          // Ignorer silencieusement l'erreur de récupération
        }
      }
      
      const result = db.prepare(`
        INSERT INTO adulte_game_games (
          f95_thread_id, titre, version, statut_jeu, moteur, developpeur,
          couverture_url, tags, lien_f95, lien_traduction, lien_jeu,
          version_traduction, statut_traduction, type_traduction,
          version_disponible, maj_disponible,
          derniere_verif, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        gameData.f95_thread_id || null,
        gameData.titre,
        gameData.version || null,
        gameData.statut_jeu || 'EN COURS',
        gameData.moteur || null,
        developpeurValue,
        gameData.couverture_url || null,
        gameData.tags ? JSON.stringify(gameData.tags) : null,
        gameData.lien_f95 || null,
        gameData.lien_traduction || null,
        gameData.lien_jeu || null,
        gameData.version_traduction || null,
        gameData.statut_traduction || null,
        gameData.type_traduction || null,
        gameData.version_disponible || null,
        gameData.maj_disponible || 0,
        gameData.derniere_verif || null
      );
      
      const gameId = result.lastInsertRowid;
      
      const { getUserIdByName } = require('./adulte-game-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      const proprietaires = gameData.proprietaires || [currentUser];
      for (const userName of proprietaires) {
        const propUserId = getUserIdByName(db, userName);
        if (propUserId) {
          db.prepare(`
            INSERT INTO adulte_game_proprietaires (game_id, user_id)
            VALUES (?, ?)
          `).run(gameId, propUserId);
        }
      }
      
      db.prepare(`
        INSERT INTO adulte_game_user_games (game_id, user_id, statut_perso, notes_privees, chemin_executable, derniere_session)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        gameId,
        userId,
        gameData.statut_perso || 'À jouer',
        gameData.notes_privees || null,
        gameData.chemin_executable || null,
        gameData.derniere_session || null
      );
      
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
      
      let f95_thread_id = null;
      let lien_f95 = null;
      let plateforme = 'F95Zone';
      
      if (jsonData.domain === 'F95z' || jsonData.domain === 'F95Zone') {
        f95_thread_id = jsonData.id;
        lien_f95 = jsonData.link || `https://f95zone.to/threads/${jsonData.id}`;
        plateforme = 'F95Zone';
      } else if (jsonData.domain === 'LewdCorner') {
        f95_thread_id = jsonData.id;
        lien_f95 = jsonData.link || `https://lewdcorner.com/threads/${jsonData.id}`;
        plateforme = 'LewdCorner';
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
                  lien_f95
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
      
      const existing = db.prepare(`
        SELECT id FROM adulte_game_games 
        WHERE (f95_thread_id = ? AND plateforme = ?) OR (titre = ? AND lien_f95 = ?)
        LIMIT 1
      `).get(f95_thread_id, plateforme, titre, lien_f95);
      
      if (existing) {
        db.prepare(`
          UPDATE adulte_game_games SET
            titre = ?,
            version = ?,
            statut_jeu = ?,
            moteur = ?,
            developpeur = COALESCE(?, developpeur),
            plateforme = ?,
            couverture_url = COALESCE(?, couverture_url),
            tags = ?,
            lien_f95 = ?,
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
          existing.id
        );
        
        console.log(`✅ Jeu adulte mis à jour: "${titre}" (ID: ${existing.id})`);
        return { success: true, id: existing.id, updated: true };
      } else {
        const result = db.prepare(`
          INSERT INTO adulte_game_games (
            f95_thread_id, titre, version, statut_jeu, moteur, developpeur, plateforme,
            couverture_url, tags, lien_f95,
            statut_perso, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          f95_thread_id,
          titre,
          version,
          statut_jeu,
          moteur,
          developpeur,
          plateforme,
          couverture_url,
          JSON.stringify(tags),
          lien_f95,
          'À jouer'
        );
        
        const gameId = result.lastInsertRowid;
        
        const { getUserIdByName } = require('./adulte-game-helpers');
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          db.prepare(`
            INSERT INTO adulte_game_proprietaires (game_id, user_id)
            VALUES (?, ?)
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
