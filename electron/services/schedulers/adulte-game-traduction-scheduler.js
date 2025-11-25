/**
 * Scheduler pour la synchronisation automatique des traductions jeux adultes
 * Gère les tâches planifiées de synchronisation depuis Google Sheets
 */

const cron = require('node-cron');
const { performAdulteGameUpdatesCheck } = require('../../handlers/adulte-game/adulte-game-updates-check-handlers');

// Scheduler global
let schedulerTask = null;

/**
 * Convertit la fréquence en expression cron
 * @param {string} frequency - '1h', '3h', '6h', '12h', '24h', 'manual'
 * @returns {string} Expression cron
 */
function getCronExpression(frequency) {
  switch (frequency) {
    case '1h':
      return '0 * * * *'; // Toutes les heures
    case '3h':
      return '0 */3 * * *'; // Toutes les 3 heures
    case '6h':
      return '0 */6 * * *'; // Toutes les 6 heures
    case '12h':
      return '0 */12 * * *'; // Toutes les 12 heures
    case '24h':
      return '0 9 * * *'; // Une fois par jour à 9h
    default:
      return null;
  }
}

/**
 * Initialise le scheduler de synchronisation
 * @param {object} config - Configuration { enabled, traducteurs, sheetUrl, syncFrequency }
 * @param {object} db - Instance de la base de données
 * @param {object} store - Instance electron-store
 */
function initScheduler(config, dbOrGetter, store) {
  const getDb = typeof dbOrGetter === 'function' ? dbOrGetter : () => dbOrGetter;

  // Arrêter le scheduler existant
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }

  // Si désactivé ou manuel, ne pas programmer
  if (!config.enabled || config.syncFrequency === 'manual') {
    console.log('📅 Synchronisation traductions: mode manuel');
    return;
  }

  const cronExpression = getCronExpression(config.syncFrequency);
  if (!cronExpression) {
    console.log('⚠️ Fréquence de sync traductions invalide:', config.syncFrequency);
    return;
  }

  // Créer le scheduler
  schedulerTask = cron.schedule(cronExpression, async () => {
    console.log('🔄 Synchronisation automatique jeux adultes (Google Sheet + F95Zone, jeux existants uniquement)...');
    try {
      const db = getDb();
      if (!db || db.open === false) {
        console.warn('⚠️ Synchronisation automatique annulée: base de données indisponible ou fermée');
        return;
      }

      const result = await performAdulteGameUpdatesCheck(db, store, null, null, getPathManager);
      
      if (result) {
        // Mettre à jour la config avec la date de sync
        const updatedConfig = {
          ...config,
          lastSync: new Date().toISOString(),
          gamesCount: result.sheetSynced || 0
        };
        store.set('traductionConfig', updatedConfig);
        config = updatedConfig;
        
        console.log(`✅ Sync auto terminée: ${result.sheetSynced} jeu(x) avec traduction(s), ${result.updated} MAJ F95Zone détectée(s)`);
      }
    } catch (error) {
      console.error('❌ Erreur scheduler traductions:', error);
    }
  });

  console.log(`✅ Scheduler traductions FR initialisé (fréquence: ${config.syncFrequency})`);
}

/**
 * Arrête le scheduler de synchronisation
 */
function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('🛑 Scheduler traductions FR arrêté');
  }
}

module.exports = {
  initScheduler,
  stopScheduler,
  getCronExpression
};
