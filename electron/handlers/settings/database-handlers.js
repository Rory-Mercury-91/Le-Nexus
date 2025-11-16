const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { getUserIdByName, getPaths: getPathsHelper } = require('./settings-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des bases de données
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Function} initDatabase - Fonction pour réinitialiser la base de données
 */
function registerDatabaseHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase) {
  const getPaths = () => getPathsHelper(getPathManager, store);

  // Fonction de fusion réutilisable (pour scheduler et IPC)
  function performMerge() {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        console.log('⚠️ Aucun utilisateur connecté, pas de fusion');
        return { merged: false, seriesCount: 0, tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      const dbFolder = getPaths().databases;
      if (!fs.existsSync(dbFolder)) {
        return { merged: false, seriesCount: 0, tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      const currentUserDbFile = `${currentUser.toLowerCase()}.db`;
      const currentUserDbPath = path.join(dbFolder, currentUserDbFile);
      
      // Vérifier que la base utilisateur existe (elle doit avoir été créée dans set-current-user)
      if (!fs.existsSync(currentUserDbPath)) {
        console.warn(`⚠️ Base utilisateur introuvable: ${currentUserDbFile}. La fusion ne peut pas être effectuée.`);
        return { merged: false, seriesCount: 0, tomesCount: 0, animesCount: 0, gamesCount: 0, error: 'Base utilisateur introuvable' };
      }
      
      // Vérifier si un enrichissement est en cours avant de fermer la connexion
      const { isEnrichmentRunning: isAnimeEnrichmentRunning } = require('../../services/animes/anime-enrichment-queue');
      const { isEnrichmentRunning: isMangaEnrichmentRunning } = require('../../services/mangas/manga-enrichment-queue');
      
      if (isAnimeEnrichmentRunning() || isMangaEnrichmentRunning()) {
        console.log('⏸️  Enrichissement en cours, report de la synchronisation des bases de données');
        return { merged: false, seriesCount: 0, tomesCount: 0, animesCount: 0, gamesCount: 0, skipped: true, reason: 'enrichment-in-progress' };
      }
      
      // S'assurer que la base utilisateur est chargée
      const { initDatabase } = require('../../services/database');
      const currentDb = getDb();
      
      // Vérifier si la base actuelle est déjà la bonne base utilisateur
      let targetDb = currentDb;
      let needsReload = false;
      
      if (currentDb) {
        // Vérifier si la base actuelle correspond à la base utilisateur
        try {
          const currentPath = currentDb.name; // better-sqlite3 expose le chemin via .name
          if (currentPath !== currentUserDbPath) {
            needsReload = true;
          }
        } catch (error) {
          // Si on ne peut pas vérifier, on suppose qu'il faut recharger
          needsReload = true;
        }
      } else {
        needsReload = true;
      }
      
      if (needsReload) {
        // Fermer la base actuelle si elle existe
        if (currentDb) {
          try {
            currentDb.close();
          } catch (error) {
            console.warn('⚠️ Erreur fermeture base actuelle:', error.message);
          }
        }
        
        // Charger la base utilisateur (source de vérité)
        console.log(`📂 Chargement de la base utilisateur: ${currentUserDbFile}`);
        targetDb = initDatabase(currentUserDbPath);
        
        // Mettre à jour la référence globale
        if (global.setDbMain) {
          global.setDbMain(targetDb);
          console.log(`✅ Base utilisateur chargée: ${currentUserDbFile}`);
        }
      } else {
        console.log(`ℹ️ Base utilisateur déjà chargée: ${currentUserDbFile}`);
      }

      // Lister toutes les bases SAUF la base utilisateur actuelle et les bases temporaires
      const files = fs.readdirSync(dbFolder).filter(f => {
        if (!f.endsWith('.db')) return false;
        if (f === currentUserDbFile) return false; // Exclure la base utilisateur actuelle
        if (f.startsWith('temp_')) return false; // Exclure les bases temporaires
        return true;
      });
      
      if (files.length === 0) {
        console.log('ℹ️ Aucune autre base à fusionner');
        return { merged: true, seriesCount: 0, tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      let seriesCount = 0;
      let tomesCount = 0;
      let animesCount = 0;
      let gamesCount = 0;

      console.log(`🔄 Fusion de ${files.length} base(s) dans ${currentUserDbFile}...`);

      files.forEach(file => {
        const userDbPath = path.join(dbFolder, file);
        const userDb = new Database(userDbPath, { readonly: true });

        try {
          // === FUSION DES MANGAS ===
          const series = userDb.prepare('SELECT * FROM series').all();
          series.forEach(serie => {
            // Vérifier par titre ou mal_id pour éviter les doublons
            const existing = targetDb.prepare('SELECT id FROM series WHERE titre = ? OR mal_id = ?').get(serie.titre, serie.mal_id || -1);
            if (!existing) {
              // Insertion complète avec tous les champs
              const insertSerie = targetDb.prepare(`
                INSERT INTO series (
                  titre, titre_alternatif, statut, type_volume, type_contenu, couverture_url, description,
                  statut_publication, statut_publication_vf, annee_publication, annee_vf, genres,
                  nb_chapitres, nb_chapitres_vf, chapitres_lus, langue_originale, demographie,
                  editeur, editeur_vo, rating, mal_id, titre_romaji, titre_natif, titre_anglais,
                  titres_alternatifs, nb_volumes, nb_volumes_vf, date_debut, date_fin, media_type,
                  themes, auteurs, volumes_lus, statut_lecture, score_utilisateur,
                  date_debut_lecture, date_fin_lecture, tags, relations, source_donnees,
                  score_mal, rank_mal, popularity_mal, serialization, background
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              insertSerie.run(
                serie.titre, serie.titre_alternatif, serie.statut, serie.type_volume, serie.type_contenu || 'volume',
                serie.couverture_url, serie.description, serie.statut_publication, serie.statut_publication_vf,
                serie.annee_publication, serie.annee_vf, serie.genres, serie.nb_chapitres, serie.nb_chapitres_vf,
                serie.chapitres_lus || 0, serie.langue_originale, serie.demographie, serie.editeur, serie.editeur_vo,
                serie.rating, serie.mal_id, serie.titre_romaji, serie.titre_natif, serie.titre_anglais,
                serie.titres_alternatifs, serie.nb_volumes, serie.nb_volumes_vf, serie.date_debut, serie.date_fin,
                serie.media_type, serie.themes, serie.auteurs, serie.volumes_lus || 0, serie.statut_lecture,
                serie.score_utilisateur, serie.date_debut_lecture, serie.date_fin_lecture, serie.tags,
                serie.relations, serie.source_donnees || 'nautiljon', serie.score_mal, serie.rank_mal,
                serie.popularity_mal, serie.serialization, serie.background
              );
              seriesCount++;
            }
          });

          // Fusion des tomes
          const tomes = userDb.prepare('SELECT * FROM tomes').all();
          tomes.forEach(tome => {
            // Trouver la série correspondante dans la base de destination
            const sourceSerie = userDb.prepare('SELECT titre, mal_id FROM series WHERE id = ?').get(tome.serie_id);
            if (sourceSerie) {
              const targetSerie = targetDb.prepare('SELECT id FROM series WHERE titre = ? OR mal_id = ?').get(sourceSerie.titre, sourceSerie.mal_id || -1);
              if (targetSerie) {
                const existing = targetDb.prepare('SELECT id FROM tomes WHERE serie_id = ? AND numero = ?').get(targetSerie.id, tome.numero);
                if (!existing) {
                  const insertTome = targetDb.prepare(`
                    INSERT INTO tomes (serie_id, numero, prix, date_sortie, date_achat, couverture_url, type_tome)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `);
                  insertTome.run(targetSerie.id, tome.numero, tome.prix || 0, tome.date_sortie, tome.date_achat, tome.couverture_url, tome.type_tome || 'Standard');
                  tomesCount++;
                }
              }
            }
          });

          // === FUSION DES ANIMES ===
          const animes = userDb.prepare('SELECT * FROM anime_series').all();
          animes.forEach(anime => {
            // Vérifier par mal_id ou titre pour éviter les doublons
            const existing = targetDb.prepare('SELECT id FROM anime_series WHERE mal_id = ? OR (mal_id IS NULL AND titre = ?)').get(anime.mal_id || -1, anime.titre);
            if (!existing) {
              const insertAnime = targetDb.prepare(`
                INSERT INTO anime_series (
                  mal_id, mal_url, titre, titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
                  type, source, nb_episodes, couverture_url, description, statut_diffusion,
                  en_cours_diffusion, date_debut, date_fin, duree, annee, saison_diffusion,
                  genres, themes, demographics, studios, producteurs, diffuseurs, rating,
                  score, rank_mal, popularity_mal, scored_by, favorites, background,
                  liens_externes, liens_streaming, franchise_name, franchise_order,
                  prequel_mal_id, sequel_mal_id, source_import, user_id_ajout
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              insertAnime.run(
                anime.mal_id, anime.mal_url, anime.titre, anime.titre_romaji, anime.titre_natif,
                anime.titre_anglais, anime.titres_alternatifs, anime.type, anime.source,
                anime.nb_episodes || 0, anime.couverture_url, anime.description, anime.statut_diffusion,
                anime.en_cours_diffusion || 0, anime.date_debut, anime.date_fin, anime.duree,
                anime.annee, anime.saison_diffusion, anime.genres, anime.themes, anime.demographics,
                anime.studios, anime.producteurs, anime.diffuseurs, anime.rating, anime.score,
                anime.rank_mal, anime.popularity_mal, anime.scored_by, anime.favorites,
                anime.background, anime.liens_externes, anime.liens_streaming, anime.franchise_name,
                anime.franchise_order || 1, anime.prequel_mal_id, anime.sequel_mal_id,
                anime.source_import || 'manual', anime.user_id_ajout
              );
              animesCount++;
            }
          });

          // === FUSION DES JEUX ADULTES ===
          const games = userDb.prepare('SELECT * FROM adulte_game_games').all();
          games.forEach(game => {
            // Vérifier par f95_thread_id + plateforme pour éviter les doublons
            const existing = targetDb.prepare('SELECT id FROM adulte_game_games WHERE f95_thread_id = ? AND plateforme = ?').get(game.f95_thread_id, game.plateforme || 'F95Zone');
            if (!existing) {
              const insertGame = targetDb.prepare(`
                INSERT INTO adulte_game_games (
                  f95_thread_id, titre, version, statut_jeu, moteur, plateforme, couverture_url,
                  tags, lien_f95, lien_traduction, lien_jeu, statut_perso, notes_privees,
                  chemin_executable, derniere_session, version_jouee, version_traduction,
                  statut_traduction, type_traduction, traduction_fr_disponible, version_traduite,
                  traducteur, f95_trad_id, statut_trad_fr, type_trad_fr, derniere_sync_trad,
                  traductions_multiples, version_disponible, maj_disponible, derniere_verif
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              insertGame.run(
                game.f95_thread_id, game.titre, game.version, game.statut_jeu, game.moteur,
                game.plateforme || 'F95Zone', game.couverture_url, game.tags, game.lien_f95,
                game.lien_traduction, game.lien_jeu, game.statut_perso, game.notes_privees,
                game.chemin_executable, game.derniere_session, game.version_jouee,
                game.version_traduction, game.statut_traduction, game.type_traduction,
                game.traduction_fr_disponible || 0, game.version_traduite, game.traducteur,
                game.f95_trad_id, game.statut_trad_fr, game.type_trad_fr, game.derniere_sync_trad,
                game.traductions_multiples, game.version_disponible, game.maj_disponible || 0,
                game.derniere_verif
              );
              gamesCount++;
            }
          });

          console.log(`  ✓ ${file}: ${series.length} séries, ${tomes.length} tomes, ${animes.length} animes, ${games.length} jeux`);
        } catch (error) {
          console.error(`  ❌ Erreur fusion ${file}:`, error.message);
        } finally {
          userDb.close();
        }
      });

      console.log(`✅ Fusion terminée: ${seriesCount} séries, ${tomesCount} tomes, ${animesCount} animes, ${gamesCount} jeux`);
      return { merged: true, seriesCount, tomesCount, animesCount, gamesCount };
    } catch (error) {
      console.error('Erreur merge-database:', error);
      return { merged: false, seriesCount: 0, tomesCount: 0, animesCount: 0, gamesCount: 0, error: error.message };
    }
  }

  // Handler IPC pour fusionner les bases de données
  ipcMain.handle('merge-database', () => {
    return performMerge();
  });

  // Exporter la fonction pour utilisation dans le scheduler
  global.performDatabaseMerge = performMerge;

  // Définir l'utilisateur actuel et recharger sa base de données
  ipcMain.handle('set-current-user', (event, userName) => {
    // Si userName est vide, juste nettoyer le store sans charger de base
    if (!userName || userName.trim() === '') {
      store.set('currentUser', '');
      console.log('ℹ️ Utilisateur actuel effacé (sélecteur sera affiché)');
      return;
    }
    
    store.set('currentUser', userName);
    
    // Recharger la base de données de l'utilisateur
    const { initDatabase } = require('../../services/database');
    const paths = getPaths();
    const userDbPath = path.join(paths.databases, `${userName.toLowerCase()}.db`);
    
    // Créer le dossier databases s'il n'existe pas
    if (!fs.existsSync(paths.databases)) {
      fs.mkdirSync(paths.databases, { recursive: true });
    }
    
    // Si la base de données utilisateur n'existe pas, la créer
    const isNewDb = !fs.existsSync(userDbPath);
    if (isNewDb) {
      console.log(`📂 Création de la base de données utilisateur: ${userDbPath}`);
      // La base sera créée par initDatabase
    } else {
      console.log(`📂 Chargement de la base de données utilisateur: ${userDbPath}`);
    }
    
    // Recharger la base de données
    const oldDb = getDb();
    if (oldDb) {
      try {
        oldDb.close();
        console.log('✅ Ancienne base de données fermée');
      } catch (error) {
        console.warn('⚠️ Erreur fermeture ancienne base:', error);
      }
    }
    
    // Initialiser la base de données de l'utilisateur (créera la base si elle n'existe pas)
    const newDb = initDatabase(userDbPath);

    // S'assurer que l'utilisateur existe dans la base chargée (cas d'anciens profils sans entrée users)
    try {
      const existingUser = newDb.prepare('SELECT id FROM users WHERE name = ?').get(userName);
      if (!existingUser) {
        console.log(`➕ Création automatique de l'utilisateur "${userName}" (ancienne base sans entrée users)`);
        newDb.prepare(`
          INSERT INTO users (name, emoji, color)
          VALUES (?, ?, ?)
        `).run(userName, '👤', '#8b5cf6');
      }
    } catch (error) {
      console.warn(`⚠️ Impossible de valider l'utilisateur "${userName}" dans ${userDbPath}:`, error.message);
    }

    if (global.setDbMain) {
      global.setDbMain(newDb);
      console.log(`✅ Base de données utilisateur chargée: ${userDbPath}`);
    } else {
      console.warn('⚠️ setDbMain non disponible, base de données non rechargée');
    }
    
    // Si c'est une nouvelle base, supprimer toutes les bases temporaires
    if (isNewDb) {
      try {
        const dbFiles = fs.readdirSync(paths.databases).filter(f => f.endsWith('.db') && f.startsWith('temp_'));
        if (dbFiles.length > 0) {
          console.log(`🗑️ Suppression de ${dbFiles.length} base(s) temporaire(s)...`);
          dbFiles.forEach(tempFile => {
            try {
              const tempDbPath = path.join(paths.databases, tempFile);
              fs.unlinkSync(tempDbPath);
              console.log(`  ✓ Base temporaire supprimée: ${tempFile}`);
            } catch (error) {
              console.warn(`  ⚠️ Impossible de supprimer ${tempFile}:`, error.message);
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la suppression des bases temporaires:', error.message);
      }
    }
  });

  // Gérer les préférences de contenu
  const defaultContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showAdulteGame: true
  };

  ipcMain.handle('set-content-preferences', (event, userName, preferences = {}) => {
    const userPrefs = store.get('contentPreferences', {});
    const mergedPrefs = {
      ...defaultContentPreferences,
      ...(userPrefs[userName] || {}),
      ...preferences
    };
    userPrefs[userName] = mergedPrefs;
    store.set('contentPreferences', userPrefs);
    
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('content-preferences-changed', userName, mergedPrefs);
    }
    
    return mergedPrefs;
  });

  ipcMain.handle('get-content-preferences', (event, userName) => {
    const userPrefs = store.get('contentPreferences', {});
    return {
      ...defaultContentPreferences,
      ...(userPrefs[userName] || {})
    };
  });

  // Préférences affichage manga
  ipcMain.handle('get-manga-display-settings', () => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    const rows = db.prepare('SELECT champ, visible FROM user_manga_display_settings WHERE user_id = ?').all(userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  });

  ipcMain.handle('save-manga-display-settings', (event, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    const stmt = db.prepare(`INSERT INTO user_manga_display_settings (user_id, champ, visible) VALUES (?, ?, ?)
                             ON CONFLICT(user_id, champ) DO UPDATE SET visible=excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('get-manga-display-overrides', (event, mangaId) => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    const rows = db.prepare('SELECT champ, visible FROM manga_display_preferences WHERE manga_id = ? AND user_id = ?').all(mangaId, userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  });

  ipcMain.handle('save-manga-display-overrides', (event, mangaId, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    const stmt = db.prepare(`INSERT INTO manga_display_preferences (manga_id, user_id, champ, visible) VALUES (?, ?, ?, ?)
                             ON CONFLICT(manga_id, user_id, champ) DO UPDATE SET visible=excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(mangaId, userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('delete-manga-display-overrides', (event, mangaId, champKeys) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    
    if (!Array.isArray(champKeys) || champKeys.length === 0) {
      return { success: true };
    }
    
    const placeholders = champKeys.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM manga_display_preferences 
                             WHERE manga_id = ? AND user_id = ? AND champ IN (${placeholders})`);
    stmt.run(mangaId, userId, ...champKeys);
    return { success: true };
  });

  // Préférences affichage anime
  ipcMain.handle('get-anime-display-settings', () => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    const rows = db.prepare('SELECT champ, visible FROM user_anime_display_settings WHERE user_id = ?').all(userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  });

  ipcMain.handle('save-anime-display-settings', (event, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    const stmt = db.prepare(`INSERT INTO user_anime_display_settings (user_id, champ, visible) VALUES (?, ?, ?)
                             ON CONFLICT(user_id, champ) DO UPDATE SET visible=excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('get-anime-display-overrides', (event, animeId) => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    const rows = db.prepare('SELECT champ, visible FROM anime_display_preferences WHERE anime_id = ? AND user_id = ?').all(animeId, userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  });

  ipcMain.handle('save-anime-display-overrides', (event, animeId, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };
    const stmt = db.prepare(`INSERT INTO anime_display_preferences (anime_id, user_id, champ, visible) VALUES (?, ?, ?, ?)
                             ON CONFLICT(anime_id, user_id, champ) DO UPDATE SET visible=excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(animeId, userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('delete-anime-display-overrides', (event, animeId, champKeys) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };

    if (!Array.isArray(champKeys) || champKeys.length === 0) {
      return { success: true };
    }

    const placeholders = champKeys.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM anime_display_preferences 
                             WHERE anime_id = ? AND user_id = ? AND champ IN (${placeholders})`);
    stmt.run(animeId, userId, ...champKeys);
    return { success: true };
  });

  // Préférences affichage jeux adultes
  ipcMain.handle('get-adulte-game-display-settings', () => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    const rows = db.prepare('SELECT champ, visible FROM user_adulte_game_display_settings WHERE user_id = ?').all(userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  });

  ipcMain.handle('save-adulte-game-display-settings', (event, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };

    const stmt = db.prepare(`INSERT INTO user_adulte_game_display_settings (user_id, champ, visible)
                             VALUES (?, ?, ?)
                             ON CONFLICT(user_id, champ) DO UPDATE SET visible = excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('get-adulte-game-display-overrides', (event, gameId) => {
    const db = getDb();
    if (!db) return {};
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return {};
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return {};
    const rows = db.prepare('SELECT champ, visible FROM adulte_game_display_preferences WHERE game_id = ? AND user_id = ?').all(gameId, userId);
    const prefs = {};
    rows.forEach(r => { prefs[r.champ] = !!r.visible; });
    return prefs;
  });

  ipcMain.handle('save-adulte-game-display-overrides', (event, gameId, prefs) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };

    const stmt = db.prepare(`INSERT INTO adulte_game_display_preferences (game_id, user_id, champ, visible)
                             VALUES (?, ?, ?, ?)
                             ON CONFLICT(game_id, user_id, champ) DO UPDATE SET visible = excluded.visible`);
    const tx = db.transaction(() => {
      Object.entries(prefs || {}).forEach(([champ, visible]) => {
        stmt.run(gameId, userId, champ, visible ? 1 : 0);
      });
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('delete-adulte-game-display-overrides', (event, gameId, champKeys) => {
    const db = getDb();
    if (!db) return { success: false, error: 'DB' };
    const currentUser = store.get('currentUser', '');
    if (!currentUser) return { success: false, error: 'No user' };
    const userId = getUserIdByName(db, currentUser);
    if (!userId) return { success: false, error: 'User not found' };

    if (!Array.isArray(champKeys) || champKeys.length === 0) {
      return { success: true };
    }

    const placeholders = champKeys.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM adulte_game_display_preferences
                             WHERE game_id = ? AND user_id = ? AND champ IN (${placeholders})`);
    stmt.run(gameId, userId, ...champKeys);
    return { success: true };
  });

  // Sauvegarder la base de données pour l'utilisateur actuel
  ipcMain.handle('save-user-database', () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        console.warn('Aucun utilisateur connecté, sauvegarde ignorée');
        return;
      }

      // La base de l'utilisateur est déjà sauvegardée automatiquement
      // Pas besoin de copie supplémentaire
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  });

  // Export de la base de données de l'utilisateur actuel
  ipcMain.handle('export-database', async () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userDbPath = path.join(getPaths().databases, `${currentUser.toLowerCase()}.db`);
      if (!fs.existsSync(userDbPath)) {
        return { success: false, error: 'Base de données utilisateur introuvable' };
      }

      const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Exporter la base de données',
        defaultPath: `${currentUser}-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          { name: 'Base de données', extensions: ['db'] }
        ]
      });

      if (filePath) {
        fs.copyFileSync(userDbPath, filePath);
        return { success: true, path: filePath };
      }
      return { success: false };
    } catch (error) {
      console.error('Erreur export-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Import de la base de données (fusionne dans la base de l'utilisateur actuel)
  ipcMain.handle('import-database', async () => {
    try {
      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const { filePaths } = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Importer une base de données',
        filters: [
          { name: 'Base de données', extensions: ['db'] }
        ],
        properties: ['openFile']
      });

      if (filePaths && filePaths.length > 0) {
        // Fusionner la base importée dans la base de l'utilisateur actuel
        const userDbPath = path.join(getPaths().databases, `${currentUser.toLowerCase()}.db`);
        const Database = require('better-sqlite3');
        const sourceDb = new Database(filePaths[0], { readonly: true });
        const targetDb = getDb();
        
        // Utiliser la logique de fusion pour importer
        // (simplifié - on pourrait réutiliser performMerge)
        console.log('🔄 Import de la base de données...');
        // Pour l'instant, on copie simplement si la base utilisateur n'existe pas
        if (!fs.existsSync(userDbPath)) {
          fs.copyFileSync(filePaths[0], userDbPath);
          console.log('✅ Base importée');
        } else {
          // Fusionner les données
          console.log('ℹ️ Base utilisateur existante, fusion des données...');
          // TODO: Implémenter la fusion complète ici si nécessaire
          sourceDb.close();
        }
        
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Erreur import-database:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer les données d'un utilisateur (lecture uniquement)
  ipcMain.handle('delete-user-data', async (event, userName) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      console.log(`🗑️ Suppression des données de l'utilisateur: ${userName}`);

      const userId = getUserIdByName(db, userName);
      if (!userId) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      const deleteLectureTomes = db.prepare('DELETE FROM lecture_tomes WHERE user_id = ?');
      const resultTomes = deleteLectureTomes.run(userId);
      console.log(`  ✓ ${resultTomes.changes} entrées lecture_tomes supprimées`);

      const deleteLectureEpisodes = db.prepare('DELETE FROM anime_episodes_vus WHERE user_id = ?');
      const resultEpisodes = deleteLectureEpisodes.run(userId);
      console.log(`  ✓ ${resultEpisodes.changes} entrées anime_episodes_vus supprimées`);

      const deleteSerieTags = db.prepare('DELETE FROM serie_tags WHERE user_id = ?');
      const resultSerieTags = deleteSerieTags.run(userId);
      console.log(`  ✓ ${resultSerieTags.changes} tags mangas supprimés`);

      const deleteAnimeTags = db.prepare('DELETE FROM anime_tags WHERE user_id = ?');
      const resultAnimeTags = deleteAnimeTags.run(userId);
      console.log(`  ✓ ${resultAnimeTags.changes} tags animes supprimés`);

      const deleteAnimeStatuts = db.prepare('DELETE FROM anime_statut_utilisateur WHERE user_id = ?');
      const resultAnimeStatuts = deleteAnimeStatuts.run(userId);
      console.log(`  ✓ ${resultAnimeStatuts.changes} statuts de visionnage supprimés`);

      const deleteSeriesMasquees = db.prepare('DELETE FROM series_masquees WHERE user_id = ?');
      const resultSeriesMasquees = deleteSeriesMasquees.run(userId);
      console.log(`  ✓ ${resultSeriesMasquees.changes} séries masquées supprimées`);

      const deleteAnimeMasquees = db.prepare('DELETE FROM anime_masquees WHERE user_id = ?');
      const resultAnimeMasquees = deleteAnimeMasquees.run(userId);
      console.log(`  ✓ ${resultAnimeMasquees.changes} animes masqués supprimés`);

      const deleteAdulteGameMasquees = db.prepare('DELETE FROM adulte_game_masquees WHERE user_id = ?');
      const resultAdulteGameMasquees = deleteAdulteGameMasquees.run(userId);
      console.log(`  ✓ ${resultAdulteGameMasquees.changes} jeux adultes masqués supprimés`);

      const dbFolder = getPaths().databases;
      const userDbPath = path.join(dbFolder, `${userName.toLowerCase()}.db`);
      if (fs.existsSync(userDbPath)) {
        fs.unlinkSync(userDbPath);
        console.log(`  ✓ Base de données utilisateur supprimée: ${userDbPath}`);
      }

      console.log(`✅ Toutes les données de ${userName} ont été supprimées`);
      return { success: true };
    } catch (error) {
      console.error('Erreur delete-user-data:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer TOUTES les données (réinitialiser l'application)
  ipcMain.handle('delete-all-data', async () => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      try {
        db.close();
      } catch (err) {
        console.warn('⚠️ Erreur lors de la fermeture de la DB:', err.message);
      }

      const configsDir = getPaths().configs;
      if (fs.existsSync(configsDir)) {
        fs.rmSync(configsDir, { recursive: true, force: true });
      }

      const coversDir = getPaths().covers;
      if (fs.existsSync(coversDir)) {
        fs.rmSync(coversDir, { recursive: true, force: true });
      }

      const configPath = store.path;
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur delete-all-data:', error);
      return { success: false, error: error.message };
    }
  });

  // Quitter l'application (avec option de redémarrage)
  ipcMain.handle('quit-app', async (event, options = {}) => {
    try {
      const { shouldRelaunch = false } = options;
      
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const dbFolder = getPaths().databases;
        if (!fs.existsSync(dbFolder)) {
          fs.mkdirSync(dbFolder, { recursive: true });
        }

        const userDbPath = path.join(dbFolder, `${currentUser.toLowerCase()}.db`);
        // La base utilisateur est déjà créée, pas besoin de copie
      }
      
      setTimeout(() => {
        const { app } = require('electron');
        
        if (shouldRelaunch) {
          app.relaunch();
          app.exit(0);
        } else {
          app.exit(0);
        }
      }, 500);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde finale:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDatabaseHandlers };
