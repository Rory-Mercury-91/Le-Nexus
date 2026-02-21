const fetch = require('node-fetch');

const RAWG_API_ENDPOINT = 'https://api.rawg.io/api';

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

/**
 * Effectue une requête à l'API RAWG
 * @param {string} path - Chemin de l'endpoint (ex: '/games')
 * @param {Object} options - Options de la requête
 * @param {string} options.apiKey - Clé API RAWG
 * @param {string} [options.method='GET'] - Méthode HTTP
 * @param {Object} [options.params={}] - Paramètres de requête
 * @returns {Promise<Object>} Réponse JSON de l'API
 */
async function requestRawg(path, {
  apiKey,
  method = 'GET',
  params = {}
} = {}) {
  if (!apiKey) {
    throw new Error('RAWG API key missing');
  }

  const query = buildQuery({ ...params, key: apiKey });
  const url = `${RAWG_API_ENDPOINT}${path}${query ? `?${query}` : ''}`;

  const headers = {
    'Content-Type': 'application/json;charset=utf-8'
  };

  const response = await fetch(url, {
    method,
    headers
  });

  if (!response.ok) {
    const message = `RAWG request failed (${response.status} ${response.statusText})`;
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

  return await response.json();
}

/**
 * Recherche des jeux sur RAWG
 * @param {string} query - Terme de recherche
 * @param {Object} options - Options de recherche
 * @param {string} options.apiKey - Clé API RAWG
 * @param {number} [options.page=1] - Numéro de page
 * @param {number} [options.pageSize=20] - Nombre de résultats par page
 * @returns {Promise<Object>} Résultats de la recherche
 */
async function searchGames(query, options = {}) {
  return requestRawg('/games', {
    ...options,
    params: {
      search: query,
      page: options.page || 1,
      page_size: options.pageSize || 20
    }
  });
}

/**
 * Récupère les détails d'un jeu par son ID RAWG
 * @param {number} rawgId - ID du jeu sur RAWG
 * @param {Object} options - Options
 * @param {string} options.apiKey - Clé API RAWG
 * @returns {Promise<Object>} Détails du jeu
 */
async function getGameDetails(rawgId, options = {}) {
  return requestRawg(`/games/${rawgId}`, {
    ...options,
    params: {}
  });
}

module.exports = {
  searchGames,
  getGameDetails
};
