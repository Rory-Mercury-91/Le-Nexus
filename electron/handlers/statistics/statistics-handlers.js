/**
 * Enregistre tous les handlers IPC pour les statistiques et la lecture
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerStatisticsHandlers(ipcMain, getDb, store) {
  
  // Récupérer les statistiques générales
  ipcMain.handle('get-statistics', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const stats = {
        totaux: {},
        totalMihon: 0,
        parType: {},
        parStatut: {},
        nbSeries: 0,
        nbTomes: 0,
        nbTomesParProprietaire: {},
        nbTomesParProprietaireParType: {}, // Nouveau : nombre de manga_tomes par type par propriétaire
        users: [] // Nouveau : liste des utilisateurs avec leurs couleurs
      };

      // Récupérer tous les utilisateurs
      const users = db.prepare('SELECT id, name, color, emoji FROM users').all();
      stats.users = users;

      // Initialiser les totaux pour chaque utilisateur
      users.forEach(user => {
        stats.totaux[user.id] = 0;
        stats.nbTomesParProprietaire[user.id] = 0;
        stats.nbTomesParProprietaireParType[user.id] = {};
      });

      // Calcul dynamique des coûts et manga_tomes par propriétaire
      const manga_tomes = db.prepare(`
        SELECT t.id, t.prix, t.mihon, s.type_volume 
        FROM manga_tomes t
        JOIN manga_series s ON t.serie_id = s.id
      `).all();
      
      manga_tomes.forEach(tome => {
        // Calculer le total Mihon (gain)
        if (tome.mihon === 1) {
          stats.totalMihon = (stats.totalMihon || 0) + tome.prix;
          return; // Exclure les manga_tomes Mihon du coût global
        }
        
        // Récupérer les propriétaires de ce tome
        const proprietaires = db.prepare(`
          SELECT user_id FROM manga_manga_tomes_proprietaires WHERE tome_id = ?
        `).all(tome.id);

        if (proprietaires.length > 0) {
          // Diviser le coût entre tous les propriétaires
          const coutParProprietaire = tome.prix / proprietaires.length;
          
          proprietaires.forEach(prop => {
            stats.totaux[prop.user_id] = (stats.totaux[prop.user_id] || 0) + coutParProprietaire;
            stats.nbTomesParProprietaire[prop.user_id] = (stats.nbTomesParProprietaire[prop.user_id] || 0) + 1;
            
            // Compter par type
            const typeVolume = tome.type_volume || 'Broché';
            if (!stats.nbTomesParProprietaireParType[prop.user_id][typeVolume]) {
              stats.nbTomesParProprietaireParType[prop.user_id][typeVolume] = 0;
            }
            stats.nbTomesParProprietaireParType[prop.user_id][typeVolume]++;
          });
        }
      });

      // Nombre de manga_tomes par type
      const parType = db.prepare(`
        SELECT s.type_volume, COUNT(t.id) as count, SUM(t.prix) as total
        FROM manga_tomes t
        JOIN manga_series s ON t.serie_id = s.id
        GROUP BY s.type_volume
      `).all();
      
      parType.forEach(row => {
        stats.parType[row.type_volume] = {
          count: row.count,
          total: row.total
        };
      });

      // Nombre de séries par statut
      const parStatut = db.prepare('SELECT statut, COUNT(*) as count FROM manga_series GROUP BY statut').all();
      parStatut.forEach(row => {
        stats.parStatut[row.statut] = row.count;
      });

      // Totaux généraux
      stats.nbSeries = db.prepare('SELECT COUNT(*) as count FROM manga_series').get().count;
      stats.nbTomes = db.prepare('SELECT COUNT(*) as count FROM manga_tomes').get().count;

      return stats;
    } catch (error) {
      console.error('Erreur get-statistics:', error);
      throw error;
    }
  });

  // Obtenir les statistiques de lecture
  ipcMain.handle('get-lecture-statistics', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return {
          manga_tomesLus: 0,
          manga_tomesTotal: 0,
          chapitresLus: 0,
          chapitresTotal: 0,
          manga_seriesCompletes: 0,
          manga_seriesTotal: 0,
          progression: 0,
          derniersTomesLus: []
        };
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { error: 'Utilisateur non trouvé' };
      }

      // Nombre total de manga_tomes (collection globale)
      const manga_tomesTotal = db.prepare('SELECT COUNT(*) as count FROM manga_tomes').get().count;

      // Nombre de manga_tomes lus par l'utilisateur (depuis manga_user_data.tome_progress)
      const { safeJsonParse } = require('../common-helpers');
      let manga_tomesLus = 0;
      const allUserData = db.prepare('SELECT tome_progress FROM manga_user_data WHERE user_id = ?').all(userId);
      for (const userData of allUserData) {
        if (userData.tome_progress) {
          const tomeProgress = safeJsonParse(userData.tome_progress, []);
          if (Array.isArray(tomeProgress)) {
            manga_tomesLus += tomeProgress.filter(tp => tp.lu === true || tp.lu === 1).length;
          }
        }
      }

      // Séries suivies par l'utilisateur (statut ou manga_tomes possédés)
      const manga_seriesTotal = db.prepare(`
        SELECT COUNT(*) as count
        FROM manga_series s
        WHERE EXISTS (
          SELECT 1 FROM manga_user_data mud
          WHERE mud.serie_id = s.id AND mud.user_id = ?
        )
        OR EXISTS (
          SELECT 1 
          FROM manga_tomes t
          JOIN manga_manga_tomes_proprietaires tp ON tp.tome_id = t.id
          WHERE t.serie_id = s.id AND tp.user_id = ?
        )
      `).get(userId, userId).count;

      // Séries complètes basées sur les manga_tomes
      // Compter les séries où tous les manga_tomes sont lus (depuis tome_progress)
      let manga_seriesCompletesTomes = 0;
      const manga_seriesWithTomes = db.prepare(`
        SELECT s.id, 
               (SELECT COUNT(*) FROM manga_tomes WHERE serie_id = s.id) as total_manga_tomes
        FROM manga_series s
        WHERE (SELECT COUNT(*) FROM manga_tomes WHERE serie_id = s.id) > 0
      `).all();
      
      for (const serie of manga_seriesWithTomes) {
        const userData = db.prepare('SELECT tome_progress FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(serie.id, userId);
        if (userData && userData.tome_progress) {
          const tomeProgress = safeJsonParse(userData.tome_progress, []);
          if (Array.isArray(tomeProgress)) {
            const manga_tomesLusCount = tomeProgress.filter(tp => tp.lu === true || tp.lu === 1).length;
            if (manga_tomesLusCount === serie.total_manga_tomes && serie.total_manga_tomes > 0) {
              manga_seriesCompletesTomes++;
            }
          }
        }
      }

      // Séries à chapitres (sans manga_tomes)
      const manga_seriesChapitres = db.prepare(`
        SELECT 
          s.id,
          s.nb_chapitres as total_chapitres,
          COALESCE(mud.chapitres_lus, s.chapitres_lus, 0) as chapitres_lus
        FROM manga_series s
        LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
        WHERE (SELECT COUNT(*) FROM manga_tomes WHERE serie_id = s.id) = 0
          AND s.nb_chapitres IS NOT NULL
          AND s.nb_chapitres > 0
          AND (
            mud.user_id IS NOT NULL
            OR COALESCE(s.chapitres_lus, 0) > 0
          )
      `).all(userId);

      const chapitresTotal = manga_seriesChapitres.reduce((acc, serie) => acc + (serie.total_chapitres || 0), 0);
      const chapitresLus = manga_seriesChapitres.reduce((acc, serie) => {
        const total = serie.total_chapitres || 0;
        const lus = Math.min(serie.chapitres_lus || 0, total);
        return acc + lus;
      }, 0);

      const manga_seriesCompletesChapitres = manga_seriesChapitres.filter(serie => {
        const total = serie.total_chapitres || 0;
        if (total === 0) return false;
        const lus = Math.min(serie.chapitres_lus || 0, total);
        return lus >= total;
      }).length;

      const manga_seriesCompletes = manga_seriesCompletesTomes + manga_seriesCompletesChapitres;

      // Derniers manga_tomes lus (les 10 plus récents) - depuis manga_user_data.tome_progress
      const derniersTomesLus = [];
      const userDataWithProgress = db.prepare(`
        SELECT mud.serie_id, mud.tome_progress, s.titre as serie_titre
        FROM manga_user_data mud
        JOIN manga_series s ON mud.serie_id = s.id
        WHERE mud.user_id = ? AND mud.tome_progress IS NOT NULL
      `).all(userId);
      
      for (const userData of userDataWithProgress) {
        const tomeProgress = safeJsonParse(userData.tome_progress, []);
        if (Array.isArray(tomeProgress)) {
          for (const tp of tomeProgress) {
            if (tp.lu === true || tp.lu === 1) {
              const tome = db.prepare('SELECT id, numero, couverture_url FROM manga_tomes WHERE id = ?').get(tp.tome_id);
              if (tome) {
                derniersTomesLus.push({
                  id: tome.id,
                  numero: tome.numero,
                  couverture_url: tome.couverture_url,
                  serie_titre: userData.serie_titre,
                  serie_id: userData.serie_id,
                  date_lecture: tp.date_lecture || null
                });
              }
            }
          }
        }
      }
      
      // Trier par date_lecture décroissante et prendre les 10 premiers
      derniersTomesLus.sort((a, b) => {
        if (!a.date_lecture && !b.date_lecture) return 0;
        if (!a.date_lecture) return 1;
        if (!b.date_lecture) return -1;
        return new Date(b.date_lecture) - new Date(a.date_lecture);
      });
      
      const derniersTomesLusLimited = derniersTomesLus.slice(0, 10);
      
      // Ancienne requête (commentée pour référence)
      /*
      const derniersTomesLus = db.prepare(`
        SELECT t.id, t.numero, t.couverture_url, s.titre as serie_titre, s.id as serie_id, lt.date_lecture
        FROM lecture_manga_tomes lt
        JOIN manga_tomes t ON lt.tome_id = t.id
        JOIN manga_series s ON t.serie_id = s.id
        WHERE lt.user_id = ? AND lt.lu = 1
        ORDER BY lt.date_lecture DESC
        LIMIT 10
      `).all(userId);
      */
      
      // Réassigner pour utiliser la version limitée
      derniersTomesLus.length = 0;
      derniersTomesLus.push(...derniersTomesLusLimited);

      const progressionTomes = manga_tomesTotal > 0
        ? (manga_tomesLus / manga_tomesTotal) * 100
        : null;

      const progressionChapitres = chapitresTotal > 0
        ? (chapitresLus / chapitresTotal) * 100
        : null;

      const progressionSources = [
        progressionTomes,
        progressionChapitres
      ].filter(value => value !== null);

      const progression = progressionSources.length > 0
        ? progressionSources.reduce((sum, value) => sum + (value || 0), 0) / progressionSources.length
        : 0;

      return {
        manga_tomesLus,
        manga_tomesTotal,
        chapitresLus,
        chapitresTotal,
        manga_seriesCompletes,
        manga_seriesTotal,
        progression,
        progressionTomes,
        progressionChapitres,
        derniersTomesLus: derniersTomesLus.map(tome => ({
          id: tome.id,
          serieId: tome.serie_id,
          serieTitre: tome.serie_titre,
          numero: tome.numero,
          couvertureUrl: tome.couverture_url,
          dateLecture: tome.date_lecture
        }))
      };
    } catch (error) {
      console.error('Erreur get-lecture-statistics:', error);
      throw error;
    }
  });

  // Marquer un tome comme lu/non lu
  ipcMain.handle('toggle-tome-lu', (event, tomeId, lu) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      // Récupérer le serie_id du tome
      const tome = db.prepare('SELECT serie_id FROM manga_tomes WHERE id = ?').get(tomeId);
      if (!tome) {
        throw new Error('Tome non trouvé');
      }

      const dateLecture = lu ? new Date().toISOString().replace('T', ' ').replace('Z', '') : null;

      // S'assurer qu'une entrée manga_user_data existe
      const { ensureMangaUserDataRow, clearManualTagOverride, updateAutoCompletionTag } = require('../mangas/manga-helpers');
      const { safeJsonParse } = require('../common-helpers');
      ensureMangaUserDataRow(db, tome.serie_id, userId);
      clearManualTagOverride(db, tome.serie_id, userId);

      // Récupérer tome_progress existant
      const userData = db.prepare('SELECT tome_progress FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(tome.serie_id, userId);
      let tomeProgress = safeJsonParse(userData?.tome_progress, []);
      
      // Trouver ou créer l'entrée pour ce tome
      const existingIndex = tomeProgress.findIndex(tp => tp.tome_id === tomeId);
      if (existingIndex >= 0) {
        // Mettre à jour l'entrée existante
        tomeProgress[existingIndex] = {
          tome_id: tomeId,
          lu: lu ? true : false,
          date_lecture: dateLecture
        };
      } else {
        // Ajouter une nouvelle entrée
        tomeProgress.push({
          tome_id: tomeId,
          lu: lu ? true : false,
          date_lecture: dateLecture
        });
      }

      // Sauvegarder dans manga_user_data
      const tomeProgressJson = JSON.stringify(tomeProgress);
      db.prepare(`
        UPDATE manga_user_data 
        SET tome_progress = ?, updated_at = datetime('now')
        WHERE serie_id = ? AND user_id = ?
      `).run(tomeProgressJson, tome.serie_id, userId);

      // Mettre à jour automatiquement le tag de completion
      updateAutoCompletionTag(db, tome.serie_id, userId);

      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-tome-lu:', error);
      throw error;
    }
  });

  // Marquer un tome comme Mihon/non Mihon
  ipcMain.handle('toggle-tome-mihon', (event, tomeId, mihon) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Mettre à jour directement le champ mihon dans la table manga_tomes
      db.prepare('UPDATE manga_tomes SET mihon = ? WHERE id = ?').run(mihon ? 1 : 0, tomeId);

      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-tome-mihon:', error);
      throw error;
    }
  });

  // Marquer un tome comme possédé/non possédé par l'utilisateur actuel
  ipcMain.handle('toggle-tome-possede', (event, tomeId, possede) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      const tome = db.prepare('SELECT serie_id FROM manga_tomes WHERE id = ?').get(tomeId);
      if (!tome) {
        throw new Error('Tome introuvable');
      }

      if (possede) {
        // Ajouter l'utilisateur comme propriétaire
        db.prepare(`
          INSERT OR IGNORE INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id)
          VALUES (?, ?, ?)
        `).run(tome.serie_id, tomeId, userId);
      } else {
        // Retirer l'utilisateur des propriétaires
        db.prepare(`
          DELETE FROM manga_manga_tomes_proprietaires
          WHERE tome_id = ? AND user_id = ?
        `).run(tomeId, userId);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-tome-possede:', error);
      throw error;
    }
  });

  // Posséder tous les tomes d'une série
  ipcMain.handle('posseder-tous-les-tomes', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      // Récupérer tous les manga_tomes de la série
      const manga_tomes = db.prepare('SELECT id FROM manga_tomes WHERE serie_id = ?').all(serieId);
      
      let manga_tomesUpdated = 0;
      for (const tome of manga_tomes) {
        db.prepare(`
          INSERT OR IGNORE INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id)
          VALUES (?, ?, ?)
        `).run(serieId, tome.id, userId);
        manga_tomesUpdated++;
      }

      return { success: true, manga_tomesUpdated };
    } catch (error) {
      console.error('Erreur posseder-tous-les-manga_tomes:', error);
      throw error;
    }
  });

  // Obtenir les données d'évolution temporelle
  ipcMain.handle('get-evolution-statistics', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // Récupérer tous les manga_tomes avec leur date d'achat
      const manga_tomes = db.prepare(`
        SELECT t.id, t.prix, t.date_achat, s.type_volume
        FROM manga_tomes t
        JOIN manga_series s ON t.serie_id = s.id
        WHERE t.date_achat IS NOT NULL
        ORDER BY t.date_achat ASC
      `).all();

      // Grouper par mois
      const parMois = {};
      const parAnnee = {};

      manga_tomes.forEach(tome => {
        const date = new Date(tome.date_achat);
        const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const annee = date.getFullYear().toString();

        // Par mois
        if (!parMois[mois]) {
          parMois[mois] = { count: 0, total: 0 };
        }
        parMois[mois].count++;
        parMois[mois].total += tome.prix;

        // Par année
        if (!parAnnee[annee]) {
          parAnnee[annee] = { count: 0, total: 0 };
        }
        parAnnee[annee].count++;
        parAnnee[annee].total += tome.prix;
      });

      return {
        parMois,
        parAnnee,
        totalTomes: manga_tomes.length
      };
    } catch (error) {
      console.error('Erreur get-evolution-statistics:', error);
      throw error;
    }
  });

  // Récupérer toutes les progressions récentes (manga_tomes + chapitres + épisodes)
  ipcMain.handle('get-recent-progress', () => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        console.log('⚠️ get-recent-progress: Aucun utilisateur connecté');
        return {
          manga_tomes: [],
          chapitres: [],
          episodes: [],
          movies: [],
          tvShows: []
        };
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        console.log('⚠️ get-recent-progress: Utilisateur non trouvé');
        return {
          manga_tomes: [],
          chapitres: [],
          episodes: [],
          movies: [],
          tvShows: []
        };
      }

      console.log(`📊 get-recent-progress: Chargement pour l'utilisateur "${currentUser}"`);

      // 1. Derniers manga_tomes lus (mangas classiques) - depuis manga_user_data.tome_progress
      const { safeJsonParse } = require('../common-helpers');
      const derniersTomesLus = [];
      const userDataWithProgress = db.prepare(`
        SELECT mud.serie_id, mud.tome_progress, s.titre as serie_titre
        FROM manga_user_data mud
        JOIN manga_series s ON mud.serie_id = s.id
        WHERE mud.user_id = ? AND mud.tome_progress IS NOT NULL
      `).all(userId);
      
      for (const userData of userDataWithProgress) {
        const tomeProgress = safeJsonParse(userData.tome_progress, []);
        if (Array.isArray(tomeProgress)) {
          for (const tp of tomeProgress) {
            if (tp.lu === true || tp.lu === 1) {
              const tome = db.prepare('SELECT id, numero, couverture_url FROM manga_tomes WHERE id = ?').get(tp.tome_id);
              if (tome) {
                derniersTomesLus.push({
                  id: tome.id,
                  numero: tome.numero,
                  couverture_url: tome.couverture_url,
                  serie_titre: userData.serie_titre,
                  serie_id: userData.serie_id,
                  date_lecture: tp.date_lecture || null
                });
              }
            }
          }
        }
      }
      
      // Trier par date_lecture décroissante et prendre les 10 premiers
      derniersTomesLus.sort((a, b) => {
        if (!a.date_lecture && !b.date_lecture) return 0;
        if (!a.date_lecture) return 1;
        if (!b.date_lecture) return -1;
        return new Date(b.date_lecture) - new Date(a.date_lecture);
      });
      
      const derniersTomesLusLimited = derniersTomesLus.slice(0, 10);
      
      console.log(`  ✅ ${derniersTomesLusLimited.length} manga_tomes lus récents`);

      // 2. Dernières progressions de chapitres (scans/manhwa + mangas MAL)
      // Note: chapitres_lus est global (pas par utilisateur) car stocké dans la table manga_series
      const dernieresProgressionsChapitres = db.prepare(`
        SELECT 
          s.id as serie_id,
          s.titre as serie_titre,
          s.couverture_url,
          s.chapitres_lus,
          s.nb_chapitres,
          s.updated_at as date_progression
        FROM manga_series s
        WHERE (s.type_contenu = 'chapitre' OR s.mal_id IS NOT NULL)
          AND s.chapitres_lus > 0
        ORDER BY s.updated_at DESC
        LIMIT 10
      `).all();
      
      console.log(`  ✅ ${dernieresProgressionsChapitres.length} progressions chapitres/mangas MAL`);

      // 3. Dernières progressions d'épisodes (animes)
      const dernieresProgressionsEpisodes = db.prepare(`
        SELECT 
          a.id as anime_id,
          a.titre as anime_titre,
          a.couverture_url,
          COALESCE(aud.episodes_vus, 0) as episodes_vus,
          a.nb_episodes,
          (SELECT MAX(json_extract(value, '$.date_visionnage')) 
           FROM json_each(aud.episode_progress)
           WHERE json_extract(value, '$.vu') = 1) as date_progression
        FROM anime_series a
        INNER JOIN anime_user_data aud ON a.id = aud.anime_id AND aud.user_id = ?
        WHERE aud.episodes_vus > 0
        ORDER BY date_progression DESC
        LIMIT 10
      `).all(userId);
      
      console.log(`  ✅ ${dernieresProgressionsEpisodes.length} progressions épisodes animes`);

      // 4. Derniers films vus ou en cours
      const filmsRecents = db.prepare(`
        SELECT
          m.id AS movie_id,
          m.tmdb_id AS tmdb_id,
          m.titre AS movie_titre,
          m.poster_path,
          mud.statut_visionnage,
          mud.date_visionnage,
          mud.updated_at AS date_modification
        FROM movie_user_data mud
        JOIN movies m ON m.id = mud.movie_id
        WHERE mud.user_id = ?
          AND (
            mud.date_visionnage IS NOT NULL
            OR mud.statut_visionnage IN ('En cours', 'Terminé', 'En pause', 'Abandonné')
          )
        ORDER BY COALESCE(mud.date_visionnage, mud.updated_at, m.updated_at) DESC
        LIMIT 10
      `).all(userId);

      console.log(`  ✅ ${filmsRecents.length} films visionnés récemment`);

      // 5. Progressions sur les séries TV
      const manga_seriesTvRecents = db.prepare(`
        SELECT
          s.id AS show_id,
          s.tmdb_id AS tmdb_id,
          s.titre AS show_titre,
          s.poster_path,
          tud.episodes_vus,
          COALESCE(
            s.nb_episodes,
            (SELECT COUNT(*) FROM tv_episodes e WHERE e.show_id = s.id)
          ) AS nb_episodes,
          tud.updated_at AS date_progression,
          tud.statut_visionnage
        FROM tv_show_user_data tud
        JOIN tv_shows s ON s.id = tud.show_id
        WHERE tud.user_id = ?
          AND tud.episodes_vus > 0
        ORDER BY tud.updated_at DESC
        LIMIT 10
      `).all(userId);

      console.log(`  ✅ ${manga_seriesTvRecents.length} progressions séries TV`);
      
      const totalItems = derniersTomesLus.length + dernieresProgressionsChapitres.length + dernieresProgressionsEpisodes.length + filmsRecents.length + manga_seriesTvRecents.length;
      console.log(`  📊 Total: ${totalItems} éléments de progression récente`);

      return {
        manga_tomes: derniersTomesLus.map(tome => ({
          type: 'tome',
          id: tome.id,
          serieId: tome.serie_id,
          serieTitre: tome.serie_titre,
          numero: tome.numero,
          couvertureUrl: tome.couverture_url,
          dateProgression: tome.date_lecture
        })),
        chapitres: dernieresProgressionsChapitres.map(serie => ({
          type: 'chapitre',
          serieId: serie.serie_id,
          serieTitre: serie.serie_titre,
          couvertureUrl: serie.couverture_url,
          chapitresLus: serie.chapitres_lus,
          nbChapitres: serie.nb_chapitres,
          dateProgression: serie.date_progression
        })),
        episodes: dernieresProgressionsEpisodes.map(anime => ({
          type: 'episode',
          animeId: anime.anime_id,
          animeTitre: anime.anime_titre,
          couvertureUrl: anime.couverture_url,
          episodesVus: anime.episodes_vus,
          nbEpisodes: anime.nb_episodes,
          dateProgression: anime.date_progression
        })),
        movies: filmsRecents.map((movie) => ({
          type: 'movie',
          movieId: movie.movie_id,
          movieTitre: movie.movie_titre,
          posterPath: movie.poster_path,
          statutVisionnage: movie.statut_visionnage,
          dateProgression: movie.date_visionnage || movie.date_modification,
          dateVisionnage: movie.date_visionnage,
          tmdbId: movie.tmdb_id
        })),
        tvShows: manga_seriesTvRecents.map((show) => ({
          type: 'tv',
          showId: show.show_id,
          showTitre: show.show_titre,
          posterPath: show.poster_path,
          episodesVus: show.episodes_vus,
          nbEpisodes: show.nb_episodes,
          statutVisionnage: show.statut_visionnage,
          dateProgression: show.date_progression,
          tmdbId: show.tmdb_id
        }))
      };
    } catch (error) {
      console.error('Erreur get-recent-progress:', error);
      throw error;
    }
  });

  // Marquer toute une série comme lue
  ipcMain.handle('marquer-serie-lue', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        throw new Error('Utilisateur non trouvé');
      }

      // S'assurer qu'une entrée manga_user_data existe
      const { ensureMangaUserDataRow, clearManualTagOverride, updateAutoCompletionTag } = require('../mangas/manga-helpers');
      const { safeJsonParse } = require('../common-helpers');
      ensureMangaUserDataRow(db, serieId, userId);

      // Récupérer tous les manga_tomes de la série, triés par numéro
      const manga_tomes = db.prepare('SELECT id FROM manga_tomes WHERE serie_id = ? ORDER BY numero ASC').all(serieId);
      
      // Récupérer tome_progress existant
      const userData = db.prepare('SELECT tome_progress FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(serieId, userId);
      let tomeProgress = safeJsonParse(userData?.tome_progress, []);
      
      // Marquer tous les manga_tomes comme lus avec des timestamps espacés de quelques secondes
      // pour conserver l'ordre chronologique (1 seconde entre chaque tome)
      const baseDate = new Date();
      manga_tomes.forEach((tome, index) => {
        const dateLecture = new Date(baseDate.getTime() + (index * 1000)); // +1 seconde par tome
        const dateLectureStr = dateLecture.toISOString().replace('T', ' ').replace('Z', '');
        
        // Trouver ou créer l'entrée pour ce tome
        const existingIndex = tomeProgress.findIndex(tp => tp.tome_id === tome.id);
        if (existingIndex >= 0) {
          // Mettre à jour l'entrée existante
          tomeProgress[existingIndex] = {
            tome_id: tome.id,
            lu: true,
            date_lecture: dateLectureStr
          };
        } else {
          // Ajouter une nouvelle entrée
          tomeProgress.push({
            tome_id: tome.id,
            lu: true,
            date_lecture: dateLectureStr
          });
        }
      });

      // Sauvegarder dans manga_user_data
      const tomeProgressJson = JSON.stringify(tomeProgress);
      db.prepare(`
        UPDATE manga_user_data 
        SET tome_progress = ?, updated_at = datetime('now')
        WHERE serie_id = ? AND user_id = ?
      `).run(tomeProgressJson, serieId, userId);

      clearManualTagOverride(db, serieId, userId);
      updateAutoCompletionTag(db, serieId, userId);

      return { success: true, manga_tomesMarques: manga_tomes.length };
    } catch (error) {
      console.error('Erreur marquer-serie-lue:', error);
      throw error;
    }
  });
}

module.exports = { registerStatisticsHandlers };
