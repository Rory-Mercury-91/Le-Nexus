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
function registerUserHandlers(ipcMain, dialog, getMainWindow, getDb, getPathManager) {
  
  // Fonction helper pour récupérer les chemins de manière lazy
  const getPaths = () => {
    const pm = getPathManager();
    return pm ? pm.getPaths() : { profiles: '' };
  };
  
  // ========== GESTION DES UTILISATEURS ==========
  
  /**
   * Récupérer tous les utilisateurs
   */
  ipcMain.handle('users:get-all', () => {
    try {
      const db = getDb();
      const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
      return users;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  });
  
  /**
   * Créer un nouvel utilisateur
   */
  ipcMain.handle('users:create', (event, { name, emoji, color }) => {
    try {
      const db = getDb();
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
      if (existingUser) {
        return { success: false, error: 'Un utilisateur avec ce nom existe déjà' };
      }
      
      // Créer l'utilisateur
      const result = db.prepare(`
        INSERT INTO users (name, emoji, color)
        VALUES (?, ?, ?)
      `).run(name, emoji || '👤', color || '#8b5cf6');
      
      // Récupérer l'utilisateur créé
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      
      console.log(`✅ Utilisateur créé: ${name}`);
      return { success: true, user };
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
      
      // Si le nom a changé, migrer les données
      if (oldUser.name !== name) {
        console.log(`📝 Migration des données de "${oldUser.name}" vers "${name}"...`);
        
        // Migrer les données de lecture de tomes
        db.prepare('UPDATE lecture_tomes SET utilisateur = ? WHERE utilisateur = ?')
          .run(name, oldUser.name);
        
        // Migrer les séries masquées
        db.prepare('UPDATE series_masquees SET utilisateur = ? WHERE utilisateur = ?')
          .run(name, oldUser.name);
        
        // Migrer les épisodes vus
        db.prepare('UPDATE anime_episodes_vus SET utilisateur = ? WHERE utilisateur = ?')
          .run(name, oldUser.name);
        
        // Migrer les statuts d'anime
        db.prepare('UPDATE anime_statut_utilisateur SET utilisateur = ? WHERE utilisateur = ?')
          .run(name, oldUser.name);
        
        // Migrer les propriétaires de tomes
        db.prepare('UPDATE tomes SET proprietaire = ? WHERE proprietaire = ?')
          .run(name, oldUser.name);
        
        // Migrer les utilisateurs qui ont ajouté des animes
        db.prepare('UPDATE anime_series SET utilisateur_ajout = ? WHERE utilisateur_ajout = ?')
          .run(name, oldUser.name);
        
        console.log(`✅ Migration terminée pour ${name}`);
      }
      
      // Récupérer l'utilisateur mis à jour
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      
      console.log(`✅ Utilisateur mis à jour: ${name}`);
      return { success: true, user };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Supprimer un utilisateur
   */
  ipcMain.handle('users:delete', (event, userId) => {
    try {
      const db = getDb();
      
      // Récupérer l'utilisateur avant de le supprimer
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'Utilisateur introuvable' };
      }
      
      // Vérifier qu'il reste au moins 2 utilisateurs
      const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      if (usersCount <= 1) {
        return { success: false, error: 'Impossible de supprimer le dernier utilisateur' };
      }
      
      console.log(`🗑️ Suppression de l'utilisateur "${user.name}"...`);
      
      // Supprimer les données de l'utilisateur
      db.prepare('DELETE FROM lecture_tomes WHERE utilisateur = ?').run(user.name);
      db.prepare('DELETE FROM series_masquees WHERE utilisateur = ?').run(user.name);
      db.prepare('DELETE FROM anime_episodes_vus WHERE utilisateur = ?').run(user.name);
      db.prepare('DELETE FROM anime_statut_utilisateur WHERE utilisateur = ?').run(user.name);
      
      // Pour les tomes, on ne supprime que les entrées de lecture, pas les tomes eux-mêmes
      // car ils peuvent appartenir à plusieurs utilisateurs
      
      // Supprimer l'avatar si existant
      if (user.avatar_path && fs.existsSync(user.avatar_path)) {
        try {
          fs.unlinkSync(user.avatar_path);
          console.log(`🗑️ Avatar supprimé: ${user.avatar_path}`);
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'avatar: ${error.message}`);
        }
      }
      
      // Supprimer l'utilisateur de la table
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      
      console.log(`✅ Utilisateur supprimé: ${user.name}`);
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
  ipcMain.handle('users:set-avatar-from-path', async (event, userId, sourcePath) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'Utilisateur introuvable' };
      }
      
      const ext = path.extname(sourcePath);
      const destFileName = `${user.name.toLowerCase().replace(/\s+/g, '_')}${ext}`;
      const destPath = path.join(getPaths().profiles, destFileName);
      
      // Créer le dossier profiles si nécessaire
      if (!fs.existsSync(getPaths().profiles)) {
        fs.mkdirSync(getPaths().profiles, { recursive: true });
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
      
      console.log(`✅ Avatar défini pour ${user.name}: ${destPath}`);
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
      const destPath = path.join(getPaths().profiles, destFileName);
      
      // Créer le dossier profiles si nécessaire
      if (!fs.existsSync(getPaths().profiles)) {
        fs.mkdirSync(getPaths().profiles, { recursive: true });
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
      
      console.log(`✅ Avatar défini pour ${user.name}: ${destPath}`);
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
          console.log(`🗑️ Avatar supprimé: ${user.avatar_path}`);
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'avatar: ${error.message}`);
        }
      }
      
      // Mettre à jour la base de données
      db.prepare('UPDATE users SET avatar_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(userId);
      
      console.log(`✅ Avatar supprimé pour ${user.name}`);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'avatar:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Obtenir l'avatar d'un utilisateur par son ID
   */
  ipcMain.handle('users:get-avatar', (event, userId) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user || !user.avatar_path) {
        return null;
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(user.avatar_path)) {
        // Nettoyer la DB si le fichier n'existe plus
        db.prepare('UPDATE users SET avatar_path = NULL WHERE id = ?').run(user.id);
        return null;
      }
      
      return `manga://${encodeURIComponent(user.avatar_path)}`;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'avatar:', error);
      return null;
    }
  });
}

module.exports = { registerUserHandlers };
