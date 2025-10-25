const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { net } = require('electron');
const { createSlug } = require('../utils/slug');

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
      console.log(`📡 Status: ${response.statusCode} ${response.statusMessage}`);
      console.log(`📋 Content-Type: ${response.headers['content-type']}`);

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
          console.log(`📦 Taille du buffer: ${buffer.byteLength} bytes`);

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

          // Vérifier les magic bytes
          const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
          const isWEBP = buffer[8] === 0x57 && buffer[9] === 0x45;
          const isAVIF = buffer.byteLength > 12 && (
            buffer.toString('utf8', 4, 12).includes('ftyp') ||
            buffer.toString('utf8', 4, 12).includes('avif')
          );

          if (!isJPEG && !isPNG && !isWEBP && !isAVIF) {
            console.warn(`⚠️ Format non reconnu. Premiers octets:`, buffer.slice(0, 16));
            reject(new Error('Format d\'image non reconnu'));
            return;
          }

          console.log(`✅ Image valide détectée`);
          fs.writeFileSync(fullPath, buffer);
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
 * Renomme le dossier d'une série et met à jour les chemins en base de données
 * @param {Database} db - Instance de la base de données
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} oldTitre - Ancien titre
 * @param {string} newTitre - Nouveau titre
 * @param {number} serieId - ID de la série
 */
function renameSerieFolder(db, pathManager, oldTitre, newTitre, serieId) {
  const oldSlug = createSlug(oldTitre);
  const newSlug = createSlug(newTitre);

  if (oldSlug === newSlug) return; // Pas besoin de renommer

  const oldFolderPath = pathManager.getSeriesPath(oldSlug);
  const newFolderPath = pathManager.getSeriesPath(newSlug);

  // Si l'ancien dossier existe, le renommer
  if (fs.existsSync(oldFolderPath)) {
    // Vérifier que le nouveau dossier n'existe pas déjà
    if (!fs.existsSync(newFolderPath)) {
      fs.renameSync(oldFolderPath, newFolderPath);


      // Mettre à jour les chemins dans la base de données
      db.prepare(`
        UPDATE series 
        SET couverture_url = REPLACE(couverture_url, ?, ?)
        WHERE id = ? AND couverture_url IS NOT NULL
      `).run(`series/${oldSlug}/`, `series/${newSlug}/`, serieId);

      db.prepare(`
        UPDATE tomes 
        SET couverture_url = REPLACE(couverture_url, ?, ?)
        WHERE serie_id = ? AND couverture_url IS NOT NULL
      `).run(`series/${oldSlug}/`, `series/${newSlug}/`, serieId);


    }
  }
}

/**
 * Renomme l'image d'un tome en tome-X.ext
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} couvertureUrl - URL de la couverture
 * @param {number} numero - Numéro du tome
 * @param {string} serieTitre - Titre de la série
 * @returns {string} Nouvelle URL de la couverture
 */
function renameTomeCover(pathManager, couvertureUrl, numero, serieTitre) {
  if (!couvertureUrl) return couvertureUrl;

  // Vérifier que c'est un fichier dans la nouvelle structure
  const match = couvertureUrl.match(/series\/([^/]+)\/tomes\/(custom-\d+|tome-\d+)(\.\w+)$/);
  if (!match) return couvertureUrl;

  const slug = match[1];
  const oldFileName = match[2] + match[3];
  const ext = match[3];
  const newFileName = `tome-${numero}${ext}`;

  if (oldFileName === newFileName) return couvertureUrl;

  const tomesPath = pathManager.getTomesPath(slug);
  const oldFilePath = path.join(tomesPath, oldFileName);
  const newFilePath = path.join(tomesPath, newFileName);

  if (fs.existsSync(oldFilePath)) {
    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }
    fs.renameSync(oldFilePath, newFilePath);

    return `series/${slug}/tomes/${newFileName}`;
  }

  return couvertureUrl;
}

/**
 * Renomme l'image d'une série en cover.ext
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} couvertureUrl - URL de la couverture
 * @param {string} serieTitre - Titre de la série
 * @returns {string} Nouvelle URL de la couverture
 */
function renameSerieCover(pathManager, couvertureUrl, serieTitre) {
  if (!couvertureUrl) return couvertureUrl;

  const match = couvertureUrl.match(/series\/([^/]+)\/(custom-\d+|cover|[a-f0-9-]+)(\.\w+)$/);
  if (!match) return couvertureUrl;

  const slug = match[1];
  const oldFileName = match[2] + match[3];
  const ext = match[3];
  const newFileName = `cover${ext}`;

  if (oldFileName === newFileName) return couvertureUrl;

  const seriesPath = pathManager.getSeriesPath(slug);
  const oldFilePath = path.join(seriesPath, oldFileName);
  const newFilePath = path.join(seriesPath, newFileName);

  if (fs.existsSync(oldFilePath)) {
    if (fs.existsSync(newFilePath)) {
      fs.unlinkSync(newFilePath);
    }
    fs.renameSync(oldFilePath, newFilePath);

    return `series/${slug}/${newFileName}`;
  }

  return couvertureUrl;
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
async function downloadCover(pathManager, imageUrl, serieTitre, type = 'serie', identifier = null, referer = null) {
  try {
    const slug = createSlug(serieTitre);
    let targetDirectory;
    let fileName;
    let relativePath;

    if (type === 'anime' || type === 'avn') {
      // Pour les animes et AVN : dossier animes/<slug>/ ou avn/<slug>/
      const typeFolder = type === 'anime' ? 'animes' : 'avn';
      const typeBasePath = path.join(pathManager.getPaths().covers, typeFolder);
      const itemPath = path.join(typeBasePath, slug);
      
      if (!fs.existsSync(typeBasePath)) fs.mkdirSync(typeBasePath, { recursive: true });
      if (!fs.existsSync(itemPath)) fs.mkdirSync(itemPath, { recursive: true });
      
      targetDirectory = itemPath;
      const ext = path.extname(imageUrl).split('?')[0] || '.jpg';
      fileName = `cover${ext}`;
      relativePath = `${typeFolder}/${slug}/${fileName}`;
    } else {
      // Pour les mangas : structure existante
      const seriesPath = pathManager.getSeriesPath(slug);
      const tomesPath = pathManager.getTomesPath(slug);

      if (!fs.existsSync(seriesPath)) fs.mkdirSync(seriesPath, { recursive: true });
      if (type === 'tome' && !fs.existsSync(tomesPath)) fs.mkdirSync(tomesPath, { recursive: true });

      targetDirectory = type === 'tome' ? tomesPath : seriesPath;
      const ext = path.extname(imageUrl).split('?')[0] || '.jpg';
      
      // Nommage : tome-X.ext pour import automatique, custom-timestamp.ext pour upload manuel
      if (type === 'tome' && identifier !== null) {
        fileName = `tome-${identifier}${ext}`;
      } else {
        const timestamp = Date.now();
        fileName = `custom-${timestamp}${ext}`;
      }
      
      relativePath = type === 'tome' ? `series/${slug}/tomes/${fileName}` : `series/${slug}/${fileName}`;
    }
    
    const fullPath = path.join(targetDirectory, fileName);
    console.log(`📁 Téléchargement vers: ${fullPath}`);

    // Déterminer le Referer approprié
    let refererUrl;
    if (referer) {
      refererUrl = referer;
    } else if (imageUrl.includes('nautiljon')) {
      refererUrl = 'https://www.nautiljon.com/';
    } else if (imageUrl.includes('f95zone')) {
      refererUrl = 'https://f95zone.to/';
    } else if (imageUrl.includes('lewdcorner')) {
      refererUrl = 'https://lewdcorner.com/';
    }

    // Pour F95Zone et LewdCorner, utiliser net.request (Chromium) au lieu de node-fetch
    if (imageUrl.includes('f95zone') || imageUrl.includes('lewdcorner')) {
      const siteName = imageUrl.includes('f95zone') ? 'F95Zone' : 'LewdCorner';
      console.log(`🌐 Utilisation de Electron.net pour ${siteName}`);
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
    
    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    console.log(`📡 URL finale: ${response.url}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`📋 Content-Type: ${contentType}`);
    
    const buffer = await response.arrayBuffer();
    console.log(`📦 Taille du buffer: ${buffer.byteLength} bytes`);
    
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
    
    // Vérifier les magic bytes pour s'assurer que c'est une image
    const bufferView = Buffer.from(buffer);
    const isJPEG = bufferView[0] === 0xFF && bufferView[1] === 0xD8;
    const isPNG = bufferView[0] === 0x89 && bufferView[1] === 0x50;
    const isWEBP = bufferView[8] === 0x57 && bufferView[9] === 0x45;
    const isAVIF = buffer.byteLength > 12 && (
      bufferView.toString('utf8', 4, 12).includes('ftyp') ||
      bufferView.toString('utf8', 4, 12).includes('avif')
    );
    
    if (!isJPEG && !isPNG && !isWEBP && !isAVIF) {
      console.warn(`⚠️ Format non reconnu. Premiers octets:`, bufferView.slice(0, 16));
      throw new Error('Format d\'image non reconnu');
    }
    
    console.log(`✅ Image valide détectée`);
    fs.writeFileSync(fullPath, bufferView);

    return { success: true, localPath: relativePath };
  } catch (error) {
    console.error('Erreur lors du téléchargement de la couverture:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload une couverture personnalisée via dialog
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {BrowserWindow} mainWindow - Fenêtre principale
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} serieTitre - Titre de la série
 * @param {string} type - 'serie' ou 'tome'
 * @returns {Promise<{success: boolean, localPath?: string, error?: string}>}
 */
async function uploadCustomCover(dialog, mainWindow, pathManager, serieTitre, type = 'serie') {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner une image de couverture',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false };
    }

    return await saveCoverFromPath(pathManager, result.filePaths[0], serieTitre, type);
  } catch (error) {
    console.error('Erreur upload-custom-cover:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sauvegarde une image depuis un chemin (drag & drop)
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} sourcePath - Chemin source du fichier
 * @param {string} serieTitre - Titre de la série
 * @param {string} type - 'serie' ou 'tome'
 * @returns {Promise<{success: boolean, localPath?: string, error?: string}>}
 */
async function saveCoverFromPath(pathManager, sourcePath, serieTitre, type = 'serie') {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Fichier source introuvable' };
    }

    const ext = path.extname(sourcePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!validExtensions.includes(ext)) {
      return { success: false, error: 'Type de fichier non supporté' };
    }

    const slug = createSlug(serieTitre);
    const seriesPath = pathManager.getSeriesPath(slug);
    const tomesPath = pathManager.getTomesPath(slug);

    if (!fs.existsSync(seriesPath)) fs.mkdirSync(seriesPath, { recursive: true });
    if (type === 'tome' && !fs.existsSync(tomesPath)) fs.mkdirSync(tomesPath, { recursive: true });

    const targetDirectory = type === 'tome' ? tomesPath : seriesPath;
    const timestamp = Date.now();
    const fileName = `custom-${timestamp}${ext}`;
    const fullPath = path.join(targetDirectory, fileName);
    const relativePath = type === 'tome' ? `series/${slug}/tomes/${fileName}` : `series/${slug}/${fileName}`;

    fs.copyFileSync(sourcePath, fullPath);

    return { success: true, localPath: relativePath };
  } catch (error) {
    console.error('Erreur save-cover-from-path:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sauvegarde une couverture depuis un buffer
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {Buffer} buffer - Buffer contenant l'image
 * @param {string} fileName - Nom original du fichier
 * @param {string} serieTitre - Titre de la série
 * @param {string} type - Type ('serie' ou 'tome')
 * @returns {Promise<Object>}
 */
async function saveCoverFromBuffer(pathManager, buffer, fileName, serieTitre, type = 'serie') {
  try {
    const ext = path.extname(fileName).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!validExtensions.includes(ext)) {
      return { success: false, error: 'Type de fichier non supporté' };
    }

    const slug = createSlug(serieTitre);
    const seriesPath = pathManager.getSeriesPath(slug);
    const tomesPath = pathManager.getTomesPath(slug);

    if (!fs.existsSync(seriesPath)) fs.mkdirSync(seriesPath, { recursive: true });
    if (type === 'tome' && !fs.existsSync(tomesPath)) fs.mkdirSync(tomesPath, { recursive: true });

    const targetDirectory = type === 'tome' ? tomesPath : seriesPath;
    const timestamp = Date.now();
    const newFileName = `custom-${timestamp}${ext}`;
    const fullPath = path.join(targetDirectory, newFileName);
    const relativePath = type === 'tome' ? `series/${slug}/tomes/${newFileName}` : `series/${slug}/${newFileName}`;

    fs.writeFileSync(fullPath, buffer);

    return { success: true, localPath: relativePath };
  } catch (error) {
    console.error('Erreur save-cover-from-buffer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère le chemin complet d'une couverture
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} relativePath - Chemin relatif
 * @returns {string|null}
 */
function getCoverFullPath(pathManager, relativePath) {
  if (!relativePath) return null;

  // URL externe
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Déjà un manga:// URL
  if (relativePath.startsWith('manga://')) {
    return relativePath;
  }

  // Construire le chemin complet depuis la base
  const paths = pathManager.getPaths();
  const fullPath = path.join(paths.covers, relativePath);

  if (fs.existsSync(fullPath)) {
    return `manga://${fullPath.replace(/\\/g, '/')}`;
  }

  return null;
}

module.exports = {
  renameSerieFolder,
  renameTomeCover,
  renameSerieCover,
  downloadCover,
  uploadCustomCover,
  saveCoverFromPath,
  saveCoverFromBuffer,
  getCoverFullPath
};
