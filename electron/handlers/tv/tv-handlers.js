const { syncTvShowFromTmdb } = require('../../services/tv/tv-sync-service');
const { searchTv } = require('../../apis/tmdb');
const { getUserIdByName } = require('../common-helpers');

function ensureTvShowStatusRow(db, showId, userId) {
  const existing = db.prepare('SELECT show_id FROM tv_show_user_status WHERE show_id = ? AND user_id = ?').get(showId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO tv_show_user_status (show_id, user_id, statut_visionnage, score, saisons_vues, episodes_vus, date_debut, date_fin, is_favorite, is_hidden)
      VALUES (?, ?, 'À regarder', NULL, NULL, NULL, NULL, NULL, 0, 0)
    `).run(showId, userId);
  }
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

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const allowedOrder = ['date_premiere', 'note_moyenne', 'popularite', 'created_at', 'titre'];
    const orderColumn = allowedOrder.includes(orderBy) ? orderBy : 'date_premiere';
    const sortDirection = sort === 'ASC' ? 'ASC' : 'DESC';

    const stmt = db.prepare(`
      SELECT
        s.*,
        tus.statut_visionnage,
        tus.score,
        tus.saisons_vues,
        tus.episodes_vus,
        tus.date_debut,
        tus.date_fin,
        COALESCE(tus.is_favorite, 0) AS is_favorite,
        COALESCE(tus.is_hidden, 0) AS is_hidden
      FROM tv_shows s
      LEFT JOIN tv_show_user_status tus ON s.id = tus.show_id AND tus.user_id = ?
      ${where}
      ORDER BY ${orderColumn} ${sortDirection}
      LIMIT ?
      OFFSET ?
    `);

    return stmt.all(...params, limit, offset).map((show) => ({
      ...show,
      genres: show.genres ? JSON.parse(show.genres) : [],
      prochain_episode: show.prochain_episode ? JSON.parse(show.prochain_episode) : null,
      dernier_episode: show.dernier_episode ? JSON.parse(show.dernier_episode) : null,
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
          tus.statut_visionnage,
          tus.score,
          tus.saisons_vues,
          tus.episodes_vus,
          tus.date_debut,
          tus.date_fin,
          COALESCE(tus.is_favorite, 0) AS is_favorite,
          COALESCE(tus.is_hidden, 0) AS is_hidden
        FROM tv_shows s
        LEFT JOIN tv_show_user_status tus ON s.id = tus.show_id AND tus.user_id = ?
        WHERE s.id = ?
      `).get(userId || -1, showId);
    } else if (tmdbId) {
      row = db.prepare(`
        SELECT
          s.*,
          tus.statut_visionnage,
          tus.score,
          tus.saisons_vues,
          tus.episodes_vus,
          tus.date_debut,
          tus.date_fin,
          COALESCE(tus.is_favorite, 0) AS is_favorite,
          COALESCE(tus.is_hidden, 0) AS is_hidden
        FROM tv_shows s
        LEFT JOIN tv_show_user_status tus ON s.id = tus.show_id AND tus.user_id = ?
        WHERE s.tmdb_id = ?
      `).get(userId || -1, tmdbId);
    }

    if (!row) {
      return null;
    }

    const seasons = db.prepare(`
      SELECT *
      FROM tv_seasons
      WHERE show_id = ?
      ORDER BY numero ASC
    `).all(row.id).map((season) => ({
      ...season,
      synopsis: season.synopsis || null,
      donnees_brutes: season.donnees_brutes ? JSON.parse(season.donnees_brutes) : null
    }));

    const episodesStmt = db.prepare(`
      SELECT
        e.*,
        COALESCE(p.vu, 0) AS progress_vu,
        p.date_visionnage AS progress_date_visionnage
      FROM tv_episodes e
      LEFT JOIN tv_episode_progress p ON p.episode_id = e.id AND p.user_id = ?
      WHERE e.show_id = ?
      ORDER BY e.saison_numero ASC, e.episode_numero ASC
    `);
    const episodes = episodesStmt.all(userId || -1, row.id).map((episode) => {
      const { donnees_brutes, progress_vu, progress_date_visionnage, ...rest } = episode;
      return {
        ...rest,
        vu: Boolean(progress_vu),
        date_visionnage: progress_date_visionnage || null,
        donnees_brutes: donnees_brutes ? JSON.parse(donnees_brutes) : null
      };
    });

    return {
      ...row,
      genres: row.genres ? JSON.parse(row.genres) : [],
      mots_cles: row.mots_cles ? JSON.parse(row.mots_cles) : [],
      compagnies: row.compagnies ? JSON.parse(row.compagnies) : [],
      pays_production: row.pays_production ? JSON.parse(row.pays_production) : [],
      reseaux: row.reseaux ? JSON.parse(row.reseaux) : [],
      plateformes: row.plateformes ? JSON.parse(row.plateformes) : [],
      prochain_episode: row.prochain_episode ? JSON.parse(row.prochain_episode) : null,
      dernier_episode: row.dernier_episode ? JSON.parse(row.dernier_episode) : null,
      images: row.images ? JSON.parse(row.images) : null,
      videos: row.videos ? JSON.parse(row.videos) : null,
      fournisseurs: row.fournisseurs ? JSON.parse(row.fournisseurs) : null,
      ids_externes: row.ids_externes ? JSON.parse(row.ids_externes) : null,
      traductions: row.traductions ? JSON.parse(row.traductions) : null,
      is_favorite: Boolean(row.is_favorite),
      is_hidden: Boolean(row.is_hidden),
      donnees_brutes: row.donnees_brutes ? JSON.parse(row.donnees_brutes) : null,
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
    const stmt = db.prepare(`
      SELECT
        e.*,
        COALESCE(p.vu, 0) AS progress_vu,
        p.date_visionnage AS progress_date_visionnage
      FROM tv_episodes e
      LEFT JOIN tv_episode_progress p ON p.episode_id = e.id AND p.user_id = ?
      WHERE e.show_id = ?
        AND (? IS NULL OR e.saison_numero = ?)
      ORDER BY e.saison_numero ASC, e.episode_numero ASC
    `);

    const seasonParam = seasonNumber ?? null;
    return stmt.all(userId || -1, showId, seasonParam, seasonParam).map((episode) => {
      const { donnees_brutes, progress_vu, progress_date_visionnage, ...rest } = episode;
      return {
        ...rest,
        vu: Boolean(progress_vu),
        date_visionnage: progress_date_visionnage || null,
        donnees_brutes: donnees_brutes ? JSON.parse(donnees_brutes) : null
      };
    });
  });

  ipcMain.handle('tv-set-status', (event, { showId, statut, score, saisonsVues, episodesVus, dateDebut, dateFin }) => {
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

    ensureTvShowStatusRow(db, showId, userId);

    const stmt = db.prepare(`
      UPDATE tv_show_user_status
      SET
        statut_visionnage = ?,
        score = ?,
        saisons_vues = ?,
        episodes_vus = ?,
        date_debut = ?,
        date_fin = ?,
        date_modification = CURRENT_TIMESTAMP
      WHERE show_id = ? AND user_id = ?
    `);

    stmt.run(
      statut || 'À regarder',
      score ?? null,
      saisonsVues ?? null,
      episodesVus ?? null,
      dateDebut || null,
      dateFin || null,
      showId,
      userId
    );

    return { success: true, statut: statut || 'À regarder' };
  });

  ipcMain.handle('tv-toggle-favorite', (event, { showId }) => {
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

    ensureTvShowStatusRow(db, showId, userId);
    const current = db.prepare('SELECT is_favorite FROM tv_show_user_status WHERE show_id = ? AND user_id = ?').get(showId, userId);
    const newValue = current?.is_favorite === 1 ? 0 : 1;
    db.prepare('UPDATE tv_show_user_status SET is_favorite = ?, date_modification = CURRENT_TIMESTAMP WHERE show_id = ? AND user_id = ?')
      .run(newValue, showId, userId);

    return { success: true, isFavorite: !!newValue };
  });

  ipcMain.handle('tv-toggle-hidden', (event, { showId }) => {
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

    ensureTvShowStatusRow(db, showId, userId);
    const current = db.prepare('SELECT is_hidden FROM tv_show_user_status WHERE show_id = ? AND user_id = ?').get(showId, userId);
    const newValue = current?.is_hidden === 1 ? 0 : 1;
    db.prepare('UPDATE tv_show_user_status SET is_hidden = ?, date_modification = CURRENT_TIMESTAMP WHERE show_id = ? AND user_id = ?')
      .run(newValue, showId, userId);

    return { success: true, isHidden: !!newValue };
  });

  ipcMain.handle('tv-mark-episode', (event, { episodeId, userId, vu, dateVisionnage }) => {
    if (!episodeId || !userId) {
      throw new Error('episodeId et userId sont requis');
    }

    const db = getDb();
    const episodeRow = db.prepare('SELECT id, show_id FROM tv_episodes WHERE id = ?').get(episodeId);
    if (!episodeRow) {
      throw new Error('Épisode introuvable');
    }

    ensureTvShowStatusRow(db, episodeRow.show_id, userId);
    const shouldMarkAsSeen = vu === undefined ? true : !!vu;
    const visionnageDate = shouldMarkAsSeen ? (dateVisionnage || new Date().toISOString()) : null;

    const stmt = db.prepare(`
      INSERT INTO tv_episode_progress (episode_id, user_id, vu, date_visionnage)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(episode_id, user_id) DO UPDATE SET
        vu = excluded.vu,
        date_visionnage = excluded.date_visionnage
    `);

    stmt.run(
      episodeId,
      userId,
      shouldMarkAsSeen ? 1 : 0,
      visionnageDate
    );

    const episodesStats = db.prepare(`
      SELECT
        SUM(CASE WHEN p.vu = 1 THEN 1 ELSE 0 END) AS episodes_vus
      FROM tv_episodes e
      LEFT JOIN tv_episode_progress p ON p.episode_id = e.id AND p.user_id = ?
      WHERE e.show_id = ?
    `).get(userId, episodeRow.show_id);

    const seasonsStats = db.prepare(`
      SELECT
        e.saison_numero,
        COUNT(*) AS total,
        SUM(CASE WHEN p.vu = 1 THEN 1 ELSE 0 END) AS vus
      FROM tv_episodes e
      LEFT JOIN tv_episode_progress p ON p.episode_id = e.id AND p.user_id = ?
      WHERE e.show_id = ?
      GROUP BY e.saison_numero
    `).all(userId, episodeRow.show_id);

    const seasonsVues = seasonsStats.reduce((count, season) => {
      if (season.total > 0 && season.vus === season.total) {
        return count + 1;
      }
      return count;
    }, 0);

    db.prepare(`
      UPDATE tv_show_user_status
      SET
        episodes_vus = ?,
        saisons_vues = ?,
        date_modification = CURRENT_TIMESTAMP
      WHERE show_id = ? AND user_id = ?
    `).run(
      episodesStats?.episodes_vus || 0,
      seasonsVues,
      episodeRow.show_id,
      userId
    );

    return {
      success: true,
      vu: shouldMarkAsSeen,
      episodesVus: episodesStats?.episodes_vus || 0,
      saisonsVues: seasonsVues,
      dateVisionnage: visionnageDate
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

    ensureTvShowStatusRow(db, showId, userId);

    const markAsSeen = vu === undefined ? true : !!vu;
    const visionnageDate = markAsSeen ? new Date().toISOString() : null;
    const episodes = db.prepare('SELECT id FROM tv_episodes WHERE show_id = ?').all(showId);
    const showRow = db.prepare('SELECT nb_episodes, nb_saisons FROM tv_shows WHERE id = ?').get(showId);
    const totalEpisodes = episodes.length || showRow?.nb_episodes || 0;

    if (episodes.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO tv_episode_progress (episode_id, user_id, vu, date_visionnage)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(episode_id, user_id) DO UPDATE SET
          vu = excluded.vu,
          date_visionnage = excluded.date_visionnage
      `);

      const transaction = db.transaction((rows) => {
        rows.forEach((ep) => {
          stmt.run(ep.id, userId, markAsSeen ? 1 : 0, markAsSeen ? visionnageDate : null);
        });
      });
      transaction(episodes);
    }

    const episodesStats = db.prepare(`
      SELECT
        SUM(CASE WHEN p.vu = 1 THEN 1 ELSE 0 END) AS episodes_vus
      FROM tv_episodes e
      LEFT JOIN tv_episode_progress p ON p.episode_id = e.id AND p.user_id = ?
      WHERE e.show_id = ?
    `).get(userId, showId);

    const seasonsStats = db.prepare(`
      SELECT
        e.saison_numero,
        COUNT(*) AS total,
        SUM(CASE WHEN p.vu = 1 THEN 1 ELSE 0 END) AS vus
      FROM tv_episodes e
      LEFT JOIN tv_episode_progress p ON p.episode_id = e.id AND p.user_id = ?
      WHERE e.show_id = ?
      GROUP BY e.saison_numero
    `).all(userId, showId);

    const seasonsVues = seasonsStats.reduce((count, season) => {
      if (season.total > 0 && season.vus === season.total) {
        return count + 1;
      }
      return count;
    }, 0);

    const updateStmt = markAsSeen
      ? db.prepare(`
        UPDATE tv_show_user_status
        SET
          episodes_vus = ?,
          saisons_vues = ?,
          statut_visionnage = 'Terminé',
          date_modification = CURRENT_TIMESTAMP
        WHERE show_id = ? AND user_id = ?
      `)
      : db.prepare(`
        UPDATE tv_show_user_status
        SET
          episodes_vus = ?,
          saisons_vues = ?,
          date_modification = CURRENT_TIMESTAMP
        WHERE show_id = ? AND user_id = ?
      `);

    updateStmt.run(
      episodesStats?.episodes_vus || (markAsSeen ? totalEpisodes : 0),
      seasonsStats.length > 0 ? seasonsVues : (markAsSeen ? (showRow?.nb_saisons || seasonsVues) : 0),
      showId,
      userId
    );

    return {
      success: true,
      episodesVus: episodesStats?.episodes_vus || (markAsSeen ? totalEpisodes : 0),
      saisonsVues: seasonsStats.length > 0 ? seasonsVues : (markAsSeen ? (showRow?.nb_saisons || seasonsVues) : 0),
      dateVisionnage: visionnageDate,
      totalEpisodes
    };
  });
}

module.exports = {
  registerTvHandlers
};
