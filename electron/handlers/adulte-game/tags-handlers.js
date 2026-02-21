const { safeJsonParse } = require('../common-helpers');
const { parseTags } = require('./adulte-game-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des tags jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 */
function registerTagsHandlers(ipcMain, getDb) {
  
  // Récupérer les préférences de tags pour un utilisateur
  ipcMain.handle('get-adulte-game-tag-preferences', async (_event, userId) => {
    try {
      const db = getDb();
      const preferences = db.prepare(`
        SELECT key, value FROM user_preferences 
        WHERE user_id = ? AND content_type = 'adulte_game' AND type = 'tag_preferences'
      `).all(userId);
      
      const result = {};
      preferences.forEach(pref => {
        const value = safeJsonParse(pref.value || '{}', {});
        result[pref.key] = value.preference || 'neutral';
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
      const current = db.prepare(`
        SELECT value FROM user_preferences 
        WHERE user_id = ? AND content_type = 'adulte_game' AND type = 'tag_preferences' AND key = ?
      `).get(userId, tag);
      
      let currentPreference = 'neutral';
      if (current) {
        const value = safeJsonParse(current.value || '{}', {});
        currentPreference = value.preference || 'neutral';
      }
      
      // Cycle: liked → disliked → neutral → liked
      let newPreference;
      switch (currentPreference) {
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
      
      // Insérer ou mettre à jour
      if (newPreference === 'neutral') {
        // Supprimer l'entrée si neutre pour éviter l'encombrement
        db.prepare(`
          DELETE FROM user_preferences 
          WHERE user_id = ? AND content_type = 'adulte_game' AND type = 'tag_preferences' AND key = ?
        `).run(userId, tag);
      } else {
        const value = JSON.stringify({ preference: newPreference });
        // SQLite ne supporte pas ON CONFLICT avec COALESCE, donc on utilise UPDATE/INSERT
        const existing = db.prepare(`
          SELECT id FROM user_preferences 
          WHERE user_id = ? AND content_type = 'adulte_game' AND type = 'tag_preferences' AND key = ? AND (platform IS NULL OR platform = '')
        `).get(userId, tag);
        
        if (existing) {
          db.prepare(`
            UPDATE user_preferences 
            SET value = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(value, existing.id);
        } else {
          db.prepare(`
            INSERT INTO user_preferences (user_id, content_type, type, key, value, platform, created_at, updated_at)
            VALUES (?, 'adulte_game', 'tag_preferences', ?, ?, NULL, datetime('now'), datetime('now'))
          `).run(userId, tag, value);
        }
      }
      
      return { success: true, preference: newPreference };
    } catch (error) {
      console.error('❌ Erreur toggle-adulte-game-tag-preference:', error);
      throw error;
    }
  });
}

module.exports = { registerTagsHandlers };
