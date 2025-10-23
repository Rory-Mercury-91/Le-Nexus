const fetch = require('node-fetch');

/**
 * Récupère les informations de couverture depuis AniList via leur API GraphQL
 * @param {number} malId - L'ID MyAnimeList de l'anime
 * @returns {Promise<{ coverImage: { extraLarge: string, large: string } | null }>}
 */
async function fetchAniListCover(malId) {
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
      console.warn(`⚠️ AniList API erreur HTTP ${response.status} pour MAL ID ${malId}`);
      return { coverImage: null };
    }

    const data = await response.json();

    if (data.errors) {
      console.warn(`⚠️ AniList GraphQL erreur pour MAL ID ${malId}:`, data.errors[0]?.message);
      return { coverImage: null };
    }

    if (!data.data?.Media) {
      return { coverImage: null };
    }

    return {
      coverImage: data.data.Media.coverImage
    };
  } catch (error) {
    console.error(`❌ Erreur fetchAniListCover pour MAL ID ${malId}:`, error.message);
    return { coverImage: null };
  }
}

module.exports = { fetchAniListCover };
