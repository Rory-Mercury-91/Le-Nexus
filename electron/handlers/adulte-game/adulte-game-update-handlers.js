/**
 * Enregistre les handlers IPC pour les opérations de mise à jour des jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
const { markFieldAsUserModified } = require('../../utils/enrichment-helpers');

function registerAdulteGameUpdateHandlers(ipcMain, getDb, store) {
  
  // PUT - Mettre à jour un jeu adulte
  ipcMain.handle('update-adulte-game-game', (event, id, gameData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      const globalFields = [];
      const globalValues = [];
      const userFields = {};
      
      if (gameData.titre !== undefined) {
        globalFields.push('titre = ?');
        globalValues.push(gameData.titre);
      }
      if (gameData.version !== undefined) {
        globalFields.push('version = ?');
        globalValues.push(gameData.version);
      }
      if (gameData.statut_jeu !== undefined) {
        globalFields.push('statut_jeu = ?');
        globalValues.push(gameData.statut_jeu);
      }
      if (gameData.moteur !== undefined) {
        globalFields.push('moteur = ?');
        globalValues.push(gameData.moteur);
      }
      if (gameData.developpeur !== undefined) {
        globalFields.push('developpeur = ?');
        globalValues.push(gameData.developpeur);
      }
      if (gameData.couverture_url !== undefined) {
        globalFields.push('couverture_url = ?');
        globalValues.push(gameData.couverture_url);
        try {
          // Protéger ce champ contre les synchronisations futures
          markFieldAsUserModified(db, 'adulte_game_games', id, 'couverture_url');
        } catch (e) {
          // ignore
        }
      }
      if (gameData.tags !== undefined) {
        globalFields.push('tags = ?');
        globalValues.push(JSON.stringify(gameData.tags));
      }
      if (gameData.lien_f95 !== undefined) {
        globalFields.push('lien_f95 = ?');
        globalValues.push(gameData.lien_f95);
      }
      if (gameData.lien_traduction !== undefined) {
        globalFields.push('lien_traduction = ?');
        globalValues.push(gameData.lien_traduction);
      }
      if (gameData.lien_jeu !== undefined) {
        globalFields.push('lien_jeu = ?');
        globalValues.push(gameData.lien_jeu);
      }
      if (gameData.version_traduction !== undefined) {
        globalFields.push('version_traduction = ?');
        globalValues.push(gameData.version_traduction);
      }
      if (gameData.statut_traduction !== undefined) {
        globalFields.push('statut_traduction = ?');
        globalValues.push(gameData.statut_traduction);
      }
      if (gameData.type_traduction !== undefined) {
        globalFields.push('type_traduction = ?');
        globalValues.push(gameData.type_traduction);
      }
      if (gameData.version_traduite !== undefined) {
        globalFields.push('version_traduite = ?');
        globalValues.push(gameData.version_traduite);
      }
      if (gameData.type_trad_fr !== undefined) {
        globalFields.push('type_trad_fr = ?');
        globalValues.push(gameData.type_trad_fr);
      }
      if (gameData.traducteur !== undefined) {
        globalFields.push('traducteur = ?');
        globalValues.push(gameData.traducteur);
      }
      if (gameData.traductions_multiples !== undefined) {
        globalFields.push('traductions_multiples = ?');
        globalValues.push(gameData.traductions_multiples);
      }
      
      if (gameData.statut_perso !== undefined) {
        userFields.statut_perso = gameData.statut_perso;
      }
      if (gameData.notes_privees !== undefined) {
        userFields.notes_privees = gameData.notes_privees;
      }
      if (gameData.chemin_executable !== undefined) {
        userFields.chemin_executable = gameData.chemin_executable;
      }
      if (gameData.derniere_session !== undefined) {
        userFields.derniere_session = gameData.derniere_session;
      }
      
      if (globalFields.length > 0) {
        globalFields.push('updated_at = datetime(\'now\')');
        globalValues.push(id);
        const query = `UPDATE adulte_game_games SET ${globalFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...globalValues);
      }
      
      if (Object.keys(userFields).length > 0) {
        const userFieldNames = Object.keys(userFields);
        const userFieldValues = Object.values(userFields);
        
        const { getUserIdByName } = require('./adulte-game-helpers');
        const userId = getUserIdByName(db, currentUser);
        if (!userId) {
          throw new Error('Utilisateur non trouvé');
        }
        
        db.prepare(`
          INSERT INTO adulte_game_user_games (game_id, user_id, ${userFieldNames.join(', ')})
          VALUES (?, ?, ${userFieldNames.map(() => '?').join(', ')})
          ON CONFLICT(game_id, user_id) DO UPDATE SET
            ${userFieldNames.map(f => `${f} = excluded.${f}`).join(', ')}
        `).run(id, userId, ...userFieldValues);
      }
      
      if (gameData.proprietaires !== undefined) {
        db.prepare('DELETE FROM adulte_game_proprietaires WHERE game_id = ?').run(id);
        const { getUserIdByName } = require('./adulte-game-helpers');
        for (const userName of gameData.proprietaires) {
          const userId = getUserIdByName(db, userName);
          if (userId) {
            db.prepare(`
              INSERT INTO adulte_game_proprietaires (game_id, user_id)
              VALUES (?, ?)
            `).run(id, userId);
          }
        }
      }
      
      console.log(`✅ Jeu adulte mis à jour (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur update-adulte-game-game:', error);
      throw error;
    }
  });
}

module.exports = { registerAdulteGameUpdateHandlers };
