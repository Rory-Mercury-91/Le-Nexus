/**
 * Appels API AniList GraphQL
 * Récupère les listes manga et anime de l'utilisateur depuis AniList
 */

const fetch = require('node-fetch');

/**
 * Récupère la liste complète des mangas de l'utilisateur depuis AniList
 * @param {string} accessToken - Access token AniList
 * @returns {Promise<Array>} Liste des mangas
 */
async function getUserMangaList(accessToken) {
  const query = `
    query ($userId: Int) {
      MediaListCollection(userId: $userId, type: MANGA) {
        lists {
          entries {
            id
            status
            score
            progress
            progressVolumes
            repeat
            priority
            private
            notes
            hiddenFromStatusLists
            startedAt {
              year
              month
              day
            }
            completedAt {
              year
              month
              day
            }
            updatedAt
            media {
              id
              idMal
              title {
                romaji
                english
                native
              }
              description
              format
              status
              startDate {
                year
                month
                day
              }
              endDate {
                year
                month
                day
              }
              chapters
              volumes
              coverImage {
                extraLarge
                large
                medium
              }
              genres
              tags {
                name
              }
              averageScore
              meanScore
              popularity
              favourites
              relations {
                edges {
                  relationType
                  node {
                    id
                    idMal
                    title {
                      romaji
                      english
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // D'abord récupérer l'ID de l'utilisateur
  const viewerQuery = `
    query {
      Viewer {
        id
      }
    }
  `;

  const viewerResponse = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query: viewerQuery })
  });

  if (!viewerResponse.ok) {
    throw new Error(`Failed to get user ID: ${viewerResponse.status}`);
  }

  const viewerData = await viewerResponse.json();
  if (viewerData.errors) {
    throw new Error(viewerData.errors[0]?.message || 'Failed to get user ID');
  }

  const userId = viewerData.data?.Viewer?.id;
  if (!userId) {
    throw new Error('User ID not found');
  }

  console.log(`📡 Récupération liste manga depuis AniList (userId: ${userId})...`);

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query,
      variables: { userId }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur réponse manga AniList:', response.status, errorText);
    throw new Error(`Failed to fetch manga list: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.errors) {
    console.error('❌ Erreurs GraphQL manga AniList:', JSON.stringify(data.errors, null, 2));
    throw new Error(data.errors[0]?.message || 'Failed to fetch manga list');
  }

  const allMangas = [];
  const lists = data.data?.MediaListCollection?.lists || [];

  for (const list of lists) {
    for (const entry of list.entries || []) {
      allMangas.push(entry);
    }
  }

  console.log(`✅ ${allMangas.length} manga(s) récupéré(s) depuis AniList`);
  return allMangas;
}

/**
 * Récupère la liste complète des animes de l'utilisateur depuis AniList
 * @param {string} accessToken - Access token AniList
 * @returns {Promise<Array>} Liste des animes
 */
async function getUserAnimeList(accessToken) {
  const query = `
    query ($userId: Int) {
      MediaListCollection(userId: $userId, type: ANIME) {
        lists {
          entries {
            id
            status
            score
            progress
            repeat
            priority
            private
            notes
            hiddenFromStatusLists
            startedAt {
              year
              month
              day
            }
            completedAt {
              year
              month
              day
            }
            updatedAt
            media {
              id
              idMal
              title {
                romaji
                english
                native
              }
              description
              format
              status
              episodes
              duration
              startDate {
                year
                month
                day
              }
              endDate {
                year
                month
                day
              }
              coverImage {
                extraLarge
                large
                medium
              }
              genres
              tags {
                name
              }
              averageScore
              meanScore
              popularity
              favourites
              studios {
                nodes {
                  name
                }
              }
              staff {
                nodes {
                  name {
                    full
                  }
                }
              }
              relations {
                edges {
                  relationType
                  node {
                    id
                    idMal
                    title {
                      romaji
                      english
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // D'abord récupérer l'ID de l'utilisateur
  const viewerQuery = `
    query {
      Viewer {
        id
      }
    }
  `;

  const viewerResponse = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query: viewerQuery })
  });

  if (!viewerResponse.ok) {
    throw new Error(`Failed to get user ID: ${viewerResponse.status}`);
  }

  const viewerData = await viewerResponse.json();
  if (viewerData.errors) {
    throw new Error(viewerData.errors[0]?.message || 'Failed to get user ID');
  }

  const userId = viewerData.data?.Viewer?.id;
  if (!userId) {
    throw new Error('User ID not found');
  }

  console.log(`📡 Récupération liste anime depuis AniList (userId: ${userId})...`);

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query,
      variables: { userId }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur réponse anime AniList:', response.status, errorText);
    throw new Error(`Failed to fetch anime list: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.errors) {
    console.error('❌ Erreurs GraphQL anime AniList:', JSON.stringify(data.errors, null, 2));
    throw new Error(data.errors[0]?.message || 'Failed to fetch anime list');
  }

  const allAnimes = [];
  const lists = data.data?.MediaListCollection?.lists || [];

  for (const list of lists) {
    for (const entry of list.entries || []) {
      allAnimes.push(entry);
    }
  }

  console.log(`✅ ${allAnimes.length} anime(s) récupéré(s) depuis AniList`);
  return allAnimes;
}

/**
 * Récupère les données d'un manga depuis AniList par son ID
 * @param {string} accessToken - Access token AniList
 * @param {number} anilistId - ID AniList du manga
 * @returns {Promise<Object>} Données du manga
 */
async function getMangaById(accessToken, anilistId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        format
        status
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        chapters
        volumes
        coverImage {
          extraLarge
          large
          medium
        }
        genres
        tags {
          name
          description
          category
        }
        averageScore
        meanScore
        popularity
        favourites
        staff {
          edges {
            role
            node {
              id
              name {
                full
                native
              }
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              idMal
              type
              title {
                romaji
                english
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query,
      variables: { id: anilistId }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch manga: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to fetch manga');
  }

  return data.data?.Media || null;
}

/**
 * Récupère les données d'un anime depuis AniList par son ID
 * @param {string} accessToken - Access token AniList
 * @param {number} anilistId - ID AniList de l'anime
 * @returns {Promise<Object>} Données de l'anime
 */
async function getAnimeById(accessToken, anilistId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        format
        status
        episodes
        duration
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        coverImage {
          extraLarge
          large
          medium
        }
        genres
        tags {
          name
        }
        averageScore
        meanScore
        popularity
        favourites
        studios {
          nodes {
            name
          }
        }
        staff {
          nodes {
            name {
              full
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              idMal
              title {
                romaji
                english
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query,
      variables: { id: anilistId }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch anime: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to fetch anime');
  }

  return data.data?.Media || null;
}

module.exports = {
  getUserMangaList,
  getUserAnimeList,
  getMangaById,
  getAnimeById
};
