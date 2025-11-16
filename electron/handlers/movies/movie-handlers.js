const { syncMovieFromTmdb } = require('../../services/movies/movie-sync-service');
const { searchMovies } = require('../../apis/tmdb');
const { getUserIdByName } = require('../common-helpers');

function ensureMovieStatusRow(db, movieId, userId) {
  const existing = db.prepare('SELECT movie_id FROM movie_user_status WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO movie_user_status (movie_id, user_id, statut_visionnage, score, date_visionnage, is_favorite, is_hidden)
      VALUES (?, ?, 'À regarder', NULL, NULL, 0, 0)
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
    const orderColumn = ['date_sortie', 'note_moyenne', 'popularite', 'created_at'].includes(orderBy) ? orderBy : 'date_sortie';
    const sortDirection = sort === 'ASC' ? 'ASC' : 'DESC';

    const stmt = db.prepare(`
      SELECT
        m.*,
        mus.statut_visionnage,
        mus.score,
        mus.date_visionnage,
        COALESCE(mus.is_favorite, 0) AS is_favorite,
        COALESCE(mus.is_hidden, 0) AS is_hidden
      FROM movies m
      LEFT JOIN movie_user_status mus ON m.id = mus.movie_id AND mus.user_id = ?
      ${where}
      ORDER BY ${orderColumn} ${sortDirection}
      LIMIT ?
      OFFSET ?
    `);

    return stmt.all(...params, limit, offset).map((movie) => ({
      ...movie,
      genres: movie.genres ? JSON.parse(movie.genres) : [],
      is_favorite: Boolean(movie.is_favorite),
      is_hidden: Boolean(movie.is_hidden)
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
          mus.statut_visionnage,
          mus.score,
          mus.date_visionnage,
          COALESCE(mus.is_favorite, 0) AS is_favorite,
          COALESCE(mus.is_hidden, 0) AS is_hidden
        FROM movies m
        LEFT JOIN movie_user_status mus ON m.id = mus.movie_id AND mus.user_id = ?
        WHERE m.id = ?
      `).get(userId || -1, movieId);
    } else if (tmdbId) {
      row = db.prepare(`
        SELECT
          m.*,
          mus.statut_visionnage,
          mus.score,
          mus.date_visionnage,
          COALESCE(mus.is_favorite, 0) AS is_favorite,
          COALESCE(mus.is_hidden, 0) AS is_hidden
        FROM movies m
        LEFT JOIN movie_user_status mus ON m.id = mus.movie_id AND mus.user_id = ?
        WHERE m.tmdb_id = ?
      `).get(userId || -1, tmdbId);
    }

    if (!row) {
      return null;
    }

    return {
      ...row,
      genres: row.genres ? JSON.parse(row.genres) : [],
      mots_cles: row.mots_cles ? JSON.parse(row.mots_cles) : [],
      langues_parlees: row.langues_parlees ? JSON.parse(row.langues_parlees) : [],
      compagnies: row.compagnies ? JSON.parse(row.compagnies) : [],
      pays_production: row.pays_production ? JSON.parse(row.pays_production) : [],
      videos: row.videos ? JSON.parse(row.videos) : null,
      images: row.images ? JSON.parse(row.images) : null,
      fournisseurs: row.fournisseurs ? JSON.parse(row.fournisseurs) : null,
      ids_externes: row.ids_externes ? JSON.parse(row.ids_externes) : null,
      traductions: row.traductions ? JSON.parse(row.traductions) : null,
      donnees_brutes: row.donnees_brutes ? JSON.parse(row.donnees_brutes) : null,
      is_favorite: Boolean(row.is_favorite),
      is_hidden: Boolean(row.is_hidden)
    };
  });

  ipcMain.handle('movies-set-status', (event, { movieId, statut, score, dateVisionnage }) => {
    if (!movieId) {
      throw new Error('movieId est requis');
    }

    const db = getDb();
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      throw new Error('Aucun utilisateur sélectionné');
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      throw new Error('Utilisateur introuvable');
    }

    ensureMovieStatusRow(db, movieId, userId);

    const stmt = db.prepare(`
      UPDATE movie_user_status
      SET
        statut_visionnage = ?,
        score = ?,
        date_visionnage = ?,
        date_modification = CURRENT_TIMESTAMP
      WHERE movie_id = ? AND user_id = ?
    `);

    stmt.run(
      statut || 'À regarder',
      score ?? null,
      dateVisionnage || null,
      userId,
      movieId
    );

    return { success: true, statut: statut || 'À regarder' };
  });

  ipcMain.handle('movies-toggle-favorite', (event, { movieId }) => {
    if (!movieId) {
      throw new Error('movieId est requis');
    }

    const db = getDb();
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      throw new Error('Aucun utilisateur sélectionné');
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      throw new Error('Utilisateur introuvable');
    }

    ensureMovieStatusRow(db, movieId, userId);
    const current = db.prepare('SELECT is_favorite FROM movie_user_status WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
    const newValue = current?.is_favorite === 1 ? 0 : 1;
    db.prepare('UPDATE movie_user_status SET is_favorite = ?, date_modification = CURRENT_TIMESTAMP WHERE movie_id = ? AND user_id = ?')
      .run(newValue, movieId, userId);

    return { success: true, isFavorite: !!newValue };
  });

  ipcMain.handle('movies-toggle-hidden', (event, { movieId }) => {
    if (!movieId) {
      throw new Error('movieId est requis');
    }

    const db = getDb();
    const currentUser = store.get('currentUser', '');
    if (!currentUser) {
      throw new Error('Aucun utilisateur sélectionné');
    }
    const userId = getUserIdByName(db, currentUser);
    if (!userId) {
      throw new Error('Utilisateur introuvable');
    }

    ensureMovieStatusRow(db, movieId, userId);
    const current = db.prepare('SELECT is_hidden FROM movie_user_status WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
    const newValue = current?.is_hidden === 1 ? 0 : 1;
    db.prepare('UPDATE movie_user_status SET is_hidden = ?, date_modification = CURRENT_TIMESTAMP WHERE movie_id = ? AND user_id = ?')
      .run(newValue, movieId, userId);

    return { success: true, isHidden: !!newValue };
  });
}

module.exports = {
  registerMovieHandlers
};
