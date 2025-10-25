const cron = require('node-cron');
const Store = require('electron-store');

let checkUpdatesTask = null;
const store = new Store();

/**
 * Démarre le scheduler de vérification des mises à jour AVN
 * @param {Function} checkAvnUpdatesHandler - Handler de vérification des MAJ
 */
function startScheduler(checkAvnUpdatesHandler) {
  try {
    const enabled = store.get('avn_auto_check_enabled', false);
    const intervalHours = store.get('avn_auto_check_interval', 6);
    
    if (!enabled) {
      console.log('⚠️ Vérification auto MAJ AVN désactivée');
      return;
    }
    
    // Créer un cron job basé sur l'intervalle (en heures)
    const cronExpression = `0 */${intervalHours} * * *`; // Toutes les X heures
    
    checkUpdatesTask = cron.schedule(cronExpression, async () => {
      console.log(`🔍 Vérification automatique des MAJ AVN (intervalle: ${intervalHours}h)...`);
      
      try {
        const result = await checkAvnUpdatesHandler();
        
        if (result.updated > 0) {
          console.log(`✅ ${result.updated} mise(s) à jour AVN détectée(s)`);
          
          // Notification desktop (optionnel)
          // TODO: Implémenter notifications desktop si souhaité
        } else {
          console.log('✅ Aucune mise à jour AVN détectée');
        }
      } catch (error) {
        console.error('❌ Erreur vérification auto MAJ AVN:', error);
      }
    });
    
    console.log(`✅ Scheduler MAJ AVN démarré (intervalle: ${intervalHours}h)`);
    
  } catch (error) {
    console.error('❌ Erreur démarrage scheduler MAJ AVN:', error);
  }
}

/**
 * Arrête le scheduler de vérification
 */
function stopScheduler() {
  if (checkUpdatesTask) {
    checkUpdatesTask.stop();
    checkUpdatesTask = null;
    console.log('🛑 Scheduler MAJ AVN arrêté');
  }
}

/**
 * Vérifie les MAJ au démarrage si activé
 * @param {Function} checkAvnUpdatesHandler 
 */
async function checkOnStartup(checkAvnUpdatesHandler) {
  try {
    const enabled = store.get('avn_auto_check_enabled', false);
    const checkOnStart = store.get('avn_check_on_startup', true);
    
    if (!enabled || !checkOnStart) {
      return;
    }
    
    console.log('🔍 Vérification des MAJ AVN au démarrage...');
    
    const result = await checkAvnUpdatesHandler();
    
    if (result.updated > 0) {
      console.log(`✅ ${result.updated} mise(s) à jour AVN détectée(s) au démarrage`);
    } else {
      console.log('✅ Aucune mise à jour AVN au démarrage');
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification MAJ AVN au démarrage:', error);
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkOnStartup
};

