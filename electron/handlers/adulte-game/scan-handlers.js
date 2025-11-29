const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { getUserIdByName } = require('./adulte-game-helpers');
const { safeJsonParse } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour le scan des exécutables
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerScanHandlers(ipcMain, getDb, store) {
  
  /**
   * Scanner récursivement un dossier pour trouver tous les fichiers .exe
   */
  function scanForExecutables(dirPath, results = []) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Ignorer certains dossiers système
            const ignoredDirs = ['node_modules', '.git', '.vscode', 'AppData', 'Program Files', 'Windows'];
            if (!ignoredDirs.some(ignored => item.toLowerCase().includes(ignored.toLowerCase()))) {
              scanForExecutables(fullPath, results);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (ext === '.exe') {
              results.push({
                path: fullPath,
                filename: item,
                folder: dirPath
              });
            }
          }
        } catch (err) {
          // Ignorer les erreurs d'accès (permissions, etc.)
          console.warn(`Impossible d'accéder à ${fullPath}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`Erreur lors du scan de ${dirPath}:`, err.message);
    }
    
    return results;
  }

  /**
   * Détecter les doublons (même nom de fichier mais chemins différents)
   */
  function detectDuplicates(executables) {
    const filenameMap = new Map();
    
    // Grouper par nom de fichier (insensible à la casse)
    executables.forEach(exe => {
      const lowerFilename = exe.filename.toLowerCase();
      if (!filenameMap.has(lowerFilename)) {
        filenameMap.set(lowerFilename, []);
      }
      filenameMap.get(lowerFilename).push(exe.path);
    });
    
    // Marquer les doublons
    executables.forEach(exe => {
      const duplicates = filenameMap.get(exe.filename.toLowerCase());
      if (duplicates.length > 1) {
        exe.isDuplicate = true;
        exe.duplicatePaths = duplicates.filter(p => p !== exe.path);
      } else {
        exe.isDuplicate = false;
        exe.duplicatePaths = [];
      }
    });
    
    return executables;
  }

  // SCAN - Sélectionner un dossier et scanner les exécutables
  ipcMain.handle('scan-adulte-game-executables', async (event) => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner le dossier contenant les jeux',
        properties: ['openDirectory']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      const folderPath = result.filePaths[0];
      console.log(`🔍 Scan du dossier: ${folderPath}`);
      
      // Scanner récursivement
      const executables = scanForExecutables(folderPath);
      console.log(`✅ ${executables.length} exécutable(s) trouvé(s)`);
      
      // Détecter les doublons
      const executablesWithDuplicates = detectDuplicates(executables);
      
      return {
        success: true,
        executables: executablesWithDuplicates
      };
      
    } catch (error) {
      console.error('❌ Erreur scan-adulte-game-executables:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // SEARCH - Rechercher des jeux par titre (version minimale)
  // Recherche dans TOUS les jeux de la base, pas seulement ceux de l'utilisateur
  // Car on peut vouloir attribuer un exécutable à un jeu qui n'a pas encore de données utilisateur
  ipcMain.handle('search-adulte-game-games-minimal', async (event, searchTerm) => {
    try {
      const db = getDb();
      
      if (!searchTerm || searchTerm.trim() === '') {
        return [];
      }
      
      const searchQuery = `%${searchTerm.trim()}%`;
      
      const games = db.prepare(`
        SELECT DISTINCT 
          g.id, 
          g.titre,
          g.f95_thread_id,
          g.Lewdcorner_thread_id
        FROM adulte_game_games g
        WHERE g.titre LIKE ?
        ORDER BY g.titre
        LIMIT 20
      `).all(searchQuery);
      
      return games.map(game => ({
        id: game.id,
        titre: game.titre,
        f95_thread_id: game.f95_thread_id,
        Lewdcorner_thread_id: game.Lewdcorner_thread_id
      }));
      
    } catch (error) {
      console.error('❌ Erreur search-adulte-game-games-minimal:', error);
      return [];
    }
  });

  // GET - Récupérer les exécutables actuels d'un jeu
  ipcMain.handle('get-adulte-game-current-executables', async (event, gameId) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        return [];
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return [];
      }
      
      const userGame = db.prepare(`
        SELECT ud.chemin_executable
        FROM adulte_game_user_data ud
        WHERE ud.game_id = ? AND ud.user_id = ?
      `).get(gameId, userId);
      
      if (!userGame || !userGame.chemin_executable) {
        return [];
      }
      
      const parsed = safeJsonParse(userGame.chemin_executable, null);
      if (parsed && Array.isArray(parsed)) {
        return parsed;
      } else if (typeof parsed === 'string') {
        return [{ version: 'default', path: parsed, label: 'Version unique' }];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Erreur get-adulte-game-current-executables:', error);
      return [];
    }
  });

  // BULK UPDATE - Mettre à jour les exécutables en masse
  // Gère plusieurs exécutables pour le même jeuId
  ipcMain.handle('bulk-update-adulte-game-executables', async (event, assignments) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return { success: true, updated: 0 };
      }
      
      // Grouper les assignments par gameId
      const assignmentsByGame = new Map();
      assignments.forEach(assignment => {
        const { gameId, executablePath, action, label } = assignment;
        if (!gameId || !executablePath) return;
        
        if (!assignmentsByGame.has(gameId)) {
          assignmentsByGame.set(gameId, []);
        }
        assignmentsByGame.get(gameId).push({ executablePath, action, label });
      });
      
      let updatedCount = 0;
      
      // Traiter chaque jeu
      for (const [gameId, gameAssignments] of assignmentsByGame.entries()) {
        // Récupérer les exécutables actuels
        const userGame = db.prepare(`
          SELECT ud.chemin_executable
          FROM adulte_game_user_data ud
          WHERE ud.game_id = ? AND ud.user_id = ?
        `).get(gameId, userId);
        
        // Parser les exécutables actuels
        let currentExecutables = [];
        if (userGame && userGame.chemin_executable) {
          const parsed = safeJsonParse(userGame.chemin_executable, []);
          if (Array.isArray(parsed)) {
            currentExecutables = parsed;
          } else if (typeof parsed === 'string') {
            currentExecutables = [{ version: 'default', path: parsed, label: 'Version unique' }];
          }
        }
        
        // Séparer les actions "replace" et "add"
        const replaceActions = gameAssignments.filter(a => a.action === 'replace');
        const addActions = gameAssignments.filter(a => a.action === 'add');
        
        let finalExecutables = [];
        
        // Si au moins un "replace", on commence par remplacer
        if (replaceActions.length > 0) {
          // Prendre le dernier "replace" (il écrase les précédents)
          const lastReplace = replaceActions[replaceActions.length - 1];
          finalExecutables = [{
            version: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            path: lastReplace.executablePath,
            label: lastReplace.label || 'Scanné'
          }];
        } else {
          // Sinon, on garde les exécutables actuels
          finalExecutables = [...currentExecutables];
        }
        
        // Ajouter tous les exécutables avec action "add"
        for (const addAction of addActions) {
          // Vérifier si le chemin existe déjà
          const alreadyExists = finalExecutables.some(exe => exe.path === addAction.executablePath);
          if (!alreadyExists) {
            finalExecutables.push({
              version: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              path: addAction.executablePath,
              label: addAction.label || 'Scanné'
            });
          }
        }
        
        // Ajouter aussi les "replace" précédents (sauf le dernier qui a déjà été ajouté)
        for (let i = 0; i < replaceActions.length - 1; i++) {
          const replaceAction = replaceActions[i];
          const alreadyExists = finalExecutables.some(exe => exe.path === replaceAction.executablePath);
          if (!alreadyExists) {
            finalExecutables.push({
              version: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              path: replaceAction.executablePath,
              label: replaceAction.label || 'Scanné'
            });
          }
        }
        
        // Mettre à jour dans la base de données
        db.prepare(`
          INSERT INTO adulte_game_user_data (game_id, user_id, chemin_executable, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(game_id, user_id) DO UPDATE SET
            chemin_executable = ?,
            updated_at = datetime('now')
        `).run(gameId, userId, JSON.stringify(finalExecutables), JSON.stringify(finalExecutables));
        
        updatedCount++;
      }
      
      console.log(`✅ ${updatedCount} jeu(x) mis à jour avec les exécutables scannés`);
      
      return { success: true, updated: updatedCount };
      
    } catch (error) {
      console.error('❌ Erreur bulk-update-adulte-game-executables:', error);
      throw error;
    }
  });
}

module.exports = { registerScanHandlers };
