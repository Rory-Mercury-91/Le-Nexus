const { dialog } = require('electron');
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
        SELECT ug.chemin_executable, g.titre
        FROM adulte_game_games g
        LEFT JOIN adulte_game_user_games ug ON g.id = ug.game_id AND ug.user_id = ?
        WHERE g.id = ?
      `).get(userId, id);
      
      if (!userGame || !userGame.chemin_executable) {
        throw new Error('Aucun exécutable défini pour ce jeu');
      }
      
      let executablePath;
      try {
        const parsed = JSON.parse(userGame.chemin_executable);
        if (Array.isArray(parsed)) {
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
      } catch (error) {
        executablePath = userGame.chemin_executable;
      }
      
      if (!fs.existsSync(executablePath)) {
        throw new Error(`L'exécutable n'existe pas: ${executablePath}`);
      }
      
      const metadata = detectGameMetadata(executablePath);
      
      if (metadata.version_jouee) {
        console.log(`📌 Version détectée: ${metadata.version_jouee}`);
        
        const updateUserGame = db.prepare(`
          UPDATE adulte_game_user_games 
          SET version_jouee = ? 
          WHERE game_id = ? AND user_id = ?
        `);
        const updateResult = updateUserGame.run(metadata.version_jouee, id, userId);
        
        if (updateResult.changes === 0) {
          db.prepare(`
            INSERT INTO adulte_game_user_games (game_id, user_id, version_jouee, chemin_executable)
            VALUES (?, ?, ?, ?)
          `).run(id, userId, metadata.version_jouee, executablePath);
        }
        
        db.prepare(`
          UPDATE adulte_game_games 
          SET version_jouee = ? 
          WHERE id = ?
        `).run(metadata.version_jouee, id);
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
      
      db.prepare(`
        INSERT INTO adulte_game_user_games (game_id, user_id, derniere_session)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(game_id, user_id) DO UPDATE SET
          derniere_session = datetime('now')
      `).run(id, userId);
      
      if (metadata.derniere_session) {
        db.prepare(`
          UPDATE adulte_game_games 
          SET derniere_session = ? 
          WHERE id = ?
        `).run(metadata.derniere_session.toISOString(), id);
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

      db.prepare(`
        INSERT INTO adulte_game_user_games (game_id, user_id, notes_privees)
        VALUES (?, ?, ?)
        ON CONFLICT(game_id, user_id) DO UPDATE SET
          notes_privees = excluded.notes_privees
      `).run(gameId, userId, notes);

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
        FROM adulte_game_user_games
        WHERE game_id = ? AND user_id = ?
      `).get(gameId, userId);
      
      const currentFavorite = userGame?.is_favorite || 0;
      const newFavorite = currentFavorite ? 0 : 1;
      
      db.prepare(`
        INSERT INTO adulte_game_user_games (game_id, user_id, is_favorite)
        VALUES (?, ?, ?)
        ON CONFLICT(game_id, user_id) DO UPDATE SET
          is_favorite = ?
      `).run(gameId, userId, newFavorite, newFavorite);
      
      console.log(`✅ Favori ${newFavorite ? 'ajouté' : 'retiré'} pour le jeu ID ${gameId} (utilisateur: ${currentUser})`);
      
      return { success: true, isFavorite: newFavorite === 1 };
    } catch (error) {
      console.error('❌ Erreur toggle-adulte-game-favorite:', error);
      throw error;
    }
  });
}

module.exports = { registerLaunchHandlers };
