const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { getPaths: getPathsHelper } = require('./settings-helpers');
const { PathManager } = require('../../utils/paths');

/**
 * Fonction helper pour fusionner deux bases de données SQLite
 */
function mergeDatabases(sourceDbPath, destDbPath) {
  console.log('🔄 Fusion des bases de données...');
  console.log('  Source:', sourceDbPath);
  console.log('  Destination:', destDbPath);

  try {
    const sourceDb = new Database(sourceDbPath, { readonly: true });
    const destDb = new Database(destDbPath);

    destDb.exec('BEGIN TRANSACTION');

    const tables = [
      { name: 'users', strategy: 'skip_duplicates' },
      { name: 'series', strategy: 'skip_duplicates' },
      { name: 'tomes', strategy: 'skip_duplicates' },
      { name: 'tomes_proprietaires', strategy: 'skip_duplicates' },
      { name: 'manga_user_data', strategy: 'skip_duplicates' },
      { name: 'anime_series', strategy: 'skip_duplicates' },
      { name: 'anime_proprietaires', strategy: 'skip_duplicates' },
      { name: 'anime_user_data', strategy: 'skip_duplicates' },
      { name: 'adulte_game_games', strategy: 'skip_duplicates' },
      { name: 'adulte_game_user_data', strategy: 'skip_duplicates' },
      { name: 'user_preferences', strategy: 'skip_duplicates' }
    ];

    let totalMerged = 0;

    for (const table of tables) {
      try {
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

        const sourceRows = sourceDb.prepare(`SELECT * FROM ${table.name}`).all();
        
        if (sourceRows.length === 0) {
          console.log(`  ✓ Table ${table.name}: 0 ligne(s) à fusionner`);
          continue;
        }

        const columns = sourceDb.pragma(`table_info(${table.name})`);
        const columnNames = columns.map(col => col.name);
        const placeholders = columnNames.map(() => '?').join(', ');

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

    destDb.exec('COMMIT');
    sourceDb.close();
    destDb.close();

    console.log(`✅ Fusion terminée: ${totalMerged} ligne(s) ajoutée(s) au total`);
    return { success: true, merged: totalMerged };
  } catch (error) {
    console.error('❌ Erreur lors de la fusion des bases:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fonction helper pour copier tous les fichiers vers un nouvel emplacement
 */
function copyAllFilesToNewLocation(currentBasePath, newBasePath) {
  if (!currentBasePath || !fs.existsSync(currentBasePath)) {
    return { success: false, error: 'Emplacement actuel introuvable' };
  }

  try {
    console.log('📦 Copie/fusion des fichiers...');
    console.log('  De:', currentBasePath);
    console.log('  Vers:', newBasePath);

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
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          console.log(`  ✓ Fichier copié: ${path.basename(dest)}`);
        } else {
          console.log(`  ⏭️  Fichier existant conservé: ${path.basename(dest)}`);
        }
      }
    };

    // Note: configs n'est plus utilisé (les bases sont dans databases/)
    // Copier les dossiers profiles et covers de manière récursive
    ['profiles', 'covers'].forEach(folder => {
      const srcFolder = path.join(currentBasePath, folder);
      const destFolder = path.join(newBasePath, folder);
      if (fs.existsSync(srcFolder)) {
        console.log(`📂 Copie du dossier: ${folder}`);
        copyRecursiveNoOverwrite(srcFolder, destFolder);
      }
    });
    
    // Le dossier databases sera copié manuellement ci-dessous pour exclure les bases temporaires

    // Copier toutes les bases de données utilisateur depuis databases/
    const srcDatabases = path.join(currentBasePath, 'databases');
    const destDatabases = path.join(newBasePath, 'databases');
    
    if (fs.existsSync(srcDatabases)) {
      if (!fs.existsSync(destDatabases)) {
        fs.mkdirSync(destDatabases, { recursive: true });
      }
      
      // Copier uniquement les bases utilisateur (pas les bases temporaires)
      const dbFiles = fs.readdirSync(srcDatabases).filter(f => 
        f.endsWith('.db') && !f.startsWith('temp_')
      );
      
      console.log(`📋 ${dbFiles.length} base(s) utilisateur trouvée(s) à copier`);
      
      dbFiles.forEach(dbFile => {
        const srcDb = path.join(srcDatabases, dbFile);
        const destDb = path.join(destDatabases, dbFile);
        
        if (fs.existsSync(destDb)) {
          console.log(`🔄 Base ${dbFile} existante, fusion en cours...`);
          const mergeResult = mergeDatabases(srcDb, destDb);
          if (!mergeResult.success) {
            console.error(`❌ Échec de la fusion de ${dbFile}`);
          } else {
            console.log(`✅ Fusion réussie pour ${dbFile}: ${mergeResult.merged} ligne(s) ajoutée(s)`);
          }
        } else {
          console.log(`📋 Copie de la base ${dbFile}...`);
          fs.copyFileSync(srcDb, destDb);
          console.log(`✅ Base ${dbFile} copiée`);
        }
      });
    }

    console.log('✅ Copie/fusion terminée avec succès !');
    return { success: true, path: newBasePath };
  } catch (error) {
    console.error('❌ Erreur lors de la copie/fusion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enregistre les handlers IPC pour la gestion de l'emplacement de Le Nexus
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Function} initDatabase - Fonction pour réinitialiser la base de données
 */
function registerEmplacementHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase) {
  const getPaths = () => getPathsHelper(getPathManager, store);

  // Récupérer l'emplacement racine de Le Nexus
  ipcMain.handle('get-base-directory', () => {
    return getPaths().base || '';
  });

  // Récupérer l'utilisateur actuel
  ipcMain.handle('get-current-user', () => {
    return store.get('currentUser', '');
  });

  // Vérifier si des bases de données existent dans un emplacement
  ipcMain.handle('check-databases-in-location', async (event, basePath) => {
    try {
      if (!basePath || typeof basePath !== 'string') {
        return { success: false, hasDatabases: false, count: 0, error: 'Chemin invalide' };
      }

      const tempPathManager = new PathManager(basePath);
      const paths = tempPathManager.getPaths();

      if (!fs.existsSync(paths.databases)) {
        return { success: true, hasDatabases: false, count: 0 };
      }

      const dbFiles = fs.readdirSync(paths.databases).filter(f =>
        f.endsWith('.db') && !f.startsWith('temp_')
      );

      return {
        success: true,
        hasDatabases: dbFiles.length > 0,
        count: dbFiles.length,
        databases: dbFiles
      };
    } catch (error) {
      console.error('Erreur lors de la vérification des bases:', error);
      return { success: false, hasDatabases: false, count: 0, error: error.message };
    }
  });

  // Choisir un emplacement de base (ouvre un dialogue)
  // Utilisé pendant l'onboarding pour sélectionner l'emplacement
  ipcMain.handle('choose-base-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Choisir l\'emplacement de la base de données',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Sélectionner ce dossier',
        message: 'Sélectionnez où stocker vos données (base de données, couvertures, images de profil)'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        return { success: true, path: selectedPath };
      }

      return { success: false, error: 'Aucun emplacement sélectionné' };
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'emplacement:', error);
      return { success: false, error: error.message };
    }
  });

  // Définir l'emplacement de base (sans ouvrir de dialogue)
  // Utilisé pendant l'onboarding après la sélection
  ipcMain.handle('set-base-directory', async (event, newBasePath) => {
    try {
      if (!newBasePath || typeof newBasePath !== 'string') {
        return { success: false, error: 'Chemin invalide' };
      }

      // Créer la structure de dossiers
      console.log('📦 Configuration du nouvel emplacement...');
      const tempPathManager = new PathManager(newBasePath);
      tempPathManager.initializeStructure();
      
      // Stocker le nouvel emplacement (source de vérité)
      store.set('baseDirectory', newBasePath);
      
      // Appliquer les migrations à toutes les bases trouvées dans le nouvel emplacement
      const paths = tempPathManager.getPaths();
      if (fs.existsSync(paths.databases)) {
        const { migrateAllDatabases } = require('../../services/database');
        migrateAllDatabases(paths.databases);
      }
      
      // Mettre à jour aussi le registre Windows si on est sur Windows
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        try {
          const escapedPath = newBasePath.replace(/\\/g, '\\\\');
          execSync(`reg add "HKCU\\Software\\Le Nexus" /v DatabasePath /t REG_SZ /d "${escapedPath}" /f`, { stdio: 'ignore' });
          console.log('✅ Registre Windows mis à jour');
        } catch (error) {
          console.warn('⚠️ Impossible de mettre à jour le registre Windows:', error.message);
        }
      }
      
      console.log('✅ Nouvel emplacement configuré avec succès !');
      return { success: true, path: newBasePath };
    } catch (error) {
      console.error('Erreur lors de la configuration:', error);
      return { success: false, error: error.message };
    }
  });

  // Configurer l'emplacement de base sans ouvrir de dialogue
  // Utilisé pendant l'onboarding (premier lancement) - configure uniquement l'emplacement
  ipcMain.handle('setup-base-directory', async (event, newBasePath) => {
    try {
      const db = getDb();
      if (db) {
        console.log('🔒 Fermeture de la base de données...');
        db.close();
      }
      
      // Pendant l'onboarding, on configure juste l'emplacement
      // La base utilisateur sera créée à la fin de l'onboarding dans cet emplacement
      console.log('📦 Configuration du nouvel emplacement pour l\'onboarding...');
      const tempPathManager = new PathManager(newBasePath);
      tempPathManager.initializeStructure();
      
      // Stocker le nouvel emplacement (source de vérité)
      store.set('baseDirectory', newBasePath);
      
      // Mettre à jour la variable globale pathManager pour que getPathManager() fonctionne immédiatement
      if (global.setPathManagerMain) {
        global.setPathManagerMain(tempPathManager);
        console.log('✅ PathManager global mis à jour');
      }
      
      // Appliquer les migrations à toutes les bases trouvées dans le nouvel emplacement
      const paths = tempPathManager.getPaths();
      if (fs.existsSync(paths.databases)) {
        const { migrateAllDatabases } = require('../../services/database');
        migrateAllDatabases(paths.databases);
      }
      
      console.log('✅ Nouvel emplacement configuré avec succès !');
      return { success: true, path: newBasePath };
    } catch (error) {
      console.error('Erreur lors de la configuration:', error);
      return { success: false, error: error.message };
    }
  });

  // Changer l'emplacement de Le Nexus
  ipcMain.handle('change-base-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Choisir un nouvel emplacement pour Nexus',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Sélectionner ce dossier',
        message: 'Tous vos fichiers seront déplacés vers ce dossier'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newBasePath = result.filePaths[0];
        
        const db = getDb();
        if (db) {
          console.log('🔒 Fermeture de la base de données avant copie...');
          db.close();
        }

        // Vérifier s'il y a un emplacement existant à copier
        const paths = getPaths();
        const currentBasePath = paths ? paths.base : null;
        
        let copyResult;
        if (currentBasePath && fs.existsSync(currentBasePath)) {
          // Changement d'emplacement : copier les bases utilisateur existantes
          copyResult = copyAllFilesToNewLocation(currentBasePath, newBasePath);
        } else {
          // Premier lancement : créer uniquement la structure
          console.log('📦 Premier lancement - création de la structure dans le nouvel emplacement...');
          const tempPathManager = new PathManager(newBasePath);
          tempPathManager.initializeStructure();
          copyResult = { success: true, path: newBasePath };
        }
        
          if (copyResult.success) {
          store.set('baseDirectory', newBasePath);
          
          // Mettre à jour aussi le registre Windows si on est sur Windows
          if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            try {
              // Échapper les backslashes pour la commande reg
              const escapedPath = newBasePath.replace(/\\/g, '\\\\');
              execSync(`reg add "HKCU\\Software\\Le Nexus" /v DatabasePath /t REG_SZ /d "${escapedPath}" /f`, { stdio: 'ignore' });
              console.log('✅ Registre Windows mis à jour');
            } catch (error) {
              console.warn('⚠️ Impossible de mettre à jour le registre Windows:', error.message);
            }
          }
          
          // Fermer la base de données et forcer un redémarrage
          const db = getDb();
          if (db) {
            console.log('🔒 Fermeture de la base de données...');
            db.close();
          }
          
          // Demander à l'utilisateur de redémarrer l'application
          const mainWindow = getMainWindow();
          if (mainWindow) {
            const { app } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Redémarrage requis',
              message: 'L\'emplacement a été changé avec succès.',
              detail: 'L\'application va redémarrer pour appliquer les changements.',
              buttons: ['OK']
            }).then(() => {
              // Redémarrer l'application
              app.relaunch();
              app.exit(0);
            });
          }

          return { 
            success: true, 
            path: newBasePath,
            requiresRestart: true,
            message: 'Nexus déplacé avec succès. L\'application va redémarrer.'
          };
        } else {
          if (typeof initDatabase === 'function') {
            initDatabase();
          }
          return copyResult;
        }
      }

      return { success: false };
    } catch (error) {
      console.error('Erreur lors du changement d\'emplacement:', error);
      if (typeof initDatabase === 'function') {
        initDatabase();
      }
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerEmplacementHandlers };
