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
        if (game.f95_thread_id || game.traducteur) {
          try {
            db.prepare(`
              INSERT INTO adulte_game_blacklist (f95_thread_id, titre, plateforme, traducteur, user_id, raison)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(f95_thread_id, plateforme, user_id) DO UPDATE SET
                date_blacklist = CURRENT_TIMESTAMP
            `).run(
              game.f95_thread_id,
              game.titre,
              game.plateforme || 'F95Zone',
              game.traducteur,
              userId,
              'Supprimé manuellement'
            );
            console.log(`📝 Jeu ajouté à la liste noire: ${game.titre}`);
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
