/**
 * Fonctions utilitaires API pour les mangas
 * Aide à récupérer les données depuis Jikan API
 */

// Délai minimum entre les appels Jikan (3 requêtes/seconde max = ~333ms entre chaque)
const JIKAN_DELAY = 400; // 400ms pour être sûr de ne pas dépasser la limite
let lastJikanCall = 0;

// Helper pour récupérer les données manga depuis Jikan avec rate-limiting et retry
async function fetchJikanMangaData(malId, retries = 3) {
  const JIKAN_API_URL = 'https://api.jikan.moe/v4';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Respecter le rate-limiting : attendre si nécessaire
      const now = Date.now();
      const timeSinceLastCall = now - lastJikanCall;
      if (timeSinceLastCall < JIKAN_DELAY) {
        const waitTime = JIKAN_DELAY - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      lastJikanCall = Date.now();
      
      const response = await fetch(`${JIKAN_API_URL}/manga/${malId}/full`);
      
      if (response.status === 429) {
        // Rate limit atteint, attendre plus longtemps
        const waitTime = attempt * 3000; // 3s, 6s, 9s
        console.log(`⏳ Jikan rate limit atteint pour MAL ${malId}, attente ${waitTime}ms (tentative ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.status}`);
      }
      
      const result = await response.json();
      const manga = result.data;
      
      return manga;
    } catch (error) {
      if (attempt === retries) {
        console.error(`❌ Erreur Jikan manga ${malId} après ${retries} tentatives:`, error.message);
        throw error;
      }
      // Attendre avant de réessayer
      const waitTime = attempt * 2000; // 2s, 4s, 6s
      console.log(`⏳ Erreur Jikan manga ${malId}, nouvelle tentative dans ${waitTime}ms (${attempt}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to fetch Jikan data for manga ${malId} after ${retries} attempts`);
}

module.exports = {
  fetchJikanMangaData
};
