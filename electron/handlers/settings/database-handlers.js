const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { getUserIdByName, getPaths: getPathsHelper } = require('./settings-helpers');
const { safeJsonParse } = require('../common-helpers');
const {
  createGetJsonDisplayOverridesHandler,
  createSaveJsonDisplayOverridesHandler,
  createDeleteJsonDisplayOverridesHandler
} = require('../common/display-overrides-helpers');
const {
  createGetGlobalDisplaySettingsHandler,
  createSaveGlobalDisplaySettingsHandler
} = require('../common/display-settings-helpers');

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
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      const dbFolder = getPaths().databases;
      if (!fs.existsSync(dbFolder)) {
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      const currentUserDbFile = `${currentUser.toLowerCase()}.db`;
      const currentUserDbPath = path.join(dbFolder, currentUserDbFile);
      
      // Vérifier que la base utilisateur existe (elle doit avoir été créée dans set-current-user)
      if (!fs.existsSync(currentUserDbPath)) {
        console.warn(`⚠️ Base utilisateur introuvable: ${currentUserDbFile}. La fusion ne peut pas être effectuée.`);
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0, error: 'Base utilisateur introuvable' };
      }
      
      // Vérifier si un enrichissement est en cours avant de fermer la connexion
      const { isEnrichmentRunning: isAnimeEnrichmentRunning } = require('../../services/animes/anime-enrichment-queue');
      const { isEnrichmentRunning: isMangaEnrichmentRunning } = require('../../services/mangas/manga-enrichment-queue');
      
      if (isAnimeEnrichmentRunning() || isMangaEnrichmentRunning()) {
        console.log('⏸️  Enrichissement en cours, report de la synchronisation des bases de données');
        return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0, skipped: true, reason: 'enrichment-in-progress' };
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
        return { merged: true, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0 };
      }

      let manga_seriesCount = 0;
      let manga_tomesCount = 0;
      let animesCount = 0;
      let gamesCount = 0;

      console.log(`🔄 Fusion de ${files.length} base(s) dans ${currentUserDbFile}...`);

      files.forEach(file => {
        const userDbPath = path.join(dbFolder, file);
        const userDb = new Database(userDbPath, { readonly: true });

        try {
          // === FUSION DES MANGAS ===
          // Récupérer les colonnes de la source et de la destination
          const sourceColumns = userDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
          const targetColumns = targetDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
          
          console.log(`  📊 ${file} - Source: ${sourceColumns.length} colonnes, Destination: ${targetColumns.length} colonnes`);
          
          // Utiliser seulement les colonnes communes (colonnes qui existent dans les deux tables)
          const commonColumns = sourceColumns.filter(col => targetColumns.includes(col));
          
          // Vérifier que nous avons bien des colonnes communes
          if (commonColumns.length === 0) {
            console.warn(`  ⚠️ Aucune colonne commune trouvée pour la table manga_series entre ${file} et la base cible`);
            return;
          }
          
          console.log(`  📊 ${file} - Colonnes communes: ${commonColumns.length}`);
          
          // Vérifier que titre et mal_id sont disponibles pour la vérification des doublons
          const hasTitre = commonColumns.includes('titre');
          const hasMalId = commonColumns.includes('mal_id');
          
          if (!hasTitre && !hasMalId) {
            console.warn(`  ⚠️ Impossible de vérifier les doublons pour ${file}: ni titre ni mal_id ne sont disponibles`);
            return;
          }
          
          // Construire la requête SELECT avec seulement les colonnes communes
          // Utiliser des guillemets pour protéger les noms de colonnes
          const selectColumns = commonColumns.map(col => `"${col}"`).join(', ');
          let manga_series = [];
          try {
            manga_series = userDb.prepare(`SELECT ${selectColumns} FROM manga_series`).all();
          } catch (selectError) {
            console.error(`  ❌ Erreur lors de la sélection des séries depuis ${file}:`, selectError.message);
            console.error(`    → Colonnes demandées: ${selectColumns}`);
            throw selectError; // Re-lancer pour être capturé par le catch global
          }
          
          manga_series.forEach((serie, index) => {
            try {
              // Vérifier par titre ou mal_id pour éviter les doublons
              const serieTitre = hasTitre ? serie.titre : null;
              const serieMalId = hasMalId ? serie.mal_id : null;
              
              let existing = null;
              if (hasTitre && hasMalId) {
                existing = targetDb.prepare('SELECT id FROM manga_series WHERE titre = ? OR mal_id = ?').get(serieTitre || '', serieMalId || -1);
              } else if (hasTitre) {
                existing = targetDb.prepare('SELECT id FROM manga_series WHERE titre = ?').get(serieTitre || '');
              } else if (hasMalId) {
                existing = targetDb.prepare('SELECT id FROM manga_series WHERE mal_id = ?').get(serieMalId || -1);
              }
              
              if (!existing) {
                const placeholders = commonColumns.map(() => '?').join(', ');
                // Extraire les valeurs dans le même ordre que commonColumns
                const values = commonColumns.map(col => {
                  const value = serie[col];
                  // Gérer les valeurs undefined/null correctement
                  return value !== undefined && value !== null ? value : null;
                });
                
                // Vérifier que le nombre de valeurs correspond au nombre de colonnes
                if (values.length !== commonColumns.length) {
                  console.warn(`  ⚠️ [${file}] Série ${index + 1}/${manga_series.length}: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${commonColumns.length})`);
                  console.warn(`    → Titre: "${serieTitre || 'sans titre'}"`);
                  return;
                }
                
                // Utiliser des guillemets pour protéger les noms de colonnes dans l'INSERT
                const quotedColumns = commonColumns.map(col => `"${col}"`).join(', ');
                const insertSerie = targetDb.prepare(`
                  INSERT INTO manga_series (${quotedColumns})
                  VALUES (${placeholders})
                `);
                insertSerie.run(...values);
                manga_seriesCount++;
              }
            } catch (insertError) {
              console.warn(`  ⚠️ [${file}] Erreur insertion série ${index + 1}/${manga_series.length}:`, insertError.message);
              // Si l'erreur est "X values for Y columns", logger plus de détails
              if (insertError.message.includes('values for') && insertError.message.includes('columns')) {
                console.warn(`    → Colonnes communes: ${commonColumns.length}, Valeurs extraites: ${commonColumns.map(col => serie[col] !== undefined ? '✓' : '✗').join(' ')}`);
                console.warn(`    → Colonnes: ${commonColumns.join(', ')}`);
              }
            }
          });

          // Fusion des manga_tomes
          const manga_tomes = userDb.prepare('SELECT * FROM manga_tomes').all();
          manga_tomes.forEach(tome => {
            // Trouver la série correspondante dans la base de destination
            const sourceSerie = userDb.prepare('SELECT titre, mal_id FROM manga_series WHERE id = ?').get(tome.serie_id);
            if (sourceSerie) {
              const targetSerie = targetDb.prepare('SELECT id FROM manga_series WHERE titre = ? OR mal_id = ?').get(sourceSerie.titre, sourceSerie.mal_id || -1);
              if (targetSerie) {
                const existing = targetDb.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?').get(targetSerie.id, tome.numero);
                if (!existing) {
                  const insertTome = targetDb.prepare(`
                    INSERT INTO manga_tomes (serie_id, numero, prix, date_sortie, date_achat, couverture_url, type_tome)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `);
                  insertTome.run(targetSerie.id, tome.numero, tome.prix || 0, tome.date_sortie, tome.date_achat, tome.couverture_url, tome.type_tome || 'Standard');
                  manga_tomesCount++;
                }
              }
            }
          });

          // === FUSION DES ANIMES ===
          // Récupérer les colonnes de la source et de la destination
          const animeSourceColumns = userDb.pragma('table_info(anime_series)').map(col => col.name).filter(name => name !== 'id');
          const animeTargetColumns = targetDb.pragma('table_info(anime_series)').map(col => col.name).filter(name => name !== 'id');
          
          // Utiliser seulement les colonnes communes
          const animeCommonColumns = animeSourceColumns.filter(col => animeTargetColumns.includes(col));
          
          // Initialiser animes avant le if pour qu'il soit accessible après
          let animes = [];
          
          // Vérifier que nous avons bien des colonnes communes
          if (animeCommonColumns.length === 0) {
            console.warn(`  ⚠️ Aucune colonne commune trouvée pour la table anime_series entre ${file} et la base cible`);
          } else {
            // Construire la requête SELECT avec seulement les colonnes communes
            const animeSelectColumns = animeCommonColumns.map(col => `"${col}"`).join(', ');
            try {
              animes = userDb.prepare(`SELECT ${animeSelectColumns} FROM anime_series`).all();
            } catch (selectError) {
              console.error(`  ❌ Erreur lors de la sélection des animes depuis ${file}:`, selectError.message);
              console.error(`    → Colonnes demandées: ${animeSelectColumns}`);
              throw selectError;
            }
            
            // Vérifier que mal_id ou titre sont disponibles pour la vérification des doublons
            const hasAnimeMalId = animeCommonColumns.includes('mal_id');
            const hasAnimeTitre = animeCommonColumns.includes('titre');
            
            animes.forEach((anime, index) => {
              try {
                // Vérifier par mal_id ou titre pour éviter les doublons
                const animeMalId = hasAnimeMalId ? anime.mal_id : null;
                const animeTitre = hasAnimeTitre ? anime.titre : null;
                
                let existing = null;
                if (hasAnimeMalId && animeMalId) {
                  // Si mal_id existe, vérifier par mal_id (plus fiable)
                  existing = targetDb.prepare('SELECT id FROM anime_series WHERE mal_id = ?').get(animeMalId);
                } else if (hasAnimeTitre && animeTitre) {
                  // Sinon, vérifier par titre
                  existing = targetDb.prepare('SELECT id FROM anime_series WHERE titre = ?').get(animeTitre);
                }
                
                if (!existing) {
                  const placeholders = animeCommonColumns.map(() => '?').join(', ');
                  // Extraire les valeurs dans le même ordre que animeCommonColumns
                  const values = animeCommonColumns.map(col => {
                    const value = anime[col];
                    // Gérer les valeurs undefined/null correctement
                    return value !== undefined && value !== null ? value : null;
                  });
                  
                  // Vérifier que le nombre de valeurs correspond au nombre de colonnes
                  if (values.length !== animeCommonColumns.length) {
                    console.warn(`  ⚠️ [${file}] Anime ${index + 1}/${animes.length}: Nombre de valeurs (${values.length}) ne correspond pas au nombre de colonnes (${animeCommonColumns.length})`);
                    return;
                  }
                  
                  // Utiliser des guillemets pour protéger les noms de colonnes dans l'INSERT
                  const quotedAnimeColumns = animeCommonColumns.map(col => `"${col}"`).join(', ');
                  try {
                    const insertAnime = targetDb.prepare(`
                      INSERT INTO anime_series (${quotedAnimeColumns})
                      VALUES (${placeholders})
                    `);
                    insertAnime.run(...values);
                    animesCount++;
                  } catch (insertError) {
                    // Si l'erreur est une contrainte UNIQUE, c'est normal (doublon)
                    if (insertError.message.includes('UNIQUE constraint')) {
                      // Ignorer silencieusement, c'est un doublon
                      return;
                    }
                    // Sinon, re-lancer l'erreur pour qu'elle soit capturée par le catch externe
                    throw insertError;
                  }
                }
              } catch (insertError) {
                console.warn(`  ⚠️ [${file}] Erreur insertion anime ${index + 1}/${animes.length}:`, insertError.message);
                // Si l'erreur est "X values for Y columns", logger plus de détails
                if (insertError.message.includes('values for') && insertError.message.includes('columns')) {
                  console.warn(`    → Colonnes communes: ${animeCommonColumns.length}, Valeurs extraites: ${animeCommonColumns.map(col => anime[col] !== undefined ? '✓' : '✗').join(' ')}`);
                  console.warn(`    → Colonnes: ${animeCommonColumns.join(', ')}`);
                }
              }
            });
          }

          // === FUSION DES JEUX ADULTES ===
          const games = userDb.prepare('SELECT * FROM adulte_game_games').all();
          games.forEach(game => {
            // Vérifier par f95_thread_id/Lewdcorner_thread_id + game_site pour éviter les doublons
            // Gérer à la fois l'ancien schéma (plateforme) et le nouveau (game_site)
            const gameSite = game.game_site || game.plateforme || 'F95Zone';
            const f95Id = game.f95_thread_id;
            const lewdcornerId = game.Lewdcorner_thread_id;
            
            let existing = null;
            if (f95Id) {
              existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                WHERE f95_thread_id = ? AND game_site = ?
              `).get(f95Id, gameSite);
            }
            if (!existing && lewdcornerId) {
              existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                WHERE Lewdcorner_thread_id = ? AND game_site = ?
              `).get(lewdcornerId, gameSite);
            }
            // Fallback pour l'ancien schéma
            if (!existing && game.f95_thread_id && game.plateforme) {
              existing = targetDb.prepare(`
                SELECT id FROM adulte_game_games 
                WHERE f95_thread_id = ? AND (game_site = ? OR plateforme = ?)
              `).get(game.f95_thread_id, game.plateforme, game.plateforme);
            }
            if (!existing) {
              // Récupérer les colonnes de la source et de la destination
              const sourceColumns = userDb.pragma('table_info(adulte_game_games)').map(col => col.name).filter(name => name !== 'id');
              const targetColumns = targetDb.pragma('table_info(adulte_game_games)').map(col => col.name).filter(name => name !== 'id');
              
              // Mapper les anciennes colonnes vers les nouvelles
              const columnMapping = {
                'version': 'game_version',
                'statut_jeu': 'game_statut',
                'moteur': 'game_engine',
                'plateforme': 'game_site',
                'developer': 'game_developer'
              };
              
              // Mapper les colonnes source vers les colonnes destination
              const mappedSourceColumns = sourceColumns.map(col => columnMapping[col] || col);
              
              // Utiliser seulement les colonnes communes (après mapping)
              const commonColumns = mappedSourceColumns.filter(col => targetColumns.includes(col));
              
              // Récupérer les colonnes source correspondantes
              const sourceColsForCommon = commonColumns.map(targetCol => {
                const sourceCol = Object.keys(columnMapping).find(key => columnMapping[key] === targetCol) || targetCol;
                return sourceCol;
              });
              
              const placeholders = commonColumns.map(() => '?').join(', ');
              const values = sourceColsForCommon.map((sourceCol, idx) => {
                const targetCol = commonColumns[idx];
                // Mapper les valeurs pour les colonnes renommées
                if (sourceCol === 'plateforme' && targetCol === 'game_site') {
                  return game[sourceCol] || 'F95Zone';
                }
                return game[sourceCol] !== undefined ? game[sourceCol] : null;
              });
              
              // Utiliser INSERT OR IGNORE pour éviter les erreurs UNIQUE constraint
              const insertGame = targetDb.prepare(`
                INSERT OR IGNORE INTO adulte_game_games (${commonColumns.join(', ')})
                VALUES (${placeholders})
              `);
              const result = insertGame.run(...values);
              if (result.changes > 0) {
                gamesCount++;
              }
            }
          });

          console.log(`  ✓ ${file}: ${manga_seriesCount} séries, ${manga_tomesCount} manga_tomes, ${animesCount} animes, ${gamesCount} jeux`);
        } catch (error) {
          console.error(`  ❌ Erreur fusion ${file}:`, error.message);
          // Logger plus de détails pour les erreurs de colonnes
          if (error.message.includes('values for') && error.message.includes('columns')) {
            console.error(`    → Détails de l'erreur:`, error);
            // Essayer de déterminer quelle table cause le problème
            try {
              const sourceSeriesCols = userDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
              const targetSeriesCols = targetDb.pragma('table_info(manga_series)').map(col => col.name).filter(name => name !== 'id');
              console.error(`    → Table manga_series - Source: ${sourceSeriesCols.length} colonnes, Destination: ${targetSeriesCols.length} colonnes`);
            } catch (e) {
              console.error(`    → Impossible de vérifier les colonnes:`, e.message);
            }
          }
        } finally {
          userDb.close();
        }
      });

      console.log(`✅ Fusion terminée: ${manga_seriesCount} séries, ${manga_tomesCount} manga_tomes, ${animesCount} animes, ${gamesCount} jeux`);
      return { merged: true, manga_seriesCount, manga_tomesCount, animesCount, gamesCount };
    } catch (error) {
      console.error('Erreur merge-database:', error);
      return { merged: false, manga_seriesCount: 0, manga_tomesCount: 0, animesCount: 0, gamesCount: 0, error: error.message };
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
    showVideos: true, // Option pour masquer/afficher toute la section Vidéos
    showAdulteGame: true,
    showBooks: true
  };

  ipcMain.handle('set-content-preferences', (event, userName, preferences = {}) => {
    const userPrefs = store.get('contentPreferences', {});
    const mergedPrefs = {
      ...defaultContentPreferences,
      ...(userPrefs[userName] || {}),
      ...preferences
    };
    
    // Synchroniser showBooks avec showMangas : si on change showMangas, showBooks suit
    if (preferences.hasOwnProperty('showMangas')) {
      mergedPrefs.showBooks = preferences.showMangas;
    }
    
    // Synchroniser showVideos avec les 3 anciennes valeurs : si on change showVideos, mettre à jour les 3
    if (preferences.hasOwnProperty('showVideos')) {
      mergedPrefs.showAnimes = preferences.showVideos;
      mergedPrefs.showMovies = preferences.showVideos;
      mergedPrefs.showSeries = preferences.showVideos;
    }
    
    // Migration automatique : si showVideos n'existe pas, le calculer à partir des 3 anciennes valeurs
    if (mergedPrefs.showVideos === undefined) {
      mergedPrefs.showVideos = mergedPrefs.showAnimes || mergedPrefs.showMovies || mergedPrefs.showSeries;
    }
    
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

  // Préférences affichage manga (globales - utilisent user_preferences avec content_type='mangas')
  const defaultMangaDisplay = {
    // Définir les champs par défaut selon les besoins
    // Pour l'instant, on garde une structure flexible
  };

  ipcMain.handle('get-manga-display-settings', createGetGlobalDisplaySettingsHandler({
    contentType: 'mangas',
    defaultDisplay: defaultMangaDisplay,
    getDb,
    store
  }));

  ipcMain.handle('save-manga-display-settings', createSaveGlobalDisplaySettingsHandler({
    contentType: 'mangas',
    getDb,
    store,
    useVisibleFormat: true
  }));

  // Handlers pour les overrides locaux des mangas (stockés dans manga_user_data.display_preferences JSON)
  const { ensureMangaUserDataRow } = require('../mangas/manga-helpers');
  
  ipcMain.handle('get-manga-display-overrides', createGetJsonDisplayOverridesHandler({
    tableName: 'manga_user_data',
    itemIdColumnName: 'serie_id',
    getDb,
    store
  }));

  ipcMain.handle('save-manga-display-overrides', createSaveJsonDisplayOverridesHandler({
    tableName: 'manga_user_data',
    itemIdColumnName: 'serie_id',
    getDb,
    store,
    ensureRowExists: ensureMangaUserDataRow
  }));

  ipcMain.handle('delete-manga-display-overrides', createDeleteJsonDisplayOverridesHandler({
    tableName: 'manga_user_data',
    itemIdColumnName: 'serie_id',
    getDb,
    store
  }));

  // Préférences affichage anime (globales - utilisent user_preferences avec content_type='animes')
  ipcMain.handle('get-anime-display-settings', createGetGlobalDisplaySettingsHandler({
    contentType: 'animes',
    defaultDisplay: {},
    getDb,
    store
  }));

  ipcMain.handle('save-anime-display-settings', createSaveGlobalDisplaySettingsHandler({
    contentType: 'animes',
    getDb,
    store,
    useVisibleFormat: true
  }));

  // Handlers pour les overrides locaux des animés (stockés dans anime_user_data.display_preferences JSON)
  ipcMain.handle('get-anime-display-overrides', createGetJsonDisplayOverridesHandler({
    tableName: 'anime_user_data',
    itemIdColumnName: 'anime_id',
    getDb,
    store
  }));

  ipcMain.handle('save-anime-display-overrides', createSaveJsonDisplayOverridesHandler({
    tableName: 'anime_user_data',
    itemIdColumnName: 'anime_id',
    getDb,
    store,
    ensureRowExists: require('../animes/anime-helpers').ensureAnimeUserDataRow
  }));

  ipcMain.handle('delete-anime-display-overrides', createDeleteJsonDisplayOverridesHandler({
    tableName: 'anime_user_data',
    itemIdColumnName: 'anime_id',
    getDb,
    store
  }));

  // Préférences affichage jeux adultes
  ipcMain.handle('get-adulte-game-display-settings', createGetGlobalDisplaySettingsHandler({
    contentType: 'adulte_game',
    defaultDisplay: {},
    getDb,
    store
  }));

  ipcMain.handle('save-adulte-game-display-settings', createSaveGlobalDisplaySettingsHandler({
    contentType: 'adulte_game',
    getDb,
    store,
    useVisibleFormat: true
  }));

  // Handlers pour les overrides locaux des jeux adultes (stockés dans adulte_game_user_data.display_preferences)
  ipcMain.handle('get-adulte-game-display-overrides', createGetJsonDisplayOverridesHandler({
    tableName: 'adulte_game_user_data',
    itemIdColumnName: 'game_id',
    getDb,
    store
  }));

  ipcMain.handle('save-adulte-game-display-overrides', createSaveJsonDisplayOverridesHandler({
    tableName: 'adulte_game_user_data',
    itemIdColumnName: 'game_id',
    getDb,
    store,
    useInsertOnConflict: true // Utilise INSERT ... ON CONFLICT pour créer la ligne si elle n'existe pas
  }));

  ipcMain.handle('delete-adulte-game-display-overrides', createDeleteJsonDisplayOverridesHandler({
    tableName: 'adulte_game_user_data',
    itemIdColumnName: 'game_id',
    getDb,
    store
  }));

  // Préférences affichage livres (globales - utilisent user_preferences avec content_type='books')
  ipcMain.handle('get-books-display-settings', createGetGlobalDisplaySettingsHandler({
    contentType: 'books',
    defaultDisplay: {},
    getDb,
    store
  }));

  ipcMain.handle('save-books-display-settings', createSaveGlobalDisplaySettingsHandler({
    contentType: 'books',
    getDb,
    store,
    useVisibleFormat: true
  }));

  // Handlers pour les overrides locaux des livres (stockés dans book_user_data.display_preferences)
  const { ensureBookUserDataRow } = require('../books/book-helpers');
  
  ipcMain.handle('get-books-display-overrides', createGetJsonDisplayOverridesHandler({
    tableName: 'book_user_data',
    itemIdColumnName: 'book_id',
    getDb,
    store
  }));

  ipcMain.handle('save-books-display-overrides', createSaveJsonDisplayOverridesHandler({
    tableName: 'book_user_data',
    itemIdColumnName: 'book_id',
    getDb,
    store,
    ensureRowExists: ensureBookUserDataRow
  }));

  ipcMain.handle('delete-books-display-overrides', createDeleteJsonDisplayOverridesHandler({
    tableName: 'book_user_data',
    itemIdColumnName: 'book_id',
    getDb,
    store
  }));

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
          // Note: La fusion complète est gérée par le scheduler de synchronisation automatique
          // qui s'exécute périodiquement et au démarrage de l'application
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

  // Analyser une base de données (pour vérification)
  ipcMain.handle('analyze-database', async (event, dbPath) => {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath, { readonly: true });

      const analysis = {
        tables: [],
        obsoleteTables: [],
        newTables: [],
        stats: {},
        structure: {}
      };

      // 1. Lister toutes les tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `).all();

      tables.forEach(table => {
        try {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
          analysis.tables.push({ name: table.name, count: count.count });
        } catch (e) {
          analysis.tables.push({ name: table.name, count: 0, error: e.message });
        }
      });

      // 2. Vérifier les tables obsolètes
      const obsoleteTables = [
        'adulte_game_user_games',
        'adulte_game_proprietaires',
        'adulte_game_labels',
        'adulte_game_masquees',
        'adulte_game_display_preferences',
        'user_adulte_game_display_settings',
        'adulte_game_tag_preferences',
        'adulte_game_blacklist'
      ];

      obsoleteTables.forEach(tableName => {
        const exists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);
        
        if (exists) {
          analysis.obsoleteTables.push(tableName);
        }
      });

      // 3. Vérifier les nouvelles tables
      const newTables = ['adulte_game_games', 'adulte_game_user_data', 'user_preferences'];
      newTables.forEach(tableName => {
        const exists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);
        
        if (exists) {
          try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
            analysis.newTables.push({ name: tableName, count: count.count });
          } catch (e) {
            analysis.newTables.push({ name: tableName, count: 0, error: e.message });
          }
        }
      });

      // 4. Statistiques principales
      try {
        analysis.stats.manga_series = db.prepare('SELECT COUNT(*) as count FROM manga_series').get().count;
      } catch (e) { analysis.stats.manga_series = 0; }
      
      try {
        analysis.stats.manga_tomes = db.prepare('SELECT COUNT(*) as count FROM manga_tomes').get().count;
      } catch (e) { analysis.stats.manga_tomes = 0; }
      
      try {
        analysis.stats.animes = db.prepare('SELECT COUNT(*) as count FROM anime_series').get().count;
      } catch (e) { analysis.stats.animes = 0; }
      
      try {
        analysis.stats.games = db.prepare('SELECT COUNT(*) as count FROM adulte_game_games').get().count;
      } catch (e) { analysis.stats.games = 0; }
      
      try {
        analysis.stats.users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      } catch (e) { analysis.stats.users = 0; }

      // 5. Structure des tables principales
      try {
        const manga_seriesColumns = db.pragma('table_info(manga_series)');
        analysis.structure.manga_series = {
          columnCount: manga_seriesColumns.length,
          columns: manga_seriesColumns.map(c => c.name)
        };
      } catch (e) { analysis.structure.manga_series = { error: e.message }; }

      try {
        const animeColumns = db.pragma('table_info(anime_series)');
        analysis.structure.anime_series = {
          columnCount: animeColumns.length,
          columns: animeColumns.map(c => c.name)
        };
      } catch (e) { analysis.structure.anime_series = { error: e.message }; }

      try {
        const gameColumns = db.pragma('table_info(adulte_game_games)');
        analysis.structure.adulte_game_games = {
          columnCount: gameColumns.length,
          columns: gameColumns.map(c => c.name)
        };
      } catch (e) { analysis.structure.adulte_game_games = { error: e.message }; }

      db.close();
      return { success: true, analysis };
    } catch (error) {
      console.error('Erreur analyze-database:', error);
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

      const deleteMangaUserData = db.prepare('DELETE FROM manga_user_data WHERE user_id = ?');
      const resultMangaUserData = deleteMangaUserData.run(userId);
      console.log(`  ✓ ${resultMangaUserData.changes} données utilisateur mangas supprimées`);

      const deleteAnimeUserData = db.prepare('DELETE FROM anime_user_data WHERE user_id = ?');
      const resultAnimeUserData = deleteAnimeUserData.run(userId);
      console.log(`  ✓ ${resultAnimeUserData.changes} données utilisateur animes supprimées`);

      const deleteAdulteGameMasquees = db.prepare('UPDATE adulte_game_user_data SET is_hidden = 0 WHERE user_id = ? AND is_hidden = 1');
      const resultAdulteGameMasquees = deleteAdulteGameMasquees.run(userId);
      console.log(`  ✓ ${resultAdulteGameMasquees.changes} jeux adultes masqués réinitialisés`);

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
