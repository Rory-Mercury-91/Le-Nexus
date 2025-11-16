const { getUserIdByName, parseTags } = require('./adulte-game-helpers');

/**
 * Enregistre les handlers IPC pour les opérations de lecture des jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAdulteGameReadHandlers(ipcMain, getDb, store) {
  
  // GET - Récupérer tous les jeux adultes
  ipcMain.handle('get-adulte-game-games', async (event, filters = {}) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        return [];
      }
      
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return [];
      }
      
      let query = `
        SELECT 
          g.*,
          ug.chemin_executable,
          ug.notes_privees as notes_privees_user,
          ug.statut_perso as statut_perso_user,
          ug.derniere_session as derniere_session_user,
          ug.version_jouee as version_jouee_user,
          ug.is_favorite,
          CASE WHEN am.adulte_game_id IS NOT NULL THEN 1 ELSE 0 END as is_hidden,
          GROUP_CONCAT(u.name) as proprietaires
        FROM adulte_game_games g
        LEFT JOIN adulte_game_proprietaires p ON g.id = p.game_id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN adulte_game_user_games ug ON g.id = ug.game_id AND ug.user_id = ?
        LEFT JOIN adulte_game_masquees am ON g.id = am.adulte_game_id AND am.user_id = ?
      `;
      
      const conditions = [];
      const params = [userId, userId];
      
      if (filters.utilisateur) {
        const filterUserId = getUserIdByName(db, filters.utilisateur);
        if (filterUserId) {
          conditions.push(`p.user_id = ?`);
          params.push(filterUserId);
        }
      }
      if (filters.statut_perso) {
        conditions.push(`COALESCE(ug.statut_perso, g.statut_perso) = ?`);
        params.push(filters.statut_perso);
      }
      if (filters.statut_jeu) {
        conditions.push(`g.statut_jeu = ?`);
        params.push(filters.statut_jeu);
      }
      if (filters.moteur) {
        conditions.push(`g.moteur = ?`);
        params.push(filters.moteur);
      }
      if (filters.maj_disponible) {
        conditions.push(`g.maj_disponible = 1`);
      }
      if (typeof filters.traduction_fr_disponible === 'boolean') {
        conditions.push(`g.traduction_fr_disponible = ?`);
        params.push(filters.traduction_fr_disponible ? 1 : 0);
      }
      if (filters.search) {
        conditions.push(`g.titre LIKE ?`);
        params.push(`%${filters.search}%`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` GROUP BY g.id ORDER BY g.updated_at DESC`;
      
      const games = db.prepare(query).all(...params);
      
      return games.map(game => ({
        ...game,
        chemin_executable: game.chemin_executable,
        notes_privees: game.notes_privees_user || game.notes_privees,
        statut_perso: game.statut_perso_user || game.statut_perso,
        derniere_session: game.derniere_session_user || game.derniere_session,
        version_jouee: game.version_jouee_user || game.version_jouee,
        tags: parseTags(game.tags),
        proprietaires: game.proprietaires ? game.proprietaires.split(',') : []
      }));
      
    } catch (error) {
      console.error('Erreur get-adulte-game-games:', error);
      throw error;
    }
  });
  
  // GET - Récupérer un jeu adulte par ID
  ipcMain.handle('get-adulte-game-game', (event, id) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = getUserIdByName(db, currentUser);
      
      const game = db.prepare(`
        SELECT 
          g.*,
          ug.chemin_executable,
          ug.notes_privees as notes_privees_user,
          ug.statut_perso as statut_perso_user,
          ug.derniere_session as derniere_session_user,
          ug.version_jouee as version_jouee_user,
          ug.is_favorite,
          GROUP_CONCAT(u.name) as proprietaires
        FROM adulte_game_games g
        LEFT JOIN adulte_game_proprietaires p ON g.id = p.game_id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN adulte_game_user_games ug ON g.id = ug.game_id AND ug.user_id = ?
        WHERE g.id = ?
        GROUP BY g.id
      `).get(userId, id);
      
      if (!game) {
        throw new Error(`Jeu adulte non trouvé (ID: ${id})`);
      }
      
      return {
        ...game,
        chemin_executable: game.chemin_executable,
        notes_privees: game.notes_privees_user || game.notes_privees,
        statut_perso: game.statut_perso_user || game.statut_perso,
        derniere_session: game.derniere_session_user || game.derniere_session,
        version_jouee: game.version_jouee_user || game.version_jouee,
        tags: parseTags(game.tags),
        proprietaires: game.proprietaires ? game.proprietaires.split(',') : []
      };
      
    } catch (error) {
      console.error('Erreur get-adulte-game-game:', error);
      throw error;
    }
  });
}

module.exports = { registerAdulteGameReadHandlers };
