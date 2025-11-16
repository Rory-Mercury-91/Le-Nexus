/**
 * Scraper pour récupérer les données d'une série depuis une URL Nautiljon
 * Orchestration principale du scraping (extraction + parsing)
 */

const { fetchNautiljonPage, fetchTomeDetails } = require('./nautiljon-extractor');
const { extractMangaDataFromHTML, extractTomeLinks, parseTomeDetails } = require('./nautiljon-parser');

/**
 * Scrape une page Nautiljon et retourne les données extraites avec les tomes
 * @param {string} url - URL de la page Nautiljon
 * @param {boolean} includeTomes - Si true, récupère aussi les détails de chaque tome
 * @returns {Promise<Object>} - Données extraites avec les tomes
 */
async function scrapeNautiljonPage(url, includeTomes = false) {
  try {
    console.log(`🔍 Scraping de la page Nautiljon: ${url}`);
    const html = await fetchNautiljonPage(url);
    const mangaData = extractMangaDataFromHTML(html, url);
    
    // Extraire les tomes si demandé
    if (includeTomes) {
      console.log(`📚 Extraction des tomes...`);
      const tomeLinks = extractTomeLinks(html, url);
      console.log(`📖 ${tomeLinks.length} tome(s) trouvé(s)`);
      
      if (tomeLinks.length > 0) {
        console.log(`🔄 Récupération des détails des tomes...`);
        const volumes = [];
        
        // Limiter à 30 tomes max pour éviter les timeouts
        const tomesToFetch = tomeLinks.slice(0, 30);
        
        for (const tomeLink of tomesToFetch) {
          // Délai entre chaque requête pour éviter le rate limiting
          if (volumes.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const tomeDetails = await fetchTomeDetails(tomeLink.url, tomeLink.numero, fetchNautiljonPage, parseTomeDetails);
          if (tomeDetails.date_sortie) {
            volumes.push(tomeDetails);
          }
        }
        
        mangaData.volumes = volumes;
        console.log(`✅ ${volumes.length} tome(s) avec date de sortie trouvé(s)`);
      } else {
        mangaData.volumes = [];
      }
    }
    
    console.log(`✅ Données extraites pour "${mangaData.titre}"`);
    return mangaData;
  } catch (error) {
    console.error(`❌ Erreur lors du scraping de ${url}:`, error);
    throw error;
  }
}

module.exports = {
  scrapeNautiljonPage,
  fetchNautiljonPage,
  extractMangaDataFromHTML
};
