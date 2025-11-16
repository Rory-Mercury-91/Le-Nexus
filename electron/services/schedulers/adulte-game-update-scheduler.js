const cron = require('node-cron');
const Store = require('electron-store');

let checkUpdatesTask = null;
const store = new Store();

/**
 * Démarre le scheduler de vérification des mises à jour jeux adultes
 * @param {Function} checkAdulteGameUpdatesHandler - Handler de vérification des MAJ
 */
function startScheduler(checkAdulteGameUpdatesHandler) {
  try {
    const enabled = store.get('adulte_game_auto_check_enabled', false);
    const intervalHours = store.get('adulte_game_auto_check_interval', 6);
    
    if (!enabled) {
      console.log('⚠️ Vérification auto MAJ jeux adultes désactivée');
      return;
    }
    
    // Créer un cron job basé sur l'intervalle (en heures)
    const cronExpression = `0 */${intervalHours} * * *`; // Toutes les X heures
    
    checkUpdatesTask = cron.schedule(cronExpression, async () => {
      console.log(`🔍 Vérification automatique des MAJ jeux adultes (intervalle: ${intervalHours}h)...`);
      
      try {
        const result = await checkAdulteGameUpdatesHandler();
        
        if (result.updated > 0) {
          console.log(`✅ ${result.updated} mise(s) à jour jeux adultes détectée(s)`);
          
          // Notification desktop (optionnel)
          // TODO: Implémenter notifications desktop si souhaité
        } else {
          console.log('✅ Aucune mise à jour jeux adultes détectée');
        }
      } catch (error) {
        console.error('❌ Erreur vérification auto MAJ jeux adultes:', error);
      }
    });
    
    console.log(`✅ Scheduler MAJ jeux adultes démarré (intervalle: ${intervalHours}h)`);
    
  } catch (error) {
    console.error('❌ Erreur démarrage scheduler MAJ jeux adultes:', error);
  }
}

/**
 * Arrête le scheduler de vérification
 */
function stopScheduler() {
  if (checkUpdatesTask) {
    checkUpdatesTask.stop();
    checkUpdatesTask = null;
    console.log('🛑 Scheduler MAJ jeux adultes arrêté');
  }
}

/**
 * Vérifie les MAJ au démarrage si activé
 * @param {Function} checkAdulteGameUpdatesHandler 
 */
async function checkOnStartup(checkAdulteGameUpdatesHandler) {
  try {
    const enabled = store.get('adulte_game_auto_check_enabled', false);
    const checkOnStart = store.get('adulte_game_check_on_startup', true);
    const intervalHours = store.get('adulte_game_auto_check_interval', 6);
    
    if (!enabled || !checkOnStart) {
      return;
    }

    const lastCheck = store.get('adulte_game_last_check', null);
    if (lastCheck?.timestamp) {
      const lastTime = new Date(lastCheck.timestamp).getTime();
      const now = Date.now();
      const diffHours = (now - lastTime) / (1000 * 60 * 60);
      if (diffHours < intervalHours) {
        console.log(`⏭️  Vérification jeux adultes déjà effectuée il y a ${diffHours.toFixed(1)}h (intervalle ${intervalHours}h)`);
        return;
      }
    }
    
    console.log('🔍 Vérification des MAJ jeux adultes au démarrage...');
    
    const result = await checkAdulteGameUpdatesHandler();
    
    if (result.updated > 0) {
      console.log(`✅ ${result.updated} mise(s) à jour jeux adultes détectée(s) au démarrage`);
    } else {
      console.log('✅ Aucune mise à jour jeux adultes au démarrage');
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification MAJ jeux adultes au démarrage:', error);
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkOnStartup
};
