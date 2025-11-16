/**
 * Service d'extraction web pour Nautiljon.
 * Gère le téléchargement des pages HTML depuis Nautiljon.
 */

const { net } = require('electron');

/**
 * Télécharge une page HTML depuis une URL Nautiljon
 * @param {string} url - URL de la page Nautiljon
 * @returns {Promise<string>} - Contenu HTML de la page
 */
async function fetchNautiljonPage(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url: url,
      method: 'GET',
      redirect: 'follow'
    });

    // Headers pour simuler un navigateur
    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
    request.setHeader('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
    request.setHeader('Referer', 'https://www.nautiljon.com/');

    const chunks = [];

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf-8');
        resolve(html);
      });

      response.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
}

/**
 * Extrait les détails d'un tome depuis sa page Nautiljon
 * @param {string} tomeUrl - URL de la page du tome
 * @param {number} volumeNum - Numéro du volume
 * @param {Function} fetchPage - Fonction pour télécharger la page (par défaut: fetchNautiljonPage)
 * @param {Function} parseTomeDetails - Fonction pour parser les détails depuis le HTML
 * @returns {Promise<Object>} - Détails du tome
 */
async function fetchTomeDetails(tomeUrl, volumeNum, fetchPage = fetchNautiljonPage, parseTomeDetails) {
  try {
    const html = await fetchPage(tomeUrl);
    const tomeDetails = parseTomeDetails(html, volumeNum);
    return tomeDetails;
  } catch (error) {
    console.error(`❌ Erreur fetch tome ${volumeNum}:`, error);
    return {
      numero: volumeNum,
      couverture_url: null,
      date_sortie: null,
      prix: 0
    };
  }
}

module.exports = {
  fetchNautiljonPage,
  fetchTomeDetails
};
