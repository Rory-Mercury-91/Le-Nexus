// API MyAnimeList via Jikan (API non-officielle mais gratuite)
// Documentation : https://docs.api.jikan.moe/

const JIKAN_API_URL = 'https://api.jikan.moe/v4';

// Recherche de mangas sur MyAnimeList
async function searchManga(query) {
  try {
    // Si la requête est un nombre, chercher directement par MAL ID
    const malId = parseInt(query.trim(), 10);
    if (!isNaN(malId) && malId > 0) {
      try {
        const response = await fetch(`${JIKAN_API_URL}/manga/${malId}`);
        const data = await response.json();

        if (data.data && data.data.mal_id) {
          const manga = data.data;
          return [{
            source: 'myanimelist',
            id: manga.mal_id.toString(),
            title: manga.title,
            titleEnglish: manga.title_english,
            titleJapanese: manga.title_japanese,
            titleFrench: manga.title_synonyms?.find(t => t.toLowerCase().includes('le ') || t.toLowerCase().includes('la ') || t.toLowerCase().includes('les ')),
            description: manga.synopsis || '',
            coverUrl: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
            status: convertMALStatus(manga.status),
            year: manga.published?.from ? new Date(manga.published.from).getFullYear() : null,
            genres: manga.genres?.map(g => g.name).join(', ') || '',
            chapters: manga.chapters || null,
            volumes: manga.volumes || null,
            score: manga.score || null,
            scored_by: manga.scored_by || null,
            demographie: manga.demographics?.[0]?.name || null,
            rating: manga.rating ? convertMALRating(manga.rating) : null
          }];
        }
      } catch (idError) {
        // Si la recherche par ID échoue, continuer avec la recherche textuelle
        console.warn(`Recherche par MAL ID ${malId} échouée, tentative recherche textuelle:`, idError.message);
      }
    }

    // Recherche textuelle normale
    const response = await fetch(`${JIKAN_API_URL}/manga?q=${encodeURIComponent(query)}&limit=10`);
    const data = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data.map(manga => ({
      source: 'myanimelist',
      id: manga.mal_id.toString(),
      title: manga.title,
      titleEnglish: manga.title_english,
      titleJapanese: manga.title_japanese,
      titleFrench: manga.title_synonyms?.find(t => t.toLowerCase().includes('le ') || t.toLowerCase().includes('la ') || t.toLowerCase().includes('les ')),
      description: manga.synopsis || '',
      coverUrl: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
      status: convertMALStatus(manga.status),
      year: manga.published?.from ? new Date(manga.published.from).getFullYear() : null,
      genres: manga.genres?.map(g => g.name).join(', ') || '',
      chapters: manga.chapters || null,
      volumes: manga.volumes || null,
      score: manga.score || null,
      scored_by: manga.scored_by || null,
      demographie: manga.demographics?.[0]?.name || null,
      rating: manga.rating ? convertMALRating(manga.rating) : null
    }));
  } catch (error) {
    console.error('Erreur recherche MyAnimeList:', error);
    return [];
  }
}

// Convertir le statut MAL vers notre format
function convertMALStatus(status) {
  const statusMap = {
    'Finished': 'Terminée',
    'Publishing': 'En cours',
    'On Hiatus': 'En pause',
    'Discontinued': 'Annulée',
    'Not yet published': 'Annoncée'
  };
  return statusMap[status] || 'En cours';
}

// Recherche d'animes sur MyAnimeList
async function searchAnime(query) {
  try {
    // Si la requête est un nombre, chercher directement par MAL ID
    const malId = parseInt(query.trim(), 10);
    if (!isNaN(malId) && malId > 0) {
      try {
        const response = await fetch(`${JIKAN_API_URL}/anime/${malId}`);
        const data = await response.json();

        if (data.data && data.data.mal_id) {
          const anime = data.data;
          return [{
            source: 'myanimelist',
            id: anime.mal_id.toString(),
            title: anime.title,
            titleEnglish: anime.title_english,
            titleJapanese: anime.title_japanese,
            titleRomaji: anime.title_synonyms?.[0] || anime.title,
            description: anime.synopsis || '',
            coverUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
            status: convertMALAnimeStatus(anime.status),
            startYear: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
            endYear: anime.aired?.to ? new Date(anime.aired.to).getFullYear() : null,
            genres: anime.genres?.map(g => g.name).join(', ') || '',
            episodes: anime.episodes || null,
            duration: anime.duration ? parseInt(anime.duration) : null,
            format: convertMALAnimeType(anime.type),
            season: anime.season || null,
            seasonYear: anime.year || null,
            studios: anime.studios?.map(s => s.name).join(', ') || null,
            score: anime.score || null,
            scored_by: anime.scored_by || null,
            rating: anime.rating ? convertMALRating(anime.rating) : null
          }];
        }
      } catch (idError) {
        // Si la recherche par ID échoue, continuer avec la recherche textuelle
        console.warn(`Recherche par MAL ID ${malId} échouée, tentative recherche textuelle:`, idError.message);
      }
    }

    // Recherche textuelle normale
    const response = await fetch(`${JIKAN_API_URL}/anime?q=${encodeURIComponent(query)}&limit=10`);
    const data = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data.map(anime => ({
      source: 'myanimelist',
      id: anime.mal_id.toString(),
      title: anime.title,
      titleEnglish: anime.title_english,
      titleJapanese: anime.title_japanese,
      titleRomaji: anime.title_synonyms?.[0] || anime.title,
      description: anime.synopsis || '',
      coverUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      status: convertMALAnimeStatus(anime.status),
      startYear: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null,
      endYear: anime.aired?.to ? new Date(anime.aired.to).getFullYear() : null,
      genres: anime.genres?.map(g => g.name).join(', ') || '',
      episodes: anime.episodes || null,
      duration: anime.duration ? parseInt(anime.duration) : null,
      format: convertMALAnimeType(anime.type),
      season: anime.season || null,
      seasonYear: anime.year || null,
      studios: anime.studios?.map(s => s.name).join(', ') || null,
      score: anime.score || null,
      scored_by: anime.scored_by || null,
      rating: anime.rating ? convertMALRating(anime.rating) : null
    }));
  } catch (error) {
    console.error('Erreur recherche MyAnimeList anime:', error);
    return [];
  }
}

// Convertir le statut MAL anime vers notre format
function convertMALAnimeStatus(status) {
  const statusMap = {
    'Finished Airing': 'Terminé',
    'Currently Airing': 'En cours',
    'Not yet aired': 'Annoncé'
  };
  return statusMap[status] || 'En cours';
}

// Convertir le type d'anime MAL
function convertMALAnimeType(type) {
  const typeMap = {
    'TV': 'TV',
    'Movie': 'Film',
    'OVA': 'OVA',
    'ONA': 'ONA',
    'Special': 'Spécial',
    'Music': 'Clip musical'
  };
  return typeMap[type] || 'TV';
}

// Convertir le rating MAL
function convertMALRating(rating) {
  if (!rating) return null;
  // Rx = contenu pornographique explicite (le plus explicite)
  if (rating.includes('Rx') || rating.includes('Hentai')) return 'erotica';
  // R+ = contenu adulte explicite
  if (rating.includes('R+') || rating.includes('R-')) return 'erotica';
  // R - 17+ = contenu mature (violence, langage) → suggestive
  if (rating.includes('R - 17') || rating.includes('17+')) return 'suggestive';
  // PG-13 = contenu pour adolescents (13+) → safe
  if (rating.includes('PG-13')) return 'safe';
  // Par défaut = safe
  return 'safe';
}

module.exports = {
  searchAnime,
  searchManga
};
