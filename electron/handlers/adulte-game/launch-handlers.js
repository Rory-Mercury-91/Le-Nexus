const { dialog, shell } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Enregistre les handlers IPC pour le lancement des jeux adultes et la sélection de fichiers
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerLaunchHandlers(ipcMain, getDb, store) {
  
  // LANCEMENT - Lancer un jeu adulte
  ipcMain.handle('launch-adulte-game-game', async (event, id, versionToLaunch = null) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const { detectGameMetadata } = require('../../utils/session-detector');
      
      const { getUserIdByName } = require('./adulte-game-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      const userGame = db.prepare(`
        SELECT ud.chemin_executable, g.titre, g.rawg_website, g.game_site
        FROM adulte_game_games g
        INNER JOIN adulte_game_user_data ud ON g.id = ud.game_id AND ud.user_id = ?
        WHERE g.id = ?
      `).get(userId, id);
      
      if (!userGame) {
        throw new Error('Jeu non trouvé');
      }

      // Si le jeu vient de RAWG et a un lien web, ouvrir le lien au lieu de lancer un exécutable
      if (userGame.rawg_website && userGame.game_site === 'RAWG') {
        if (!userGame.rawg_website.startsWith('http://') && !userGame.rawg_website.startsWith('https://')) {
          throw new Error('Lien RAWG invalide');
        }
        
        await shell.openExternal(userGame.rawg_website);
        console.log(`🌐 Site web ouvert: "${userGame.titre}" -> ${userGame.rawg_website}`);
        
        // Mettre à jour la dernière session
        db.prepare(`
          UPDATE adulte_game_user_data 
          SET derniere_session = datetime('now'),
              updated_at = datetime('now')
          WHERE game_id = ? AND user_id = ?
        `).run(id, userId);
        
        return { success: true, openedWebsite: true };
      }
      
      // Comportement normal : chercher un exécutable
      if (!userGame.chemin_executable) {
        throw new Error('Aucun exécutable défini pour ce jeu');
      }
      
      const { safeJsonParse } = require('../common-helpers');
      let executablePath;
      const parsed = safeJsonParse(userGame.chemin_executable, null);
      if (parsed && Array.isArray(parsed)) {
        if (versionToLaunch) {
          const exe = parsed.find(e => e.version === versionToLaunch);
          if (!exe) {
            throw new Error(`Version ${versionToLaunch} non trouvée`);
          }
          executablePath = exe.path;
        } else {
          if (parsed.length === 0) {
            throw new Error('Aucun exécutable défini pour ce jeu');
          }
          executablePath = parsed[0].path;
        }
      } else {
        executablePath = userGame.chemin_executable;
      }
      
      if (!fs.existsSync(executablePath)) {
        throw new Error(`L'exécutable n'existe pas: ${executablePath}`);
      }
      
      const metadata = detectGameMetadata(executablePath);
      
      if (metadata.version_jouee) {
        console.log(`📌 Version détectée: ${metadata.version_jouee}`);
        
        const updateResult = db.prepare(`
          UPDATE adulte_game_user_data 
          SET version_jouee = ?,
              updated_at = datetime('now')
          WHERE game_id = ? AND user_id = ?
        `).run(metadata.version_jouee, id, userId);
        
        if (updateResult.changes === 0) {
          db.prepare(`
            INSERT INTO adulte_game_user_data (game_id, user_id, version_jouee, chemin_executable, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(id, userId, metadata.version_jouee, executablePath);
        }
      }
      
      const gamePath = path.resolve(executablePath);
      const gameDir = path.dirname(gamePath);
      
      exec(`"${gamePath}"`, { cwd: gameDir }, (error) => {
        if (error) {
          console.error(`❌ Erreur lancement jeu "${userGame.titre}":`, error);
        } else {
          console.log(`🎮 Jeu lancé: "${userGame.titre}"`);
        }
      });
      
      const updateResult = db.prepare(`
        UPDATE adulte_game_user_data 
        SET derniere_session = datetime('now'),
            updated_at = datetime('now')
        WHERE game_id = ? AND user_id = ?
      `).run(id, userId);
      
      if (updateResult.changes === 0) {
        db.prepare(`
          INSERT INTO adulte_game_user_data (game_id, user_id, derniere_session, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'))
        `).run(id, userId);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur launch-adulte-game-game:', error);
      throw error;
    }
  });
  
  // Sélectionner un fichier exécutable
  ipcMain.handle('select-adulte-game-executable', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner l\'exécutable du jeu',
        filters: [
          { name: 'Exécutables', extensions: ['exe'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      return {
        success: true,
        path: result.filePaths[0]
      };
      
    } catch (error) {
      console.error('❌ Erreur sélection fichier:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Sélectionner une image de couverture
  ipcMain.handle('select-adulte-game-cover-image', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner une image de couverture',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      return {
        success: true,
        path: result.filePaths[0]
      };
      
    } catch (error) {
      console.error('❌ Erreur sélection image:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // NOTES - Mise à jour des notes privées
  ipcMain.handle('update-adulte-game-notes', async (event, gameId, notes) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');

      if (!currentUser) throw new Error('Utilisateur non connecté');

      const { getUserIdByName } = require('./adulte-game-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      const updateResult = db.prepare(`
        UPDATE adulte_game_user_data 
        SET notes_privees = ?,
            updated_at = datetime('now')
        WHERE game_id = ? AND user_id = ?
      `).run(notes, gameId, userId);
      
      if (updateResult.changes === 0) {
        db.prepare(`
          INSERT INTO adulte_game_user_data (game_id, user_id, notes_privees, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).run(gameId, userId, notes);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur update-adulte-game-notes:', error);
      throw error;
    }
  });

  // Toggle favori pour un jeu adulte
  ipcMain.handle('toggle-adulte-game-favorite', async (event, gameId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      const { getUserIdByName } = require('./adulte-game-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      const userGame = db.prepare(`
        SELECT is_favorite
        FROM adulte_game_user_data
        WHERE game_id = ? AND user_id = ?
      `).get(gameId, userId);
      
      const currentFavorite = userGame?.is_favorite || 0;
      const newFavorite = currentFavorite ? 0 : 1;
      
      const updateResult = db.prepare(`
        UPDATE adulte_game_user_data 
        SET is_favorite = ?,
            updated_at = datetime('now')
        WHERE game_id = ? AND user_id = ?
      `).run(newFavorite, gameId, userId);
      
      if (updateResult.changes === 0) {
        db.prepare(`
          INSERT INTO adulte_game_user_data (game_id, user_id, is_favorite, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).run(gameId, userId, newFavorite);
      }
      
      console.log(`✅ Favori ${newFavorite ? 'ajouté' : 'retiré'} pour le jeu ID ${gameId} (utilisateur: ${currentUser})`);
      
      return { success: true, isFavorite: newFavorite === 1 };
    } catch (error) {
      console.error('❌ Erreur toggle-adulte-game-favorite:', error);
      throw error;
    }
  });
}

module.exports = { registerLaunchHandlers };
