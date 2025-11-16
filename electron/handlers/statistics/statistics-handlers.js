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
        parType: {},
        parStatut: {},
        nbSeries: 0,
        nbTomes: 0,
        nbTomesParProprietaire: {},
        nbTomesParProprietaireParType: {}, // Nouveau : nombre de tomes par type par propriétaire
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

      // Calcul dynamique des coûts et tomes par propriétaire
      const tomes = db.prepare(`
        SELECT t.id, t.prix, s.type_volume 
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
      `).all();
      
      tomes.forEach(tome => {
        // Récupérer les propriétaires de ce tome
        const proprietaires = db.prepare(`
          SELECT user_id FROM tomes_proprietaires WHERE tome_id = ?
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

      // Nombre de tomes par type
      const parType = db.prepare(`
        SELECT s.type_volume, COUNT(t.id) as count, SUM(t.prix) as total
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
        GROUP BY s.type_volume
      `).all();
      
      parType.forEach(row => {
        stats.parType[row.type_volume] = {
          count: row.count,
          total: row.total
        };
      });

      // Nombre de séries par statut
      const parStatut = db.prepare('SELECT statut, COUNT(*) as count FROM series GROUP BY statut').all();
      parStatut.forEach(row => {
        stats.parStatut[row.statut] = row.count;
      });

      // Totaux généraux
      stats.nbSeries = db.prepare('SELECT COUNT(*) as count FROM series').get().count;
      stats.nbTomes = db.prepare('SELECT COUNT(*) as count FROM tomes').get().count;

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
          tomesLus: 0,
          tomesTotal: 0,
          chapitresLus: 0,
          chapitresTotal: 0,
          seriesCompletes: 0,
          seriesTotal: 0,
          progression: 0,
          derniersTomesLus: []
        };
      }

      const { getUserIdByName } = require('../common-helpers');
      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { error: 'Utilisateur non trouvé' };
      }

      // Nombre total de tomes (collection globale)
      const tomesTotal = db.prepare('SELECT COUNT(*) as count FROM tomes').get().count;

      // Nombre de tomes lus par l'utilisateur
      const tomesLus = db.prepare(`
        SELECT COUNT(*) as count 
        FROM lecture_tomes 
        WHERE user_id = ? AND lu = 1
      `).get(userId).count;

      // Séries suivies par l'utilisateur (statut ou tomes possédés)
      const seriesTotal = db.prepare(`
        SELECT COUNT(*) as count
        FROM series s
        WHERE EXISTS (
          SELECT 1 FROM serie_statut_utilisateur ssu
          WHERE ssu.serie_id = s.id AND ssu.user_id = ?
        )
        OR EXISTS (
          SELECT 1 
          FROM tomes t
          JOIN tomes_proprietaires tp ON tp.tome_id = t.id
          WHERE t.serie_id = s.id AND tp.user_id = ?
        )
      `).get(userId, userId).count;

      // Séries complètes basées sur les tomes
      const seriesCompletesTomes = db.prepare(`
        SELECT COUNT(DISTINCT s.id) as count
        FROM series s
        WHERE (
          SELECT COUNT(*) 
          FROM tomes t 
          WHERE t.serie_id = s.id
        ) = (
          SELECT COUNT(*) 
          FROM tomes t 
          LEFT JOIN lecture_tomes lt ON t.id = lt.tome_id AND lt.user_id = ?
          WHERE t.serie_id = s.id AND lt.lu = 1
        )
        AND (SELECT COUNT(*) FROM tomes WHERE serie_id = s.id) > 0
      `).get(userId).count;

      // Séries à chapitres (sans tomes)
      const seriesChapitres = db.prepare(`
        SELECT 
          s.id,
          s.nb_chapitres as total_chapitres,
          COALESCE(ssu.chapitres_lus, s.chapitres_lus, 0) as chapitres_lus
        FROM series s
        LEFT JOIN serie_statut_utilisateur ssu ON s.id = ssu.serie_id AND ssu.user_id = ?
        WHERE (SELECT COUNT(*) FROM tomes WHERE serie_id = s.id) = 0
          AND s.nb_chapitres IS NOT NULL
          AND s.nb_chapitres > 0
          AND (
            ssu.user_id IS NOT NULL
            OR COALESCE(s.chapitres_lus, 0) > 0
          )
      `).all(userId);

      const chapitresTotal = seriesChapitres.reduce((acc, serie) => acc + (serie.total_chapitres || 0), 0);
      const chapitresLus = seriesChapitres.reduce((acc, serie) => {
        const total = serie.total_chapitres || 0;
        const lus = Math.min(serie.chapitres_lus || 0, total);
        return acc + lus;
      }, 0);

      const seriesCompletesChapitres = seriesChapitres.filter(serie => {
        const total = serie.total_chapitres || 0;
        if (total === 0) return false;
        const lus = Math.min(serie.chapitres_lus || 0, total);
        return lus >= total;
      }).length;

      const seriesCompletes = seriesCompletesTomes + seriesCompletesChapitres;

      // Derniers tomes lus (les 10 plus récents)
      const derniersTomesLus = db.prepare(`
        SELECT t.id, t.numero, t.couverture_url, s.titre as serie_titre, s.id as serie_id, lt.date_lecture
        FROM lecture_tomes lt
        JOIN tomes t ON lt.tome_id = t.id
        JOIN series s ON t.serie_id = s.id
        WHERE lt.user_id = ? AND lt.lu = 1
        ORDER BY lt.date_lecture DESC
        LIMIT 10
      `).all(userId);

      const progressionTomes = tomesTotal > 0
        ? (tomesLus / tomesTotal) * 100
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
        tomesLus,
        tomesTotal,
        chapitresLus,
        chapitresTotal,
        seriesCompletes,
        seriesTotal,
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
      const tome = db.prepare('SELECT serie_id FROM tomes WHERE id = ?').get(tomeId);
      if (!tome) {
        throw new Error('Tome non trouvé');
      }

      const dateLecture = lu ? new Date().toISOString().replace('T', ' ').replace('Z', '') : null;

      // Utiliser INSERT OR REPLACE pour gérer l'insertion ou la mise à jour
      db.prepare(`
        INSERT INTO lecture_tomes (tome_id, user_id, lu, date_lecture)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tome_id, user_id) 
        DO UPDATE SET lu = ?, date_lecture = ?
      `).run(tomeId, userId, lu ? 1 : 0, dateLecture, lu ? 1 : 0, dateLecture);

      // Mettre à jour automatiquement le tag de completion
      const { updateAutoCompletionTag } = require('../mangas/manga-helpers');
      updateAutoCompletionTag(db, tome.serie_id, userId);

      return { success: true };
    } catch (error) {
      console.error('Erreur toggle-tome-lu:', error);
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

      if (possede) {
        // Ajouter l'utilisateur comme propriétaire
        db.prepare(`
          INSERT OR IGNORE INTO tomes_proprietaires (tome_id, user_id)
          VALUES (?, ?)
        `).run(tomeId, userId);
      } else {
        // Retirer l'utilisateur des propriétaires
        db.prepare(`
          DELETE FROM tomes_proprietaires
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

      // Récupérer tous les tomes de la série
      const tomes = db.prepare('SELECT id FROM tomes WHERE serie_id = ?').all(serieId);
      
      // Ajouter l'utilisateur comme propriétaire de tous les tomes
      const insertProprietaire = db.prepare(`
        INSERT OR IGNORE INTO tomes_proprietaires (tome_id, user_id)
        VALUES (?, ?)
      `);

      let tomesUpdated = 0;
      for (const tome of tomes) {
        insertProprietaire.run(tome.id, userId);
        tomesUpdated++;
      }

      return { success: true, tomesUpdated };
    } catch (error) {
      console.error('Erreur posseder-tous-les-tomes:', error);
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

      // Récupérer tous les tomes avec leur date d'achat
      const tomes = db.prepare(`
        SELECT t.id, t.prix, t.date_achat, s.type_volume
        FROM tomes t
        JOIN series s ON t.serie_id = s.id
        WHERE t.date_achat IS NOT NULL
        ORDER BY t.date_achat ASC
      `).all();

      // Grouper par mois
      const parMois = {};
      const parAnnee = {};

      tomes.forEach(tome => {
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
        totalTomes: tomes.length
      };
    } catch (error) {
      console.error('Erreur get-evolution-statistics:', error);
      throw error;
    }
  });

  // Récupérer toutes les progressions récentes (tomes + chapitres + épisodes)
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
          tomes: [],
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
          tomes: [],
          chapitres: [],
          episodes: [],
          movies: [],
          tvShows: []
        };
      }

      console.log(`📊 get-recent-progress: Chargement pour l'utilisateur "${currentUser}"`);

      // 1. Derniers tomes lus (mangas classiques)
      const derniersTomesLus = db.prepare(`
        SELECT t.id, t.numero, t.couverture_url, s.titre as serie_titre, s.id as serie_id, lt.date_lecture
        FROM lecture_tomes lt
        JOIN tomes t ON lt.tome_id = t.id
        JOIN series s ON t.serie_id = s.id
        WHERE lt.user_id = ? AND lt.lu = 1
        ORDER BY lt.date_lecture DESC
        LIMIT 10
      `).all(userId);
      
      console.log(`  ✅ ${derniersTomesLus.length} tomes lus récents`);

      // 2. Dernières progressions de chapitres (scans/manhwa + mangas MAL)
      // Note: chapitres_lus est global (pas par utilisateur) car stocké dans la table series
      const dernieresProgressionsChapitres = db.prepare(`
        SELECT 
          s.id as serie_id,
          s.titre as serie_titre,
          s.couverture_url,
          s.chapitres_lus,
          s.nb_chapitres,
          s.updated_at as date_progression
        FROM series s
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
          (SELECT COUNT(*) FROM anime_episodes_vus aev 
           WHERE aev.anime_id = a.id 
           AND aev.user_id = ? 
           AND aev.vu = 1) as episodes_vus,
          a.nb_episodes,
          (SELECT MAX(aev2.date_visionnage) FROM anime_episodes_vus aev2 
           WHERE aev2.anime_id = a.id 
           AND aev2.user_id = ? 
           AND aev2.vu = 1) as date_progression
        FROM anime_series a
        WHERE (SELECT COUNT(*) FROM anime_episodes_vus aev 
               WHERE aev.anime_id = a.id 
               AND aev.user_id = ? 
               AND aev.vu = 1) > 0
        ORDER BY date_progression DESC
        LIMIT 10
      `).all(userId, userId, userId);
      
      console.log(`  ✅ ${dernieresProgressionsEpisodes.length} progressions épisodes animes`);

      // 4. Derniers films vus ou en cours
      const filmsRecents = db.prepare(`
        SELECT
          m.id AS movie_id,
          m.tmdb_id AS tmdb_id,
          m.titre AS movie_titre,
          m.poster_path,
          mus.statut_visionnage,
          mus.date_visionnage,
          mus.date_modification
        FROM movie_user_status mus
        JOIN movies m ON m.id = mus.movie_id
        WHERE mus.user_id = ?
          AND (
            mus.date_visionnage IS NOT NULL
            OR mus.statut_visionnage IN ('En cours', 'Terminé', 'En pause', 'Abandonné')
          )
        ORDER BY COALESCE(mus.date_visionnage, mus.date_modification, m.updated_at) DESC
        LIMIT 10
      `).all(userId);

      console.log(`  ✅ ${filmsRecents.length} films visionnés récemment`);

      // 5. Progressions sur les séries TV
      const seriesTvRecents = db.prepare(`
        SELECT
          s.id AS show_id,
          s.tmdb_id AS tmdb_id,
          s.titre AS show_titre,
          s.poster_path,
          tus.episodes_vus,
          COALESCE(
            s.nb_episodes,
            (SELECT COUNT(*) FROM tv_episodes e WHERE e.show_id = s.id)
          ) AS nb_episodes,
          tus.date_modification AS date_progression,
          tus.statut_visionnage
        FROM tv_show_user_status tus
        JOIN tv_shows s ON s.id = tus.show_id
        WHERE tus.user_id = ?
          AND tus.episodes_vus > 0
        ORDER BY tus.date_modification DESC
        LIMIT 10
      `).all(userId);

      console.log(`  ✅ ${seriesTvRecents.length} progressions séries TV`);
      
      const totalItems = derniersTomesLus.length + dernieresProgressionsChapitres.length + dernieresProgressionsEpisodes.length + filmsRecents.length + seriesTvRecents.length;
      console.log(`  📊 Total: ${totalItems} éléments de progression récente`);

      return {
        tomes: derniersTomesLus.map(tome => ({
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
        tvShows: seriesTvRecents.map((show) => ({
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

      // Récupérer tous les tomes de la série, triés par numéro
      const tomes = db.prepare('SELECT id FROM tomes WHERE serie_id = ? ORDER BY numero ASC').all(serieId);
      
      // Marquer tous les tomes comme lus avec des timestamps espacés de quelques secondes
      // pour conserver l'ordre chronologique (1 seconde entre chaque tome)
      const stmt = db.prepare(`
        INSERT INTO lecture_tomes (tome_id, user_id, lu, date_lecture)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(tome_id, user_id) 
        DO UPDATE SET lu = 1, date_lecture = ?
      `);

      const baseDate = new Date();
      tomes.forEach((tome, index) => {
        const dateLecture = new Date(baseDate.getTime() + (index * 1000)); // +1 seconde par tome
        const dateLectureStr = dateLecture.toISOString().replace('T', ' ').replace('Z', '');
        stmt.run(tome.id, userId, dateLectureStr, dateLectureStr);
      });


      return { success: true, tomesMarques: tomes.length };
    } catch (error) {
      console.error('Erreur marquer-serie-lue:', error);
      throw error;
    }
  });
}

module.exports = { registerStatisticsHandlers };
