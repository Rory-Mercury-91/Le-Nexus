const { syncTvShowFromTmdb } = require('../../services/tv/tv-sync-service');
const { searchTv } = require('../../apis/tmdb');
const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { createToggleFavoriteHandler, createToggleHiddenHandler, createSetStatusHandler } = require('../common/item-action-helpers');

function ensureTvShowUserDataRow(db, showId, userId) {
  const existing = db.prepare('SELECT id FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO tv_show_user_data (
        show_id, user_id, statut_visionnage, score, saisons_vues, episodes_vus,
        date_debut, date_fin, is_favorite, is_hidden,
        user_images, user_videos, episode_videos, episode_progress,
        notes_privees, display_preferences, created_at, updated_at
      )
      VALUES (?, ?, 'À regarder', NULL, 0, 0, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, datetime('now'), datetime('now'))
    `).run(showId, userId);
  }
}

function fetchSeasonsAndEpisodes(db, showId, episodeProgressMap = {}) {
  const seasons = db.prepare(`
    SELECT *
    FROM tv_seasons
    WHERE show_id = ?
    ORDER BY numero ASC
  `).all(showId).map((season) => ({
    ...season,
    synopsis: season.synopsis || null,
    donnees_brutes: safeJsonParse(season.donnees_brutes, null)
  }));

  const episodes = db.prepare(`
    SELECT *
    FROM tv_episodes
    WHERE show_id = ?
    ORDER BY saison_numero ASC, episode_numero ASC
  `).all(showId).map((episode) => {
    const progress = episodeProgressMap[String(episode.id)] || { vu: false, date_visionnage: null };
    return {
      ...episode,
      vu: Boolean(progress.vu),
      date_visionnage: progress.date_visionnage || null,
      donnees_brutes: episode.donnees_brutes ? safeJsonParse(episode.donnees_brutes, null) : null
    };
  });

  return { seasons, episodes };
}

function registerTvHandlers(ipcMain, getDb, store) {
  ipcMain.handle('tv-sync-from-tmdb', async (event, { tmdbId, autoTranslate = true, includeEpisodes = true }) => {
    if (!tmdbId) {
      throw new Error('tmdbId est requis');
    }

    const db = getDb();
    const language = store.get('tmdb.language', 'fr-FR');
    const region = store.get('tmdb.region', 'FR');
    const autoTranslateSetting = store.get('media.autoTranslate', true);

    return await syncTvShowFromTmdb({
      tmdbId,
      db,
      store,
      language,
      region,
      enableTranslation: autoTranslate ?? autoTranslateSetting,
      includeEpisodes
    });
  });

  ipcMain.handle('tv-search-tmdb', async (event, { query, page = 1 } = {}) => {
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

      const response = await searchTv(searchTerm, {
        apiKey,
        apiToken,
        language,
        region,
        page
      });

      const findExistingStmt = db.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ? LIMIT 1');

      const results = (response?.results || []).map((item) => {
        const existing = findExistingStmt.get(item.id);
        return {
          tmdbId: item.id,
          title: item.name || item.original_name || 'Sans titre',
          originalTitle: item.original_name || null,
          firstAirDate: item.first_air_date || null,
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
      console.error('[TMDb] tv-search error:', error);
      throw new Error(error?.message || 'Impossible de rechercher sur TMDb.');
    }
  });

  ipcMain.handle('tv-get', (event, filters = {}) => {
    const db = getDb();
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;
    const {
      search,
      statut,
      genres,
      orderBy = 'date_premiere',
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

    if (statut) {
      clauses.push('LOWER(statut) = ?');
      params.push(statut.toLowerCase());
    }

    // Filtre par genres (les genres sont stockés en JSON, on cherche le nom dans le JSON)
    if (genres && Array.isArray(genres) && genres.length > 0) {
      const genreConditions = genres.map(() => 's.genres LIKE ?').join(' AND ');
      clauses.push(`(${genreConditions})`);
      genres.forEach(genre => params.push(`%"name":"${genre}"%`));
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    // Mapping sécurisé des colonnes ORDER BY pour éviter l'injection SQL
    const orderColumnMap = {
      'date_premiere': 's.date_premiere',
      'created_at': 's.created_at',
      'titre': 's.titre'
    };
    const sortDirectionMap = {
      'ASC': 'ASC',
      'DESC': 'DESC'
    };

    const safeOrderColumn = orderColumnMap[orderBy] || orderColumnMap['date_premiere'];
    const safeSortDirection = sortDirectionMap[sort] || 'DESC';

    const stmt = db.prepare(`
      SELECT
        s.*,
        tud.statut_visionnage,
        tud.score,
        tud.saisons_vues,
        tud.episodes_vus,
        tud.date_debut,
        tud.date_fin,
        COALESCE(tud.is_favorite, 0) AS is_favorite,
        COALESCE(tud.is_hidden, 0) AS is_hidden
      FROM tv_shows s
      LEFT JOIN tv_show_user_data tud ON s.id = tud.show_id AND tud.user_id = ?
      ${where}
      ORDER BY ${safeOrderColumn} ${safeSortDirection}
      LIMIT ?
      OFFSET ?
    `);

    return stmt.all(...params, limit, offset).map((show) => ({
      ...show,
      genres: safeJsonParse(show.genres, []),
      prochain_episode: safeJsonParse(show.prochain_episode, null),
      dernier_episode: safeJsonParse(show.dernier_episode, null),
      is_favorite: Boolean(show.is_favorite),
      is_hidden: Boolean(show.is_hidden)
    }));
  });

  ipcMain.handle('tv-get-detail', (event, { showId, tmdbId }) => {
    const db = getDb();
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;
    let row;
    if (showId) {
      row = db.prepare(`
        SELECT
          s.*,
          tud.statut_visionnage,
          tud.score,
          tud.saisons_vues,
          tud.episodes_vus,
          tud.date_debut,
          tud.date_fin,
          COALESCE(tud.is_favorite, 0) AS is_favorite,
          COALESCE(tud.is_hidden, 0) AS is_hidden,
          tud.episode_progress,
          tud.display_preferences
        FROM tv_shows s
        LEFT JOIN tv_show_user_data tud ON s.id = tud.show_id AND tud.user_id = ?
        WHERE s.id = ?
      `).get(userId || -1, showId);
    } else if (tmdbId) {
      row = db.prepare(`
        SELECT
          s.*,
          tud.statut_visionnage,
          tud.score,
          tud.saisons_vues,
          tud.episodes_vus,
          tud.date_debut,
          tud.date_fin,
          COALESCE(tud.is_favorite, 0) AS is_favorite,
          COALESCE(tud.is_hidden, 0) AS is_hidden,
          tud.episode_progress,
          tud.display_preferences
        FROM tv_shows s
        LEFT JOIN tv_show_user_data tud ON s.id = tud.show_id AND tud.user_id = ?
        WHERE s.tmdb_id = ?
      `).get(userId || -1, tmdbId);
    }

    if (!row) {
      return null;
    }

    const episodeProgress = safeJsonParse(row.episode_progress, {});
    const { seasons, episodes } = fetchSeasonsAndEpisodes(db, row.id, episodeProgress);

    return {
      ...row,
      genres: safeJsonParse(row.genres, []),
      mots_cles: safeJsonParse(row.mots_cles, []),
      compagnies: safeJsonParse(row.compagnies, []),
      pays_production: safeJsonParse(row.pays_production, []),
      reseaux: safeJsonParse(row.reseaux, []),
      plateformes: safeJsonParse(row.plateformes, []),
      prochain_episode: safeJsonParse(row.prochain_episode, null),
      dernier_episode: safeJsonParse(row.dernier_episode, null),
      images: safeJsonParse(row.images, null),
      videos: safeJsonParse(row.videos, null),
      fournisseurs: safeJsonParse(row.fournisseurs, null),
      ids_externes: safeJsonParse(row.ids_externes, null),
      traductions: safeJsonParse(row.traductions, null),
      is_favorite: Boolean(row.is_favorite),
      is_hidden: Boolean(row.is_hidden),
      donnees_brutes: safeJsonParse(row.donnees_brutes, null),
      display_preferences: safeJsonParse(row.display_preferences, {}),
      seasons,
      episodes
    };
  });

  ipcMain.handle('tv-get-episodes', (event, { showId, seasonNumber }) => {
    if (!showId) {
      throw new Error('showId est requis');
    }

    const db = getDb();
    const currentUser = store.get('currentUser', '');
    const userId = currentUser ? getUserIdByName(db, currentUser) : null;

    // Récupérer la progression depuis episode_progress JSON
    const userData = db.prepare(`
      SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?
    `).get(showId, userId || -1);
    const episodeProgress = safeJsonParse(userData?.episode_progress, {});

    const stmt = db.prepare(`
      SELECT e.*
      FROM tv_episodes e
      WHERE e.show_id = ?
        AND (? IS NULL OR e.saison_numero = ?)
      ORDER BY e.saison_numero ASC, e.episode_numero ASC
    `);

    const seasonParam = seasonNumber ?? null;
    return stmt.all(showId, seasonParam, seasonParam).map((episode) => {
      const { donnees_brutes, ...rest } = episode;
      const progress = episodeProgress[String(episode.id)] || { vu: false, date_visionnage: null };
      return {
        ...rest,
        vu: Boolean(progress.vu),
        date_visionnage: progress.date_visionnage || null,
        donnees_brutes: donnees_brutes ? safeJsonParse(donnees_brutes, null) : null
      };
    });
  });

  ipcMain.handle('tv-create-season', (event, payload = {}) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const {
        showId,
        seasonNumber,
        episodeCount,
        title,
        synopsis,
        defaultEpisodeDuration,
        duplicateFromSeasonId
      } = payload;

      if (!showId) {
        return { success: false, error: 'showId est requis' };
      }
      if (seasonNumber === undefined || seasonNumber === null) {
        return { success: false, error: 'Numéro de saison requis' };
      }

      const show = db.prepare('SELECT id FROM tv_shows WHERE id = ?').get(showId);
      if (!show) {
        return { success: false, error: 'Série introuvable' };
      }

      const existingSeason = db.prepare('SELECT id FROM tv_seasons WHERE show_id = ? AND numero = ?').get(showId, seasonNumber);
      if (existingSeason) {
        return { success: false, error: 'Une saison avec ce numéro existe déjà' };
      }

      let episodesTemplate = [];

      if (duplicateFromSeasonId) {
        const sourceSeason = db.prepare('SELECT id, show_id FROM tv_seasons WHERE id = ?').get(duplicateFromSeasonId);
        if (!sourceSeason || sourceSeason.show_id !== showId) {
          return { success: false, error: 'Saison à dupliquer introuvable' };
        }

        const sourceEpisodes = db.prepare(`
          SELECT titre, synopsis, duree, still_path
          FROM tv_episodes
          WHERE season_id = ?
          ORDER BY episode_numero ASC
        `).all(sourceSeason.id);

        if (sourceEpisodes.length === 0) {
          return { success: false, error: 'La saison à dupliquer ne contient aucun épisode' };
        }

        episodesTemplate = sourceEpisodes.map((episode, index) => ({
          episodeNumber: index + 1,
          titre: episode.titre || `Épisode ${index + 1}`,
          synopsis: episode.synopsis || null,
          duree: episode.duree || null,
          stillPath: episode.still_path || null
        }));
      } else {
        if (!episodeCount || episodeCount <= 0) {
          return { success: false, error: 'Nombre d\'épisodes requis' };
        }
        episodesTemplate = Array.from({ length: episodeCount }).map((_, index) => ({
          episodeNumber: index + 1,
          titre: `Épisode ${index + 1}`,
          synopsis: null,
          duree: defaultEpisodeDuration || null,
          stillPath: null
        }));
      }

      const insertSeasonStmt = db.prepare(`
        INSERT INTO tv_seasons (
          show_id, tmdb_id, numero, titre, synopsis, date_premiere,
          nb_episodes, poster_path, donnees_brutes, created_at, updated_at
        )
        VALUES (?, NULL, ?, ?, ?, NULL, ?, NULL, NULL, datetime('now'), datetime('now'))
      `);

      const insertEpisodeStmt = db.prepare(`
        INSERT INTO tv_episodes (
          show_id, season_id, tmdb_id, tvmaze_id, saison_numero, episode_numero,
          titre, synopsis, date_diffusion, duree, note_moyenne, nb_votes,
          still_path, donnees_brutes, created_at, updated_at
        )
        VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, NULL, datetime('now'), datetime('now'))
      `);

      const transaction = db.transaction(() => {
        const seasonInsert = insertSeasonStmt.run(
          showId,
          seasonNumber,
          title?.trim() || `Saison ${seasonNumber}`,
          synopsis?.trim() || null,
          episodesTemplate.length
        );
        const newSeasonId = seasonInsert.lastInsertRowid;

        episodesTemplate.forEach((episode) => {
          insertEpisodeStmt.run(
            showId,
            newSeasonId,
            seasonNumber,
            episode.episodeNumber,
            episode.titre,
            episode.synopsis,
            episode.duree,
            episode.stillPath
          );
        });

        const totals = db.prepare('SELECT COUNT(*) as count FROM tv_seasons WHERE show_id = ?').get(showId);
        const episodesTotals = db.prepare('SELECT COUNT(*) as count FROM tv_episodes WHERE show_id = ?').get(showId);
        db.prepare(`
          UPDATE tv_shows
          SET nb_saisons = ?, nb_episodes = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(totals?.count || 0, episodesTotals?.count || 0, showId);

        return newSeasonId;
      });

      const newSeasonId = transaction();

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }

      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);

      return { success: true, seasonId: newSeasonId, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-create-season:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tv-update-season', (event, payload = {}) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      const { showId, seasonId, title, synopsis, datePremiere, posterPath } = payload;
      if (!showId || !seasonId) {
        return { success: false, error: 'showId et seasonId sont requis' };
      }
      const season = db.prepare('SELECT id FROM tv_seasons WHERE id = ? AND show_id = ?').get(seasonId, showId);
      if (!season) {
        return { success: false, error: 'Saison introuvable' };
      }

      db.prepare(`
        UPDATE tv_seasons
        SET
          titre = ?,
          synopsis = ?,
          date_premiere = ?,
          poster_path = COALESCE(?, poster_path),
          updated_at = datetime('now')
        WHERE id = ? AND show_id = ?
      `).run(
        title?.trim() || null,
        synopsis?.trim() || null,
        datePremiere || null,
        posterPath || null,
        seasonId,
        showId
      );

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }
      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);
      return { success: true, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-update-season:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tv-delete-season', (event, { showId, seasonId }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      if (!showId || !seasonId) {
        return { success: false, error: 'showId et seasonId sont requis' };
      }

      db.prepare('DELETE FROM tv_episodes WHERE show_id = ? AND season_id = ?').run(showId, seasonId);
      const result = db.prepare('DELETE FROM tv_seasons WHERE id = ? AND show_id = ?').run(seasonId, showId);
      if (result.changes === 0) {
        return { success: false, error: 'Saison introuvable' };
      }

      const totals = db.prepare('SELECT COUNT(*) as count FROM tv_seasons WHERE show_id = ?').get(showId);
      const episodesTotals = db.prepare('SELECT COUNT(*) as count FROM tv_episodes WHERE show_id = ?').get(showId);
      db.prepare(`
        UPDATE tv_shows
        SET nb_saisons = ?, nb_episodes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(totals?.count || 0, episodesTotals?.count || 0, showId);

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }
      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);
      return { success: true, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-delete-season:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tv-update-episode', (event, payload = {}) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      const { showId, episodeId, title, synopsis, dateDiffusion, duree } = payload;
      if (!showId || !episodeId) {
        return { success: false, error: 'showId et episodeId requis' };
      }

      const episode = db.prepare('SELECT id FROM tv_episodes WHERE id = ? AND show_id = ?').get(episodeId, showId);
      if (!episode) {
        return { success: false, error: 'Épisode introuvable' };
      }

      db.prepare(`
        UPDATE tv_episodes
        SET
          titre = ?,
          synopsis = ?,
          date_diffusion = ?,
          duree = ?,
          updated_at = datetime('now')
        WHERE id = ? AND show_id = ?
      `).run(
        title?.trim() || null,
        synopsis?.trim() || null,
        dateDiffusion || null,
        (duree || duree === 0) ? parseInt(String(duree), 10) : null,
        episodeId,
        showId
      );

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }
      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);
      return { success: true, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-update-episode:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tv-delete-episode', (event, { showId, episodeId }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      if (!showId || !episodeId) {
        return { success: false, error: 'showId et episodeId requis' };
      }

      const result = db.prepare('DELETE FROM tv_episodes WHERE id = ? AND show_id = ?').run(episodeId, showId);
      if (result.changes === 0) {
        return { success: false, error: 'Épisode introuvable' };
      }

      const episodesTotals = db.prepare('SELECT COUNT(*) as count FROM tv_episodes WHERE show_id = ?').get(showId);
      db.prepare(`
        UPDATE tv_shows
        SET nb_episodes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(episodesTotals?.count || 0, showId);

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }
      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);
      return { success: true, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-delete-episode:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tv-reorder-episodes', (event, { showId, seasonNumber, order }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      if (!showId || !seasonNumber || !Array.isArray(order) || order.length === 0) {
        return { success: false, error: 'Paramètres manquants' };
      }

      const updateStmt = db.prepare(`
        UPDATE tv_episodes
        SET episode_numero = ?, updated_at = datetime('now')
        WHERE id = ? AND show_id = ? AND saison_numero = ?
      `);

      const transaction = db.transaction(() => {
        order.forEach(({ episodeId, episodeNumber }) => {
          updateStmt.run(episodeNumber, episodeId, showId, seasonNumber);
        });
      });
      transaction();

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }
      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);
      return { success: true, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-reorder-episodes:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tv-update-season-poster', (event, { showId, seasonId, posterPath }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }
      if (!showId || !seasonId || !posterPath) {
        return { success: false, error: 'Paramètres manquants' };
      }

      const season = db.prepare('SELECT id FROM tv_seasons WHERE id = ? AND show_id = ?').get(seasonId, showId);
      if (!season) {
        return { success: false, error: 'Saison introuvable' };
      }

      db.prepare(`
        UPDATE tv_seasons
        SET poster_path = ?, updated_at = datetime('now')
        WHERE id = ? AND show_id = ?
      `).run(posterPath, seasonId, showId);

      let episodeProgressMap = {};
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          const userData = db.prepare('SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
          episodeProgressMap = safeJsonParse(userData?.episode_progress, {});
        }
      }
      const { seasons, episodes } = fetchSeasonsAndEpisodes(db, showId, episodeProgressMap);
      return { success: true, seasons, episodes };
    } catch (error) {
      console.error('Erreur tv-update-season-poster:', error);
      return { success: false, error: error.message };
    }
  });

  // Handlers génériques pour les actions communes
  ipcMain.handle('tv-set-status', createSetStatusHandler({
    getDb,
    store,
    itemIdParamName: 'showId',
    statusTableName: 'tv_show_user_data',
    itemIdColumnName: 'show_id',
    ensureStatusRowFn: ensureTvShowUserDataRow,
    buildUpdateQuery: (tableName, itemIdColumnName) => `
      UPDATE ${tableName}
      SET
        statut_visionnage = ?,
        score = ?,
        saisons_vues = ?,
        episodes_vus = ?,
        date_debut = ?,
        date_fin = ?,
        updated_at = datetime('now')
      WHERE ${itemIdColumnName} = ? AND user_id = ?
    `,
    buildUpdateParams: (params, itemId, userId) => [
      params.statut || 'À regarder',
      params.score ?? null,
      params.saisonsVues ?? null,
      params.episodesVus ?? null,
      params.dateDebut || null,
      params.dateFin || null,
      itemId,
      userId
    ]
  }));

  ipcMain.handle('tv-toggle-favorite', createToggleFavoriteHandler({
    getDb,
    store,
    itemIdParamName: 'showId',
    statusTableName: 'tv_show_user_data',
    itemIdColumnName: 'show_id',
    ensureStatusRowFn: ensureTvShowUserDataRow
  }));

  ipcMain.handle('tv-toggle-hidden', createToggleHiddenHandler({
    getDb,
    store,
    itemIdParamName: 'showId',
    statusTableName: 'tv_show_user_data',
    itemIdColumnName: 'show_id',
    ensureStatusRowFn: ensureTvShowUserDataRow
  }));

  ipcMain.handle('tv-mark-episode', (event, { episodeId, userId, vu, dateVisionnage }) => {
    if (!episodeId || !userId) {
      throw new Error('episodeId et userId sont requis');
    }

    const db = getDb();
    const episodeRow = db.prepare('SELECT id, show_id FROM tv_episodes WHERE id = ?').get(episodeId);
    if (!episodeRow) {
      throw new Error('Épisode introuvable');
    }

    ensureTvShowUserDataRow(db, episodeRow.show_id, userId);
    const shouldMarkAsSeen = vu === undefined ? true : !!vu;
    const visionnageDate = shouldMarkAsSeen ? (dateVisionnage || new Date().toISOString()) : null;

    // Récupérer et mettre à jour episode_progress JSON
    const userData = db.prepare(`
      SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?
    `).get(episodeRow.show_id, userId);
    const episodeProgress = safeJsonParse(userData?.episode_progress, {});

    // Mettre à jour la progression pour cet épisode
    episodeProgress[String(episodeId)] = {
      vu: shouldMarkAsSeen,
      date_visionnage: visionnageDate
    };

    // Sauvegarder le JSON mis à jour
    db.prepare(`
      UPDATE tv_show_user_data 
      SET episode_progress = ?, updated_at = datetime('now')
      WHERE show_id = ? AND user_id = ?
    `).run(JSON.stringify(episodeProgress), episodeRow.show_id, userId);

    // Récupérer le statut actuel AVANT la mise à jour pour comparer
    const currentStatus = db.prepare(`
      SELECT statut_visionnage, episodes_vus FROM tv_show_user_data
      WHERE show_id = ? AND user_id = ?
    `).get(episodeRow.show_id, userId);

    const previousEpisodesVus = currentStatus ? (currentStatus.episodes_vus || 0) : 0;

    // Récupérer le nombre total d'épisodes
    const showInfo = db.prepare('SELECT nb_episodes FROM tv_shows WHERE id = ?').get(episodeRow.show_id);
    const nbEpisodes = showInfo?.nb_episodes || 0;

    // Calculer les stats depuis episode_progress JSON
    const allEpisodes = db.prepare('SELECT id, saison_numero FROM tv_episodes WHERE show_id = ?').all(episodeRow.show_id);
    let episodesVusCount = 0;
    const seasonsStats = {};

    for (const ep of allEpisodes) {
      const progress = episodeProgress[String(ep.id)];
      if (progress && progress.vu) {
        episodesVusCount++;
        if (!seasonsStats[ep.saison_numero]) {
          seasonsStats[ep.saison_numero] = { total: 0, vus: 0 };
        }
        seasonsStats[ep.saison_numero].vus++;
      }
      if (!seasonsStats[ep.saison_numero]) {
        seasonsStats[ep.saison_numero] = { total: 0, vus: 0 };
      }
      seasonsStats[ep.saison_numero].total++;
    }

    const seasonsVues = Object.values(seasonsStats).reduce((count, season) => {
      if (season.total > 0 && season.vus === season.total) {
        return count + 1;
      }
      return count;
    }, 0);

    const wasZero = previousEpisodesVus === 0;
    const isNowOneOrMore = episodesVusCount >= 1;

    // Calculer automatiquement le statut de visionnage
    let autoStatut = null;
    if (episodesVusCount === 0) {
      autoStatut = 'À regarder';
    } else if (nbEpisodes > 0 && episodesVusCount === nbEpisodes) {
      autoStatut = 'Terminé';
    } else if (episodesVusCount >= 1) {
      autoStatut = 'En cours';
    }

    // Mettre à jour le statut automatiquement si :
    // 1. On passe de 0 à >= 1 (forcer "En cours" même si statut était "Abandonné" ou "En pause")
    // 2. Le statut actuel est automatique (À regarder, En cours, Terminé)
    // 3. On atteint 100% (forcer "Terminé")
    const shouldUpdate = autoStatut && (
      (wasZero && isNowOneOrMore) || // Passage de 0 à >= 1
      (nbEpisodes > 0 && episodesVusCount === nbEpisodes) || // 100% complété
      (!currentStatus || currentStatus.statut_visionnage === 'À regarder' || currentStatus.statut_visionnage === 'En cours' || currentStatus.statut_visionnage === 'Terminé') // Statut automatique
    );

    // Mettre à jour les stats dans tv_show_user_data (avec le statut si nécessaire)
    if (shouldUpdate) {
      db.prepare(`
        UPDATE tv_show_user_data
        SET
          episodes_vus = ?,
          saisons_vues = ?,
          statut_visionnage = ?,
          updated_at = datetime('now')
        WHERE show_id = ? AND user_id = ?
      `).run(
        episodesVusCount,
        seasonsVues,
        autoStatut,
        episodeRow.show_id,
        userId
      );

      console.log(`✅ Auto-update: Série ${episodeRow.show_id} statut mis à jour vers "${autoStatut}" (${episodesVusCount}/${nbEpisodes} épisodes)`);
    } else {
      // Mettre à jour seulement episodes_vus et saisons_vues sans changer le statut
      db.prepare(`
        UPDATE tv_show_user_data
        SET
          episodes_vus = ?,
          saisons_vues = ?,
          updated_at = datetime('now')
        WHERE show_id = ? AND user_id = ?
      `).run(
        episodesVusCount,
        seasonsVues,
        episodeRow.show_id,
        userId
      );
    }

    return {
      success: true,
      vu: shouldMarkAsSeen,
      episodesVus: episodesVusCount,
      saisonsVues: seasonsVues,
      dateVisionnage: visionnageDate,
      statutUpdated: shouldUpdate ? autoStatut : null
    };
  });

  ipcMain.handle('tv-mark-all-episodes', (event, { showId, vu }) => {
    if (!showId) {
      throw new Error('showId est requis');
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

    ensureTvShowUserDataRow(db, showId, userId);

    const markAsSeen = vu === undefined ? true : !!vu;
    const visionnageDate = markAsSeen ? new Date().toISOString() : null;
    const episodes = db.prepare('SELECT id FROM tv_episodes WHERE show_id = ?').all(showId);
    const showRow = db.prepare('SELECT nb_episodes, nb_saisons FROM tv_shows WHERE id = ?').get(showId);
    const totalEpisodes = episodes.length || showRow?.nb_episodes || 0;

    // Récupérer et mettre à jour episode_progress JSON
    const userData = db.prepare(`
      SELECT episode_progress FROM tv_show_user_data WHERE show_id = ? AND user_id = ?
    `).get(showId, userId);
    const episodeProgress = safeJsonParse(userData?.episode_progress, {});

    // Mettre à jour tous les épisodes
    if (episodes.length > 0) {
      episodes.forEach((ep) => {
        episodeProgress[String(ep.id)] = {
          vu: markAsSeen,
          date_visionnage: markAsSeen ? visionnageDate : null
        };
      });

      // Sauvegarder le JSON mis à jour
      db.prepare(`
        UPDATE tv_show_user_data 
        SET episode_progress = ?, updated_at = datetime('now')
        WHERE show_id = ? AND user_id = ?
      `).run(JSON.stringify(episodeProgress), showId, userId);
    }

    // Calculer les stats depuis episode_progress JSON
    const allEpisodes = db.prepare('SELECT id, saison_numero FROM tv_episodes WHERE show_id = ?').all(showId);
    let episodesVusCount = 0;
    const seasonsStats = {};

    for (const ep of allEpisodes) {
      const progress = episodeProgress[String(ep.id)];
      if (progress && progress.vu) {
        episodesVusCount++;
        if (!seasonsStats[ep.saison_numero]) {
          seasonsStats[ep.saison_numero] = { total: 0, vus: 0 };
        }
        seasonsStats[ep.saison_numero].vus++;
      }
      if (!seasonsStats[ep.saison_numero]) {
        seasonsStats[ep.saison_numero] = { total: 0, vus: 0 };
      }
      seasonsStats[ep.saison_numero].total++;
    }

    const seasonsVues = Object.values(seasonsStats).reduce((count, season) => {
      if (season.total > 0 && season.vus === season.total) {
        return count + 1;
      }
      return count;
    }, 0);

    const updateStmt = markAsSeen
      ? db.prepare(`
        UPDATE tv_show_user_data
        SET
          episodes_vus = ?,
          saisons_vues = ?,
          statut_visionnage = 'Terminé',
          updated_at = datetime('now')
        WHERE show_id = ? AND user_id = ?
      `)
      : db.prepare(`
        UPDATE tv_show_user_data
        SET
          episodes_vus = ?,
          saisons_vues = ?,
          updated_at = datetime('now')
        WHERE show_id = ? AND user_id = ?
      `);

    updateStmt.run(
      episodesVusCount,
      seasonsVues,
      showId,
      userId
    );

    return {
      success: true,
      episodesVus: episodesVusCount,
      saisonsVues: seasonsVues,
      dateVisionnage: visionnageDate,
      totalEpisodes
    };
  });

  // Créer une série manuellement
  ipcMain.handle('create-tv-show', (event, tvShowData) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Utiliser le tmdb_id fourni, sinon générer un tmdb_id négatif unique pour les séries manuelles
      let newTmdbId;
      if (tvShowData.tmdb_id && tvShowData.tmdb_id > 0) {
        // Si un tmdb_id positif est fourni, l'utiliser (vient de TMDB)
        newTmdbId = tvShowData.tmdb_id;
      } else {
        // Sinon, générer un ID négatif unique pour les séries manuelles
        const existingMax = db.prepare('SELECT MIN(tmdb_id) as min_id FROM tv_shows WHERE tmdb_id < 0').get();
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

      // Vérifier si la série existe déjà avec ce tmdb_id
      const existingShow = db.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ?').get(newTmdbId);
      if (existingShow) {
        // Si la série existe déjà, utiliser son ID
        const showId = existingShow.id;
        const currentUser = store.get('currentUser', '');
        if (currentUser) {
          const userId = getUserIdByName(db, currentUser);
          if (userId) {
            ensureTvShowUserDataRow(db, showId, userId);
          }
        }
        return { success: true, showId, alreadyExists: true };
      }

      const insertStmt = db.prepare(`
        INSERT INTO tv_shows (
          tmdb_id, titre, titre_original, synopsis, statut, type,
          date_premiere, date_derniere, nb_saisons, nb_episodes, duree_episode,
          genres, poster_path, backdrop_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        newTmdbId,
        tvShowData.titre || '',
        tvShowData.titre_original || null,
        tvShowData.synopsis || null,
        tvShowData.statut || null,
        tvShowData.type || null,
        tvShowData.date_premiere || null,
        tvShowData.date_derniere || null,
        tvShowData.nb_saisons || null,
        tvShowData.nb_episodes || null,
        tvShowData.duree_episode || null,
        toJson(tvShowData.genres || []),
        tvShowData.poster_path || null,
        tvShowData.backdrop_path || null
      );

      // Vérifier si l'insertion a réussi
      if (result.changes === 0) {
        // L'insertion a échoué, probablement à cause d'une contrainte UNIQUE
        // Vérifier à nouveau si la série existe maintenant
        const existingShow = db.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ?').get(newTmdbId);
        if (existingShow) {
          const showId = existingShow.id;
          const currentUser = store.get('currentUser', '');
          if (currentUser) {
            const userId = getUserIdByName(db, currentUser);
            if (userId) {
              ensureTvShowUserDataRow(db, showId, userId);
            }
          }
          return { success: true, showId, alreadyExists: true };
        }
        throw new Error('Échec de la création de la série : aucune ligne insérée');
      }

      const showId = result.lastInsertRowid;
      if (!showId || showId === 0) {
        throw new Error('Échec de la création de la série : aucun ID retourné');
      }
      const currentUser = store.get('currentUser', '');
      if (currentUser) {
        const userId = getUserIdByName(db, currentUser);
        if (userId) {
          ensureTvShowUserDataRow(db, showId, userId);
        }
      }

      return { success: true, showId };
    } catch (error) {
      console.error('❌ Erreur create-tv-show:', error);
      return { success: false, error: error.message };
    }
  });

  // Mettre à jour une série manuellement
  ipcMain.handle('update-tv-show', (event, { showId, tvShowData }) => {
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

      const updateStmt = db.prepare(`
        UPDATE tv_shows SET
          titre = ?,
          titre_original = ?,
          synopsis = ?,
          statut = ?,
          type = ?,
          date_premiere = ?,
          date_derniere = ?,
          nb_saisons = ?,
          nb_episodes = ?,
          duree_episode = ?,
          genres = ?,
          poster_path = ?,
          backdrop_path = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      updateStmt.run(
        tvShowData.titre || '',
        tvShowData.titre_original || null,
        tvShowData.synopsis || null,
        tvShowData.statut || null,
        tvShowData.type || null,
        tvShowData.date_premiere || null,
        tvShowData.date_derniere || null,
        tvShowData.nb_saisons || null,
        tvShowData.nb_episodes || null,
        tvShowData.duree_episode || null,
        toJson(tvShowData.genres || []),
        tvShowData.poster_path || null,
        tvShowData.backdrop_path || null,
        showId
      );

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur update-tv-show:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer une série TV
  ipcMain.handle('delete-tv-show', (event, showId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier que la série existe
      const show = db.prepare('SELECT id, titre FROM tv_shows WHERE id = ?').get(showId);
      if (!show) {
        return { success: false, error: 'Série introuvable' };
      }

      // Supprimer la série (cascade supprimera les données utilisateur via FOREIGN KEY)
      db.prepare('DELETE FROM tv_shows WHERE id = ?').run(showId);

      console.log(`✅ Série TV supprimée (ID: ${showId}, Titre: ${show.titre})`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur delete-tv-show:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer tous les genres uniques
  ipcMain.handle('get-all-tv-genres', async () => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');
      const shows = db.prepare('SELECT genres FROM tv_shows WHERE genres IS NOT NULL AND genres <> \'\' AND LENGTH(genres) > 0').all();
      const allGenres = new Set();
      shows.forEach(show => {
        if (show.genres) {
          try {
            const genres = safeJsonParse(show.genres, []);
            if (Array.isArray(genres)) {
              genres.forEach(genre => {
                if (genre && genre.name) {
                  allGenres.add(genre.name);
                }
              });
            }
          } catch (e) {
            console.warn('⚠️ Erreur parsing genres pour série:', e);
          }
        }
      });
      return Array.from(allGenres).sort();
    } catch (error) {
      console.error('❌ Erreur get-all-tv-genres:', error);
      throw error;
    }
  });
}

const { registerTvShowGalleryHandlers } = require('./tv-show-gallery-handlers');
const { registerTvEpisodeVideoHandlers } = require('./tv-episode-video-handlers');
const { registerTvShowVideoHandlers } = require('./tv-show-video-handlers');

function registerAllTvHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  registerTvHandlers(ipcMain, getDb, store);
  registerTvShowGalleryHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
  registerTvEpisodeVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
  registerTvShowVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager);
}

module.exports = {
  registerTvHandlers,
  registerAllTvHandlers
};
