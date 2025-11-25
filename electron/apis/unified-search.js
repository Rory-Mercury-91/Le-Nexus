// Système de recherche unifié avec fallback automatique
// MyAnimeList uniquement (AniList géré directement dans search-handlers.js)

const MyAnimeList = require('./myanimelist');
const { generateSearchVariants, isFrenchQuery } = require('./searchHelper');

/**
 * Recherche d'animes sur toutes les API disponibles avec fallback
 * @param {string} query - Titre de l'anime à rechercher
 * @param {Object} options - Options de recherche
 * @param {boolean} options.tryAllSources - Essayer toutes les sources (défaut: false, s'arrête à la première qui répond)
 * @returns {Promise<Array>} - Résultats de recherche avec source identifiée
 */
async function searchAnime(query, options = {}) {
  const { tryAllSources = false } = options;
  
  console.log(`🔍 Recherche anime: "${query}"`);
  
  // Générer des variantes de recherche si la requête est en français
  const searchVariants = isFrenchQuery(query) 
    ? generateSearchVariants(query) 
    : [query];
  
  console.log(`📝 Variantes de recherche:`, searchVariants);
  
  const allResults = [];
  
  // MyAnimeList uniquement
  const apis = [
    { name: 'MyAnimeList', func: MyAnimeList.searchAnime, priority: 1 }
  ];
  
  for (const api of apis) {
    
    try {
      console.log(`🔎 Tentative de recherche sur ${api.name}...`);
      
      let apiResults = [];
      
      // Essayer toutes les variantes de recherche
      for (const variant of searchVariants) {
        try {
          const results = await api.func(variant);
          if (results && results.length > 0) {
            apiResults.push(...results);
            console.log(`✅ ${api.name}: ${results.length} résultat(s) pour "${variant}"`);
            
            // Si on ne veut pas essayer toutes les sources et qu'on a des résultats, on s'arrête
            if (!tryAllSources && results.length > 0) {
              break;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erreur sur ${api.name} avec "${variant}":`, error.message);
        }
      }
      
      if (apiResults.length > 0) {
        // Dédupliquer les résultats par titre
        const uniqueResults = deduplicateResults(apiResults);
        allResults.push(...uniqueResults);
        
        console.log(`✅ ${api.name}: ${uniqueResults.length} résultat(s) unique(s)`);
        
        // Si on ne veut pas essayer toutes les sources et qu'on a des résultats, on s'arrête
        if (!tryAllSources) {
          break;
        }
      } else {
        console.log(`❌ ${api.name}: Aucun résultat`);
      }
    } catch (error) {
      console.error(`❌ Erreur ${api.name}:`, error);
    }
  }
  
  // Dédupliquer tous les résultats finaux
  const finalResults = deduplicateResults(allResults);
  console.log(`🎯 Total final: ${finalResults.length} résultat(s)`);
  
  return finalResults;
}

/**
 * Recherche de mangas sur toutes les API disponibles avec fallback
 * @param {string} query - Titre du manga à rechercher
 * @param {Object} options - Options de recherche
 * @param {boolean} options.tryAllSources - Essayer toutes les sources (défaut: false)
 * @returns {Promise<Array>} - Résultats de recherche avec source identifiée
 */
async function searchManga(query, options = {}) {
  const { tryAllSources = false } = options;
  
  console.log(`🔍 Recherche manga: "${query}"`);
  
  // Générer des variantes de recherche si la requête est en français
  const searchVariants = isFrenchQuery(query) 
    ? generateSearchVariants(query) 
    : [query];
  
  console.log(`📝 Variantes de recherche:`, searchVariants);
  
  const allResults = [];
  
  // MyAnimeList uniquement
  const apis = [
    { name: 'MyAnimeList', func: MyAnimeList.searchManga, priority: 1 }
  ];
  
  for (const api of apis) {
    try {
      console.log(`🔎 Tentative de recherche sur ${api.name}...`);
      
      let apiResults = [];
      
      // Essayer toutes les variantes de recherche
      for (const variant of searchVariants) {
        try {
          const results = await api.func(variant);
          if (results && results.length > 0) {
            apiResults.push(...results);
            console.log(`✅ ${api.name}: ${results.length} résultat(s) pour "${variant}"`);
            
            if (!tryAllSources && results.length > 0) {
              break;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erreur sur ${api.name} avec "${variant}":`, error.message);
        }
      }
      
      if (apiResults.length > 0) {
        const uniqueResults = deduplicateResults(apiResults);
        allResults.push(...uniqueResults);
        
        console.log(`✅ ${api.name}: ${uniqueResults.length} résultat(s) unique(s)`);
        
        if (!tryAllSources) {
          break;
        }
      } else {
        console.log(`❌ ${api.name}: Aucun résultat`);
      }
    } catch (error) {
      console.error(`❌ Erreur ${api.name}:`, error);
    }
  }
  
  const finalResults = deduplicateResults(allResults);
  console.log(`🎯 Total final: ${finalResults.length} résultat(s)`);
  
  return finalResults;
}

/**
 * Dédupliquer les résultats en fonction du titre
 * Garde le premier résultat (priorité à la source de meilleure qualité)
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(result => {
    const normalizedTitle = normalizeTitle(result.title);
    if (seen.has(normalizedTitle)) {
      return false;
    }
    seen.add(normalizedTitle);
    return true;
  });
}

/**
 * Normaliser un titre pour la comparaison
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Enlever ponctuation
    .replace(/\s+/g, ' '); // Normaliser espaces
}

module.exports = {
  searchAnime,
  searchManga
};
