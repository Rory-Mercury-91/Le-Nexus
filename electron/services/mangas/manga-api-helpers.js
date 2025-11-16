/**
 * Fonctions utilitaires API pour les mangas
 * Aide à récupérer les données depuis Jikan API
 */

// Helper pour récupérer les données manga depuis Jikan
async function fetchJikanMangaData(malId) {
  const JIKAN_API_URL = 'https://api.jikan.moe/v4';
  
  try {
    const response = await fetch(`${JIKAN_API_URL}/manga/${malId}/full`);
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`);
    }
    
    const result = await response.json();
    const manga = result.data;
    
    return manga;
  } catch (error) {
    console.error(`❌ Erreur Jikan manga ${malId}:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchJikanMangaData
};
