const fs = require('fs');
const path = require('path');

/**
 * Enregistre tous les handlers IPC pour la gestion des utilisateurs
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
// Import des fonctions communes
const { getPaths } = require('../common-helpers');

function registerUserHandlers(ipcMain, dialog, getMainWindow, getDb, getPathManager, store) {
  
  // Fonction helper pour récupérer les chemins de manière lazy
  const getPathsLocal = () => getPaths(getPathManager, store);
  
  // ========== GESTION DES UTILISATEURS ==========
  
  /**
   * Récupérer tous les utilisateurs depuis toutes les bases de données
   * Parcourt toutes les bases dans databases/ pour trouver tous les utilisateurs
   * Inclut aussi la base principale pour compatibilité avec les anciennes données
   */
  ipcMain.handle('users:get-all', () => {
    try {
      const Database = require('better-sqlite3');
      const paths = getPathsLocal();
      const usersAggregate = [];
      const seenNames = new Set();
      let autoId = 1;

      const pushUser = (user, options = {}) => {
        const { preferExistingId = false } = options;
        const name = (user?.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (seenNames.has(key)) return;

        usersAggregate.push({
          id: preferExistingId && user?.id ? user.id : autoId++,
          name,
          emoji: user?.emoji || '👤',
          color: user?.color || '#8b5cf6',
          created_at: user?.created_at || null,
          avatar_path: user?.avatar_path || null
        });
        seenNames.add(key);
      };

      // 1) Utilisateur(s) présents dans la base actuellement chargée
      const currentDb = getDb();
      if (currentDb) {
        try {
          const currentUsers = currentDb.prepare('SELECT id, name, color, emoji, avatar_path, created_at FROM users ORDER BY created_at ASC').all();
          currentUsers.forEach(user => pushUser(user, { preferExistingId: true }));
        } catch (error) {
          console.warn('⚠️ Impossible de lire la base actuelle:', error.message);
        }
      }

      // 2) Utilisateurs présents dans les autres bases (databases/*.db)
      if (paths.databases && fs.existsSync(paths.databases)) {
        const dbFiles = fs.readdirSync(paths.databases).filter(file =>
          file.endsWith('.db') && !file.startsWith('temp_')
        );

        for (const file of dbFiles) {
          const dbPath = path.join(paths.databases, file);

          try {
            const tempDb = new Database(dbPath, { readonly: true });
            const users = tempDb.prepare('SELECT id, name, emoji, color, avatar_path, created_at FROM users ORDER BY created_at ASC').all();
            tempDb.close();

            users.forEach(user => pushUser(user));
          } catch (error) {
            console.warn('⚠️ Impossible de lire', dbPath, error.message);
          }
        }

        // 3) Fallback supprimé : on ne crée plus d'utilisateurs basés sur les noms de fichiers
        // car cela recréait des utilisateurs supprimés. Seuls les utilisateurs présents
        // dans la table users de chaque base sont retournés.
      }

      return usersAggregate;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  });
  
  /**
   * Créer un nouvel utilisateur
   * Crée la base de données de l'utilisateur si elle n'existe pas
   */
  ipcMain.handle('users:create', (event, { name, emoji, color }) => {
    try {
      const Database = require('better-sqlite3');
      const { initDatabase } = require('../../services/database');
      const paths = getPathsLocal();
      
      // S'assurer que le dossier databases existe
      if (!paths.databases) {
        return { success: false, error: 'Emplacement de base non configuré. Veuillez choisir un emplacement dans l\'onboarding.' };
      }
      
      // Vérifier que le dossier parent (baseDirectory) existe
      if (!fs.existsSync(paths.base)) {
        return { success: false, error: `Le dossier de base n'existe pas: ${paths.base}` };
      }
      
      if (!fs.existsSync(paths.databases)) {
        fs.mkdirSync(paths.databases, { recursive: true });
      }
      
      const userDbPath = path.join(paths.databases, `${name.toLowerCase()}.db`);
      const userDb = initDatabase(userDbPath);
      
      const existingUser = userDb.prepare('SELECT * FROM users WHERE name = ?').get(name);
      if (existingUser) {
        userDb.close();
        return { success: false, error: 'Un utilisateur avec ce nom existe déjà' };
      }

      // Créer l'utilisateur dans sa base dédiée
      const insertResult = userDb.prepare(`
        INSERT INTO users (name, emoji, color)
        VALUES (?, ?, ?)
      `).run(name, emoji || '👤', color || '#8b5cf6');
      const createdUserInOwnDb = userDb.prepare('SELECT * FROM users WHERE id = ?').get(insertResult.lastInsertRowid);
      userDb.close();

      // Enregistrer également l'utilisateur dans la base actuellement chargée si disponible
      const currentDb = getDb();
      if (currentDb) {
        const existingInCurrent = currentDb.prepare('SELECT * FROM users WHERE name = ?').get(name);
        if (!existingInCurrent) {
          currentDb.prepare(`
            INSERT INTO users (name, emoji, color)
            VALUES (?, ?, ?)
          `).run(name, emoji || '👤', color || '#8b5cf6');
        }
        const createdUser = currentDb.prepare('SELECT * FROM users WHERE name = ?').get(name);
        return { success: true, user: createdUser };
      }

      return { success: true, user: createdUserInOwnDb };
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Mettre à jour un utilisateur
   */
  ipcMain.handle('users:update', (event, { id, name, emoji, color }) => {
    try {
      const db = getDb();
      
      // Vérifier si un autre utilisateur utilise déjà ce nom
      const existingUser = db.prepare('SELECT * FROM users WHERE name = ? AND id != ?').get(name, id);
      if (existingUser) {
        return { success: false, error: 'Un autre utilisateur utilise déjà ce nom' };
      }
      
      // Récupérer l'ancien nom pour la migration des données
      const oldUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!oldUser) {
        return { success: false, error: 'Utilisateur introuvable' };
      }
      
      // Mettre à jour l'utilisateur
      db.prepare(`
        UPDATE users 
        SET name = ?, emoji = ?, color = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, emoji, color, id);
      
      // Note: Avec user_id, il n'est plus nécessaire de migrer les données
      // car l'ID utilisateur ne change pas, seulement le nom
      
      // Récupérer l'utilisateur mis à jour
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      

      return { success: true, user };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Supprimer un utilisateur
   * Cherche l'utilisateur dans toutes les bases de données par son nom et le supprime
   */
  ipcMain.handle('users:delete', (event, userName) => {
    try {
      const Database = require('better-sqlite3');
      const { initDatabase } = require('../../services/database');
      const paths = getPathsLocal();
      
      // Chercher l'utilisateur dans toutes les bases par son nom
      let user = null;
      let userDb = null;
      let userDbPath = null;
      
      // 1) Chercher dans la base actuellement chargée
      const currentDb = getDb();
      if (currentDb) {
        try {
          user = currentDb.prepare('SELECT * FROM users WHERE name = ?').get(userName);
          if (user) {
            userDb = currentDb;
          }
        } catch (error) {
          console.warn('⚠️ Erreur lecture base actuelle:', error.message);
        }
      }
      
      // 2) Si pas trouvé, chercher dans toutes les bases databases/*.db
      if (!user && paths.databases && fs.existsSync(paths.databases)) {
        const dbFiles = fs.readdirSync(paths.databases).filter(file =>
          file.endsWith('.db') && !file.startsWith('temp_')
        );
        
        for (const file of dbFiles) {
          userDbPath = path.join(paths.databases, file);
          try {
            const tempDb = new Database(userDbPath, { readonly: true });
            const foundUser = tempDb.prepare('SELECT * FROM users WHERE name = ?').get(userName);
            tempDb.close();
            
            if (foundUser) {
              user = foundUser;
              userDb = initDatabase(userDbPath);
              break;
            }
          } catch (error) {
            console.warn(`⚠️ Erreur lecture base ${file}:`, error.message);
          }
        }
      }
      
      if (!user || !userDb) {
        return { success: false, error: `Utilisateur "${userName}" introuvable` };
      }
      
      const userId = user.id;
      
      // Vérifier qu'il reste au moins 2 utilisateurs (compter dans toutes les bases)
      let totalUsersCount = 0;
      
      // Compter dans la base actuelle
      if (currentDb) {
        try {
          totalUsersCount += currentDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
        } catch (error) {
          console.warn('⚠️ Erreur comptage base actuelle:', error.message);
        }
      }
      
      // Compter dans les autres bases
      if (paths.databases && fs.existsSync(paths.databases)) {
        const dbFiles = fs.readdirSync(paths.databases).filter(file =>
          file.endsWith('.db') && !file.startsWith('temp_')
        );
        
        const seenNames = new Set();
        for (const file of dbFiles) {
          const dbPath = path.join(paths.databases, file);
          try {
            const tempDb = new Database(dbPath, { readonly: true });
            const users = tempDb.prepare('SELECT name FROM users').all();
            tempDb.close();
            
            users.forEach(u => {
              const key = (u.name || '').toLowerCase();
              if (!seenNames.has(key)) {
                seenNames.add(key);
                totalUsersCount++;
              }
            });
          } catch (error) {
            console.warn(`⚠️ Erreur comptage base ${file}:`, error.message);
          }
        }
      }
      
      if (totalUsersCount <= 1) {
        // Fermer la base si on l'a ouverte
        if (userDbPath && userDb !== currentDb) {
          try {
            userDb.close();
          } catch (error) {
            console.warn(`⚠️ Erreur fermeture base utilisateur: ${error.message}`);
          }
        }
        return { success: false, error: 'Impossible de supprimer le dernier utilisateur' };
      }
      
      // Supprimer les données de l'utilisateur (via user_id maintenant)
      userDb.prepare('DELETE FROM manga_user_data WHERE user_id = ?').run(userId);
      userDb.prepare('DELETE FROM anime_user_data WHERE user_id = ?').run(userId);
      userDb.prepare('DELETE FROM movie_user_data WHERE user_id = ?').run(userId);
      userDb.prepare('DELETE FROM tv_show_user_data WHERE user_id = ?').run(userId);
      userDb.prepare('DELETE FROM adulte_game_user_data WHERE user_id = ?').run(userId);
      userDb.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
      
      // Supprimer l'avatar si existant
      if (user.avatar_path && fs.existsSync(user.avatar_path)) {
        try {
          fs.unlinkSync(user.avatar_path);
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'avatar: ${error.message}`);
        }
      }
      
      // Supprimer l'utilisateur de sa base
      userDb.prepare('DELETE FROM users WHERE id = ?').run(userId);
      
      // Supprimer aussi de la base actuellement chargée si différente
      if (currentDb && userDb !== currentDb) {
        try {
          const userInCurrent = currentDb.prepare('SELECT * FROM users WHERE name = ?').get(userName);
          if (userInCurrent) {
            currentDb.prepare('DELETE FROM users WHERE name = ?').run(userName);
          }
        } catch (error) {
          console.warn('⚠️ Erreur suppression base actuelle:', error.message);
        }
      }
      
      // Fermer la base avant de supprimer le fichier
      if (userDbPath && userDb !== currentDb) {
        try {
          userDb.close();
        } catch (error) {
          console.warn(`⚠️ Erreur fermeture base utilisateur: ${error.message}`);
        }
      }
      
      // Supprimer le fichier de base de données de l'utilisateur si c'est une base dédiée
      if (userDbPath && paths.databases && fs.existsSync(userDbPath)) {
        try {
          // Vérifier que le fichier correspond bien à l'utilisateur (nom du fichier = nom utilisateur en minuscule)
          const expectedFileName = `${userName.toLowerCase()}.db`;
          const actualFileName = path.basename(userDbPath);
          
          if (actualFileName === expectedFileName) {
            fs.unlinkSync(userDbPath);
            console.log(`✅ Fichier de base de données supprimé: ${userDbPath}`);
          } else {
            console.warn(`⚠️ Nom de fichier ne correspond pas (${actualFileName} vs ${expectedFileName}), suppression non effectuée`);
          }
        } catch (error) {
          console.warn(`⚠️ Erreur suppression fichier base ${userDbPath}:`, error.message);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Choisir un fichier avatar et retourner son chemin (pour l'onboarding)
   */
  ipcMain.handle('users:choose-avatar-file', async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Choisir une image de profil',
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      return { success: true, path: result.filePaths[0] };
    } catch (error) {
      console.error('Erreur lors du choix de l\'avatar:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Définir l'avatar d'un utilisateur à partir d'un chemin de fichier
   */
  ipcMain.handle('users:set-avatar-from-path', async (event, userId, sourcePath, userName = null) => {
    try {
      const Database = require('better-sqlite3');
      const { initDatabase } = require('../../services/database');
      const paths = getPathsLocal();
      
      // Chercher l'utilisateur dans toutes les bases pour trouver sa base de données
      let user = null;
      let userDb = null;
      let userDbPath = null;
      
      // Si on connaît le nom de l'utilisateur, utiliser directement sa base
      if (userName) {
        userDbPath = path.join(paths.databases, `${userName.toLowerCase()}.db`);
        if (fs.existsSync(userDbPath)) {
          try {
            userDb = initDatabase(userDbPath);
            user = userDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (!user || user.name.toLowerCase() !== userName.toLowerCase()) {
              // L'utilisateur trouvé ne correspond pas, fermer et chercher ailleurs
              userDb.close();
              userDb = null;
              user = null;
              userDbPath = null;
            }
          } catch (error) {
            console.warn(`⚠️ Erreur ouverture base ${userDbPath}:`, error.message);
          }
        }
      }
      
      // Si pas trouvé et qu'on connaît le nom, chercher dans toutes les bases
      if (!user && userName) {
        if (fs.existsSync(paths.databases)) {
          const dbFiles = fs.readdirSync(paths.databases).filter(f => 
            f.endsWith('.db') && !f.startsWith('temp_')
          );
          
          for (const dbFile of dbFiles) {
            userDbPath = path.join(paths.databases, dbFile);
            try {
              const tempDb = new Database(userDbPath, { readonly: true });
              const foundUser = tempDb.prepare('SELECT * FROM users WHERE id = ? AND name = ?').get(userId, userName);
              tempDb.close();
              
              if (foundUser) {
                user = foundUser;
                userDb = initDatabase(userDbPath);
                break;
              }
            } catch (error) {
              console.warn(`⚠️ Erreur lecture base ${dbFile}:`, error.message);
            }
          }
        }
      }
      
      // Si toujours pas trouvé, chercher par ID seulement (comportement par défaut)
      if (!user) {
        const currentDb = getDb();
        if (currentDb) {
          user = currentDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
          if (user) {
            userDb = currentDb;
          }
        }
        
        if (!user && fs.existsSync(paths.databases)) {
          const dbFiles = fs.readdirSync(paths.databases).filter(f => 
            f.endsWith('.db') && !f.startsWith('temp_')
          );
          
          for (const dbFile of dbFiles) {
            userDbPath = path.join(paths.databases, dbFile);
            try {
              const tempDb = new Database(userDbPath, { readonly: true });
              const foundUser = tempDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
              tempDb.close();
              
              if (foundUser) {
                user = foundUser;
                userDb = initDatabase(userDbPath);
                break;
              }
            } catch (error) {
              console.warn(`⚠️ Erreur lecture base ${dbFile}:`, error.message);
            }
          }
        }
      }
      
      if (!user || !userDb) {
        return { success: false, error: 'Utilisateur introuvable' };
      }
      
      const ext = path.extname(sourcePath);
      // Utiliser le nom de l'utilisateur trouvé pour nommer le fichier
      const destFileName = `${user.name.toLowerCase().replace(/\s+/g, '_')}${ext}`;
      const destPath = path.join(paths.profiles, destFileName);
      
      // Créer le dossier profiles si nécessaire
      if (!fs.existsSync(paths.profiles)) {
        fs.mkdirSync(paths.profiles, { recursive: true });
      }
      
      // Supprimer l'ancien avatar si existant
      if (user.avatar_path && fs.existsSync(user.avatar_path)) {
        try {
          fs.unlinkSync(user.avatar_path);
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'ancien avatar: ${error.message}`);
        }
      }
      
      // Copier la nouvelle image
      fs.copyFileSync(sourcePath, destPath);
      
      // Mettre à jour la base de données de l'utilisateur (pas la base actuellement chargée)
      userDb.prepare('UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(destPath, userId);
      
      // Si on a ouvert une nouvelle base, la fermer
      const currentDb = getDb();
      if (userDbPath && userDb !== currentDb) {
        try {
          userDb.close();
        } catch (error) {
          console.warn(`⚠️ Erreur fermeture base utilisateur: ${error.message}`);
        }
      }

      return { success: true, path: destPath };
    } catch (error) {
      console.error('Erreur lors de la définition de l\'avatar:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Définir l'avatar d'un utilisateur
   */
  ipcMain.handle('users:set-avatar', async (event, userId) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'Utilisateur introuvable' };
      }
      
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: `Choisir une image pour ${user.name}`,
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Aucune image sélectionnée' };
      }
      
      const sourcePath = result.filePaths[0];
      const ext = path.extname(sourcePath);
      const destFileName = `${user.name.toLowerCase().replace(/\s+/g, '_')}${ext}`;
      const destPath = path.join(getPathsLocal().profiles, destFileName);
      
      // Créer le dossier profiles si nécessaire
      if (!fs.existsSync(getPathsLocal().profiles)) {
        fs.mkdirSync(getPathsLocal().profiles, { recursive: true });
      }
      
      // Supprimer l'ancien avatar si existant
      if (user.avatar_path && fs.existsSync(user.avatar_path)) {
        try {
          fs.unlinkSync(user.avatar_path);
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'ancien avatar: ${error.message}`);
        }
      }
      
      // Copier la nouvelle image
      fs.copyFileSync(sourcePath, destPath);
      
      // Mettre à jour la base de données
      db.prepare('UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(destPath, userId);
      

      return { success: true, path: destPath };
    } catch (error) {
      console.error('Erreur lors de la définition de l\'avatar:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Supprimer l'avatar d'un utilisateur
   */
  ipcMain.handle('users:remove-avatar', (event, userId) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'Utilisateur introuvable' };
      }
      
      // Supprimer le fichier avatar
      if (user.avatar_path && fs.existsSync(user.avatar_path)) {
        try {
          fs.unlinkSync(user.avatar_path);

        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'avatar: ${error.message}`);
        }
      }
      
      // Mettre à jour la base de données
      db.prepare('UPDATE users SET avatar_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(userId);
      

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'avatar:', error);
      return { success: false, error: error.message };
    }
  });
  
  // ========== GESTION DU MOT DE PASSE JEUX ADULTES MAÎTRE ==========
  // Note: Le mot de passe jeux adultes est désormais un mot de passe maître local
  // partagé par tous les utilisateurs d'une même machine

  /**
   * Définir/Modifier le mot de passe jeux adultes maître
   */
  ipcMain.handle('users:set-adulte-game-password', async (event, { password }) => {
    const adulteGamePasswordManager = require('../../services/adulte-game/adulte-game-password-manager');
    return await adulteGamePasswordManager.setPassword(password);
  });

  /**
   * Vérifier le mot de passe jeux adultes maître
   */
  ipcMain.handle('users:check-adulte-game-password', async (event, { password }) => {
    const adulteGamePasswordManager = require('../../services/adulte-game/adulte-game-password-manager');
    return await adulteGamePasswordManager.checkPassword(password);
  });

  /**
   * Supprimer le mot de passe jeux adultes maître (après vérification)
   */
  ipcMain.handle('users:remove-adulte-game-password', async (event, { password }) => {
    const adulteGamePasswordManager = require('../../services/adulte-game/adulte-game-password-manager');
    return await adulteGamePasswordManager.removePassword(password);
  });

  /**
   * Vérifier si un mot de passe jeux adultes maître est défini
   */
  ipcMain.handle('users:has-adulte-game-password', (event) => {
    const adulteGamePasswordManager = require('../../services/adulte-game/adulte-game-password-manager');
    return { hasPassword: adulteGamePasswordManager.hasPassword() };
  });

  /**
   * Initialiser un utilisateur de test en mode développement
   * Skip l'onboarding automatiquement
   */
  ipcMain.handle('dev:init-test-user', async (event) => {
    try {
      const db = getDb();
      const pm = getPathManager();
      
      // Vérifier si un utilisateur existe déjà
      const existingUsers = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
      if (existingUsers.length > 0) {
        // Utiliser le premier utilisateur existant
        const firstUser = existingUsers[0];
        store.set('currentUser', firstUser.name);
        return { 
          success: true, 
          user: firstUser, 
          message: 'Utilisateur existant utilisé',
          created: false 
        };
      }

      // Créer un utilisateur de test
      const testUser = {
        name: 'Test User',
        emoji: '🧪',
        color: '#8b5cf6'
      };

      const result = db.prepare(`
        INSERT INTO users (name, emoji, color)
        VALUES (?, ?, ?)
      `).run(testUser.name, testUser.emoji, testUser.color);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

      // Configurer le répertoire de base si nécessaire
      let baseDirectory = store.get('baseDirectory');
      if (!baseDirectory || !fs.existsSync(baseDirectory)) {
        const { app } = require('electron');
        baseDirectory = path.join(app.getPath('userData'), 'Le Nexus');
        store.set('baseDirectory', baseDirectory);
        
        // Initialiser la structure
        if (pm) {
          const paths = getPaths(pm);
          if (!fs.existsSync(paths.covers)) {
            fs.mkdirSync(paths.covers, { recursive: true });
          }
          if (!fs.existsSync(paths.profiles)) {
            fs.mkdirSync(paths.profiles, { recursive: true });
          }
        }
      }

      // Définir les préférences de contenu par défaut
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        const { ipcMain } = require('electron');
        const contentPrefs = { showMangas: true, showAnimes: true, showAdulteGame: true };
        store.set(`contentPreferences:${user.name}`, contentPrefs);
      } catch (e) {
        console.warn('Erreur lors de la définition des préférences:', e);
      }

      // Définir l'utilisateur actuel
      store.set('currentUser', user.name);

      return { 
        success: true, 
        user, 
        message: 'Utilisateur de test créé automatiquement',
        created: true 
      };
    } catch (error) {
      console.error('Erreur init utilisateur de test:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerUserHandlers };
