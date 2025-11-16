/**
 * Enregistre les handlers IPC pour la gestion des tags jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 */
function registerTagsHandlers(ipcMain, getDb) {
  
  // Récupérer tous les tags uniques existants
  ipcMain.handle('get-all-tags', async () => {
    try {
      const db = getDb();
      
      const games = db.prepare('SELECT tags FROM adulte_game_games WHERE tags IS NOT NULL').all();
      
      const allTags = new Set();
      games.forEach(game => {
        try {
          const tags = JSON.parse(game.tags);
          if (Array.isArray(tags)) {
            tags.forEach(tag => allTags.add(tag));
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      });
      
      return Array.from(allTags).sort();
    } catch (error) {
      console.error('❌ Erreur get-all-tags:', error);
      throw error;
    }
  });

  // Récupérer les préférences de tags pour un utilisateur
  ipcMain.handle('get-adulte-game-tag-preferences', async (_event, userId) => {
    try {
      const db = getDb();
      const preferences = db.prepare('SELECT tag, preference FROM adulte_game_tag_preferences WHERE user_id = ?').all(userId);
      
      const result = {};
      preferences.forEach(pref => {
        result[pref.tag] = pref.preference;
      });
      
      return result;
    } catch (error) {
      console.error('❌ Erreur get-adulte-game-tag-preferences:', error);
      throw error;
    }
  });

  // Basculer la préférence d'un tag (liked → disliked → neutral → liked)
  ipcMain.handle('toggle-adulte-game-tag-preference', async (_event, userId, tag) => {
    try {
      const db = getDb();
      
      // Récupérer la préférence actuelle
      const current = db.prepare('SELECT preference FROM adulte_game_tag_preferences WHERE user_id = ? AND tag = ?').get(userId, tag);
      
      let newPreference;
      if (!current) {
        // Pas de préférence, passer à 'liked'
        newPreference = 'liked';
      } else {
        // Cycle: liked → disliked → neutral → liked
        switch (current.preference) {
          case 'liked':
            newPreference = 'disliked';
            break;
          case 'disliked':
            newPreference = 'neutral';
            break;
          case 'neutral':
            newPreference = 'liked';
            break;
          default:
            newPreference = 'liked';
        }
      }
      
      // Insérer ou mettre à jour
      if (newPreference === 'neutral') {
        // Supprimer l'entrée si neutre pour éviter l'encombrement
        db.prepare('DELETE FROM adulte_game_tag_preferences WHERE user_id = ? AND tag = ?').run(userId, tag);
      } else {
        db.prepare(`
          INSERT INTO adulte_game_tag_preferences (user_id, tag, preference, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, tag) DO UPDATE SET
            preference = ?,
            updated_at = CURRENT_TIMESTAMP
        `).run(userId, tag, newPreference, newPreference);
      }
      
      return { success: true, preference: newPreference };
    } catch (error) {
      console.error('❌ Erreur toggle-adulte-game-tag-preference:', error);
      throw error;
    }
  });
}

module.exports = { registerTagsHandlers };
