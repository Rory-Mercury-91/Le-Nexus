const fs = require('fs');
const path = require('path');
const { cleanEmptyFolders, deleteImageWithCleanup } = require('../utils/file-utils');
const { downloadCover, uploadCustomCover, saveCoverFromPath } = require('../services/cover-manager');

/**
 * Enregistre tous les handlers IPC pour les paramètres et la configuration
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Function} initDatabase - Fonction pour réinitialiser la base de données
 * @param {App} app - Module app d'Electron
 */
function registerSettingsHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase, app) {
  
  // Fonction helper pour récupérer les chemins de manière lazy
  const getPaths = () => {
    const pm = getPathManager();
    return pm ? pm.getPaths() : { base: '', configs: '', database: '', databases: '', profiles: '', covers: '', series: '' };
  };
  
  // ========== EMPLACEMENT DE MA MANGATHÈQUE ==========
  
  // Récupérer l'emplacement racine de Ma Mangathèque
  ipcMain.handle('get-base-directory', () => {
    return getPaths().base || '';
  });

  // Récupérer l'utilisateur actuel
  ipcMain.handle('get-current-user', () => {
    return store.get('currentUser', '');
  });

  // Fonction helper pour copier tous les fichiers vers un nouvel emplacement
  const copyAllFilesToNewLocation = (newBasePath) => {
    const currentBasePath = getPaths().base;
    
    if (!currentBasePath || !fs.existsSync(currentBasePath)) {
      return { success: false, error: 'Emplacement actuel introuvable' };
    }

    try {
      // Copier récursivement
      const copyRecursive = (src, dest) => {
        if (fs.statSync(src).isDirectory()) {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          const files = fs.readdirSync(src);
          files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };

      // Copier les dossiers
      ['configs', 'profiles', 'covers'].forEach(folder => {
        const srcFolder = path.join(currentBasePath, folder);
        const destFolder = path.join(newBasePath, folder);
        if (fs.existsSync(srcFolder)) {
          copyRecursive(srcFolder, destFolder);
        }
      });

      // Copier la base de données
      const srcDb = path.join(currentBasePath, 'manga.db');
      const destDb = path.join(newBasePath, 'manga.db');
      if (fs.existsSync(srcDb)) {
        fs.copyFileSync(srcDb, destDb);

      }


      return { success: true, path: newBasePath };
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Copier vers un nouvel emplacement sans ouvrir de dialogue
  ipcMain.handle('copy-to-new-location', async (event, newBasePath) => {
    try {
      const result = copyAllFilesToNewLocation(newBasePath);
      if (result.success) {
        // Sauvegarder le nouveau chemin
        store.set('baseDirectory', newBasePath);
      }
      return result;
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      return { success: false, error: error.message };
    }
  });

  // Changer l'emplacement de Ma Mangathèque
  ipcMain.handle('change-base-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Choisir un nouvel emplacement pour Ma Mangathèque',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Sélectionner ce dossier',
        message: 'Tous vos fichiers seront déplacés vers ce dossier'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newBasePath = result.filePaths[0];
        const currentBasePath = getPaths().base;

        // Copier toute la structure vers le nouvel emplacement
        const copyResult = copyAllFilesToNewLocation(newBasePath);
        if (!copyResult.success) {
          return copyResult;
        }

        // Sauvegarder le nouveau chemin
        store.set('baseDirectory', newBasePath);

        return { 
          success: true, 
          path: newBasePath,
          message: 'Ma Mangathèque déplacée avec succès. Redémarrez l\'application pour appliquer les changements.'
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Erreur lors du changement d\'emplacement:', error);
      return { success: false, error: error.message };
    }
  });

  // ========== GESTION DES IMAGES ==========
  
  // Télécharger une couverture
  ipcMain.handle('download-cover', async (event, imageUrl, fileName, serieTitre, type = 'serie') => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return await downloadCover(pm, imageUrl, serieTitre, type);
  });

  // Upload d'une couverture personnalisée
  ipcMain.handle('upload-custom-cover', async (event, serieTitre, type = 'serie') => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return await uploadCustomCover(dialog, mainWindow, pm, serieTitre, type);
  });

  // Sauvegarder une image depuis un chemin (drag & drop)
  ipcMain.handle('save-cover-from-path', async (event, sourcePath, serieTitre, type = 'serie') => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromPath(pm, sourcePath, serieTitre, type);
  });

  // Récupération du chemin complet d'une image
  ipcMain.handle('get-cover-full-path', (event, relativePath) => {
    const pm = getPathManager();
    if (!pm) return null;
    return require('../services/cover-manager').getCoverFullPath(pm, relativePath);
  });

  // Supprimer une image de couverture
  ipcMain.handle('delete-cover-image', async (event, relativePath) => {
    try {
      if (!relativePath) {
        return { success: false, error: 'Paramètres invalides' };
      }

      // Ne pas supprimer les URLs externes
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return { success: true }; // Rien à supprimer
      }

      return deleteImageWithCleanup(getPaths().covers, relativePath);
    } catch (error) {
      console.error('Erreur delete-cover-image:', error);
      return { success: false, error: error.message };
    }
  });

  // Nettoyer les dossiers vides
  ipcMain.handle('clean-empty-folders', () => {
    try {
      const count = cleanEmptyFolders(getPaths().series, getPaths().series);

      
      return { success: true, count };
    } catch (error) {
      console.error('Erreur clean-empty-folders:', error);
      return { success: false, error: error.message };
    }
  });

  // ========== GESTION DES UTILISATEURS ==========
  
  // Obtenir l'image de profil d'un utilisateur
  ipcMain.handle('get-user-profile-image', async (event, userName) => {
    try {
      const db = getDb();
      if (!db) {

        return null;
      }
      
      // Récupérer l'avatar depuis la BDD
      const user = db.prepare('SELECT avatar_path FROM users WHERE name = ?').get(userName);

      
      if (!user || !user.avatar_path) {

        return null;
      }
      
      // L'avatar_path peut être soit relatif, soit absolu
      let fullPath = user.avatar_path;
      
      // Si le chemin est relatif, le combiner avec profilesDir
      if (!path.isAbsolute(user.avatar_path)) {
        const pm = getPathManager();
        if (!pm || !pm.profilesDir) {

          return null;
        }
        fullPath = path.join(pm.profilesDir, user.avatar_path);
      }
      

      
      // Vérifier que le fichier existe
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

      // Supprimer l'ancienne image de profil si elle existe
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

  // ========== GESTION DES BASES DE DONNÉES ==========
  
  // Fusionner les bases de données utilisateurs
  ipcMain.handle('merge-database', () => {
    try {
      const dbFolder = getPaths().databases;
      if (!fs.existsSync(dbFolder)) {

        return { merged: false, seriesCount: 0, tomesCount: 0 };
      }

      const files = fs.readdirSync(dbFolder).filter(f => f.endsWith('.db'));
      if (files.length === 0) {

        return { merged: false, seriesCount: 0, tomesCount: 0 };
      }


      
      let seriesCount = 0;
      let tomesCount = 0;

      files.forEach(file => {
        const userDbPath = path.join(dbFolder, file);
        const userDb = new (require('better-sqlite3'))(userDbPath, { readonly: true });

        try {
          const db = getDb(); // Récupérer l'instance de la base de données
          
          // Fusionner les séries
          const series = userDb.prepare('SELECT * FROM series').all();
          series.forEach(serie => {
            const existing = db.prepare('SELECT id FROM series WHERE titre = ?').get(serie.titre);
            if (!existing) {
              const insertSerie = db.prepare(`
                INSERT INTO series (titre, statut, type_volume, couverture_url, description, statut_publication, annee_publication, genres, nb_chapitres, langue_originale, demographie, rating)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              insertSerie.run(serie.titre, serie.statut, serie.type_volume, serie.couverture_url, serie.description, serie.statut_publication, serie.annee_publication, serie.genres, serie.nb_chapitres, serie.langue_originale, serie.demographie, serie.rating);
              seriesCount++;
            }
          });

          // Fusionner les tomes
          const tomes = userDb.prepare('SELECT * FROM tomes').all();
          tomes.forEach(tome => {
            const serie = db.prepare('SELECT id FROM series WHERE titre = (SELECT titre FROM series WHERE id = ? LIMIT 1 OFFSET 0)').get(tome.serie_id);
            if (serie) {
              const existing = db.prepare('SELECT id FROM tomes WHERE serie_id = ? AND numero = ?').get(serie.id, tome.numero);
              if (!existing) {
                const insertTome = db.prepare(`
                  INSERT INTO tomes (serie_id, numero, prix, proprietaire, date_achat, couverture_url)
                  VALUES (?, ?, ?, ?, ?, ?)
                `);
                insertTome.run(serie.id, tome.numero, tome.prix, tome.proprietaire, tome.date_achat, tome.couverture_url);
                tomesCount++;
              }
            }
          });
        } finally {
          userDb.close();
        }
      });


      return { merged: true, seriesCount, tomesCount };
    } catch (error) {
      console.error('Erreur merge-database:', error);
      return { merged: false, seriesCount: 0, tomesCount: 0, error: error.message };
    }
  });

  // Définir l'utilisateur actuel
  ipcMain.handle('set-current-user', (event, userName) => {
    store.set('currentUser', userName);

  });

  // Sauvegarder la base de données pour l'utilisateur actuel
  ipcMain.handle('save-user-database', () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        console.warn('Aucun utilisateur connecté, sauvegarde ignorée');
        return;
      }

      const dbFolder = getPaths().databases;
      if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
      }

      const userDbPath = path.join(dbFolder, `${currentUser.toLowerCase()}.db`);
      
      // Copier la base actuelle vers la base utilisateur
      fs.copyFileSync(getPaths().database, userDbPath);
      

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  });

  // Export de la base de données
  ipcMain.handle('export-database', async () => {
    try {
      const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Exporter la base de données',
        defaultPath: `manga-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          { name: 'Base de données', extensions: ['db'] }
        ]
      });

      if (filePath) {
        fs.copyFileSync(getPaths().database, filePath);
        return { success: true, path: filePath };
      }
      return { success: false };
    } catch (error) {
      console.error('Erreur export-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Import de la base de données
  ipcMain.handle('import-database', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Importer une base de données',
        filters: [
          { name: 'Base de données', extensions: ['db'] }
        ],
        properties: ['openFile']
      });

      if (filePaths && filePaths.length > 0) {
        // Fermer la base actuelle
        if (db) db.close();
        
        // Copier le fichier importé
        fs.copyFileSync(filePaths[0], getPaths().database);
        
        // Réouvrir la base
        initDatabase();
        
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Erreur import-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer les données d'un utilisateur (lecture uniquement)
  ipcMain.handle('delete-user-data', async (event, userName) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }



      // Supprimer les données de lecture pour cet utilisateur
      const deleteLectureTomes = db.prepare('DELETE FROM lecture_tomes WHERE utilisateur = ?');
      const resultTomes = deleteLectureTomes.run(userName);

      const deleteLectureEpisodes = db.prepare('DELETE FROM lecture_episodes WHERE utilisateur = ?');
      const resultEpisodes = deleteLectureEpisodes.run(userName);




      // Supprimer aussi la base utilisateur si elle existe
      const dbFolder = getPaths().databases;
      const userDbPath = path.join(dbFolder, `${userName.toLowerCase()}.db`);
      if (fs.existsSync(userDbPath)) {
        fs.unlinkSync(userDbPath);

      }

      return { success: true };
    } catch (error) {
      console.error('Erreur delete-user-data:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer TOUTES les données (réinitialiser l'application)
  ipcMain.handle('delete-all-data', async () => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }



      // Fermer la base de données avant de supprimer les fichiers
      try {
        db.close();

      } catch (err) {
        console.warn('⚠️ Erreur lors de la fermeture de la DB:', err.message);
      }

      // 1. Supprimer TOUT le dossier configs/ (avec manga.db et databases/)
      const configsDir = getPaths().configs;
      if (fs.existsSync(configsDir)) {
        fs.rmSync(configsDir, { recursive: true, force: true });

      }

      // 2. Supprimer TOUT le dossier covers/ 
      const coversDir = getPaths().covers;
      if (fs.existsSync(coversDir)) {
        fs.rmSync(coversDir, { recursive: true, force: true });

      }

      // 3. Garder le dossier profiles/ (images utilisateurs)


      // 4. Supprimer le fichier config.json dans AppData
      const configPath = store.path;

      
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);

      }



      return { success: true };
    } catch (error) {
      console.error('Erreur delete-all-data:', error);
      return { success: false, error: error.message };
    }
  });

  // Quitter l'application (avec option de redémarrage)
  ipcMain.handle('quit-app', async (event, options = {}) => {
    try {
      const { shouldRelaunch = false } = options;
      
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const dbFolder = getPaths().databases;
        if (!fs.existsSync(dbFolder)) {
          fs.mkdirSync(dbFolder, { recursive: true });
        }

        const userDbPath = path.join(dbFolder, `${currentUser.toLowerCase()}.db`);
        fs.copyFileSync(getPaths().database, userDbPath);

      }
      
      // Redémarrer ou quitter l'application après la sauvegarde
      setTimeout(() => {
        const { app } = require('electron');
        
        if (shouldRelaunch) {

          app.relaunch();
          app.exit(0);
        } else {

          app.exit(0);
        }
      }, 500);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde finale:', error);
      return { success: false, error: error.message };
    }
  });

  // ========== THÈME ==========
  
  // Récupérer le thème actuel
  ipcMain.handle('get-theme', () => {
    return store.get('theme', 'dark'); // Par défaut : dark
  });

  // Définir le thème
  ipcMain.handle('set-theme', (event, theme) => {
    store.set('theme', theme);

    return { success: true };
  });

  // ========== DÉMARRAGE AUTOMATIQUE ==========
  
  // Récupérer l'état du démarrage automatique
  ipcMain.handle('get-auto-launch', () => {
    // En mode dev, toujours retourner false
    if (!app.isPackaged) {
      return false;
    }
    
    const loginItemSettings = app.getLoginItemSettings();
    return loginItemSettings.openAtLogin;
  });

  // Définir le démarrage automatique
  ipcMain.handle('set-auto-launch', (event, enabled) => {
    try {
      // En mode dev, ignorer la demande
      if (!app.isPackaged) {
        return { success: true, message: 'Désactivé en mode développement' };
      }

      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: false, // Ne pas démarrer caché
        args: [] // Pas d'arguments spéciaux
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur set-auto-launch:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerSettingsHandlers };
