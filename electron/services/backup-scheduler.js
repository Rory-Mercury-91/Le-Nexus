const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class BackupScheduler {
  constructor() {
    this.task = null;
    this.config = null;
  }

  /**
   * Initialise le scheduler de backup
   * @param {object} config - Configuration { enabled, frequency, keepCount, lastBackup }
   * @param {string} dbPath - Chemin vers la base de données
   */
  init(config, dbPath) {
    this.config = config;
    this.dbPath = dbPath;

    if (this.task) {
      this.task.stop();
    }

    if (config.enabled && config.frequency !== 'manual') {
      const cronExpression = this.getCronExpression(config.frequency);
      
      this.task = cron.schedule(cronExpression, async () => {
        console.log('🔄 Backup automatique programmé démarré...');
        await this.createBackup();
      });

      console.log(`✅ Backup scheduler initialisé (fréquence: ${config.frequency})`);
    }
  }

  /**
   * Convertit la fréquence en expression cron
   * @param {string} frequency - 'daily' ou 'weekly'
   * @returns {string} Expression cron
   */
  getCronExpression(frequency) {
    switch (frequency) {
      case 'daily':
        return '0 2 * * *'; // Tous les jours à 2h du matin
      case 'weekly':
        return '0 2 * * 0'; // Tous les dimanches à 2h du matin
      default:
        return '0 2 * * *';
    }
  }

  /**
   * Crée un backup de la base de données
   * @returns {Promise<object>} Résultat du backup
   */
  async createBackup() {
    try {
      const backupDir = this.getBackupDirectory();
      
      // Créer le dossier de backup s'il n'existe pas
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Générer le nom du fichier de backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const backupFileName = `backup_${timestamp}_${time}.db`;
      const backupPath = path.join(backupDir, backupFileName);

      // Copier la base de données
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('Base de données source introuvable');
      }

      fs.copyFileSync(this.dbPath, backupPath);

      // Nettoyer les anciens backups
      await this.cleanOldBackups(backupDir);

      console.log(`✅ Backup créé: ${backupFileName}`);

      return {
        success: true,
        path: backupPath,
        fileName: backupFileName,
        timestamp: new Date().toISOString()
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
   */
  async cleanOldBackups(backupDir) {
    try {
      const keepCount = this.config?.keepCount || 7;
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Tri du plus récent au plus ancien

      // Supprimer les backups excédentaires
      if (files.length > keepCount) {
        const toDelete = files.slice(keepCount);
        toDelete.forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Ancien backup supprimé: ${file.name}`);
        });
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
