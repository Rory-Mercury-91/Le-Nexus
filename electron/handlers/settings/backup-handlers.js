const backupScheduler = require('../../services/schedulers/backup-scheduler');
const path = require('path');
const fs = require('fs');

// Import des fonctions communes
const { getPaths } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour les backups automatiques
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance d'electron-store
 */

function registerBackupHandlers(ipcMain, getPathManager, store, getDb, initDatabase) {
  const getPathsLocal = () => getPaths(getPathManager);

  // Récupérer la configuration du backup
  ipcMain.handle('get-backup-config', () => {
    const config = store.get('backupConfig', {
      enabled: false,
      frequency: 'weekly',
      day: 0,
      hour: '02:00',
      keepCount: 7,
      lastBackup: null,
      backupOnStartup: true,
      backupOnShutdown: true
    });
    return config;
  });
  
  // Sauvegarder la configuration du backup
  ipcMain.handle('save-backup-config', async (event, config) => {
    try {
      store.set('backupConfig', config);
      
      // Le chemin de la base sera déterminé dynamiquement lors de la création du backup
      // car il dépend de l'utilisateur connecté
      backupScheduler.init(config, null, store);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur sauvegarde config backup:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Créer un backup manuel
  ipcMain.handle('create-backup', async () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userDbPath = path.join(getPathsLocal().databases, `${currentUser.toLowerCase()}.db`);
      if (!fs.existsSync(userDbPath)) {
        return { success: false, error: 'Base de données utilisateur introuvable' };
      }

      // Fusionner les bases avant le backup pour s'assurer que toutes les données sont à jour
      console.log('🔄 Fusion des bases de données avant backup...');
      if (global.performDatabaseMerge) {
        const mergeResult = global.performDatabaseMerge();
        if (mergeResult.merged && (mergeResult.seriesCount > 0 || mergeResult.tomesCount > 0 || mergeResult.animesCount > 0 || mergeResult.gamesCount > 0)) {
          console.log(`✅ Fusion avant backup: ${mergeResult.seriesCount} séries, ${mergeResult.tomesCount} tomes, ${mergeResult.animesCount} animes, ${mergeResult.gamesCount} jeux`);
        }
      }

      backupScheduler.dbPath = userDbPath;
      
      const result = await backupScheduler.createBackup();
      
      if (result.success) {
        const config = store.get('backupConfig', {});
        config.lastBackup = result.timestamp;
        store.set('backupConfig', config);
      }
      
      return result;
    } catch (error) {
      console.error('Erreur création backup:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Lister tous les backups
  ipcMain.handle('list-backups', async () => {
    try {
      // Ne pas nettoyer lors du listage, seulement lors de la création
      // Le nettoyage est déjà fait lors de la création du backup
      const backups = backupScheduler.listBackups();
      return { success: true, backups };
    } catch (error) {
      console.error('Erreur liste backups:', error);
      return { success: false, error: error.message, backups: [] };
    }
  });
  
  // Restaurer un backup
  ipcMain.handle('restore-backup', async (event, backupPath) => {
    try {
      console.log('🔄 Début de la restauration du backup:', backupPath);
      
      // Vérifier que le fichier de backup existe
      const fs = require('fs');
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Le fichier de backup n'existe pas: ${backupPath}`);
      }
      
      // S'assurer que le dbPath est défini dans le scheduler
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const dbPath = path.join(getPathsLocal().databases, `${currentUser.toLowerCase()}.db`);
      backupScheduler.dbPath = dbPath;
      console.log('📂 Chemin de la base de données:', dbPath);
      
      // Fermer la base de données avant la restauration
      if (getDb) {
        const db = getDb();
        if (db) {
          try {
            db.close();
            console.log('✅ Base de données fermée avant restauration');
            // Attendre un peu pour s'assurer que la base est bien fermée
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (closeError) {
            console.warn('⚠️ Erreur lors de la fermeture de la base de données:', closeError);
          }
        } else {
          console.log('ℹ️  Aucune base de données ouverte actuellement');
        }
      }
      
      // Vérifier que le fichier de base de données n'est plus verrouillé
      // En Windows, il peut y avoir un délai avant que le fichier soit libéré
      let retries = 5;
      while (retries > 0) {
        try {
          // Tester si on peut ouvrir le fichier en mode lecture seule
          const testFile = fs.openSync(dbPath, 'r');
          fs.closeSync(testFile);
          break;
        } catch (testError) {
          console.log(`⏳ Attente libération du fichier... (${retries} tentatives restantes)`);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            throw new Error('Le fichier de base de données est toujours verrouillé. Fermez toutes les connexions et réessayez.');
          }
        }
      }
      
      console.log('🔄 Lancement de la restauration...');
      const result = await backupScheduler.restoreBackup(backupPath);
      
      if (result.success) {
        console.log('✅ Restauration réussie, réinitialisation de la base...');
        // Réinitialiser la base de données après restauration réussie
        if (initDatabase) {
          try {
            const newDb = initDatabase(dbPath);
            console.log('✅ Base de données réinitialisée après restauration');
          } catch (initError) {
            console.warn('⚠️ Erreur lors de la réinitialisation de la base de données:', initError);
            // L'application devra redémarrer pour que la base soit correctement réinitialisée
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur restauration backup:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Supprimer un backup
  ipcMain.handle('delete-backup', (event, backupPath) => {
    try {
      console.log('🗑️ Suppression du backup:', backupPath);
      const success = backupScheduler.deleteBackup(backupPath);
      if (success) {
        console.log('✅ Backup supprimé avec succès');
      } else {
        console.warn('⚠️ Le backup n\'a pas pu être supprimé (fichier introuvable ?)');
      }
      return { success, error: success ? null : 'Le fichier de backup n\'a pas pu être trouvé ou supprimé' };
    } catch (error) {
      console.error('❌ Erreur suppression backup:', error);
      return { success: false, error: error.message };
    }
  });

  // Initialiser le scheduler au démarrage
  const initBackupScheduler = () => {
    const config = store.get('backupConfig');
    if (config && config.enabled) {
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const dbPath = path.join(getPathsLocal().databases, `${currentUser.toLowerCase()}.db`);
        if (fs.existsSync(dbPath)) {
          backupScheduler.init(config, dbPath, store);
        }
      }
    }
  };
  
  setTimeout(initBackupScheduler, 2000);
}

module.exports = { registerBackupHandlers };
