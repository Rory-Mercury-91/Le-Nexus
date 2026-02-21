const fetch = require('node-fetch');

const TVMAZE_ENDPOINT = 'https://api.tvmaze.com';

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
}

async function requestTvMaze(path, { params = {}, method = 'GET', body = null } = {}) {
  const query = buildQuery(params);
  const url = `${TVMAZE_ENDPOINT}${path}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const message = `TV Maze request failed (${response.status} ${response.statusText})`;
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

async function lookupShow({ imdb, thetvdb, tvmaze }) {
  if (tvmaze) {
    return requestTvMaze(`/shows/${tvmaze}`);
  }
  if (imdb) {
    return requestTvMaze('/lookup/shows', { params: { imdb } });
  }
  if (thetvdb) {
    return requestTvMaze('/lookup/shows', { params: { thetvdb } });
  }
  throw new Error('Missing lookup identifiers for TV Maze');
}

module.exports = {
  lookupShow
};
