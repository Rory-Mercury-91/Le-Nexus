/**
 * Enregistre les handlers IPC pour les opérations de mise à jour des jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
const { buildDynamicUpdateQuery, executeUpdateWithMarking } = require('../common/crud-helpers');
const { markFieldAsUserModified } = require('../../utils/enrichment-helpers');

function registerAdulteGameUpdateHandlers(ipcMain, getDb, store) {
  
  // PUT - Mettre à jour un jeu adulte
  ipcMain.handle('update-adulte-game-game', (event, id, gameData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      // Séparer les champs globaux des champs utilisateur
      const globalData = {};
      const userFields = {};
      
      // Champs globaux (avec mapping vers nouveaux noms)
      if (gameData.titre !== undefined) globalData.titre = gameData.titre;
      if (gameData.version !== undefined || gameData.game_version !== undefined) {
        globalData.game_version = gameData.game_version || gameData.version;
      }
      if (gameData.statut_jeu !== undefined || gameData.game_statut !== undefined) {
        globalData.game_statut = gameData.game_statut || gameData.statut_jeu;
      }
      if (gameData.moteur !== undefined || gameData.game_engine !== undefined) {
        globalData.game_engine = gameData.game_engine || gameData.moteur;
      }
      if (gameData.developpeur !== undefined || gameData.game_developer !== undefined) {
        globalData.game_developer = gameData.game_developer || gameData.developpeur;
      }
      if (gameData.plateforme !== undefined || gameData.game_site !== undefined) {
        globalData.game_site = gameData.game_site || gameData.plateforme;
      }
      if (gameData.couverture_url !== undefined) globalData.couverture_url = gameData.couverture_url;
      if (gameData.tags !== undefined) globalData.tags = JSON.stringify(gameData.tags);
      if (gameData.lien_f95 !== undefined) globalData.lien_f95 = gameData.lien_f95;
      if (gameData.lien_lewdcorner !== undefined) globalData.lien_lewdcorner = gameData.lien_lewdcorner;
      if (gameData.f95_thread_id !== undefined) globalData.f95_thread_id = gameData.f95_thread_id;
      if (gameData.Lewdcorner_thread_id !== undefined) globalData.Lewdcorner_thread_id = gameData.Lewdcorner_thread_id;
      if (gameData.statut_traduction !== undefined) globalData.statut_traduction = gameData.statut_traduction;
      if (gameData.type_traduction !== undefined) globalData.type_traduction = gameData.type_traduction;
      if (gameData.version_traduite !== undefined) globalData.version_traduite = gameData.version_traduite;
      if (gameData.traducteur !== undefined) globalData.traducteur = gameData.traducteur;
      if (gameData.traductions_multiples !== undefined) globalData.traductions_multiples = gameData.traductions_multiples;
      if (gameData.lien_traduction !== undefined) globalData.lien_traduction = gameData.lien_traduction;
      if (gameData.rawg_description !== undefined) globalData.rawg_description = gameData.rawg_description;
      
      // Champs utilisateur
      if (gameData.statut_perso !== undefined || gameData.completion_perso !== undefined) {
        userFields.completion_perso = gameData.completion_perso || gameData.statut_perso;
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
      if (gameData.version_jouee !== undefined) {
        userFields.version_jouee = gameData.version_jouee;
      }
      if (gameData.is_favorite !== undefined) {
        userFields.is_favorite = gameData.is_favorite ? 1 : 0;
      }
      
      // Mettre à jour les champs globaux
      if (Object.keys(globalData).length > 0) {
        // Récupérer les valeurs actuelles pour comparer
        const currentGame = db.prepare('SELECT * FROM adulte_game_games WHERE id = ?').get(id);
        if (!currentGame) {
          throw new Error(`Jeu adulte introuvable (ID: ${id})`);
        }
        
        // Comparer les valeurs et marquer uniquement les champs réellement modifiés
        for (const [key, newValue] of Object.entries(globalData)) {
          if (newValue === undefined) continue;
          
          const currentValue = currentGame[key];
          
          // Normaliser les valeurs pour la comparaison
          let normalizedCurrent = currentValue === null || currentValue === undefined ? null : currentValue;
          let normalizedNew = newValue === null || newValue === undefined ? null : newValue;
          
          // Pour les champs JSON (tags), comparer les objets parsés
          if (key === 'tags') {
            try {
              const currentTags = normalizedCurrent ? (typeof normalizedCurrent === 'string' ? JSON.parse(normalizedCurrent) : normalizedCurrent) : [];
              const newTags = normalizedNew ? (typeof normalizedNew === 'string' ? JSON.parse(normalizedNew) : normalizedNew) : [];
              normalizedCurrent = JSON.stringify(Array.isArray(currentTags) ? currentTags.sort() : []);
              normalizedNew = JSON.stringify(Array.isArray(newTags) ? newTags.sort() : []);
            } catch (e) {
              // Si erreur de parsing, comparer comme strings
              normalizedCurrent = String(normalizedCurrent || '').trim();
              normalizedNew = String(normalizedNew || '').trim();
            }
          } else {
            // Pour les autres champs, comparer comme strings
            normalizedCurrent = normalizedCurrent === null ? null : String(normalizedCurrent).trim();
            normalizedNew = normalizedNew === null ? null : String(normalizedNew).trim();
          }
          
          // Marquer uniquement si la valeur a réellement changé
          if (normalizedCurrent !== normalizedNew) {
            try {
              markFieldAsUserModified(db, 'adulte_game_games', id, key);
            } catch (e) {
              // ignore les erreurs (colonne peut ne pas exister encore)
            }
          }
        }
        
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(globalData)) {
          fields.push(`${key} = ?`);
          values.push(value === undefined ? null : value);
        }
        
        if (fields.length > 0) {
          fields.push('updated_at = datetime(\'now\')');
          values.push(id);
          const query = `UPDATE adulte_game_games SET ${fields.join(', ')} WHERE id = ?`;
          db.prepare(query).run(...values);
        }
      }
      
      // Mettre à jour les champs utilisateur
      if (Object.keys(userFields).length > 0) {
        const { getUserIdByName } = require('./adulte-game-helpers');
        const userId = getUserIdByName(db, currentUser);
        if (!userId) {
          throw new Error('Utilisateur non trouvé');
        }
        
        const userFieldNames = Object.keys(userFields);
        const userFieldValues = Object.values(userFields);
        
        db.prepare(`
          INSERT INTO adulte_game_user_data (game_id, user_id, ${userFieldNames.join(', ')})
          VALUES (?, ?, ${userFieldNames.map(() => '?').join(', ')})
          ON CONFLICT(game_id, user_id) DO UPDATE SET
            ${userFieldNames.map(f => `${f} = excluded.${f}`).join(', ')},
            updated_at = datetime('now')
        `).run(id, userId, ...userFieldValues);
      }
      
      // Gérer les propriétaires (créer des entrées dans adulte_game_user_data)
      if (gameData.proprietaires !== undefined) {
        const { getUserIdByName } = require('./adulte-game-helpers');
        for (const userName of gameData.proprietaires) {
          const userId = getUserIdByName(db, userName);
          if (userId) {
            // Créer ou mettre à jour l'entrée utilisateur
            db.prepare(`
              INSERT INTO adulte_game_user_data (game_id, user_id, created_at, updated_at)
              VALUES (?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(game_id, user_id) DO UPDATE SET updated_at = datetime('now')
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
