const cron = require('node-cron');
const { getLastSession } = require('../../utils/session-detector');
const { detectVersionFromPath } = require('../../utils/version-detector');

let schedulerTask = null;

/**
 * Vérifie les sessions de jeux en checkant les fichiers log.txt
 * Met à jour derniere_session dans la base de données si changement détecté
 * 
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store pour la config
 */
async function checkGameSessions(getDb, store) {
  const db = getDb();
  try {
    const currentUser = store.get('currentUser', '');
    
    // Récupérer l'ID utilisateur depuis le nom
    const { getUserIdByName } = require('../../handlers/common-helpers');
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      console.log('[Session Tracker] Aucun utilisateur connecté');
      return { checked: 0, updated: 0 };
    }

    // Récupérer tous les jeux adultes avec des exécutables configurés
    const games = db.prepare(`
      SELECT 
        g.id,
        g.titre,
        ud.chemin_executable,
        ud.derniere_session as derniere_session_db
      FROM adulte_game_games g
      INNER JOIN adulte_game_user_data ud ON g.id = ud.game_id AND ud.user_id = ?
      WHERE ud.chemin_executable IS NOT NULL AND ud.chemin_executable != ''
    `).all(userId);
    
    if (games.length === 0) {
      console.log('[Session Tracker] Aucun jeu à vérifier');
      return { checked: 0, updated: 0 };
    }
    
    console.log(`[Session Tracker] Vérification de ${games.length} jeu(x)...`);
    
    let checked = 0;
    let updated = 0;
    
    for (const game of games) {
      try {
        let executables = [];
        
        // Parser les exécutables (JSON array ou string simple)
        try {
          const parsed = JSON.parse(game.chemin_executable);
          if (Array.isArray(parsed)) {
            executables = parsed;
          } else {
            executables = [{ version: 'default', path: game.chemin_executable }];
          }
        } catch {
          // Format ancien (string simple)
          executables = [{ version: 'default', path: game.chemin_executable }];
        }
        
        // Vérifier chaque exécutable pour trouver la session la plus récente
        let mostRecentSession = null;
        let mostRecentPath = null;
        
        for (const exe of executables) {
          const sessionDate = getLastSession(exe.path);
          
          if (sessionDate) {
            if (!mostRecentSession || sessionDate > mostRecentSession) {
              mostRecentSession = sessionDate;
              mostRecentPath = exe.path;
            }
          }
        }
        
        checked++;
        
        // Si on a trouvé une session et qu'elle est plus récente que celle en DB
        if (mostRecentSession && mostRecentPath) {
          const dbDate = game.derniere_session_db ? new Date(game.derniere_session_db) : null;
          
          if (!dbDate || mostRecentSession > dbDate) {
            // Détecter la version depuis le chemin
            const detectedVersion = detectVersionFromPath(mostRecentPath);
            
            // Mettre à jour dans adulte_game_user_data
            if (detectedVersion) {
              db.prepare(`
                UPDATE adulte_game_user_data 
                SET derniere_session = ?,
                    version_jouee = ?,
                    updated_at = datetime('now')
                WHERE game_id = ? AND user_id = ?
              `).run(mostRecentSession.toISOString(), detectedVersion, game.id, userId);
              
              console.log(`[Session Tracker] ✅ "${game.titre}": session mise à jour (${mostRecentSession.toISOString()}) - Version jouée: ${detectedVersion}`);
            } else {
              db.prepare(`
                UPDATE adulte_game_user_data 
                SET derniere_session = ?,
                    updated_at = datetime('now')
                WHERE game_id = ? AND user_id = ?
              `).run(mostRecentSession.toISOString(), game.id, userId);
              
              console.log(`[Session Tracker] ✅ "${game.titre}": session mise à jour (${mostRecentSession.toISOString()})`);
            }
            
            updated++;
          }
        }
        
      } catch (error) {
        console.error(`[Session Tracker] Erreur pour "${game.titre}":`, error);
      }
    }
    
    if (updated > 0) {
      console.log(`[Session Tracker] ✅ ${updated} session(s) mise(s) à jour sur ${checked} jeu(x) vérifiés`);
    }
    
    return { checked, updated };
    
  } catch (error) {
    console.error('[Session Tracker] Erreur globale:', error);
    return { checked: 0, updated: 0, error: error.message };
  }
}

/**
 * Initialise le scheduler de vérification des sessions
 * Vérifie toutes les 5 minutes si des jeux ont été lancés en dehors de l'application
 * 
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function initScheduler(getDb, store) {
  // Arrêter le scheduler existant si présent
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }
  
  // Vérification toutes les 5 minutes
  schedulerTask = cron.schedule('*/5 * * * *', async () => {
    console.log('[Session Tracker] 🔄 Vérification automatique des sessions...');
    await checkGameSessions(getDb, store);
  });
  
  console.log('[Session Tracker] ✅ Scheduler initialisé (vérification toutes les 5 minutes)');
}

/**
 * Arrête le scheduler de vérification
 */
function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Session Tracker] 🛑 Scheduler arrêté');
  }
}

module.exports = {
  checkGameSessions,
  initScheduler,
  stopScheduler
};
