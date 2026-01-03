const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class BackupScheduler {
  constructor() {
    this.task = null;
    this.config = null;
    this.dbPath = null;
    this.store = null;
  }

  /**
   * Initialise le scheduler de backup
   * @param {object} config - Configuration { enabled, frequency, day, hour, keepCount, lastBackup, backupOnStartup, backupOnShutdown }
   * @param {string} dbPath - Chemin vers la base de données
   */
  init(config, dbPath, store = null) {
    this.config = config;
    // Préserver le dbPath existant si un nouveau n'est pas fourni
    this.dbPath = dbPath || this.dbPath;
    this.store = store || this.store;

    if (this.task) {
      this.task.stop();
    }

    // Backup toujours activé (enabled est toujours true maintenant)
    // Frequency peut être 'daily' ou 'weekly' (plus de 'manual')
    if (config.frequency === 'daily' || config.frequency === 'weekly') {
      const cronExpression = this.getCronExpression(config);

      this.task = cron.schedule(cronExpression, async () => {
        console.log('🔄 Backup automatique programmé démarré...');
        const result = await this.createBackup('scheduled');
        if (result?.success && result.timestamp) {
          if (this.config) {
            this.config.lastBackup = result.timestamp;
          }
          if (this.store) {
            const currentConfig = this.store.get('backupConfig', {});
            this.store.set('backupConfig', { ...currentConfig, lastBackup: result.timestamp });
          }
        }
      });

      console.log(`✅ Backup scheduler initialisé (fréquence: ${config.frequency}, jour: ${config.day}, heure: ${config.hour})`);
    }

    // Backup au démarrage si activé (seulement si on vient de l'initialiser avec un dbPath)
    // Ne pas créer de backup si on réinitialise juste la config (dbPath serait null)
    if (config.backupOnStartup && dbPath) {
      if (this.dbPath && fs.existsSync(this.dbPath)) {
        this.createBackupOnStartup();
      } else {
        console.warn('⚠️ Backup au démarrage ignoré : chemin de base non défini ou fichier absent.');
      }
    }
  }

  /**
   * Crée un backup au démarrage de l'application
   */
  async createBackupOnStartup() {
    try {
      console.log('🚀 Création backup au démarrage...');
      const result = await this.createBackup('launch');
      if (result.success) {
        console.log('✅ Backup de démarrage créé avec succès');
        if (result.timestamp) {
          if (this.config) {
            this.config.lastBackup = result.timestamp;
          }
          if (this.store) {
            const currentConfig = this.store.get('backupConfig', {});
            this.store.set('backupConfig', { ...currentConfig, lastBackup: result.timestamp });
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Erreur backup de démarrage:', error);
    }
  }

  /**
   * Crée un backup à la fermeture de l'application
   */
  async createBackupOnShutdown() {
    try {
      console.log('🛑 Création backup à la fermeture...');
      const result = await this.createBackup('quit');
      if (result.success) {
        console.log('✅ Backup de fermeture créé avec succès');
      }
      return result;
    } catch (error) {
      console.error('⚠️ Erreur backup de fermeture:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convertit la configuration en expression cron
   * @param {object} config - Configuration avec frequency, day, hour
   * @returns {string} Expression cron
   */
  getCronExpression(config) {
    // Parser l'heure (format HH:mm)
    const [hour, minute] = (config.hour || '02:00').split(':').map(Number);

    switch (config.frequency) {
      case 'daily':
        // Format cron: minute heure jour_du_mois mois jour_de_la_semaine
        return `${minute} ${hour} * * *`; // Tous les jours à l'heure spécifiée
      case 'weekly': {
        // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
        const day = config.day !== undefined ? config.day : 0;
        return `${minute} ${hour} * * ${day}`; // Jour spécifique à l'heure spécifiée
      }
      default:
        return `${minute} ${hour} * * *`;
    }
  }

  /**
   * Crée un backup de la base de données
   * @param {string} backupType - Type de backup: 'manual', 'scheduled', 'launch', 'quit'
   * @returns {Promise<object>} Résultat du backup
   */
  async createBackup(backupType = 'manual') {
    // Fusionner les bases avant le backup pour s'assurer que toutes les données sont à jour
    if (global.performDatabaseMerge) {
      try {
        console.log('🔄 Fusion des bases de données avant backup...');
        const mergeResult = global.performDatabaseMerge();
        if (mergeResult.merged && (mergeResult.seriesCount > 0 || mergeResult.tomesCount > 0 || mergeResult.animesCount > 0 || mergeResult.gamesCount > 0)) {
          console.log(`✅ Fusion avant backup: ${mergeResult.seriesCount} séries, ${mergeResult.tomesCount} tomes, ${mergeResult.animesCount} animes, ${mergeResult.gamesCount} jeux`);
        }
      } catch (error) {
        console.warn('⚠️ Erreur fusion avant backup:', error.message);
        // Ne pas bloquer le backup en cas d'erreur de fusion
      }
    }
    try {
      if (!this.dbPath) {
        console.warn('⚠️ Backup annulé : chemin de base non défini.');
        return {
          success: false,
          error: 'Chemin de base de données non configuré'
        };
      }

      const backupDir = this.getBackupDirectory();

      // Créer le dossier de backup s'il n'existe pas
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Générer le nom du fichier de backup avec le type
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const typePrefix = backupType === 'launch' ? 'launch_' : backupType === 'quit' ? 'quit_' : backupType === 'scheduled' ? 'scheduled_' : '';
      const backupFileName = `backup_${typePrefix}${timestamp}_${time}.db`;
      const backupPath = path.join(backupDir, backupFileName);

      // Copier la base de données
      if (!fs.existsSync(this.dbPath)) {
        console.warn(`⚠️ Backup annulé : base de données introuvable (${this.dbPath}).`);
        return {
          success: false,
          error: 'Base de données source introuvable'
        };
      }

      fs.copyFileSync(this.dbPath, backupPath);

      console.log(`✅ Backup créé: ${backupFileName}`);
      const isoTimestamp = new Date().toISOString();
      if (this.config) {
        this.config.lastBackup = isoTimestamp;
      }
      if (this.store) {
        const currentConfig = this.store.get('backupConfig', {});
        this.store.set('backupConfig', { ...currentConfig, lastBackup: isoTimestamp });
      }

      // Nettoyer les anciens backups immédiatement (en excluant celui qui vient d'être créé)
      await this.cleanOldBackups(backupDir, backupPath);

      return {
        success: true,
        path: backupPath,
        fileName: backupFileName,
        timestamp: isoTimestamp
      };
    } catch (error) {
      console.error('❌ Erreur lors du backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Nettoie les anciens backups selon la configuration
   * @param {string} backupDir - Dossier contenant les backups
   * @param {string} excludePath - Chemin du backup à exclure du nettoyage (optionnel)
   */
  async cleanOldBackups(backupDir, excludePath = null) {
    try {
      const keepCount = this.config?.keepCount || 10;

      if (!fs.existsSync(backupDir)) {
        return; // Pas de dossier, rien à nettoyer
      }

      // Normaliser les chemins pour une comparaison fiable
      const normalizePath = (p) => path.normalize(p).toLowerCase().replace(/\\/g, '/');
      const excludePathNormalized = excludePath ? normalizePath(excludePath) : null;

      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(backupDir, f);
          const stats = fs.statSync(filePath);
          const normalizedPath = normalizePath(filePath);
          return {
            name: f,
            path: filePath,
            normalizedPath: normalizedPath,
            time: stats.mtime.getTime()
          };
        })
        // Exclure le backup qui vient d'être créé en comparant les chemins normalisés
        .filter(f => !excludePathNormalized || f.normalizedPath !== excludePathNormalized)
        .sort((a, b) => b.time - a.time); // Tri du plus récent au plus ancien

      // On garde keepCount fichiers au total (incluant le nouveau si présent)
      const totalFiles = excludePath ? files.length + 1 : files.length;

      if (totalFiles > keepCount) {
        // On veut garder keepCount fichiers au total
        // Donc on garde les keepCount-1 plus récents de la liste actuelle (le nouveau compte déjà)
        const filesToKeep = excludePath ? keepCount - 1 : keepCount;
        const toDelete = files.slice(filesToKeep);
        const deletedCount = toDelete.length;

        if (deletedCount > 0) {
          toDelete.forEach(file => {
            try {
              fs.unlinkSync(file.path);
              console.log(`🗑️ Ancien backup supprimé: ${file.name}`);
            } catch (deleteError) {
              console.warn(`⚠️ Impossible de supprimer ${file.name}:`, deleteError.message);
            }
          });
          console.log(`🧹 Nettoyage: ${deletedCount} backup(s) supprimé(s), ${keepCount} conservé(s)`);
        }
      } else {
        console.log(`ℹ️  Nettoyage: ${totalFiles} backup(s) au total, limite: ${keepCount}, aucun nettoyage nécessaire`);
      }
    } catch (error) {
      console.error('⚠️ Erreur lors du nettoyage des backups:', error);
    }
  }

  /**
   * Liste tous les backups disponibles
   * @returns {Array} Liste des backups avec leurs infos
   */
  listBackups() {
    try {
      const backupDir = this.getBackupDirectory();

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            size: stats.size,
            date: stats.mtime,
            timestamp: stats.mtime.getTime()
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Plus récent en premier

      return files;
    } catch (error) {
      console.error('Erreur lors de la liste des backups:', error);
      return [];
    }
  }

  /**
   * Restaure un backup
   * @param {string} backupPath - Chemin vers le fichier de backup
   * @returns {Promise<object>} Résultat de la restauration
   */
  async restoreBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Fichier de backup introuvable');
      }

      // Créer un backup de sécurité avant la restauration
      const safetyBackupPath = this.dbPath + '.before-restore';
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, safetyBackupPath);
      }

      // Restaurer le backup
      fs.copyFileSync(backupPath, this.dbPath);

      console.log(`✅ Backup restauré: ${path.basename(backupPath)}`);

      // Supprimer le backup de sécurité après succès
      if (fs.existsSync(safetyBackupPath)) {
        fs.unlinkSync(safetyBackupPath);
      }

      return {
        success: true,
        message: 'Backup restauré avec succès. Redémarrage de l\'application nécessaire.'
      };
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);

      // Restaurer le backup de sécurité en cas d'échec
      const safetyBackupPath = this.dbPath + '.before-restore';
      if (fs.existsSync(safetyBackupPath)) {
        fs.copyFileSync(safetyBackupPath, this.dbPath);
        fs.unlinkSync(safetyBackupPath);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Supprime un backup spécifique
   * @param {string} backupPath - Chemin vers le fichier de backup
   * @returns {boolean} Succès de la suppression
   */
  deleteBackup(backupPath) {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        console.log(`🗑️ Backup supprimé: ${path.basename(backupPath)}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la suppression du backup:', error);
      return false;
    }
  }

  /**
   * Obtient le chemin du dossier de backup
   * @returns {string} Chemin du dossier de backup
   */
  getBackupDirectory() {
    return path.join(app.getPath('userData'), 'backups');
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('🛑 Backup scheduler arrêté');
    }
  }
}

module.exports = new BackupScheduler();
