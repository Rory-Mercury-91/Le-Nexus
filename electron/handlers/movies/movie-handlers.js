const { syncMovieFromTmdb } = require('../../services/movies/movie-sync-service');
const { searchMovies } = require('../../apis/tmdb');
const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { createToggleFavoriteHandler, createToggleHiddenHandler, createSetStatusHandler } = require('../common/item-action-helpers');

function ensureMovieUserDataRow(db, movieId, userId) {
  const existing = db.prepare('SELECT id FROM movie_user_data WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO movie_user_data (movie_id, user_id, statut_visionnage, score, date_visionnage, is_favorite, is_hidden, user_images, user_videos, notes_privees, display_preferences, created_at, updated_at)
      VALUES (?, ?, 'À regarder', NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, datetime('now'), datetime('now'))
    `).run(movieId, userId);
  }
}

function registerMovieHandlers(ipcMain, getDb, store) {
  ipcMain.handle('movies-sync-from-tmdb', async (event, { tmdbId, autoTranslate = true }) => {
    if (!tmdbId) {
      throw new Error('tmdbId est requis');
    }

    const db = getDb();
    const language = store.get('tmdb.language', 'fr-FR');
    const region = store.get('tmdb.region', 'FR');
    const autoTranslateSetting = store.get('media.autoTranslate', true);

    return await syncMovieFromTmdb({
      tmdbId,
      db,
      store,
      language,
      region,
      enableTranslation: autoTranslate ?? autoTranslateSetting
    });
  });

  ipcMain.handle('movies-search-tmdb', async (event, { query, page = 1 } = {}) => {
    const searchTerm = (query || '').trim();
    if (!searchTerm) {
      return { results: [], totalResults: 0, totalPages: 0, page: 1 };
    }

    try {
      const apiKey = store.get('tmdb.apiKey', process.env.TMDB_API_KEY || '');
      const apiToken = store.get('tmdb.apiToken', process.env.TMDB_API_TOKEN || '');
      const language = store.get('tmdb.language', 'fr-FR');
      const region = store.get('tmdb.region', 'FR');
      const db = getDb();

      const response = await searchMovies(searchTerm, {
        apiKey,
        apiToken,
        language,
        region,
        page
      });

      const findExistingStmt = db.prepare('SELECT id FROM movies WHERE tmdb_id = ? LIMIT 1');

      const results = (response?.results || []).map((item) => {
        const existing = findExistingStmt.get(item.id);
        return {
          tmdbId: item.id,
          title: item.title || item.name || item.original_title || 'Sans titre',
          originalTitle: item.original_title || null,
          releaseDate: item.release_date || null,
          overview: item.overview || '',
          posterPath: item.poster_path || null,
          voteAverage: typeof item.vote_average === 'number' ? item.vote_average : null,
          inLibrary: Boolean(existing)
        };
      });

      return {
        results,
        totalResults: response?.total_results ?? results.length,
        totalPages: response?.total_pages ?? 1,
        page: response?.page ?? page
      };
    } catch (error) {
      console.error('[TMDb] movies-search error:', error);
      throw new Error(error?.message || 'Impossible de rechercher sur TMDb.');
    }
  });

  ipcMain.handle('movies-get', (event, filters = {}) => {
    const db = getDb();
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;

    const {
      search,
      orderBy = 'date_sortie',
      sort = 'DESC',
      limit = filters.limit ?? 500,
      offset = filters.offset ?? 0
    } = filters;

    const clauses = [];
    const params = [userId || -1];

    if (search) {
      clauses.push('(LOWER(titre) LIKE ? OR LOWER(titre_original) LIKE ? OR tmdb_id = ?)');
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, Number.isNaN(Number(search)) ? -1 : Number(search));
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    
    // Mapping sécurisé des colonnes ORDER BY pour éviter l'injection SQL
    const orderColumnMap = {
      'date_sortie': 'm.date_sortie',
      'note_moyenne': 'm.note_moyenne',
      'popularite': 'm.popularite',
      'created_at': 'm.created_at'
    };
    const sortDirectionMap = {
      'ASC': 'ASC',
      'DESC': 'DESC'
    };
    
    const safeOrderColumn = orderColumnMap[orderBy] || orderColumnMap['date_sortie'];
    const safeSortDirection = sortDirectionMap[sort] || 'DESC';

    const stmt = db.prepare(`
      SELECT
        m.*,
        mud.statut_visionnage,
        mud.score,
        mud.date_visionnage,
        COALESCE(mud.is_favorite, 0) AS is_favorite,
        COALESCE(mud.is_hidden, 0) AS is_hidden,
        mud.notes_privees,
        mud.user_images,
        mud.user_videos,
        mud.display_preferences
      FROM movies m
      LEFT JOIN movie_user_data mud ON m.id = mud.movie_id AND mud.user_id = ?
      ${where}
      ORDER BY ${safeOrderColumn} ${safeSortDirection}
      LIMIT ?
      OFFSET ?
    `);

    return stmt.all(...params, limit, offset).map((movie) => ({
      ...movie,
      genres: safeJsonParse(movie.genres, []),
      is_favorite: Boolean(movie.is_favorite),
      is_hidden: Boolean(movie.is_hidden),
      user_images: safeJsonParse(movie.user_images, []),
      user_videos: safeJsonParse(movie.user_videos, []),
      display_preferences: safeJsonParse(movie.display_preferences, {})
    }));
  });

  ipcMain.handle('movies-get-detail', (event, { movieId, tmdbId }) => {
    const db = getDb();
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;
    let row;
    if (movieId) {
      row = db.prepare(`
        SELECT
          m.*,
          mud.statut_visionnage,
          mud.score,
          mud.date_visionnage,
          COALESCE(mud.is_favorite, 0) AS is_favorite,
          COALESCE(mud.is_hidden, 0) AS is_hidden,
          mud.notes_privees,
          mud.user_images,
          mud.user_videos,
          mud.display_preferences
        FROM movies m
        LEFT JOIN movie_user_data mud ON m.id = mud.movie_id AND mud.user_id = ?
        WHERE m.id = ?
      `).get(userId || -1, movieId);
    } else if (tmdbId) {
      row = db.prepare(`
        SELECT
          m.*,
          mud.statut_visionnage,
          mud.score,
          mud.date_visionnage,
          COALESCE(mud.is_favorite, 0) AS is_favorite,
          COALESCE(mud.is_hidden, 0) AS is_hidden,
          mud.notes_privees,
          mud.user_images,
          mud.user_videos,
          mud.display_preferences
        FROM movies m
        LEFT JOIN movie_user_data mud ON m.id = mud.movie_id AND mud.user_id = ?
        WHERE m.tmdb_id = ?
      `).get(userId || -1, tmdbId);
    }

    if (!row) {
      return null;
    }

    return {
      ...row,
      genres: safeJsonParse(row.genres, []),
      mots_cles: safeJsonParse(row.mots_cles, []),
      langues_parlees: safeJsonParse(row.langues_parlees, []),
      compagnies: safeJsonParse(row.compagnies, []),
      pays_production: safeJsonParse(row.pays_production, []),
      videos: safeJsonParse(row.videos, null),
      images: safeJsonParse(row.images, null),
      fournisseurs: safeJsonParse(row.fournisseurs, null),
      ids_externes: safeJsonParse(row.ids_externes, null),
      traductions: safeJsonParse(row.traductions, null),
      donnees_brutes: safeJsonParse(row.donnees_brutes, null),
      is_favorite: Boolean(row.is_favorite),
      is_hidden: Boolean(row.is_hidden),
      user_images: safeJsonParse(row.user_images, []),
      user_videos: safeJsonParse(row.user_videos, []),
      display_preferences: safeJsonParse(row.display_preferences, {})
    };
  });

  // Handlers génériques pour les actions communes
  ipcMain.handle('movies-set-status', createSetStatusHandler({
    getDb,
    store,
    itemIdParamName: 'movieId',
    statusTableName: 'movie_user_data',
    itemIdColumnName: 'movie_id',
    ensureStatusRowFn: ensureMovieUserDataRow,
    buildUpdateQuery: (tableName, itemIdColumnName) => `
      UPDATE ${tableName}
      SET
        statut_visionnage = ?,
        score = ?,
        date_visionnage = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `,
    buildUpdateParams: (params, itemId, userId) => [
      params.statut || 'À regarder',
      params.score ?? null,
      params.dateVisionnage || null,
      itemId,
      userId
    ]
  }));

  ipcMain.handle('movies-toggle-favorite', createToggleFavoriteHandler({
    getDb,
    store,
    itemIdParamName: 'movieId',
    statusTableName: 'movie_user_data',
    itemIdColumnName: 'movie_id',
    ensureStatusRowFn: ensureMovieUserDataRow
  }));

  ipcMain.handle('movies-toggle-hidden', createToggleHiddenHandler({
    getDb,
    store,
    itemIdParamName: 'movieId',
    statusTableName: 'movie_user_data',
    itemIdColumnName: 'movie_id',
    ensureStatusRowFn: ensureMovieUserDataRow
  }));

  // Créer un film manuellement
  ipcMain.handle('create-movie', (event, movieData) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Utiliser le tmdb_id fourni, sinon générer un tmdb_id négatif unique pour les films manuels
      let newTmdbId;
      if (movieData.tmdb_id && movieData.tmdb_id > 0) {
        // Si un tmdb_id positif est fourni, l'utiliser (vient de TMDB)
        newTmdbId = movieData.tmdb_id;
      } else {
        // Sinon, générer un ID négatif unique pour les films manuels
        const existingMax = db.prepare('SELECT MIN(tmdb_id) as min_id FROM movies WHERE tmdb_id < 0').get();
        newTmdbId = existingMax?.min_id ? existingMax.min_id - 1 : -1;
      }

      const toJson = (value) => {
        if (value === undefined || value === null) return null;
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      };

      // Vérifier si le film existe déjà avec ce tmdb_id
      const existingMovie = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(newTmdbId);
      if (existingMovie) {
        // Si le film existe déjà, utiliser son ID
        const movieId = existingMovie.id;
        const currentUser = store.get('currentUser', '');
        if (currentUser) {
          const userId = getUserIdByName(db, currentUser);
          if (userId) {
            ensureMovieUserDataRow(db, movieId, userId);
          }
        }
        return { success: true, movieId, alreadyExists: true };
      }

      const insertStmt = db.prepare(`
        INSERT INTO movies (
          tmdb_id, titre, titre_original, synopsis, statut, date_sortie, duree,
          note_moyenne, popularite, genres, poster_path, backdrop_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Normaliser la popularité (remplacer virgule par point si nécessaire)
      let popularite = movieData.popularite;
      if (popularite != null && typeof popularite === 'string') {
        popularite = parseFloat(popularite.replace(',', '.')) || null;
      }

      const result = insertStmt.run(
        newTmdbId,
        movieData.titre || '',
        movieData.titre_original || null,
        movieData.synopsis || null,
        movieData.statut || null,
        movieData.date_sortie || null,
        movieData.duree || null,
        movieData.note_moyenne || null,
        popularite,
        toJson(movieData.genres || []),
        movieData.poster_path || null,
        movieData.backdrop_path || null
      );

      // Vérifier si l'insertion a réussi
      if (result.changes === 0) {
        // L'insertion a échoué, probablement à cause d'une contrainte UNIQUE
        // Vérifier à nouveau si le film existe maintenant
        const existingMovie = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(newTmdbId);
        if (existingMovie) {
          const movieId = existingMovie.id;
          const currentUser = store.get('currentUser', '');
          if (currentUser) {
            const userId = getUserIdByName(db, currentUser);
            if (userId) {
              ensureMovieUserDataRow(db, movieId, userId);
            }
          }
          return { success: true, movieId, alreadyExists: true };
        }
        throw new Error('Échec de la création du film : aucune ligne insérée');
      }

      const movieId = result.lastInsertRowid;
      if (!movieId || movieId === 0) {
        throw new Error('Échec de la création du film : aucun ID retourné');
      }
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          ensureMovieUserDataRow(db, movieId, userId);
        }
      }

      return { success: true, movieId };
    } catch (error) {
      console.error('❌ Erreur create-movie:', error);
      return { success: false, error: error.message };
    }
  });

  // Mettre à jour un film manuellement
  ipcMain.handle('update-movie', (event, { movieId, movieData }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const toJson = (value) => {
        if (value === undefined || value === null) return null;
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      };

      // Normaliser la popularité (remplacer virgule par point si nécessaire)
      let popularite = movieData.popularite;
      if (popularite != null && typeof popularite === 'string') {
        popularite = parseFloat(popularite.replace(',', '.')) || null;
      }

      const updateStmt = db.prepare(`
        UPDATE movies SET
          titre = ?,
          titre_original = ?,
          synopsis = ?,
          statut = ?,
          date_sortie = ?,
          duree = ?,
          note_moyenne = ?,
          popularite = ?,
          genres = ?,
          poster_path = ?,
          backdrop_path = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      updateStmt.run(
        movieData.titre || '',
        movieData.titre_original || null,
        movieData.synopsis || null,
        movieData.statut || null,
        movieData.date_sortie || null,
        movieData.duree || null,
        movieData.note_moyenne || null,
        popularite,
        toJson(movieData.genres || []),
        movieData.poster_path || null,
        movieData.backdrop_path || null,
        movieId
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur update-movie:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer un film
  ipcMain.handle('delete-movie', (event, movieId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier que le film existe
      const movie = db.prepare('SELECT id, titre FROM movies WHERE id = ?').get(movieId);
      if (!movie) {
        return { success: false, error: 'Film introuvable' };
      }

      // Supprimer le film (cascade supprimera les données utilisateur via FOREIGN KEY)
      db.prepare('DELETE FROM movies WHERE id = ?').run(movieId);

      console.log(`✅ Film supprimé (ID: ${movieId}, Titre: ${movie.titre})`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur delete-movie:', error);
      return { success: false, error: error.message };
    }
  });
}

const { registerMovieGalleryHandlers } = require('./movie-gallery-handlers');
const { registerMovieVideoHandlers } = require('./movie-video-handlers');

function registerAllMovieHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  registerMovieHandlers(ipcMain, getDb, store);
  registerMovieGalleryHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
  registerMovieVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
}

module.exports = {
  registerMovieHandlers,
  registerAllMovieHandlers
};
