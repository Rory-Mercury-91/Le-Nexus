const { ipcMain, dialog } = require('electron');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const path = require('path');
const coverManager = require('../services/cover-manager');

/**
 * URL de l'API F95List pour le contrôle de version
 */
const F95LIST_API_URL = 'https://script.google.com/macros/s/AKfycbwb8C1478tnW30d77HtECYTxjJ2EpB1OrtQUueFeZ0tZPz3Uuze5s2FAQAnQOKShEzD/exec';

/**
 * Enregistre tous les handlers IPC pour la gestion des AVN
 * @param {Electron.IpcMain} ipcMain 
 * @param {Function} getDb 
 * @param {Object} store 
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerAvnHandlers(ipcMain, getDb, store, getPathManager) {
  
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
          ug.chemin_executable,
          ug.notes_privees as notes_privees_user,
          ug.statut_perso as statut_perso_user,
          ug.derniere_session as derniere_session_user,
          GROUP_CONCAT(p.utilisateur) as proprietaires
        FROM avn_games g
        LEFT JOIN avn_proprietaires p ON g.id = p.game_id
        LEFT JOIN avn_user_games ug ON g.id = ug.game_id AND ug.utilisateur = ?
      `;
      
      const conditions = [];
      const params = [currentUser]; // Pour la jointure avn_user_games
      
      // Filtre par utilisateur (propriétaire)
      if (filters.utilisateur) {
        conditions.push(`p.utilisateur = ?`);
        params.push(filters.utilisateur);
      }
      
      // Filtre par statut personnel (utiliser les données utilisateur)
      if (filters.statut_perso) {
        conditions.push(`COALESCE(ug.statut_perso, g.statut_perso) = ?`);
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
            // Si c'est déjà un array, l'utiliser directement
            if (Array.isArray(game.tags)) {
              tags = game.tags;
            }
            // Si c'est une string qui commence par [, c'est du JSON
            else if (typeof game.tags === 'string' && game.tags.trim().startsWith('[')) {
              tags = JSON.parse(game.tags);
            }
            // Sinon, c'est une string CSV
            else if (typeof game.tags === 'string') {
              tags = game.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
            }
          } catch (e) {
            console.warn(`Erreur parsing tags pour jeu ${game.id}:`, e.message);
            // En cas d'erreur, essayer de splitter en CSV
            if (typeof game.tags === 'string') {
              tags = game.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
            } else {
              tags = [];
            }
          }
        }
        
        return {
          ...game,
          // Utiliser les données par utilisateur si disponibles, sinon fallback sur les données globales
          chemin_executable: game.chemin_executable,
          notes_privees: game.notes_privees_user || game.notes_privees,
          statut_perso: game.statut_perso_user || game.statut_perso,
          derniere_session: game.derniere_session_user || game.derniere_session,
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
      const currentUser = store.get('currentUser', '');
      
      const game = db.prepare(`
        SELECT 
          g.*,
          ug.chemin_executable,
          ug.notes_privees as notes_privees_user,
          ug.statut_perso as statut_perso_user,
          ug.derniere_session as derniere_session_user,
          GROUP_CONCAT(p.utilisateur) as proprietaires
        FROM avn_games g
        LEFT JOIN avn_proprietaires p ON g.id = p.game_id
        LEFT JOIN avn_user_games ug ON g.id = ug.game_id AND ug.utilisateur = ?
        WHERE g.id = ?
        GROUP BY g.id
      `).get(currentUser, id);
      
      if (!game) {
        throw new Error(`Jeu AVN non trouvé (ID: ${id})`);
      }
      
      // Parser les tags (JSON string -> array)
      let tags = [];
      if (game.tags) {
        try {
          // Si c'est déjà un array, l'utiliser directement
          if (Array.isArray(game.tags)) {
            tags = game.tags;
          }
          // Si c'est une string qui commence par [, c'est du JSON
          else if (typeof game.tags === 'string' && game.tags.trim().startsWith('[')) {
            tags = JSON.parse(game.tags);
          }
          // Sinon, c'est une string CSV
          else if (typeof game.tags === 'string') {
            tags = game.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
          }
        } catch (e) {
          console.warn(`Erreur parsing tags pour jeu ${id}:`, e.message);
          // En cas d'erreur, essayer de splitter en CSV
          if (typeof game.tags === 'string') {
            tags = game.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
          } else {
            tags = [];
          }
        }
      }
      
      return {
        ...game,
        // Utiliser les données par utilisateur si disponibles
        chemin_executable: game.chemin_executable,
        notes_privees: game.notes_privees_user || game.notes_privees,
        statut_perso: game.statut_perso_user || game.statut_perso,
        derniere_session: game.derniere_session_user || game.derniere_session,
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
      
      // Insérer le jeu (données globales uniquement)
      const result = db.prepare(`
        INSERT INTO avn_games (
          f95_thread_id, titre, version, statut_jeu, moteur,
          couverture_url, tags, lien_f95, lien_traduction, lien_jeu,
          version_traduction, statut_traduction, type_traduction,
          version_disponible, maj_disponible,
          derniere_verif, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
        gameData.version_traduction || null,
        gameData.statut_traduction || null,
        gameData.type_traduction || null,
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
      
      // Créer les données utilisateur pour le créateur du jeu
      db.prepare(`
        INSERT INTO avn_user_games (game_id, utilisateur, statut_perso, notes_privees, chemin_executable, derniere_session)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        gameId,
        currentUser,
        gameData.statut_perso || 'À jouer',
        gameData.notes_privees || null,
        gameData.chemin_executable || null,
        gameData.derniere_session || null
      );
      
      console.log(`✅ Jeu AVN créé: "${gameData.titre}" (ID: ${gameId})`);
      
      return { success: true, id: gameId };
      
    } catch (error) {
      console.error('Erreur create-avn-game:', error);
      throw error;
    }
  });
  
  // ========================================
  // POST - Import depuis JSON (LC Extractor / F95 Extractor)
  // ========================================
  
  ipcMain.handle('import-avn-from-json', async (event, jsonData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      if (!currentUser) {
        throw new Error('Aucun utilisateur actuel sélectionné');
      }
      
      console.log(`📥 Import JSON AVN:`, jsonData);
      
      // Mapper les données selon le format LC Extractor / F95 Extractor
      const titre = jsonData.name;
      const version = jsonData.version || null;
      const statut_jeu = jsonData.status || 'EN COURS';
      const moteur = jsonData.type || jsonData.engine || null;
      const tags = typeof jsonData.tags === 'string' 
        ? jsonData.tags.split(',').map(t => t.trim()).filter(t => t)
        : (Array.isArray(jsonData.tags) ? jsonData.tags : []);
      
      // Lien F95Zone ou LewdCorner
      let f95_thread_id = null;
      let lien_f95 = null;
      
      if (jsonData.domain === 'F95z' || jsonData.domain === 'F95Zone') {
        f95_thread_id = jsonData.id;
        lien_f95 = jsonData.link || `https://f95zone.to/threads/${jsonData.id}`;
      } else if (jsonData.domain === 'LewdCorner') {
        f95_thread_id = jsonData.id; // On garde l'ID pour référence
        lien_f95 = jsonData.link || `https://lewdcorner.com/threads/${jsonData.id}`;
      }
      
      // Télécharger la couverture
      let couverture_url = null;
      if (jsonData.image) {
        // LewdCorner protège ses images : ne pas stocker l'URL (impossible d'afficher)
        if (jsonData.domain === 'LewdCorner' || jsonData.image.includes('lewdcorner')) {
          console.log(`⚠️ LewdCorner: images protégées, pas d'affichage possible`);
          couverture_url = null; // On ne stocke pas l'URL inutile
        } else {
          // Pour F95Zone, télécharger localement
          try {
            const pathManager = typeof getPathManager === 'function' ? getPathManager() : getPathManager;
            const { createSlug } = require('../utils/slug');
            const gameSlug = createSlug(titre);
            
            console.log(`📥 Téléchargement de l'image...`);
            const result = await coverManager.downloadCover(
              pathManager,
              jsonData.image, 
              titre,
              'avn', 
              null,
              lien_f95 // referer
            );
            
            if (result.success) {
              couverture_url = result.localPath;
              console.log(`✅ Image téléchargée: ${couverture_url}`);
            }
          } catch (imgError) {
            console.warn(`⚠️ Échec du téléchargement de l'image:`, imgError.message);
            couverture_url = jsonData.image; // Fallback sur l'URL distante
          }
        }
      }
      
      // Vérifier si le jeu existe déjà
      const existing = db.prepare(`
        SELECT id FROM avn_games 
        WHERE f95_thread_id = ? OR (titre = ? AND lien_f95 = ?)
        LIMIT 1
      `).get(f95_thread_id, titre, lien_f95);
      
      if (existing) {
        // Mettre à jour le jeu existant
        db.prepare(`
          UPDATE avn_games SET
            titre = ?,
            version = ?,
            statut_jeu = ?,
            moteur = ?,
            couverture_url = COALESCE(?, couverture_url),
            tags = ?,
            lien_f95 = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          titre,
          version,
          statut_jeu,
          moteur,
          couverture_url,
          JSON.stringify(tags),
          lien_f95,
          existing.id
        );
        
        console.log(`✅ Jeu AVN mis à jour: "${titre}" (ID: ${existing.id})`);
        return { success: true, id: existing.id, updated: true };
      } else {
        // Créer un nouveau jeu
        const result = db.prepare(`
          INSERT INTO avn_games (
            f95_thread_id, titre, version, statut_jeu, moteur,
            couverture_url, tags, lien_f95,
            statut_perso, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          f95_thread_id,
          titre,
          version,
          statut_jeu,
          moteur,
          couverture_url,
          JSON.stringify(tags),
          lien_f95,
          'À jouer'
        );
        
        const gameId = result.lastInsertRowid;
        
        // Ajouter le propriétaire
        db.prepare(`
          INSERT INTO avn_proprietaires (game_id, utilisateur)
          VALUES (?, ?)
        `).run(gameId, currentUser);
        
        console.log(`✅ Jeu AVN créé depuis JSON: "${titre}" (ID: ${gameId})`);
        return { success: true, id: gameId, created: true };
      }
      
    } catch (error) {
      console.error('Erreur import-avn-from-json:', error);
      throw error;
    }
  });
  
  // ========================================
  // PUT - Mettre à jour un jeu AVN
  // ========================================
  
  ipcMain.handle('update-avn-game', (event, id, gameData) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      // Séparer les champs globaux et les champs utilisateur
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
      if (gameData.couverture_url !== undefined) {
        globalFields.push('couverture_url = ?');
        globalValues.push(gameData.couverture_url);
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
      
      // Champs spécifiques à l'utilisateur
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
      
      // Mettre à jour les données globales si nécessaire
      if (globalFields.length > 0) {
        globalFields.push('updated_at = datetime(\'now\')');
        globalValues.push(id);
        const query = `UPDATE avn_games SET ${globalFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...globalValues);
      }
      
      // Mettre à jour/insérer les données utilisateur si nécessaire
      if (Object.keys(userFields).length > 0) {
        const userFieldNames = Object.keys(userFields);
        const userFieldValues = Object.values(userFields);
        
        db.prepare(`
          INSERT INTO avn_user_games (game_id, utilisateur, ${userFieldNames.join(', ')})
          VALUES (?, ?, ${userFieldNames.map(() => '?').join(', ')})
          ON CONFLICT(game_id, utilisateur) DO UPDATE SET
            ${userFieldNames.map(f => `${f} = excluded.${f}`).join(', ')}
        `).run(id, currentUser, ...userFieldValues);
      }
      
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
  // MARQUER COMME VU - Réinitialiser le flag MAJ
  // ========================================
  
  ipcMain.handle('mark-avn-update-seen', (event, id) => {
    try {
      const db = getDb();
      
      db.prepare(`
        UPDATE avn_games 
        SET maj_disponible = 0,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(id);
      
      console.log(`✅ MAJ marquée comme vue pour jeu AVN (ID: ${id})`);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erreur mark-avn-update-seen:', error);
      throw error;
    }
  });
  
  // ========================================
  // LANCEMENT - Lancer un jeu AVN
  // ========================================
  
  ipcMain.handle('launch-avn-game', async (event, id) => {
    try {
      const db = getDb();
      const currentUser = store.get('currentUser', '');
      
      // Récupérer le chemin depuis avn_user_games
      const userGame = db.prepare(`
        SELECT ug.chemin_executable, g.titre
        FROM avn_games g
        LEFT JOIN avn_user_games ug ON g.id = ug.game_id AND ug.utilisateur = ?
        WHERE g.id = ?
      `).get(currentUser, id);
      
      if (!userGame || !userGame.chemin_executable) {
        throw new Error('Aucun exécutable défini pour ce jeu');
      }
      
      // Vérifier que le fichier existe
      const fs = require('fs');
      if (!fs.existsSync(userGame.chemin_executable)) {
        throw new Error(`L'exécutable n'existe pas: ${userGame.chemin_executable}`);
      }
      
      // Lancer le jeu
      const gamePath = path.resolve(userGame.chemin_executable);
      const gameDir = path.dirname(gamePath);
      
      exec(`"${gamePath}"`, { cwd: gameDir }, (error) => {
        if (error) {
          console.error(`❌ Erreur lancement jeu "${userGame.titre}":`, error);
        } else {
          console.log(`🎮 Jeu lancé: "${userGame.titre}"`);
        }
      });
      
      // Mettre à jour la dernière session dans avn_user_games
      db.prepare(`
        INSERT INTO avn_user_games (game_id, utilisateur, derniere_session)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(game_id, utilisateur) DO UPDATE SET
          derniere_session = datetime('now')
      `).run(id, currentUser);
      
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
      
      // Récupérer tous les jeux avec un f95_thread_id ET liens F95Zone uniquement (pas LewdCorner)
      const games = db.prepare(`
        SELECT id, f95_thread_id, titre, version, statut_jeu, moteur, tags, couverture_url, maj_disponible, lien_f95 
        FROM avn_games 
        WHERE f95_thread_id IS NOT NULL 
          AND (lien_f95 IS NULL OR lien_f95 NOT LIKE '%lewdcorner%')
      `).all();
      
      if (games.length === 0) {
        console.log('⚠️ Aucun jeu AVN à vérifier (aucun f95_thread_id)');
        return { checked: 0, updated: 0 };
      }
      
      console.log(`🔍 Vérification des MAJ pour ${games.length} jeux AVN via scraping F95Zone...`);
      
      let updatedCount = 0;
      
      for (let i = 0; i < games.length; i++) {
        // Pause pour éviter le gel de l'UI
        if (i % 3 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
        
        const game = games[i];
        
        try {
          const f95Id = game.f95_thread_id;
          const threadUrl = `https://f95zone.to/threads/${f95Id}/`;
          
          console.log(`🌐 Vérif MAJ [${i + 1}/${games.length}]: ${game.titre} (${f95Id})`);
          
          // Scraper la page F95Zone (scraping complet comme dans search-avn-by-f95-id)
          const response = await fetch(threadUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (!response.ok) {
            console.warn(`⚠️ Erreur HTTP ${response.status} pour "${game.titre}"`);
            continue;
          }
          
          const html = await response.text();
          
          // === Fonction de décodage HTML entities ===
          const decodeHTML = (text) => {
            return text
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'")
              .replace(/&nbsp;/g, ' ');
          };
          
          // Extraire le titre complet
          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (!titleMatch) {
            console.warn(`⚠️ Titre non trouvé pour "${game.titre}"`);
            continue;
          }
          
          const fullTitle = decodeHTML(titleMatch[1]);
          
          // Parser le titre pour extraire infos
          const regTitle = /([\w\\']+)(?=\s-)/gi;
          const titleWords = Array.from(fullTitle.matchAll(regTitle)).map(m => m[0]);
          
          // Extraire nom du jeu
          const regName = /-\s(.*?)\s\[/i;
          const nameMatch = fullTitle.match(regName);
          const name = nameMatch ? decodeHTML(nameMatch[1]) : game.titre;
          
          // Extraire version
          const versionMatch = fullTitle.matchAll(/\[([^\]]+)\]/gi);
          const allBrackets = Array.from(versionMatch).map(m => m[1]);
          const validVersions = allBrackets.filter(v => 
            v.toLowerCase().startsWith('v') || 
            /^\d+\.\d+/.test(v)
          );
          const version = validVersions.length > 0 ? `[${validVersions[validVersions.length - 1]}]` : null;
          
          // Extraire statut et moteur
          let status = 'Ongoing';
          let engine = game.moteur || 'Autre';
          
          for (const word of titleWords) {
            switch (word) {
              case 'Abandoned':
                status = 'Abandoned';
                break;
              case 'Completed':
                status = 'Completed';
                break;
            }
            
            switch (word) {
              case "Ren'Py":
              case 'RenPy':
                engine = 'RenPy';
                break;
              case 'RPGM':
                engine = 'RPGM';
                break;
              case 'Unity':
                engine = 'Unity';
                break;
              case 'Unreal':
                engine = 'Unreal';
                break;
              case 'Flash':
                engine = 'Flash';
                break;
              case 'HTML':
                engine = 'HTML';
                break;
              case 'QSP':
                engine = 'QSP';
                break;
              case 'Others':
                engine = 'Autre';
                break;
            }
          }
          
          // Extraire les tags
          const tagsMatches = html.matchAll(/<a[^>]*class="[^"]*tagItem[^"]*"[^>]*>(.*?)<\/a>/gi);
          const tags = Array.from(tagsMatches).map(m => decodeHTML(m[1])).filter(t => t.length > 0);
          
          // Extraire l'image
          const imgMatch = html.match(/<img[^>]*class="[^"]*bbImage[^"]*"[^>]*src="([^"]+)"/i) || 
                           html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*bbImage[^"]*"/i);
          let image = imgMatch ? imgMatch[1] : game.couverture_url;
          
          if (image && image.includes('/thumb/')) {
            image = image.replace('/thumb/', '/');
          }
          
          // Normaliser les statuts pour comparaison (FR → EN)
          const normalizeStatus = (statutJeu) => {
            if (!statutJeu) return 'Ongoing';
            const upper = statutJeu.toUpperCase();
            if (upper === 'EN COURS' || upper === 'ONGOING') return 'Ongoing';
            if (upper === 'TERMINÉ' || upper === 'COMPLETED') return 'Completed';
            if (upper === 'ABANDONNÉ' || upper === 'ABANDONED') return 'Abandoned';
            return statutJeu;
          };
          
          // Vérifier si des données ont changé
          const versionChanged = version && version !== game.version;
          const statusChanged = normalizeStatus(status) !== normalizeStatus(game.statut_jeu);
          const engineChanged = engine !== game.moteur;
          const tagsChanged = tags.join(',') !== (game.tags || '');
          const imageChanged = image !== game.couverture_url;
          
          const hasChanges = versionChanged || statusChanged || engineChanged || tagsChanged || imageChanged;
          
          if (hasChanges) {
            console.log(`🔄 MAJ détectée pour "${game.titre}":`);
            if (versionChanged) console.log(`  - Version: ${game.version} → ${version}`);
            if (statusChanged) console.log(`  - Statut: ${game.statut_jeu} → ${status}`);
            if (engineChanged) console.log(`  - Moteur: ${game.moteur} → ${engine}`);
            if (tagsChanged) console.log(`  - Tags mis à jour`);
            if (imageChanged) console.log(`  - Image mise à jour`);
            
            // Ne compter que les NOUVELLES mises à jour (maj_disponible passant de 0 à 1)
            if (game.maj_disponible === 0) {
              updatedCount++;
              console.log(`  ✅ Nouvelle mise à jour signalée`);
            } else {
              console.log(`  ℹ️ Mise à jour déjà signalée, mise à jour des données uniquement`);
            }
            
            // Mapper le statut pour la DB
            let statutJeu;
            switch (status) {
              case 'Completed':
                statutJeu = 'TERMINÉ';
                break;
              case 'Abandoned':
                statutJeu = 'ABANDONNÉ';
                break;
              default:
                statutJeu = 'EN COURS';
            }
            
            // Mettre à jour TOUTES les données dans la DB
            db.prepare(`
              UPDATE avn_games 
              SET titre = ?,
                  version = ?,
                  statut_jeu = ?,
                  moteur = ?,
                  tags = ?,
                  couverture_url = ?,
                  maj_disponible = 1,
                  derniere_verif = datetime('now'),
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(name, version, statutJeu, engine, tags.join(','), image, game.id);
          } else {
            // Aucun changement, réinitialiser le flag MAJ
            db.prepare(`
              UPDATE avn_games 
              SET maj_disponible = 0,
                  derniere_verif = datetime('now')
              WHERE id = ?
            `).run(game.id);
            console.log(`  ✅ Aucun changement détecté`);
          }
          
          // Pause pour éviter le rate limiting F95Zone
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
      
      // Scraping direct depuis F95Zone (même logique que le script Tampermonkey)
      const threadUrl = `https://f95zone.to/threads/${f95Id}/`;
      console.log(`🌐 Scraping: ${threadUrl}`);
      
      const response = await fetch(threadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Thread F95Zone introuvable: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Fonction pour décoder les entités HTML
      const decodeHTML = (str) => {
        return str
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
          .trim();
      };
      
      // Extraire le titre complet (comme dans le script Tampermonkey)
      const titleTag = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const fullTitle = titleTag ? decodeHTML(titleTag[1]) : '';
      
      // Parser le titre comme le fait Tampermonkey
      // Format: [Prefix] - [Moteur] [Statut] Nom [Version] [Auteur]
      const regName = /.*-\s(.*?)\s\[/i;
      const regTitle = /([\w\\']+)(?=\s-)/gi; // Tous les mots avant " -"
      const regVersion = /\[([^\]]+)\]/gi;
      
      const titleMatch = fullTitle.match(regTitle) || [];
      const nameMatch = fullTitle.match(regName) || [];
      const versionMatches = fullTitle.match(regVersion) || [];
      
      const name = nameMatch[1] || fullTitle.split(' - ')[1]?.split(' [')[0] || 'Titre inconnu';
      const version = versionMatches[0] || null;
      
      console.log(`🔍 Parsing titre: "${fullTitle}"`);
      console.log(`📝 Mots trouvés:`, titleMatch);
      
      // Déterminer le statut et le moteur depuis les mots du titre (EXACTEMENT comme Tampermonkey)
      let status = 'Ongoing'; // Par défaut (en anglais pour le mapping frontend)
      let engine = 'Autre'; // Par défaut
      
      // Parser tous les mots pour trouver statut ET moteur
      for (const word of titleMatch) {
        // Détection du statut (en anglais pour correspondre au mapping frontend)
        switch (word) {
          case 'Abandoned':
            status = 'Abandoned';
            break;
          case 'Completed':
            status = 'Completed';
            break;
          // Si ce n'est ni Abandoned ni Completed, on garde "Ongoing" (défaut)
        }
        
        // Détection du moteur
        switch (word) {
          case "Ren'Py":
          case 'RenPy':
            engine = 'RenPy';
            break;
          case 'RPGM':
            engine = 'RPGM';
            break;
          case 'Unity':
            engine = 'Unity';
            break;
          case 'Unreal':
            engine = 'Unreal';
            break;
          case 'Flash':
            engine = 'Flash';
            break;
          case 'HTML':
            engine = 'HTML';
            break;
          case 'QSP':
            engine = 'QSP';
            break;
          case 'Others':
            engine = 'Autre';
            break;
        }
      }
      
      console.log(`📊 Statut détecté: ${status}`);
      console.log(`🛠️ Moteur détecté: ${engine}`);
      
      // Extraire l'image comme dans le script Tampermonkey
      // Chercher LA PREMIÈRE img.bbImage avec src
      const imgMatch = html.match(/<img[^>]*class="[^"]*bbImage[^"]*"[^>]*src="([^"]+)"/i) || 
                       html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*bbImage[^"]*"/i);
      
      let image = imgMatch ? imgMatch[1] : null;
      
      console.log(`🖼️ Image trouvée (brute):`, image);
      
      // Pour Electron, on garde l'URL attachments car preview peut être bloqué
      // On retire juste /thumb/ pour avoir la pleine résolution
      if (image && image.includes('/thumb/')) {
        image = image.replace('/thumb/', '/');
        console.log(`🖼️ Image convertie (sans thumb):`, image);
      }
      
      // Extraire les tags
      const tagsMatches = html.matchAll(/<a[^>]*class="[^"]*tagItem[^"]*"[^>]*>(.*?)<\/a>/gi);
      const tags = Array.from(tagsMatches).map(m => decodeHTML(m[1])).filter(t => t.length > 0);
      
      console.log(`✅ Jeu trouvé: ${name}`);
      
      // Télécharger l'image et la sauvegarder localement pour éviter les problèmes CORS
      let localImage = null;
      if (image) {
        try {
          console.log(`📥 Téléchargement de l'image...`);
          const downloadResult = await coverManager.downloadCover(
            getPathManager(),
            image,
            name,
            'avn',
            parseInt(f95Id),
            threadUrl // Passer l'URL du thread comme referer
          );
          
          if (downloadResult.success && downloadResult.localPath) {
            localImage = downloadResult.localPath;
            console.log(`✅ Image téléchargée: ${localImage}`);
          } else {
            console.warn(`⚠️ Échec du téléchargement de l'image:`, downloadResult.error);
          }
        } catch (error) {
          console.error(`❌ Erreur téléchargement image:`, error);
        }
      }
      
      return {
        success: true,
        data: {
          id: parseInt(f95Id),
          name: name,
          version: version,
          status: status,
          engine: engine,
          tags: tags,
          image: localImage || image, // Utiliser l'image locale si disponible, sinon l'URL externe
          thread_url: threadUrl
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
