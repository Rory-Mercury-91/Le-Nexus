const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { shell } = require('electron');
const { cleanEmptyFolders, deleteImageWithCleanup } = require('../utils/file-utils');
const { downloadCover, uploadCustomCover, saveCoverFromPath, saveCoverFromBuffer } = require('../services/cover-manager');
const { translateText: groqTranslate } = require('../apis/groq');

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
  
  // Récupérer l'emplacement racine de Le Nexus
  ipcMain.handle('get-base-directory', () => {
    return getPaths().base || '';
  });

  // Récupérer l'utilisateur actuel
  ipcMain.handle('get-current-user', () => {
    return store.get('currentUser', '');
  });

  // Fonction helper pour fusionner deux bases de données SQLite
  const mergeDatabases = (sourceDbPath, destDbPath) => {
    console.log('🔄 Fusion des bases de données...');
    console.log('  Source:', sourceDbPath);
    console.log('  Destination:', destDbPath);

    try {
      // Ouvrir les deux bases
      const sourceDb = new Database(sourceDbPath, { readonly: true });
      const destDb = new Database(destDbPath);

      // Commencer une transaction
      destDb.exec('BEGIN TRANSACTION');

      // Liste des tables à fusionner (ordre important pour respecter les clés étrangères)
      const tables = [
        { name: 'users', strategy: 'skip_duplicates' },
        { name: 'series', strategy: 'skip_duplicates' },
        { name: 'tomes', strategy: 'skip_duplicates' },
        { name: 'tomes_proprietaires', strategy: 'skip_duplicates' },
        { name: 'lecture_tomes', strategy: 'skip_duplicates' },
        { name: 'series_masquees', strategy: 'skip_duplicates' },
        { name: 'anime_series', strategy: 'skip_duplicates' },
        { name: 'anime_proprietaires', strategy: 'skip_duplicates' },
        { name: 'anime_episodes', strategy: 'skip_duplicates' },
        { name: 'avn_games', strategy: 'skip_duplicates' },
        { name: 'avn_proprietaires', strategy: 'skip_duplicates' }
      ];

      let totalMerged = 0;

      for (const table of tables) {
        try {
          // Vérifier si la table existe dans les deux bases
          const tableExistsSource = sourceDb.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
          ).get(table.name);

          const tableExistsDest = destDb.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
          ).get(table.name);

          if (!tableExistsSource) {
            console.log(`  ⏭️  Table ${table.name} absente de la source, ignorée`);
            continue;
          }

          if (!tableExistsDest) {
            console.log(`  ⚠️  Table ${table.name} absente de la destination, ignorée`);
            continue;
          }

          // Récupérer toutes les données de la source
          const sourceRows = sourceDb.prepare(`SELECT * FROM ${table.name}`).all();
          
          if (sourceRows.length === 0) {
            console.log(`  ✓ Table ${table.name}: 0 ligne(s) à fusionner`);
            continue;
          }

          // Récupérer les colonnes de la table
          const columns = sourceDb.pragma(`table_info(${table.name})`);
          const columnNames = columns.map(col => col.name);
          const placeholders = columnNames.map(() => '?').join(', ');

          // Insérer les données avec INSERT OR IGNORE pour éviter les doublons
          const insertStmt = destDb.prepare(
            `INSERT OR IGNORE INTO ${table.name} (${columnNames.join(', ')}) VALUES (${placeholders})`
          );

          let mergedCount = 0;
          for (const row of sourceRows) {
            const values = columnNames.map(col => row[col]);
            const result = insertStmt.run(...values);
            if (result.changes > 0) mergedCount++;
          }

          totalMerged += mergedCount;
          console.log(`  ✓ Table ${table.name}: ${mergedCount}/${sourceRows.length} ligne(s) fusionnée(s)`);
        } catch (tableError) {
          console.error(`  ❌ Erreur fusion table ${table.name}:`, tableError.message);
        }
      }

      // Commit la transaction
      destDb.exec('COMMIT');
      
      // Fermer les connexions
      sourceDb.close();
      destDb.close();

      console.log(`✅ Fusion terminée: ${totalMerged} ligne(s) ajoutée(s) au total`);
      return { success: true, merged: totalMerged };
    } catch (error) {
      console.error('❌ Erreur lors de la fusion des bases:', error);
      return { success: false, error: error.message };
    }
  };

  // Fonction helper pour copier tous les fichiers vers un nouvel emplacement
  const copyAllFilesToNewLocation = (newBasePath) => {
    const currentBasePath = getPaths().base;
    
    if (!currentBasePath || !fs.existsSync(currentBasePath)) {
      return { success: false, error: 'Emplacement actuel introuvable' };
    }

    try {
      console.log('📦 Copie/fusion des fichiers...');
      console.log('  De:', currentBasePath);
      console.log('  Vers:', newBasePath);

      // Copier récursivement SANS écraser les fichiers existants
      const copyRecursiveNoOverwrite = (src, dest) => {
        if (fs.statSync(src).isDirectory()) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
            console.log(`  📁 Dossier créé: ${path.basename(dest)}`);
          }
          const files = fs.readdirSync(src);
          files.forEach(file => {
            copyRecursiveNoOverwrite(path.join(src, file), path.join(dest, file));
          });
        } else {
          // Ne copier que si le fichier n'existe pas déjà à destination
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
            console.log(`  ✓ Fichier copié: ${path.basename(dest)}`);
          } else {
            console.log(`  ⏭️  Fichier existant conservé: ${path.basename(dest)}`);
          }
        }
      };

      // Copier les dossiers (configs, profiles, covers) SANS écraser
      ['configs', 'profiles', 'covers'].forEach(folder => {
        const srcFolder = path.join(currentBasePath, folder);
        const destFolder = path.join(newBasePath, folder);
        if (fs.existsSync(srcFolder)) {
          console.log(`📂 Copie du dossier: ${folder}`);
          copyRecursiveNoOverwrite(srcFolder, destFolder);
        }
      });

      // Gérer la base de données principale (manga.db)
      const srcDb = path.join(currentBasePath, 'manga.db');
      const destDb = path.join(newBasePath, 'manga.db');
      
      if (fs.existsSync(srcDb)) {
        if (fs.existsSync(destDb)) {
          // Base de données existante à destination : FUSIONNER
          console.log('🔄 Base de données existante détectée, fusion en cours...');
          const mergeResult = mergeDatabases(srcDb, destDb);
          if (!mergeResult.success) {
            console.error('❌ Échec de la fusion de la base de données');
            return { success: false, error: 'Échec de la fusion de la base de données: ' + mergeResult.error };
          }
          console.log(`✅ Fusion réussie: ${mergeResult.merged} ligne(s) ajoutée(s)`);
        } else {
          // Pas de base à destination : simple copie
          console.log('📋 Copie de la base de données...');
          fs.copyFileSync(srcDb, destDb);
          console.log('✅ Base de données copiée');
        }
      }

      console.log('✅ Copie/fusion terminée avec succès !');
      return { success: true, path: newBasePath };
    } catch (error) {
      console.error('❌ Erreur lors de la copie/fusion:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Copier vers un nouvel emplacement sans ouvrir de dialogue
  ipcMain.handle('copy-to-new-location', async (event, newBasePath) => {
    try {
      // IMPORTANT: Fermer la BDD avant de la copier pour éviter corruption
      const db = getDb();
      if (db) {
        console.log('🔒 Fermeture de la base de données avant copie...');
        db.close();
      }
      
      const result = copyAllFilesToNewLocation(newBasePath);
      if (result.success) {
        // Sauvegarder le nouveau chemin
        store.set('baseDirectory', newBasePath);
        
        // Réinitialiser PathManager et rouvrir la BDD au nouvel emplacement
        console.log('🔄 Réinitialisation de la base de données vers le nouvel emplacement...');
        if (typeof initDatabase === 'function') {
          initDatabase(); // Callback qui recrée PathManager + rouvre la BDD
        }
        console.log('✅ Base de données réinitialisée avec succès !');
      } else {
        // Si la copie échoue, rouvrir la BDD à l'ancien emplacement
        if (typeof initDatabase === 'function') {
          initDatabase();
        }
      }
      return result;
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      // En cas d'erreur, tenter de rouvrir la BDD
      if (typeof initDatabase === 'function') {
        initDatabase();
      }
      return { success: false, error: error.message };
    }
  });

  // Changer l'emplacement de Le Nexus
  ipcMain.handle('change-base-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Choisir un nouvel emplacement pour Le Nexus',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Sélectionner ce dossier',
        message: 'Tous vos fichiers seront déplacés vers ce dossier'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newBasePath = result.filePaths[0];
        
        // IMPORTANT: Fermer la BDD avant de la copier
        const db = getDb();
        if (db) {
          console.log('🔒 Fermeture de la base de données avant copie...');
          db.close();
        }

        // Copier toute la structure vers le nouvel emplacement
        const copyResult = copyAllFilesToNewLocation(newBasePath);
        
        if (copyResult.success) {
          // Sauvegarder le nouveau chemin
          store.set('baseDirectory', newBasePath);
          
          // Rouvrir la BDD au nouvel emplacement
          if (typeof initDatabase === 'function') {
            initDatabase();
          }

          return { 
            success: true, 
            path: newBasePath,
            message: 'Le Nexus déplacé avec succès. Redémarrez l\'application pour appliquer les changements.'
          };
        } else {
          // Si échec, rouvrir la BDD à l'ancien emplacement
          if (typeof initDatabase === 'function') {
            initDatabase();
          }
          return copyResult;
        }
      }

      return { success: false };
    } catch (error) {
      console.error('Erreur lors du changement d\'emplacement:', error);
      // En cas d'erreur, rouvrir la BDD
      if (typeof initDatabase === 'function') {
        initDatabase();
      }
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
    return await uploadCustomCover(dialog, getMainWindow(), pm, serieTitre, type);
  });

  // Sauvegarder une image depuis un chemin (drag & drop)
  ipcMain.handle('save-cover-from-path', async (event, sourcePath, serieTitre, type = 'serie') => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromPath(pm, sourcePath, serieTitre, type);
  });

  ipcMain.handle('save-cover-from-buffer', async (event, buffer, fileName, serieTitre, type = 'serie') => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromBuffer(pm, buffer, fileName, serieTitre, type);
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

  // Gérer les préférences de contenu
  ipcMain.handle('set-content-preferences', (event, userName, preferences) => {
    const userPrefs = store.get('contentPreferences', {});
    userPrefs[userName] = preferences;
    store.set('contentPreferences', userPrefs);
    
    // Notifier tous les renderers du changement
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('content-preferences-changed', userName, preferences);
    }
  });

  ipcMain.handle('get-content-preferences', (event, userName) => {
    const userPrefs = store.get('contentPreferences', {});
    return userPrefs[userName] || { showMangas: true, showAnimes: true, showAvn: true };
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

  // ========== GROQ AI ==========
  
  // Récupérer la clé API Groq
  ipcMain.handle('get-groq-api-key', () => {
    return store.get('groqApiKey', '');
  });

  // Définir la clé API Groq
  ipcMain.handle('set-groq-api-key', (event, apiKey) => {
    store.set('groqApiKey', apiKey);
    return { success: true };
  });

  // Traduire un texte avec Groq AI
  ipcMain.handle('translate-text', async (event, text, targetLang = 'fr') => {
    const apiKey = store.get('groqApiKey', '');
    return await groqTranslate(text, apiKey, targetLang);
  });

  // ========== SOURCE IMAGES ANIME ==========
  
  // Récupérer la source des images anime
  ipcMain.handle('get-anime-image-source', () => {
    return store.get('animeImageSource', 'anilist'); // Par défaut : anilist
  });

  // Définir la source des images anime
  ipcMain.handle('set-anime-image-source', (event, source) => {
    store.set('animeImageSource', source);
    console.log(`✅ Source images anime définie: ${source}`);
    return { success: true };
  });

  // ========== OUVRIR LA PAGE D'INSTALLATION DES SCRIPTS ==========
  
  ipcMain.handle('open-tampermonkey-installation', async () => {
    try {
      // Déterminer le chemin vers le fichier HTML
      const htmlPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'tampermonkey', 'INSTALLATION.html')
        : path.join(__dirname, '..', '..', 'tampermonkey', 'INSTALLATION.html');

      // Vérifier que le fichier existe
      if (!fs.existsSync(htmlPath)) {
        console.error('❌ Fichier INSTALLATION.html introuvable:', htmlPath);
        return { success: false, error: 'Fichier introuvable' };
      }

      // Ouvrir dans le navigateur par défaut
      const url = `file://${htmlPath}`;
      await shell.openExternal(url);
      
      console.log('✅ Page d\'installation des scripts ouverte dans le navigateur');
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de l\'ouverture de la page d\'installation:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerSettingsHandlers };
