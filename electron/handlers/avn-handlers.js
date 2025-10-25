const { ipcMain, dialog } = require('electron');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const path = require('path');

/**
 * URL de l'API F95List pour le contrôle de version
 */
const F95LIST_API_URL = 'https://script.google.com/macros/s/AKfycbwb8C1478tnW30d77HtECYTxjJ2EpB1OrtQUueFeZ0tZPz3Uuze5s2FAQAnQOKShEzD/exec';

/**
 * Enregistre tous les handlers IPC pour la gestion des AVN
 * @param {Electron.IpcMain} ipcMain 
 * @param {Function} getDb 
 * @param {Object} store 
 */
function registerAvnHandlers(ipcMain, getDb, store) {
  
  // ========================================
  // GET - Récupérer tous les jeux AVN
  // ========================================
  
  ipcMain.handle('get-avn-games', (event, filters = {}) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        return [];
      }
      
      let query = `
        SELECT 
          g.*,
          GROUP_CONCAT(p.utilisateur) as proprietaires
        FROM avn_games g
        LEFT JOIN avn_proprietaires p ON g.id = p.game_id
      `;
      
      const conditions = [];
      const params = [];
      
      // Filtre par utilisateur (propriétaire)
      if (filters.utilisateur) {
        conditions.push(`p.utilisateur = ?`);
        params.push(filters.utilisateur);
      }
      
      // Filtre par statut personnel
      if (filters.statut_perso) {
        conditions.push(`g.statut_perso = ?`);
        params.push(filters.statut_perso);
      }
      
      // Filtre par statut du jeu
      if (filters.statut_jeu) {
        conditions.push(`g.statut_jeu = ?`);
        params.push(filters.statut_jeu);
      }
      
      // Filtre par moteur
      if (filters.moteur) {
        conditions.push(`g.moteur = ?`);
        params.push(filters.moteur);
      }
      
      // Filtre MAJ disponible
      if (filters.maj_disponible) {
        conditions.push(`g.maj_disponible = 1`);
      }
      
      // Recherche par titre
      if (filters.search) {
        conditions.push(`g.titre LIKE ?`);
        params.push(`%${filters.search}%`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` GROUP BY g.id ORDER BY g.updated_at DESC`;
      
      const games = db.prepare(query).all(...params);
      
      return games.map(game => {
        // Parser les tags (JSON string -> array)
        let tags = [];
        if (game.tags) {
          try {
            tags = JSON.parse(game.tags);
            // Si tags est une string (au lieu d'un array), le transformer en array
            if (typeof tags === 'string') {
              tags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
            }
          } catch (e) {
            console.warn(`Erreur parsing tags pour jeu ${game.id}:`, e.message);
            tags = [];
          }
        }
        
        return {
          ...game,
          tags: tags,
          proprietaires: game.proprietaires ? game.proprietaires.split(',') : []
        };
      });
      
    } catch (error) {
      console.error('Erreur get-avn-games:', error);
      throw error;
    }
  });
  
  // ========================================
  // GET - Récupérer un jeu AVN par ID
  // ========================================
  
  ipcMain.handle('get-avn-game', (event, id) => {
    try {
      const db = getDb();
      
      const game = db.prepare(`
        SELECT 
          g.*,
          GROUP_CONCAT(p.utilisateur) as proprietaires
        FROM avn_games g
        LEFT JOIN avn_proprietaires p ON g.id = p.game_id
        WHERE g.id = ?
        GROUP BY g.id
      `).get(id);
      
      if (!game) {
        throw new Error(`Jeu AVN non trouvé (ID: ${id})`);
      }
      
      // Parser les tags (JSON string -> array)
      let tags = [];
      if (game.tags) {
        try {
          tags = JSON.parse(game.tags);
          // Si tags est une string (au lieu d'un array), le transformer en array
          if (typeof tags === 'string') {
            tags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
          }
        } catch (e) {
          console.warn(`Erreur parsing tags pour jeu ${id}:`, e.message);
          tags = [];
        }
      }
      
      return {
        ...game,
        tags: tags,
        proprietaires: game.proprietaires ? game.proprietaires.split(',') : []
      };
      
    } catch (error) {
      console.error('Erreur get-avn-game:', error);
      throw error;
    }
  });
  
  // ========================================
  // POST - Créer un nouveau jeu AVN
  // ========================================
  
  ipcMain.handle('create-avn-game', (event, gameData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }
      
      // Insérer le jeu
      const result = db.prepare(`
        INSERT INTO avn_games (
          f95_thread_id, titre, version, statut_jeu, moteur,
          couverture_url, tags, lien_f95, lien_traduction, lien_jeu,
          statut_perso, notes_privees, chemin_executable,
          derniere_session, version_disponible, maj_disponible,
          derniere_verif, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        gameData.f95_thread_id || null,
        gameData.titre,
        gameData.version || null,
        gameData.statut_jeu || 'EN COURS',
        gameData.moteur || null,
        gameData.couverture_url || null,
        gameData.tags ? JSON.stringify(gameData.tags) : null,
        gameData.lien_f95 || null,
        gameData.lien_traduction || null,
        gameData.lien_jeu || null,
        gameData.statut_perso || 'À jouer',
        gameData.notes_privees || null,
        gameData.chemin_executable || null,
        gameData.derniere_session || null,
        gameData.version_disponible || null,
        gameData.maj_disponible || 0,
        gameData.derniere_verif || null
      );
      
      const gameId = result.lastInsertRowid;
      
      // Ajouter les propriétaires
      const proprietaires = gameData.proprietaires || [currentUser];
      for (const user of proprietaires) {
        db.prepare(`
          INSERT INTO avn_proprietaires (game_id, utilisateur)
          VALUES (?, ?)
        `).run(gameId, user);
      }
      
      console.log(`✅ Jeu AVN créé: "${gameData.titre}" (ID: ${gameId})`);
      
      return { success: true, id: gameId };
      
    } catch (error) {
      console.error('Erreur create-avn-game:', error);
      throw error;
    }
  });
  
  // ========================================
  // PUT - Mettre à jour un jeu AVN
  // ========================================
  
  ipcMain.handle('update-avn-game', (event, id, gameData) => {
    try {
      const db = getDb();
      
      const fields = [];
      const values = [];
      
      if (gameData.titre !== undefined) {
        fields.push('titre = ?');
        values.push(gameData.titre);
      }
      if (gameData.version !== undefined) {
        fields.push('version = ?');
        values.push(gameData.version);
      }
      if (gameData.statut_jeu !== undefined) {
        fields.push('statut_jeu = ?');
        values.push(gameData.statut_jeu);
      }
      if (gameData.moteur !== undefined) {
        fields.push('moteur = ?');
        values.push(gameData.moteur);
      }
      if (gameData.couverture_url !== undefined) {
        fields.push('couverture_url = ?');
        values.push(gameData.couverture_url);
      }
      if (gameData.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(gameData.tags));
      }
      if (gameData.lien_f95 !== undefined) {
        fields.push('lien_f95 = ?');
        values.push(gameData.lien_f95);
      }
      if (gameData.lien_traduction !== undefined) {
        fields.push('lien_traduction = ?');
        values.push(gameData.lien_traduction);
      }
      if (gameData.lien_jeu !== undefined) {
        fields.push('lien_jeu = ?');
        values.push(gameData.lien_jeu);
      }
      if (gameData.statut_perso !== undefined) {
        fields.push('statut_perso = ?');
        values.push(gameData.statut_perso);
      }
      if (gameData.notes_privees !== undefined) {
        fields.push('notes_privees = ?');
        values.push(gameData.notes_privees);
      }
      if (gameData.chemin_executable !== undefined) {
        fields.push('chemin_executable = ?');
        values.push(gameData.chemin_executable);
      }
      if (gameData.derniere_session !== undefined) {
        fields.push('derniere_session = ?');
        values.push(gameData.derniere_session);
      }
      
      fields.push('updated_at = datetime(\'now\')');
      values.push(id);
      
      const query = `UPDATE avn_games SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      
      // Mettre à jour les propriétaires si fourni
      if (gameData.proprietaires !== undefined) {
        db.prepare('DELETE FROM avn_proprietaires WHERE game_id = ?').run(id);
        for (const user of gameData.proprietaires) {
          db.prepare(`
            INSERT INTO avn_proprietaires (game_id, utilisateur)
            VALUES (?, ?)
          `).run(id, user);
        }
      }
      
      console.log(`✅ Jeu AVN mis à jour (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur update-avn-game:', error);
      throw error;
    }
  });
  
  // ========================================
  // DELETE - Supprimer un jeu AVN
  // ========================================
  
  ipcMain.handle('delete-avn-game', (event, id) => {
    try {
      const db = getDb();
      
      db.prepare('DELETE FROM avn_games WHERE id = ?').run(id);
      
      console.log(`✅ Jeu AVN supprimé (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur delete-avn-game:', error);
      throw error;
    }
  });
  
  // ========================================
  // LANCEMENT - Lancer un jeu AVN
  // ========================================
  
  ipcMain.handle('launch-avn-game', async (event, id) => {
    try {
      const db = getDb();
      
      const game = db.prepare('SELECT chemin_executable, titre FROM avn_games WHERE id = ?').get(id);
      
      if (!game || !game.chemin_executable) {
        throw new Error('Aucun exécutable défini pour ce jeu');
      }
      
      // Vérifier que le fichier existe
      const fs = require('fs');
      if (!fs.existsSync(game.chemin_executable)) {
        throw new Error(`L'exécutable n'existe pas: ${game.chemin_executable}`);
      }
      
      // Lancer le jeu
      const gamePath = path.resolve(game.chemin_executable);
      const gameDir = path.dirname(gamePath);
      
      exec(`"${gamePath}"`, { cwd: gameDir }, (error) => {
        if (error) {
          console.error(`❌ Erreur lancement jeu "${game.titre}":`, error);
        } else {
          console.log(`🎮 Jeu lancé: "${game.titre}"`);
        }
      });
      
      // Mettre à jour la dernière session
      db.prepare(`
        UPDATE avn_games 
        SET derniere_session = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(id);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur launch-avn-game:', error);
      throw error;
    }
  });
  
  // ========================================
  // VÉRIFICATION MAJ - Vérifier mises à jour via API F95List
  // ========================================
  
  ipcMain.handle('check-avn-updates', async () => {
    try {
      const db = getDb();
      
      // Récupérer tous les jeux avec un f95_thread_id
      const games = db.prepare('SELECT id, f95_thread_id, titre, version FROM avn_games WHERE f95_thread_id IS NOT NULL').all();
      
      if (games.length === 0) {
        console.log('⚠️ Aucun jeu AVN à vérifier (aucun f95_thread_id)');
        return { checked: 0, updated: 0 };
      }
      
      console.log(`🔍 Vérification des MAJ pour ${games.length} jeux AVN via API F95List...`);
      
      let updatedCount = 0;
      
      for (const game of games) {
        try {
          // Appel à l'API F95List pour récupérer les données du jeu
          const response = await fetch(`${F95LIST_API_URL}?action=getGame&id=${game.f95_thread_id}`);
          
          if (!response.ok) {
            console.warn(`⚠️ API error pour ${game.titre} (${game.f95_thread_id}):`, response.status);
            continue;
          }
          
          const data = await response.json();
          
          if (data && data.version) {
            const versionApi = data.version.trim();
            const versionLocale = (game.version || '').trim();
            
            // Comparer les versions
            const majDisponible = versionApi !== versionLocale && versionApi !== '';
            
            if (majDisponible) {
              console.log(`🔄 MAJ disponible: "${game.titre}" (${versionLocale} → ${versionApi})`);
              updatedCount++;
            }
            
            // Mettre à jour la DB
            db.prepare(`
              UPDATE avn_games 
              SET version_disponible = ?,
                  maj_disponible = ?,
                  derniere_verif = datetime('now'),
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(versionApi, majDisponible ? 1 : 0, game.id);
          }
          
          // Rate limiting: attendre 500ms entre chaque requête
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Erreur vérif MAJ "${game.titre}":`, error.message);
        }
      }
      
      console.log(`✅ Vérification MAJ terminée: ${updatedCount} mise(s) à jour détectée(s)`);
      
      return { checked: games.length, updated: updatedCount };
      
    } catch (error) {
      console.error('Erreur check-avn-updates:', error);
      throw error;
    }
  });
  
  // ========================================
  // Rechercher un jeu par ID F95Zone
  // ========================================
  
  ipcMain.handle('search-avn-by-f95-id', async (event, f95Id) => {
    try {
      console.log(`🔍 Recherche jeu F95 ID: ${f95Id}`);
      
      const response = await fetch(`${F95LIST_API_URL}?id=${f95Id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.name) {
        throw new Error('Jeu introuvable');
      }
      
      console.log(`✅ Jeu trouvé: ${data.name}`);
      
      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          version: data.version,
          status: data.status,
          engine: data.engine,
          tags: data.tags,
          image: data.image,
          thread_url: data.thread_url
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur recherche F95:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // ========================================
  // Sélectionner un fichier exécutable
  // ========================================
  
  ipcMain.handle('select-avn-executable', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner l\'exécutable du jeu',
        filters: [
          { name: 'Exécutables', extensions: ['exe'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      return {
        success: true,
        path: result.filePaths[0]
      };
      
    } catch (error) {
      console.error('❌ Erreur sélection fichier:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // ========================================
  // Sélectionner une image de couverture
  // ========================================
  
  ipcMain.handle('select-avn-cover-image', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Sélectionner une image de couverture',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      return {
        success: true,
        path: result.filePaths[0]
      };
      
    } catch (error) {
      console.error('❌ Erreur sélection image:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  console.log('✅ Handlers AVN enregistrés');
}

module.exports = { registerAvnHandlers };
