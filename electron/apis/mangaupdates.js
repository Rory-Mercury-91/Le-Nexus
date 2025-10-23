// API MangaUpdates
// Documentation : https://api.mangaupdates.com/v1/docs

const MANGAUPDATES_API_URL = 'https://api.mangaupdates.com/v1';

// Recherche de mangas sur MangaUpdates
async function searchManga(query) {
  try {
    const response = await fetch(`${MANGAUPDATES_API_URL}/series/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        search: query,
        perpage: 10
      })
    });
    
    const data = await response.json();

    if (!data.results) {
      return [];
    }

    return data.results.map(manga => {
      // Chercher le titre français dans les titres alternatifs
      const frenchTitle = manga.title_associated?.find(t => 
        t.toLowerCase().startsWith('le ') || 
        t.toLowerCase().startsWith('la ') || 
        t.toLowerCase().startsWith('les ') ||
        t.toLowerCase().startsWith('l\'')
      );

      return {
        source: 'mangaupdates',
        id: manga.record?.series_id?.toString() || manga.hit_id?.toString(),
        title: manga.record?.title || manga.title,
        titleFrench: frenchTitle,
        description: manga.record?.description || '',
        coverUrl: manga.record?.image?.url?.original || null,
        status: convertMUStatus(manga.record?.status),
        year: manga.record?.year ? parseInt(manga.record.year) : null,
        genres: manga.record?.genres?.map(g => g.genre).join(', ') || '',
        chapters: null,
        volumes: null,
        rating: manga.record?.bayesian_rating || null,
        demographie: manga.record?.type || null
      };
    });
  } catch (error) {
    console.error('Erreur recherche MangaUpdates:', error);
    return [];
  }
}

// Convertir le statut MangaUpdates vers notre format
function convertMUStatus(status) {
  if (!status) return 'En cours';
  
  const statusMap = {
    'Complete': 'Terminée',
    'Ongoing': 'En cours',
    'Hiatus': 'En pause',
    'Cancelled': 'Annulée'
  };
  return statusMap[status] || 'En cours';
}

export { searchManga };
