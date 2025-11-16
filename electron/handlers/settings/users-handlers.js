const fs = require('fs');
const path = require('path');
const { getPaths: getPathsHelper } = require('./settings-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des utilisateurs
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerUsersHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager) {
  const getPaths = () => getPathsHelper(getPathManager, store);
  const Database = require('better-sqlite3');

  // Obtenir l'image de profil d'un utilisateur
  ipcMain.handle('get-user-profile-image', async (event, userName) => {
    try {
      const paths = getPaths();
      let user = null;
      
      // D'abord essayer la base actuellement chargée
      const db = getDb();
      if (db) {
        user = db.prepare('SELECT avatar_path FROM users WHERE name = ?').get(userName);
      }
      
      // Si pas trouvé, chercher dans toutes les bases utilisateur
      if (!user && fs.existsSync(paths.databases)) {
        const dbFiles = fs.readdirSync(paths.databases).filter(f => 
          f.endsWith('.db') && !f.startsWith('temp_')
        );
        
        for (const dbFile of dbFiles) {
          const dbPath = path.join(paths.databases, dbFile);
          try {
            const tempDb = new Database(dbPath, { readonly: true });
            const foundUser = tempDb.prepare('SELECT avatar_path FROM users WHERE name = ?').get(userName);
            tempDb.close();
            
            if (foundUser) {
              user = foundUser;
              break;
            }
          } catch (error) {
            console.warn(`⚠️ Erreur lecture base ${dbFile}:`, error.message);
          }
        }
      }

      if (!user || !user.avatar_path) {
        return null;
      }
      
      let fullPath = user.avatar_path;
      
      if (!path.isAbsolute(user.avatar_path)) {
        // Utiliser le chemin du dossier profiles depuis getPaths
        fullPath = path.join(paths.profiles, user.avatar_path);
      } else {
        fullPath = user.avatar_path;
      }
      
      if (fs.existsSync(fullPath)) {
        const result = `manga://${fullPath.replace(/\\/g, '/')}`;
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur get-user-profile-image:', error);
      return null;
    }
  });

  // Définir l'image de profil d'un utilisateur
  ipcMain.handle('set-user-profile-image', async (event, userName) => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Sélectionner une image de profil',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false };
      }

      const sourcePath = result.filePaths[0];
      const profilesDir = getPaths().profiles;
      
      if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, { recursive: true });
      }

      const existingFiles = fs.readdirSync(profilesDir);
      const oldFile = existingFiles.find(f => f.startsWith(`${userName.toLowerCase()}.`));
      if (oldFile) {
        fs.unlinkSync(path.join(profilesDir, oldFile));
      }

      const ext = path.extname(sourcePath);
      const fileName = `${userName.toLowerCase()}${ext}`;
      const destPath = path.join(profilesDir, fileName);

      fs.copyFileSync(sourcePath, destPath);

      return { success: true, path: `manga://${destPath.replace(/\\/g, '/')}` };
    } catch (error) {
      console.error('Erreur set-user-profile-image:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerUsersHandlers };
