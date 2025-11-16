/**
 * Téléchargement des couvertures
 * Gère le téléchargement d'images depuis des URLs externes
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { net } = require('electron');
const { createSlug } = require('../../utils/slug');

/**
 * Télécharge une image en utilisant Electron.net.request (moteur Chromium)
 * Utilisé pour contourner les protections anti-scraping de certains sites
 */
function downloadWithElectronNet(imageUrl, fullPath, relativePath, refererUrl) {
  return new Promise((resolve, reject) => {
    console.log(`🌐 Téléchargement via Electron.net: ${imageUrl}`);
    
    const request = net.request({
      url: imageUrl,
      method: 'GET',
      redirect: 'follow'
    });

    // Ajouter les headers
    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    request.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
    request.setHeader('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
    if (refererUrl) {
      request.setHeader('Referer', refererUrl);
    }

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
        try {
          const buffer = Buffer.concat(chunks);

          if (buffer.byteLength === 0) {
            reject(new Error('Le buffer téléchargé est vide'));
            return;
          }

          if (buffer.byteLength < 1000) {
            const preview = buffer.toString('utf8', 0, Math.min(200, buffer.byteLength));
            console.log(`⚠️ Buffer trop petit, aperçu: ${preview}`);
            reject(new Error(`Image trop petite: ${buffer.byteLength} bytes`));
            return;
          }

          // Vérifier les magic bytes et déterminer l'extension
          const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
          const isWEBP = buffer[8] === 0x57 && buffer[9] === 0x45;
          const isAVIF = buffer.byteLength > 12 && (
            buffer.toString('utf8', 4, 12).includes('ftyp') ||
            buffer.toString('utf8', 4, 12).includes('avif')
          );

          let detectedExt = '';
          if (isPNG) detectedExt = '.png';
          else if (isJPEG) detectedExt = '.jpg';
          else if (isWEBP) detectedExt = '.webp';
          else if (isAVIF) detectedExt = '.avif';

          if (!detectedExt) {
            console.warn(`⚠️ Format non reconnu. Premiers octets:`, buffer.slice(0, 16));
            reject(new Error('Format d\'image non reconnu'));
            return;
          }

          // Ajouter l'extension si elle n'est pas déjà présente
          let finalPath = fullPath;
          if (!fullPath.match(/\.(png|jpg|jpeg|webp|avif)$/i)) {
            finalPath = fullPath + detectedExt;
            relativePath = relativePath + detectedExt;
          }

          fs.writeFileSync(finalPath, buffer);
          resolve({ success: true, localPath: relativePath });
        } catch (error) {
          reject(error);
        }
      });

      response.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      console.error(`❌ Erreur requête Electron.net:`, error);
      reject(error);
    });

    request.end();
  });
}

/**
 * Télécharge et sauvegarde une couverture
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} imageUrl - URL de l'image à télécharger
 * @param {string} serieTitre - Titre de la série/anime
 * @param {string} type - 'serie', 'tome' ou 'anime'
 * @param {number} identifier - Numéro du tome (pour 'tome') ou ID de l'anime (pour 'anime')
 * @returns {Promise<{success: boolean, localPath?: string, error?: string}>}
 */
function determineMediaCategory(pathManager, type, options = {}) {
  const {
    mediaCategory,
    mediaType,
    typeVolume
  } = options;

  if (type === 'anime') return pathManager.resolveMediaCategory('Anime');
  if (type === 'adulte-game') return pathManager.resolveMediaCategory('Adult_Game');

  if (mediaCategory) return pathManager.resolveMediaCategory(mediaCategory);
  if (mediaType) return pathManager.resolveMediaCategory(mediaType);

  const volumeLower = (typeVolume || '').toLowerCase();
  if (volumeLower.includes('light novel') || volumeLower.includes('novel')) {
    return pathManager.resolveMediaCategory('Light_Novel');
  }
  if (volumeLower.includes('webtoon') || volumeLower.includes('manhwa') || volumeLower.includes('manhua')) {
    return pathManager.resolveMediaCategory('Webtoon');
  }

  return pathManager.resolveMediaCategory('Manga');
}

async function downloadCover(pathManager, imageUrl, serieTitre, type = 'serie', identifier = null, options = {}) {
  try {
    const slug = createSlug(serieTitre);
    const category = determineMediaCategory(pathManager, type, options);
    let targetDirectory;
    let fileName;
    let relativePath;

    const seriesPath = pathManager.getSeriesPath(slug, category);
    const tomesPath = pathManager.getTomesPath(slug, category);

    if (!fs.existsSync(seriesPath)) fs.mkdirSync(seriesPath, { recursive: true });
    if (type === 'tome' && !fs.existsSync(tomesPath)) fs.mkdirSync(tomesPath, { recursive: true });

    targetDirectory = type === 'tome' ? tomesPath : seriesPath;
    const ext = path.extname(imageUrl).split('?')[0] || '.jpg';

    // Nommage : tome-X.ext pour les tomes, serie.ext pour les séries, cover.ext pour animes/jeux
    if (type === 'tome' && identifier !== null) {
      fileName = `tome-${identifier}${ext}`;
    } else if (type === 'anime') {
      fileName = `cover${ext}`;
    } else {
      fileName = `serie${ext}`;
    }

    const baseRelative = `${category}/${slug}`;
    relativePath = type === 'tome'
      ? `${baseRelative}/tomes/${fileName}`
      : `${baseRelative}/${fileName}`;
    
    const fullPath = path.join(targetDirectory, fileName);

    // Déterminer le Referer approprié
    let refererUrl;
    if (options.referer) {
      refererUrl = options.referer;
    } else if (imageUrl.includes('nautiljon')) {
      refererUrl = 'https://www.nautiljon.com/';
    } else if (imageUrl.includes('f95zone')) {
      refererUrl = 'https://f95zone.to/';
    } else if (imageUrl.includes('lewdcorner')) {
      refererUrl = 'https://lewdcorner.com/';
    }

    // Pour F95Zone et LewdCorner, utiliser net.request (Chromium) au lieu de node-fetch
    if (imageUrl.includes('f95zone') || imageUrl.includes('lewdcorner')) {
      return await downloadWithElectronNet(imageUrl, fullPath, relativePath, refererUrl);
    }

    // Headers pour contourner les protections anti-scraping
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': refererUrl,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const response = await fetch(imageUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    const buffer = await response.arrayBuffer();
    
    // Vérifier la taille minimum (pas un buffer vide)
    if (buffer.byteLength === 0) {
      throw new Error('Le buffer téléchargé est vide');
    }
    
    // Si la taille est trop petite (< 1KB), c'est probablement une erreur
    if (buffer.byteLength < 1000) {
      const preview = Buffer.from(buffer).toString('utf8', 0, Math.min(200, buffer.byteLength));
      console.log(`⚠️ Buffer trop petit, aperçu: ${preview}`);
      throw new Error(`Image trop petite: ${buffer.byteLength} bytes`);
    }
    
    // Vérifier les magic bytes et déterminer l'extension
    const bufferView = Buffer.from(buffer);
    const isJPEG = bufferView[0] === 0xFF && bufferView[1] === 0xD8;
    const isPNG = bufferView[0] === 0x89 && bufferView[1] === 0x50;
    const isWEBP = bufferView[8] === 0x57 && bufferView[9] === 0x45;
    const isAVIF = buffer.byteLength > 12 && (
      bufferView.toString('utf8', 4, 12).includes('ftyp') ||
      bufferView.toString('utf8', 4, 12).includes('avif')
    );
    
    let detectedExt = '';
    if (isPNG) detectedExt = '.png';
    else if (isJPEG) detectedExt = '.jpg';
    else if (isWEBP) detectedExt = '.webp';
    else if (isAVIF) detectedExt = '.avif';
    
    if (!detectedExt) {
      console.warn(`⚠️ Format non reconnu. Premiers octets:`, bufferView.slice(0, 16));
      throw new Error('Format d\'image non reconnu');
    }
    
    // Ajouter l'extension si elle n'est pas déjà présente
    let finalPath = fullPath;
    if (!fullPath.match(/\.(png|jpg|jpeg|webp|avif)$/i)) {
      finalPath = fullPath + detectedExt;
      relativePath = relativePath + detectedExt;
    }
    
    fs.writeFileSync(finalPath, bufferView);

    return { success: true, localPath: relativePath };
  } catch (error) {
    console.error('Erreur lors du téléchargement de la couverture:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  downloadWithElectronNet,
  downloadCover,
  determineMediaCategory
};
