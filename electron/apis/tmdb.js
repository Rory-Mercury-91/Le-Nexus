const fetch = require('node-fetch');

const TMDB_REST_ENDPOINT = 'https://api.themoviedb.org/3';

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

async function requestTmdb(path, {
  apiKey,
  apiToken,
  method = 'GET',
  params = {},
  body = null,
  language = 'fr-FR',
  region = 'FR'
} = {}) {
  if (!apiKey && !apiToken) {
    throw new Error('TMDb API key or token missing');
  }

  const query = buildQuery({ language, region, ...params, api_key: apiToken ? undefined : apiKey });
  const url = `${TMDB_REST_ENDPOINT}${path}${query ? `?${query}` : ''}`;

  const headers = {
    'Content-Type': 'application/json;charset=utf-8'
  };

  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const message = `TMDb request failed (${response.status} ${response.statusText})`;
    let details;
    try {
      details = await response.json();
    } catch {
      // ignore
    }
    const error = new Error(message);
    error.status = response.status;
    error.details = details;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function searchMovies(query, options = {}) {
  return requestTmdb('/search/movie', {
    ...options,
    params: {
      include_adult: false,
      query,
      page: options.page || 1,
      year: options.year
    }
  });
}

async function searchTv(query, options = {}) {
  return requestTmdb('/search/tv', {
    ...options,
    params: {
      include_adult: false,
      query,
      page: options.page || 1,
      first_air_date_year: options.year
    }
  });
}

async function getConfiguration(options = {}) {
  return requestTmdb('/configuration', options);
}

async function getMovieDetails(tmdbId, options = {}) {
  return requestTmdb(`/movie/${tmdbId}`, {
    ...options,
    params: {
      append_to_response: [
        'credits',
        'keywords',
        'release_dates',
        'videos',
        'images',
        'external_ids',
        'watch/providers',
        'translations',
        'recommendations',
        'similar'
      ].join(','),
      include_image_language: 'fr,en,null',
      include_video_language: 'fr,en,null'
    }
  });
}

async function getTvDetails(tmdbId, options = {}) {
  return requestTmdb(`/tv/${tmdbId}`, {
    ...options,
    params: {
      append_to_response: [
        'aggregate_credits',
        'keywords',
        'content_ratings',
        'videos',
        'images',
        'external_ids',
        'watch/providers',
        'translations',
        'recommendations',
        'similar'
      ].join(','),
      include_image_language: 'fr,en,null',
      include_video_language: 'fr,en,null'
    }
  });
}

async function getTvSeason(tmdbId, seasonNumber, options = {}) {
  return requestTmdb(`/tv/${tmdbId}/season/${seasonNumber}`, {
    ...options,
    params: {
      append_to_response: [
        'translations',
        'credits',
        'videos'
      ].join(',')
    }
  });
}

module.exports = {
  searchMovies,
  searchTv,
  getConfiguration,
  getMovieDetails,
  getTvDetails,
  getTvSeason
};
