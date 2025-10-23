// API AniList - GraphQL
// Documentation : https://anilist.gitbook.io/anilist-apiv2-docs

const ANILIST_API_URL = 'https://graphql.anilist.co';

// Recherche de mangas sur AniList
async function searchManga(query) {
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: MANGA) {
          id
          title {
            romaji
            english
            native
          }
          description(asHtml: false)
          coverImage {
            extraLarge
            large
          }
          status
          startDate {
            year
          }
          genres
          chapters
          volumes
          format
          countryOfOrigin
          averageScore
          isAdult
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Erreur AniList:', data.errors);
      return [];
    }

    return data.data.Page.media.map(manga => ({
      source: 'anilist',
      id: manga.id.toString(),
      title: manga.title.english || manga.title.romaji || manga.title.native,
      titleRomaji: manga.title.romaji,
      titleNative: manga.title.native,
      description: manga.description ? manga.description.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '') : '',
      coverUrl: manga.coverImage.extraLarge || manga.coverImage.large,
      status: convertAniListStatus(manga.status),
      year: manga.startDate?.year || null,
      genres: manga.genres ? manga.genres.join(', ') : '',
      chapters: manga.chapters || null,
      volumes: manga.volumes || null,
      format: manga.format,
      language: manga.countryOfOrigin === 'JP' ? 'ja' : manga.countryOfOrigin?.toLowerCase(),
      demographie: convertAniListFormat(manga.format),
      rating: manga.isAdult ? 'erotica' : (manga.averageScore > 70 ? 'safe' : 'suggestive')
    }));
  } catch (error) {
    console.error('Erreur recherche AniList:', error);
    return [];
  }
}

// Recherche d'animes sur AniList
async function searchAnime(query) {
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description(asHtml: false)
          coverImage {
            extraLarge
            large
          }
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
          genres
          episodes
          duration
          format
          season
          seasonYear
          countryOfOrigin
          averageScore
          studios {
            nodes {
              name
            }
          }
          isAdult
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Erreur AniList:', data.errors);
      return [];
    }

    return data.data.Page.media.map(anime => ({
      source: 'anilist',
      id: anime.id.toString(),
      title: anime.title.english || anime.title.romaji || anime.title.native,
      titleRomaji: anime.title.romaji,
      titleNative: anime.title.native,
      description: anime.description ? anime.description.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '') : '',
      coverUrl: anime.coverImage.extraLarge || anime.coverImage.large,
      status: convertAniListStatus(anime.status),
      startYear: anime.startDate?.year || null,
      endYear: anime.endDate?.year || null,
      genres: anime.genres ? anime.genres.join(', ') : '',
      episodes: anime.episodes || null,
      duration: anime.duration || null,
      format: anime.format,
      season: anime.season,
      seasonYear: anime.seasonYear,
      language: anime.countryOfOrigin === 'JP' ? 'ja' : anime.countryOfOrigin?.toLowerCase(),
      studios: anime.studios?.nodes.map(s => s.name).join(', ') || '',
      rating: anime.isAdult ? 'erotica' : (anime.averageScore > 70 ? 'safe' : 'suggestive')
    }));
  } catch (error) {
    console.error('Erreur recherche AniList anime:', error);
    return [];
  }
}

// Convertir le statut AniList vers notre format
function convertAniListStatus(status) {
  const statusMap = {
    'FINISHED': 'Terminée',
    'RELEASING': 'En cours',
    'NOT_YET_RELEASED': 'Annoncée',
    'CANCELLED': 'Annulée',
    'HIATUS': 'En pause'
  };
  return statusMap[status] || 'En cours';
}

// Convertir le format AniList vers une démographie approximative
function convertAniListFormat(format) {
  const formatMap = {
    'MANGA': 'Shōnen',
    'LIGHT_NOVEL': 'Light Novel',
    'ONE_SHOT': 'One-shot',
    'DOUJINSHI': 'Doujinshi',
    'MANHWA': 'Manhwa',
    'MANHUA': 'Manhua',
    'NOVEL': 'Novel'
  };
  return formatMap[format] || null;
}

export { searchAnime, searchManga };
