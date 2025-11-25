const { getUserIdByName, parseTags } = require('./adulte-game-helpers');
const { safeJsonParse } = require('../common-helpers');

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
          ud.chemin_executable,
          ud.notes_privees,
          ud.derniere_session,
          ud.version_jouee,
          ud.is_favorite,
          ud.completion_perso as statut_perso,
          ud.is_hidden,
          ud.labels,
          ud.display_preferences,
          -- Propriétaires : utilisateurs ayant des données dans adulte_game_user_data
          (SELECT GROUP_CONCAT(u.name) 
           FROM adulte_game_user_data ud2
           JOIN users u ON ud2.user_id = u.id
           WHERE ud2.game_id = g.id) as proprietaires
        FROM adulte_game_games g
        LEFT JOIN adulte_game_user_data ud ON g.id = ud.game_id AND ud.user_id = ?
      `;
      
      const conditions = [];
      const params = [userId];
      
      if (filters.utilisateur) {
        const filterUserId = getUserIdByName(db, filters.utilisateur);
        if (filterUserId) {
          conditions.push(`EXISTS (
            SELECT 1 FROM adulte_game_user_data ud2 
            WHERE ud2.game_id = g.id AND ud2.user_id = ?
          )`);
          params.push(filterUserId);
        }
      }
      if (filters.statut_perso) {
        conditions.push(`COALESCE(ud.completion_perso, '') = ?`);
        params.push(filters.statut_perso);
      }
      if (filters.statut_jeu) {
        conditions.push(`g.game_statut = ?`);
        params.push(filters.statut_jeu);
      }
      if (filters.moteur) {
        conditions.push(`g.game_engine = ?`);
        params.push(filters.moteur);
      }
      if (filters.maj_disponible) {
        conditions.push(`g.maj_disponible = 1`);
      }
      if (typeof filters.traduction_fr_disponible === 'boolean') {
        conditions.push(`g.traduction_fr_disponible = ?`);
        params.push(filters.traduction_fr_disponible ? 1 : 0);
      }
      if (filters.statut_traduction) {
        conditions.push(`g.statut_traduction = ?`);
        params.push(filters.statut_traduction);
      }
      if (filters.search) {
        conditions.push(`g.titre LIKE ?`);
        params.push(`%${filters.search}%`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY g.updated_at DESC`;
      
      const games = db.prepare(query).all(...params);
      
      return games.map(game => {
        // Parser les champs JSON
        let labels = [];
        let displayPreferences = {};
        
        if (game.labels) {
          labels = safeJsonParse(game.labels, []);
        }
        
      displayPreferences = safeJsonParse(game.display_preferences, {});
        
        return {
          ...game,
          // Mapper les anciens noms vers les nouveaux pour compatibilité
          version: game.game_version,
          statut_jeu: game.game_statut,
          moteur: game.game_engine,
          developpeur: game.game_developer,
          plateforme: game.game_site,
          tags: parseTags(game.tags),
          labels: labels,
          display_preferences: displayPreferences,
          // Mapper type_traduction vers type_trad_fr pour compatibilité frontend
          type_trad_fr: game.type_traduction,
          proprietaires: game.proprietaires ? game.proprietaires.split(',') : []
        };
      });
      
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
          ud.chemin_executable,
          ud.notes_privees,
          ud.derniere_session,
          ud.version_jouee,
          ud.is_favorite,
          ud.completion_perso as statut_perso,
          ud.is_hidden,
          ud.labels,
          ud.display_preferences,
          -- Propriétaires : utilisateurs ayant des données dans adulte_game_user_data
          (SELECT GROUP_CONCAT(u.name) 
           FROM adulte_game_user_data ud2
           JOIN users u ON ud2.user_id = u.id
           WHERE ud2.game_id = g.id) as proprietaires
        FROM adulte_game_games g
        LEFT JOIN adulte_game_user_data ud ON g.id = ud.game_id AND ud.user_id = ?
        WHERE g.id = ?
      `).get(userId, id);
      
      if (!game) {
        throw new Error(`Jeu adulte non trouvé (ID: ${id})`);
      }
      
      // Parser les champs JSON
      let labels = [];
      let displayPreferences = {};
      
      try {
        if (game.labels) {
          labels = safeJsonParse(game.labels, []);
        }
      } catch (e) {
        console.warn('Erreur parsing labels:', e);
      }
      
      displayPreferences = safeJsonParse(game.display_preferences, {});
      
      return {
        ...game,
        // Mapper les anciens noms vers les nouveaux pour compatibilité
        version: game.game_version,
        statut_jeu: game.game_statut,
        moteur: game.game_engine,
        developpeur: game.game_developer,
        plateforme: game.game_site,
        tags: parseTags(game.tags),
        labels: labels,
        display_preferences: displayPreferences,
        // Mapper type_traduction vers type_trad_fr pour compatibilité frontend
        type_trad_fr: game.type_traduction,
        proprietaires: game.proprietaires ? game.proprietaires.split(',') : []
      };
      
    } catch (error) {
      console.error('Erreur get-adulte-game-game:', error);
      throw error;
    }
  });
}

module.exports = { registerAdulteGameReadHandlers };
