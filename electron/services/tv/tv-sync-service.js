const { getTvDetails, getTvSeason } = require('../../apis/tmdb');
const { lookupShow, getShow, getEpisodes: getTvMazeEpisodes } = require('../../apis/tvmaze');
const { translateText } = require('../../apis/groq');

function toJson(value) {
  if (value === undefined || value === null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function pickFrenchTranslation(entries, fallbackLanguage = 'en') {
  if (!entries || !Array.isArray(entries)) {
    return { fr: null, fallback: null };
  }

  const fr = entries.find(entry => entry.iso_639_1 === 'fr');
  if (fr?.data) {
    return { fr: fr.data, fallback: null };
  }

  const fallback = entries.find(entry => entry.iso_639_1 === fallbackLanguage);
  return { fr: null, fallback: fallback?.data || null };
}

async function maybeTranslate(text, store, context = 'séries TV') {
  if (!text || text.trim().length < 10) {
    return { translated: text, usedGroq: false };
  }

  const groqKey = store.get('groqApiKey', '');
  if (!groqKey) {
    return { translated: text, usedGroq: false };
  }

  const result = await translateText(text, groqKey, 'fr', context);
  if (result.success) {
    return { translated: result.text, usedGroq: true };
  }

  return { translated: text, usedGroq: false };
}

function upsertTvShow(db, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map(col => `@${col}`).join(', ');
  const updates = columns
    .filter(col => col !== 'tmdb_id')
    .map(col => `${col} = excluded.${col}`)
    .join(', ');

  const stmt = db.prepare(`
    INSERT INTO tv_shows (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(tmdb_id) DO UPDATE SET
      ${updates},
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(data);
  const row = db.prepare('SELECT id FROM tv_shows WHERE tmdb_id = ?').get(data.tmdb_id);
  return row?.id || null;
}

function upsertSeason(db, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map(col => `@${col}`).join(', ');
  const updates = columns
    .filter(col => !['show_id', 'numero'].includes(col))
    .map(col => `${col} = excluded.${col}`)
    .join(', ');

  const stmt = db.prepare(`
    INSERT INTO tv_seasons (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(show_id, numero) DO UPDATE SET
      ${updates},
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(data);
  const row = db.prepare('SELECT id FROM tv_seasons WHERE show_id = ? AND numero = ?').get(data.show_id, data.numero);
  return row?.id || null;
}

function upsertEpisode(db, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map(col => `@${col}`).join(', ');
  const updates = columns
    .filter(col => !['show_id', 'saison_numero', 'episode_numero'].includes(col))
    .map(col => `${col} = excluded.${col}`)
    .join(', ');

  const stmt = db.prepare(`
    INSERT INTO tv_episodes (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(show_id, saison_numero, episode_numero) DO UPDATE SET
      ${updates},
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(data);
}

function buildTvShowData(show, {
  translatedOverview,
  translationSource,
  tvmazeInfo
}) {
  return {
    tmdb_id: show.id,
    tvmaze_id: tvmazeInfo?.id || null,
    imdb_id: show.external_ids?.imdb_id || null,
    titre: show.name || '',
    titre_original: show.original_name || null,
    tagline: show.tagline || null,
    synopsis: translatedOverview || show.overview || null,
    statut: show.status || null,
    type: show.type || null,
    nb_saisons: show.number_of_seasons || null,
    nb_episodes: show.number_of_episodes || null,
    duree_episode: Array.isArray(show.episode_run_time) && show.episode_run_time.length > 0 ? show.episode_run_time[0] : null,
    date_premiere: show.first_air_date || null,
    date_derniere: show.last_air_date || null,
    prochain_episode: toJson(show.next_episode_to_air || tvmazeInfo?.nextEpisode),
    dernier_episode: toJson(show.last_episode_to_air || tvmazeInfo?.previousEpisode),
    genres: toJson(show.genres),
    mots_cles: toJson(show.keywords?.results),
    langues_parlees: toJson(show.spoken_languages),
    compagnies: toJson(show.production_companies),
    pays_production: toJson(show.production_countries),
    reseaux: toJson(show.networks || show.original_language),
    plateformes: toJson(show.networks),
    poster_path: show.poster_path || null,
    backdrop_path: show.backdrop_path || null,
    images: toJson(show.images),
    videos: toJson(show.videos),
    fournisseurs: toJson(show['watch/providers']),
    ids_externes: toJson(show.external_ids),
    traductions: toJson({
      requested: 'fr',
      available: show.translations,
      source: translationSource
    }),
    donnees_brutes: toJson(show),
    derniere_sync: new Date().toISOString()
  };
}

function buildSeasonData(season, {
  showId,
  translatedOverview,
  translationSource
}) {
  return {
    show_id: showId,
    tmdb_id: season.id || null,
    numero: season.season_number,
    titre: season.name || null,
    synopsis: translatedOverview || season.overview || null,
    date_premiere: season.air_date || null,
    nb_episodes: season.episodes?.length || season.episode_count || null,
    poster_path: season.poster_path || null,
    donnees_brutes: toJson({
      ...season,
      translationSource
    }),
    derniere_sync: new Date().toISOString()
  };
}

function buildEpisodeData(episode, { showId, seasonId }) {
  return {
    show_id: showId,
    season_id: seasonId || null,
    tmdb_id: episode.id || null,
    tvmaze_id: null,
    saison_numero: episode.season_number,
    episode_numero: episode.episode_number,
    titre: episode.name || null,
    synopsis: episode.overview || null,
    date_diffusion: episode.air_date || null,
    duree: episode.runtime || null,
    note_moyenne: episode.vote_average || null,
    nb_votes: episode.vote_count || null,
    still_path: episode.still_path || null,
    donnees_brutes: toJson(episode)
  };
}

async function enrichWithTvMaze(tmdbShow, store) {
  const identifiers = {
    imdb: tmdbShow.external_ids?.imdb_id || null,
    thetvdb: tmdbShow.external_ids?.tvdb_id || null
  };

  if (!identifiers.imdb && !identifiers.thetvdb) {
    return null;
  }

  try {
    const show = await lookupShow(identifiers);
    if (!show) {
      return null;
    }

    let nextEpisode = null;
    if (show._embedded?.nextepisode) {
      nextEpisode = show._embedded.nextepisode;
    } else {
      // fallback: fetch next episodes
      const episodes = await getTvMazeEpisodes(show.id, { includeSpecials: false });
      if (Array.isArray(episodes)) {
        const future = episodes.filter(ep => ep.airdate && new Date(ep.airdate) >= new Date());
        future.sort((a, b) => new Date(a.airdate) - new Date(b.airdate));
        nextEpisode = future[0] || null;
      }
    }

    return {
      id: show.id,
      url: show.officialSite || show.url,
      timezone: show.network?.timezone || show.webChannel?.timezone,
      network: show.network?.name || show.webChannel?.name,
      nextEpisode,
      previousEpisode: show._embedded?.previousepisode || null
    };
  } catch (error) {
    console.error('❌ Enrichissement TV Maze échoué:', error.message);
    return null;
  }
}

/**
 * Synchronise une série TV TMDb (et TV Maze) dans la base locale
 * @param {Object} options
 * @param {number} options.tmdbId
 * @param {Database} options.db
 * @param {Store} options.store
 * @param {string} [options.language='fr-FR']
 * @param {string} [options.region='FR']
 * @param {boolean} [options.enableTranslation=true]
 * @param {boolean} [options.includeEpisodes=true]
 * @returns {Promise<{ id: number | null, tmdbId: number, seasons: number, episodes: number }>}
 */
async function syncTvShowFromTmdb({
  tmdbId,
  db,
  store,
  language = 'fr-FR',
  region = 'FR',
  enableTranslation = true,
  includeEpisodes = true
}) {
  const apiKey = store.get('tmdb.apiKey', process.env.TMDB_API_KEY || '');
  const apiToken = store.get('tmdb.apiToken', process.env.TMDB_API_TOKEN || '');

  if (!apiKey && !apiToken) {
    throw new Error('Aucune clé API TMDb définie');
  }

  const show = await getTvDetails(tmdbId, {
    apiKey,
    apiToken,
    language,
    region
  });

  if (!show) {
    throw new Error(`Série TMDb ${tmdbId} introuvable`);
  }

  let overview = show.overview;
  let translationSource = 'tmdb';

  // Traductions TMDb
  const translations = show.translations?.translations;
  if ((!overview || overview.trim().length < 20) && translations) {
    const { fr, fallback } = pickFrenchTranslation(translations);
    if (fr?.overview && fr.overview.trim().length > 20) {
      overview = fr.overview;
      translationSource = 'tmdb_fr';
    } else if (fallback?.overview && fallback.overview.trim().length > 20) {
      overview = fallback.overview;
      translationSource = `tmdb_${fallback.iso_639_1 || 'en'}`;
    }
  }

  if (enableTranslation && (!overview || overview.trim().length < 20) && show.overview) {
    const translation = await maybeTranslate(show.overview, store, 'séries TV');
    overview = translation.translated;
    if (translation.usedGroq) {
      translationSource = 'groq';
    }
  }

  const tvmazeInfo = await enrichWithTvMaze(show, store);

  const showData = buildTvShowData(show, {
    translatedOverview: overview,
    translationSource,
    tvmazeInfo
  });

  const showId = upsertTvShow(db, showData);

  if (!includeEpisodes) {
    return {
      id: showId,
      tmdbId,
      seasons: show.number_of_seasons || 0,
      episodes: show.number_of_episodes || 0
    };
  }

  let totalEpisodes = 0;

  for (const seasonSummary of show.seasons || []) {
    if (seasonSummary.season_number < 0) {
      continue;
    }

    const season = await getTvSeason(tmdbId, seasonSummary.season_number, {
      apiKey,
      apiToken,
      language,
      region
    });

    if (!season) {
      continue;
    }

    let seasonOverview = season.overview;
    let seasonSource = 'tmdb';

    if (!seasonOverview && enableTranslation && season.overview) {
      const translation = await maybeTranslate(season.overview, store, 'saisons de séries TV');
      seasonOverview = translation.translated;
      if (translation.usedGroq) {
        seasonSource = 'groq';
      }
    }

    const seasonId = upsertSeason(db, buildSeasonData(season, {
      showId,
      translatedOverview: seasonOverview,
      translationSource: seasonSource
    }));

    if (season.episodes && Array.isArray(season.episodes)) {
      for (const episode of season.episodes) {
        upsertEpisode(db, buildEpisodeData(episode, {
          showId,
          seasonId
        }));
        totalEpisodes += 1;
      }
    }
  }

  return {
    id: showId,
    tmdbId,
    seasons: show.number_of_seasons || 0,
    episodes: totalEpisodes || show.number_of_episodes || 0
  };
}

module.exports = {
  syncTvShowFromTmdb
};
