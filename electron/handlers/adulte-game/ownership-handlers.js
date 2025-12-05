const { getUserIdByName } = require('./adulte-game-helpers');

/**
 * Enregistre les handlers IPC pour la gestion de la possession des jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerOwnershipHandlers(ipcMain, getDb, store) {
  // Marquer un jeu comme "Possédé" (ajoute l'utilisateur dans adulte_game_proprietaires)
  ipcMain.handle('adulte-game-mark-as-owned', async (event, { gameId, prix, dateAchat, partageAvec, platforms }) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      const userId = currentUser ? getUserIdByName(db, currentUser) : null;

      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // S'assurer que la table existe
      try {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS adulte_game_proprietaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            prix REAL NOT NULL,
            date_achat TEXT,
            platforms TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(game_id, user_id),
            FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `).run();
      } catch (error) {
        console.warn('⚠️ Table adulte_game_proprietaires déjà existante ou erreur:', error.message);
      }
      
      // S'assurer que la colonne platforms existe
      try {
        const { ensureColumn } = require('../../services/database');
        ensureColumn(db, 'adulte_game_proprietaires', 'platforms', 'TEXT');
      } catch (error) {
        // Colonne déjà existante ou erreur, continuer
      }

      // Liste des utilisateurs qui possèdent le jeu (utilisateur actuel + partage)
      const userIds = [userId];
      if (partageAvec && Array.isArray(partageAvec) && partageAvec.length > 0) {
        userIds.push(...partageAvec);
      }

      // Calculer le prix par utilisateur (diviser le prix total)
      const prixParUtilisateur = prix / userIds.length;
      
      // Convertir les plateformes en JSON si fournies
      const platformsJson = platforms && Array.isArray(platforms) && platforms.length > 0
        ? JSON.stringify(platforms)
        : null;

      // Ajouter/mettre à jour chaque propriétaire
      for (const propUserId of userIds) {
        const existing = db.prepare('SELECT id FROM adulte_game_proprietaires WHERE game_id = ? AND user_id = ?').get(gameId, propUserId);
        
        if (existing) {
          // Mettre à jour
          db.prepare(`
            UPDATE adulte_game_proprietaires
            SET prix = ?, date_achat = ?, platforms = ?, updated_at = datetime('now')
            WHERE game_id = ? AND user_id = ?
          `).run(prixParUtilisateur, dateAchat || null, platformsJson, gameId, propUserId);
        } else {
          // Créer
          db.prepare(`
            INSERT INTO adulte_game_proprietaires (game_id, user_id, prix, date_achat, platforms, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(gameId, propUserId, prixParUtilisateur, dateAchat || null, platformsJson);
        }
      }

      console.log(`✅ Jeu ID ${gameId} marqué comme possédé pour ${userIds.length} utilisateur(s)`);
      return { success: true };
    } catch (error) {
      console.error('[AdulteGame] Erreur lors du marquage comme possédé:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer les propriétaires d'un jeu
  ipcMain.handle('adulte-game-get-owners', async (event, gameId) => {
    try {
      const db = getDb();
      
      // S'assurer que la table existe
      try {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS adulte_game_proprietaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            prix REAL NOT NULL,
            date_achat TEXT,
            platforms TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(game_id, user_id),
            FOREIGN KEY (game_id) REFERENCES adulte_game_games(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `).run();
      } catch (error) {
        // Table déjà existante, continuer
      }
      
      // S'assurer que la colonne platforms existe
      try {
        const { ensureColumn } = require('../../services/database');
        ensureColumn(db, 'adulte_game_proprietaires', 'platforms', 'TEXT');
      } catch (error) {
        // Colonne déjà existante ou erreur, continuer
      }

      // Vérifier si la colonne platforms existe avant de la sélectionner
      const tableInfo = db.prepare("PRAGMA table_info(adulte_game_proprietaires)").all();
      const hasPlatformsColumn = tableInfo.some(col => col.name === 'platforms');
      
      const owners = db.prepare(`
        SELECT 
          p.id,
          p.prix,
          p.date_achat,
          ${hasPlatformsColumn ? 'p.platforms,' : 'NULL as platforms,'}
          u.id as user_id,
          u.name as user_name,
          u.color as user_color,
          u.emoji as user_emoji
        FROM adulte_game_proprietaires p
        INNER JOIN users u ON p.user_id = u.id
        WHERE p.game_id = ?
      `).all(gameId);

      return { success: true, owners };
    } catch (error) {
      console.error('[AdulteGame] Erreur lors de la récupération des propriétaires:', error);
      return { success: false, error: error.message, owners: [] };
    }
  });
}

module.exports = { registerOwnershipHandlers };
