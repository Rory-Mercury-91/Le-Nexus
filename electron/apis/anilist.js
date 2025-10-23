const fetch = require('node-fetch');

/**
 * Récupère les informations de couverture depuis AniList via leur API GraphQL
 * @param {number} malId - L'ID MyAnimeList de l'anime
 * @param {string} [titre] - Le titre de l'anime (optionnel, pour les logs)
 * @returns {Promise<{ coverImage: { extraLarge: string, large: string } | null }>}
 */
async function fetchAniListCover(malId, titre = null) {
  try {
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    `;

    const variables = {
      malId: parseInt(malId)
    };

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    });

    if (!response.ok) {
      const identifier = titre ? `"${titre}" (MAL ID: ${malId})` : `MAL ID ${malId}`;
      console.warn(`⚠️ AniList API erreur HTTP ${response.status} pour ${identifier}`);
      return { coverImage: null };
    }

    const data = await response.json();

    if (data.errors) {
      const identifier = titre ? `"${titre}" (MAL ID: ${malId})` : `MAL ID ${malId}`;
      console.warn(`⚠️ AniList GraphQL erreur pour ${identifier}:`, data.errors[0]?.message);
      return { coverImage: null };
    }

    if (!data.data?.Media) {
      return { coverImage: null };
    }

    return {
      coverImage: data.data.Media.coverImage
    };
  } catch (error) {
    const identifier = titre ? `"${titre}" (MAL ID: ${malId})` : `MAL ID ${malId}`;
    console.error(`❌ Erreur fetchAniListCover pour ${identifier}:`, error.message);
    return { coverImage: null };
  }
}

module.exports = { fetchAniListCover };
