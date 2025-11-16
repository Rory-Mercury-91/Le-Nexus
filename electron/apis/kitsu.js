// API Kitsu - REST
// Documentation : https://kitsu.docs.apiary.io/

const KITSU_API_URL = 'https://kitsu.io/api/edge';

// Recherche de mangas sur Kitsu
async function searchManga(query) {
  try {
    const response = await fetch(`${KITSU_API_URL}/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=10`);
    const data = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data.map(manga => ({
      source: 'kitsu',
      id: manga.id,
      title: manga.attributes.titles?.en || manga.attributes.titles?.en_jp || manga.attributes.canonicalTitle,
      titleRomaji: manga.attributes.titles?.en_jp || manga.attributes.canonicalTitle,
      titleNative: manga.attributes.titles?.ja_jp || null,
      description: manga.attributes.synopsis || manga.attributes.description || '',
      coverUrl: manga.attributes.posterImage?.large || manga.attributes.posterImage?.original,
      status: convertKitsuStatus(manga.attributes.status),
      year: manga.attributes.startDate ? new Date(manga.attributes.startDate).getFullYear() : null,
      genres: null, // Kitsu nécessite des requêtes supplémentaires pour les genres
      chapters: manga.attributes.chapterCount || null,
      volumes: manga.attributes.volumeCount || null,
      format: convertKitsuMangaType(manga.attributes.mangaType),
      language: 'ja',
      demographie: convertKitsuMangaType(manga.attributes.mangaType),
      rating: convertKitsuRating(manga.attributes.ageRating)
    }));
  } catch (error) {
    console.error('Erreur recherche Kitsu:', error);
    return [];
  }
}

// Recherche d'animes sur Kitsu
async function searchAnime(query) {
  try {
    const response = await fetch(`${KITSU_API_URL}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=10`);
    const data = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data.map(anime => ({
      source: 'kitsu',
      id: anime.id,
      title: anime.attributes.titles?.en || anime.attributes.titles?.en_jp || anime.attributes.canonicalTitle,
      titleRomaji: anime.attributes.titles?.en_jp || anime.attributes.canonicalTitle,
      titleNative: anime.attributes.titles?.ja_jp || null,
      description: anime.attributes.synopsis || anime.attributes.description || '',
      coverUrl: anime.attributes.posterImage?.large || anime.attributes.posterImage?.original,
      status: convertKitsuStatus(anime.attributes.status),
      startYear: anime.attributes.startDate ? new Date(anime.attributes.startDate).getFullYear() : null,
      endYear: anime.attributes.endDate ? new Date(anime.attributes.endDate).getFullYear() : null,
      genres: null, // Kitsu nécessite des requêtes supplémentaires pour les genres
      episodes: anime.attributes.episodeCount || null,
      duration: anime.attributes.episodeLength || null,
      format: convertKitsuAnimeType(anime.attributes.showType),
      season: null,
      seasonYear: anime.attributes.startDate ? new Date(anime.attributes.startDate).getFullYear() : null,
      language: 'ja',
      studios: null,
      rating: convertKitsuRating(anime.attributes.ageRating)
    }));
  } catch (error) {
    console.error('Erreur recherche Kitsu anime:', error);
    return [];
  }
}

// Convertir le statut Kitsu vers notre format
function convertKitsuStatus(status) {
  const statusMap = {
    'finished': 'Terminée',
    'current': 'En cours',
    'upcoming': 'Annoncée',
    'unreleased': 'Annoncée'
  };
  return statusMap[status] || 'En cours';
}

// Convertir le type de manga Kitsu
function convertKitsuMangaType(type) {
  const typeMap = {
    'manga': 'Shōnen',
    'novel': 'Light Novel',
    'manhua': 'Manhua',
    'manhwa': 'Manhwa',
    'oneshot': 'One-shot',
    'doujin': 'Doujinshi'
  };
  return typeMap[type] || null;
}

// Convertir le type d'anime Kitsu
function convertKitsuAnimeType(type) {
  const typeMap = {
    'TV': 'TV',
    'movie': 'Film',
    'OVA': 'OVA',
    'ONA': 'ONA',
    'special': 'Spécial',
    'music': 'Clip musical'
  };
  return typeMap[type] || 'TV';
}

// Convertir le rating Kitsu
function convertKitsuRating(rating) {
  const ratingMap = {
    'G': 'safe',
    'PG': 'safe',
    'R': 'suggestive',
    'R18': 'erotica'
  };
  return ratingMap[rating] || 'safe';
}

module.exports = {
  searchAnime,
  searchManga
};
