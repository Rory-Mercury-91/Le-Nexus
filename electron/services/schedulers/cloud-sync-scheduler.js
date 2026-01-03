/**
 * Scheduler pour la synchronisation cloud automatique
 */

const cron = require('node-cron');

class CloudSyncScheduler {
  constructor() {
    this.task = null;
    this.config = null;
    this.syncFunction = null;
  }

  /**
   * Initialise le scheduler de synchronisation cloud
   * @param {object} config - Configuration { enabled, syncFrequency }
   * @param {Function} syncFunction - Fonction à appeler pour synchroniser
   */
  init(config, syncFunction) {
    this.config = config;
    this.syncFunction = syncFunction;

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    if (config.enabled && config.syncFrequency && config.syncFrequency !== 'manual') {
      const cronExpression = this.getCronExpression(config.syncFrequency);
      
      if (cronExpression) {
        this.task = cron.schedule(cronExpression, async () => {
          console.log('🔄 Synchronisation cloud automatique démarrée...');
          try {
            if (this.syncFunction) {
              await this.syncFunction();
            }
            console.log('✅ Synchronisation cloud automatique terminée');
          } catch (error) {
            console.error('❌ Erreur synchronisation cloud automatique:', error);
          }
        });

        console.log(`✅ Cloud sync scheduler initialisé (fréquence: ${config.syncFrequency})`);
      }
    }
  }

  /**
   * Convertit la fréquence en expression cron
   * @param {string} frequency - Fréquence: '6h', '12h', '24h', '7d', '30d'
   * @returns {string|null} Expression cron ou null si fréquence invalide
   */
  getCronExpression(frequency) {
    switch (frequency) {
      case '6h':
        // Toutes les 6 heures (à 00:00, 06:00, 12:00, 18:00)
        return '0 */6 * * *';
      case '12h':
        // Toutes les 12 heures (à 00:00 et 12:00)
        return '0 */12 * * *';
      case '24h':
      case 'daily':
        // Tous les jours à 02:00
        return '0 2 * * *';
      case '7d':
      case 'weekly':
        // Tous les lundis à 02:00
        return '0 2 * * 1';
      case '30d':
      case 'monthly':
        // Le 1er de chaque mois à 02:00
        return '0 2 1 * *';
      default:
        return null;
    }
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  /**
   * Convertit la fréquence en heures pour calculer l'intervalle
   * @param {string} frequency - Fréquence: '6h', '12h', '24h', '7d', '30d'
   * @returns {number|null} Nombre d'heures ou null si fréquence invalide
   */
  getFrequencyHours(frequency) {
    switch (frequency) {
      case '6h':
        return 6;
      case '12h':
        return 12;
      case '24h':
      case 'daily':
        return 24;
      case '7d':
      case 'weekly':
        return 24 * 7;
      case '30d':
      case 'monthly':
        return 24 * 30;
      default:
        return null;
    }
  }

  /**
   * Vérifie si une synchronisation est nécessaire au démarrage
   * @param {Store} store - Instance d'electron-store
   * @returns {boolean} true si une synchronisation est nécessaire
   */
  shouldSyncOnStartup(store) {
    const config = store.get('cloudSyncConfig', {});
    
    if (!config.enabled || !config.syncFrequency || config.syncFrequency === 'manual') {
      return false;
    }

    // Si le dev mode est activé, toujours synchroniser
    const devMode = store.get('devMode', false);
    if (devMode) {
      return true;
    }

    // Vérifier la dernière synchronisation
    const syncHistory = store.get('cloudSyncHistory', {});
    const lastSyncTimestamp = syncHistory.lastSync;
    
    if (!lastSyncTimestamp) {
      return true; // Jamais synchronisé
    }

    const frequencyHours = this.getFrequencyHours(config.syncFrequency);
    if (!frequencyHours) {
      return false;
    }

    const lastSyncTime = new Date(lastSyncTimestamp).getTime();
    const now = Date.now();
    const hoursSinceLastSync = (now - lastSyncTime) / (1000 * 60 * 60);

    return hoursSinceLastSync >= frequencyHours;
  }
}

// Instance singleton
const cloudSyncScheduler = new CloudSyncScheduler();

module.exports = cloudSyncScheduler;
