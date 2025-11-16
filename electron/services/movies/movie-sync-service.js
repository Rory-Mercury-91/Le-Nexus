const { getMovieDetails } = require('../../apis/tmdb');
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

async function maybeTranslate(text, store, context = 'films et séries') {
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

function mapMovieForDb(movie, {
  translatedOverview,
  translationSource
}) {
  return {
    tmdb_id: movie.id,
    imdb_id: movie.imdb_id || null,
    titre: movie.title || movie.original_title || '',
    titre_original: movie.original_title || null,
    tagline: movie.tagline || null,
    synopsis: translatedOverview || movie.overview || null,
    statut: movie.status || null,
    date_sortie: movie.release_date || null,
    duree: movie.runtime || null,
    budget: movie.budget || null,
    revenus: movie.revenue || null,
    note_moyenne: movie.vote_average || null,
    nb_votes: movie.vote_count || null,
    popularite: movie.popularity || null,
    adulte: movie.adult ? 1 : 0,
    genres: toJson(movie.genres),
    mots_cles: toJson(movie.keywords?.keywords || movie.keywords?.results),
    langues_parlees: toJson(movie.spoken_languages),
    compagnies: toJson(movie.production_companies),
    pays_production: toJson(movie.production_countries),
    site_officiel: movie.homepage || null,
    poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null,
    videos: toJson(movie.videos),
    images: toJson(movie.images),
    fournisseurs: toJson(movie['watch/providers']),
    ids_externes: toJson(movie.external_ids),
    traductions: toJson({
      requested: 'fr',
      available: movie.translations,
      source: translationSource
    }),
    donnees_brutes: toJson(movie),
    derniere_sync: new Date().toISOString()
  };
}

function upsertMovie(db, movieData) {
  const columns = Object.keys(movieData);
  const placeholders = columns.map(col => `@${col}`).join(', ');
  const updates = columns
    .filter(col => col !== 'tmdb_id')
    .map(col => `${col} = excluded.${col}`)
    .join(', ');

  const stmt = db.prepare(`
    INSERT INTO movies (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(tmdb_id) DO UPDATE SET
      ${updates},
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(movieData);

  const idRow = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(movieData.tmdb_id);
  return idRow?.id || null;
}

/**
 * Synchronise un film TMDb dans la base locale
 * @param {Object} options
 * @param {number} options.tmdbId
 * @param {Database} options.db
 * @param {Store} options.store
 * @param {string} [options.language='fr-FR']
 * @param {string} [options.region='FR']
 * @param {boolean} [options.enableTranslation=true]
 * @returns {Promise<{ id: number | null, tmdbId: number, usedTranslation: boolean }>}
 */
async function syncMovieFromTmdb({
  tmdbId,
  db,
  store,
  language = 'fr-FR',
  region = 'FR',
  enableTranslation = true
}) {
  const apiKey = store.get('tmdb.apiKey', process.env.TMDB_API_KEY || '');
  const apiToken = store.get('tmdb.apiToken', process.env.TMDB_API_TOKEN || '');

  if (!apiKey && !apiToken) {
    throw new Error('Aucune clé API TMDb définie');
  }

  const movie = await getMovieDetails(tmdbId, {
    apiKey,
    apiToken,
    language,
    region
  });

  if (!movie) {
    throw new Error(`Film TMDb ${tmdbId} introuvable`);
  }

  let overview = movie.overview;
  let translationSource = 'tmdb';

  // Vérifier les traductions TMDb disponibles
  const translations = movie.translations?.translations;
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

  let usedGroq = false;
  if (enableTranslation && (!overview || overview.trim().length < 20) && movie.overview) {
    const translation = await maybeTranslate(movie.overview, store, 'films');
    overview = translation.translated;
    usedGroq = translation.usedGroq;
    if (translation.usedGroq) {
      translationSource = 'groq';
    }
  }

  const movieData = mapMovieForDb(movie, {
    translatedOverview: overview,
    translationSource
  });

  const id = upsertMovie(db, movieData);

  return {
    id,
    tmdbId,
    usedTranslation: usedGroq
  };
}

module.exports = {
  syncMovieFromTmdb
};
