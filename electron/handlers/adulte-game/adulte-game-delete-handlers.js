const { getUserIdByName } = require('./adulte-game-helpers');

/**
 * Enregistre les handlers IPC pour les opérations de suppression des jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAdulteGameDeleteHandlers(ipcMain, getDb, store) {
  
  // DELETE - Supprimer un jeu adulte
  ipcMain.handle('delete-adulte-game-game', (event, id) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }
      
      const game = db.prepare('SELECT * FROM adulte_game_games WHERE id = ?').get(id);
      
      if (game) {
        if (game.f95_thread_id || game.Lewdcorner_thread_id || game.traducteur) {
          try {
            // Déterminer la plateforme et l'ID du thread correctement
            let threadId = null;
            let platform = game.game_site || 'F95Zone';
            
            // Si le jeu a un ID LewdCorner et pas d'ID F95, c'est un jeu LewdCorner
            if (game.Lewdcorner_thread_id && !game.f95_thread_id) {
              threadId = game.Lewdcorner_thread_id;
              platform = 'LewdCorner';
            } 
            // Si le jeu a un ID F95, c'est un jeu F95Zone
            else if (game.f95_thread_id) {
              threadId = game.f95_thread_id;
              // Utiliser game_site si défini, sinon 'F95Zone'
              platform = game.game_site || 'F95Zone';
            }
            // Si le jeu a les deux IDs, utiliser F95 par défaut (ou game_site)
            else if (game.Lewdcorner_thread_id && game.f95_thread_id) {
              threadId = game.f95_thread_id;
              platform = game.game_site || 'F95Zone';
            }
            
            const key = threadId ? threadId.toString() : '';
            
            if (key) {
              const value = JSON.stringify({
                titre: game.titre,
                plateforme: platform,
                traducteur: game.traducteur || null,
                raison: 'Supprimé manuellement'
              });
              
              // SQLite ne supporte pas ON CONFLICT avec COALESCE, donc on utilise UPDATE/INSERT
              const existing = db.prepare(`
                SELECT id FROM user_preferences 
                WHERE user_id = ? AND content_type = 'adulte_game' AND type = 'blacklist' AND key = ? AND platform = ?
              `).get(userId, key, platform);
              
              if (existing) {
                db.prepare(`
                  UPDATE user_preferences 
                  SET value = ?, updated_at = datetime('now')
                  WHERE id = ?
                `).run(value, existing.id);
              } else {
                db.prepare(`
                  INSERT INTO user_preferences (user_id, content_type, type, key, value, platform, created_at, updated_at)
                  VALUES (?, 'adulte_game', 'blacklist', ?, ?, ?, datetime('now'), datetime('now'))
                `).run(userId, key, value, platform);
              }
              
              console.log(`📝 Jeu ajouté à la liste noire: ${game.titre} (${platform}, ID: ${threadId})`);
            }
          } catch (blacklistError) {
            console.warn('⚠️ Erreur ajout à la liste noire:', blacklistError);
          }
        }
      }
      
      db.prepare('DELETE FROM adulte_game_games WHERE id = ?').run(id);
      
      console.log(`✅ Jeu adulte supprimé (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur delete-adulte-game-game:', error);
      throw error;
    }
  });
}

module.exports = { registerAdulteGameDeleteHandlers };
