/**
 * Service de synchronisation des images de couverture via Cloudflare R2
 * Gère l'upload et le download des images de couverture
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration pour éviter les erreurs ECONNRESET (rate limiting)
const DOWNLOAD_DELAY_MS = 200; // Délai entre chaque téléchargement (200ms)
const MAX_RETRIES = 5; // Nombre de tentatives en cas d'erreur
const RETRY_DELAY_BASE_MS = 1000; // Délai de base pour le retry (1 seconde)
const CONCURRENT_DOWNLOADS = 3; // Nombre maximum de téléchargements simultanés

function createR2Client(endpoint, accessKeyId, secretAccessKey) {
  return new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    },
    // Configuration du retry intégré du SDK
    maxAttempts: MAX_RETRIES,
    retryMode: 'adaptive' // Mode adaptatif pour le retry
  });
}

/**
 * Fonction utilitaire pour attendre un délai
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry avec backoff exponentiel pour les erreurs de connexion
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, baseDelay = RETRY_DELAY_BASE_MS) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Si c'est une erreur ECONNRESET ou TimeoutError, on retry
      const isRetryableError = error.code === 'ECONNRESET' || 
                               error.name === 'TimeoutError' ||
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ENOTFOUND';
      
      if (!isRetryableError || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Backoff exponentiel : 1s, 2s, 4s, 8s, 16s
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Erreur de connexion (tentative ${attempt + 1}/${maxRetries}), retry dans ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Calcule un hash MD5 d'un chemin d'image pour créer une clé R2 unique
 * @param {string} relativePath - Chemin relatif de l'image (ex: "covers/Adult_Game/virtual-daughter/ccustom-1764105147525.png")
 * @returns {string} Hash MD5 du chemin
 */
function getCoverHash(relativePath) {
  return crypto.createHash('md5').update(relativePath).digest('hex');
}

/**
 * Téléverse une image de couverture vers R2
 * @param {string} coverPath - Chemin local complet du fichier image
 * @param {string} relativePath - Chemin relatif de l'image (stocké dans la base de données)
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function uploadCover(coverPath, relativePath, bucketName, endpoint, accessKeyId, secretAccessKey) {
  try {
    if (!fs.existsSync(coverPath)) {
      return { success: false, error: 'Le fichier image n\'existe pas' };
    }

    const ext = path.extname(coverPath);
    const hash = getCoverHash(relativePath);
    const fileName = `covers/${hash}${ext}`; // Stocker dans un dossier "covers" avec hash comme nom
    
    const fileContent = fs.readFileSync(coverPath);
    
    // Déterminer le Content-Type selon l'extension
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypes[ext.toLowerCase()] || 'image/jpeg';

    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: contentType,
      Metadata: {
        'original-path': relativePath // Stocker le chemin original dans les métadonnées
      }
    });

    await client.send(command);
    console.log(`✅ Couverture uploadée vers R2: ${fileName} (${relativePath})`);
    return { success: true, r2Path: fileName };
  } catch (error) {
    console.error('❌ Erreur upload couverture R2:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'upload de la couverture' };
  }
}

/**
 * Télécharge une image de couverture depuis R2
 * @param {string} relativePath - Chemin relatif de l'image (comme stocké dans la base de données)
 * @param {string} targetPath - Chemin de destination local complet
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function downloadCover(relativePath, targetPath, bucketName, endpoint, accessKeyId, secretAccessKey) {
  try {
    const hash = getCoverHash(relativePath);
    const ext = path.extname(relativePath) || '.png';
    const fileName = `covers/${hash}${ext}`;
    
    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    
    // Créer le répertoire de destination s'il n'existe pas
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName
    });

    try {
      // Utiliser retry avec backoff pour gérer les erreurs ECONNRESET
      const response = await retryWithBackoff(async () => {
        return await client.send(command);
      });
      
      // Convertir le stream en buffer et sauvegarder
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      fs.writeFileSync(targetPath, buffer);
      console.log(`✅ Couverture téléchargée depuis R2: ${fileName} -> ${targetPath}`);
      return { success: true };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return { success: false, error: 'Image non trouvée sur le serveur R2' };
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur download couverture R2:', error);
    return { success: false, error: error.message || 'Erreur lors du téléchargement de la couverture' };
  }
}

/**
 * Extrait tous les chemins d'images de couverture depuis une base de données
 * @param {Database} db - Instance de base de données
 * @returns {Array<string>} Liste des chemins relatifs d'images (filtrés pour exclure les URLs)
 */
function extractCoverPathsFromDatabase(db) {
  const coverPaths = new Set();
  
  try {
    // Manga series
    const mangaSeries = db.prepare('SELECT couverture_url FROM manga_series WHERE couverture_url IS NOT NULL AND LENGTH(couverture_url) > 0').all();
    mangaSeries.forEach(row => {
      const url = row.couverture_url;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
    
    // Manga tomes
    const mangaTomes = db.prepare('SELECT couverture_url FROM manga_tomes WHERE couverture_url IS NOT NULL AND LENGTH(couverture_url) > 0').all();
    mangaTomes.forEach(row => {
      const url = row.couverture_url;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
    
    // Anime series
    const animeSeries = db.prepare('SELECT couverture_url FROM anime_series WHERE couverture_url IS NOT NULL AND LENGTH(couverture_url) > 0').all();
    animeSeries.forEach(row => {
      const url = row.couverture_url;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
    
    // Movies
    const movies = db.prepare('SELECT poster_path FROM movies WHERE poster_path IS NOT NULL AND LENGTH(poster_path) > 0').all();
    movies.forEach(row => {
      const url = row.poster_path;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
    
    // TV Shows
    const tvShows = db.prepare('SELECT poster_path FROM tv_shows WHERE poster_path IS NOT NULL AND LENGTH(poster_path) > 0').all();
    tvShows.forEach(row => {
      const url = row.poster_path;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
    
    // Adulte Game Games
    const adulteGames = db.prepare('SELECT couverture_url FROM adulte_game_games WHERE couverture_url IS NOT NULL AND LENGTH(couverture_url) > 0').all();
    adulteGames.forEach(row => {
      const url = row.couverture_url;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
    
    // Books
    const books = db.prepare('SELECT couverture_url FROM books WHERE couverture_url IS NOT NULL AND LENGTH(couverture_url) > 0').all();
    books.forEach(row => {
      const url = row.couverture_url;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
        coverPaths.add(url);
      }
    });
  } catch (error) {
    console.warn('⚠️ Erreur extraction chemins couvertures:', error.message);
  }
  
  return Array.from(coverPaths);
}

/**
 * Upload toutes les images de couverture d'une base de données vers R2
 * @param {Database} db - Instance de base de données
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @param {Function} onProgress - Callback de progression (current, total, item)
 * @returns {Promise<{success: boolean, uploaded: number, errors: number, error?: string}>}
 */
async function uploadAllCovers(db, pathManager, bucketName, endpoint, accessKeyId, secretAccessKey, onProgress = null) {
  try {
    const coverPaths = extractCoverPathsFromDatabase(db);
    console.log(`📋 ${coverPaths.length} chemin(s) de couverture trouvé(s) dans la base de données`);
    
    if (coverPaths.length === 0) {
      console.log('ℹ️ Aucune couverture à uploader (base de données ne contient pas de chemins locaux)');
      return { success: true, uploaded: 0, errors: 0 };
    }
    
    const paths = pathManager.getPaths();
    let uploaded = 0;
    let errors = 0;
    let notFound = 0;
    const total = coverPaths.length;
    
    // Filtrer les chemins qui existent localement
    const pathsToUpload = [];
    for (const relativePath of coverPaths) {
      let fullPath;
      if (path.isAbsolute(relativePath)) {
        fullPath = relativePath;
      } else {
        const normalized = relativePath.replace(/\\/g, '/').replace(/^covers\//, '');
        fullPath = path.join(paths.covers, normalized);
      }
      
      if (fs.existsSync(fullPath)) {
        pathsToUpload.push(relativePath);
      } else {
        notFound++;
        if (notFound <= 5) {
          console.warn(`⚠️ Fichier couverture non trouvé: ${fullPath} (chemin relatif: ${relativePath})`);
        }
      }
    }
    
    const totalToUpload = pathsToUpload.length;
    console.log(`📤 Vérification et upload de ${totalToUpload} couverture(s)...`);
    
    let alreadyUploaded = 0;
    let skipped = 0;
    
    for (let i = 0; i < pathsToUpload.length; i++) {
      const relativePath = pathsToUpload[i];
      
      try {
        // Construire le chemin complet
        let fullPath;
        if (path.isAbsolute(relativePath)) {
          fullPath = relativePath;
        } else {
          const normalized = relativePath.replace(/\\/g, '/').replace(/^covers\//, '');
          fullPath = path.join(paths.covers, normalized);
        }
        
        // Vérifier si l'image existe déjà dans R2 avant de la téléverser
        const existsResult = await checkCoverExists(relativePath, bucketName, endpoint, accessKeyId, secretAccessKey);
        
        if (existsResult.exists) {
          // L'image existe déjà dans R2, on la skip
          alreadyUploaded++;
          skipped++;
          if (onProgress) {
            onProgress(uploaded + errors + skipped, totalToUpload, relativePath);
          }
          // Pas besoin de délai pour les images déjà uploadées
          continue;
        }
        
        // L'image n'existe pas, on la téléverse
        const result = await uploadCover(fullPath, relativePath, bucketName, endpoint, accessKeyId, secretAccessKey);
        if (result.success) {
          uploaded++;
        } else {
          errors++;
          console.warn(`⚠️ Erreur upload couverture ${relativePath}:`, result.error);
        }
        
        // Notifier la progression
        if (onProgress) {
          onProgress(uploaded + errors + skipped, totalToUpload, relativePath);
        }
        
        // Permettre à l'interface de se mettre à jour et éviter le rate limiting
        if (i < pathsToUpload.length - 1) {
          await sleep(100); // Petit délai entre chaque upload
        }
      } catch (error) {
        errors++;
        console.warn(`⚠️ Erreur traitement couverture ${relativePath}:`, error.message);
        if (onProgress) {
          onProgress(uploaded + errors + skipped, totalToUpload, relativePath);
        }
      }
    }
    
    if (notFound > 5) {
      console.warn(`⚠️ ${notFound - 5} autre(s) fichier(s) de couverture non trouvé(s)`);
    }
    
    console.log(`✅ Upload couvertures terminé: ${uploaded} uploadées, ${alreadyUploaded} déjà présentes (skippées), ${errors} erreurs, ${notFound} fichiers non trouvés`);
    return { success: true, uploaded, errors, notFound, alreadyUploaded, skipped };
  } catch (error) {
    console.error('❌ Erreur upload couvertures:', error);
    return { success: false, error: error.message, uploaded: 0, errors: 0 };
  }
}

/**
 * Télécharge les images de couverture manquantes depuis R2
 * @param {Database} db - Instance de base de données
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @param {Function} onProgress - Callback de progression (current, total, item)
 * @returns {Promise<{success: boolean, downloaded: number, errors: number, error?: string}>}
 */
async function downloadMissingCovers(db, pathManager, bucketName, endpoint, accessKeyId, secretAccessKey, onProgress = null) {
  try {
    const coverPaths = extractCoverPathsFromDatabase(db);
    const paths = pathManager.getPaths();
    
    // Filtrer les chemins qui nécessitent un téléchargement
    const pathsToDownload = [];
    for (const relativePath of coverPaths) {
      let targetPath;
      if (path.isAbsolute(relativePath)) {
        targetPath = relativePath;
      } else {
        const normalized = relativePath.replace(/\\/g, '/').replace(/^covers\//, '');
        targetPath = path.join(paths.covers, normalized);
      }
      
      if (!fs.existsSync(targetPath)) {
        pathsToDownload.push(relativePath);
      }
    }
    
    const total = pathsToDownload.length;
    let downloaded = 0;
    let errors = 0;
    
    if (total === 0) {
      console.log('ℹ️ Toutes les couvertures sont déjà téléchargées');
      return { success: true, downloaded: 0, errors: 0 };
    }
    
    console.log(`📥 Téléchargement de ${total} couverture(s) manquante(s)...`);
    
    // Limiter la concurrence avec un système de queue
    const downloadQueue = [];
    let activeDownloads = 0;
    
    for (let i = 0; i < pathsToDownload.length; i++) {
      const relativePath = pathsToDownload[i];
      
      // Attendre si on a atteint la limite de concurrence
      while (activeDownloads >= CONCURRENT_DOWNLOADS) {
        await sleep(100);
      }
      
      // Lancer le téléchargement
      activeDownloads++;
      const downloadPromise = (async () => {
        try {
          // Construire le chemin complet cible
          let targetPath;
          if (path.isAbsolute(relativePath)) {
            targetPath = relativePath;
          } else {
            const normalized = relativePath.replace(/\\/g, '/').replace(/^covers\//, '');
            targetPath = path.join(paths.covers, normalized);
          }
          
          const result = await downloadCover(relativePath, targetPath, bucketName, endpoint, accessKeyId, secretAccessKey);
          if (result.success) {
            downloaded++;
          } else {
            errors++;
            // Ne pas logger les erreurs "non trouvé" car c'est normal si l'image n'a pas encore été uploadée
            if (!result.error.includes('non trouvée')) {
              console.warn(`⚠️ Erreur download couverture ${relativePath}:`, result.error);
            }
          }
          
          // Notifier la progression
          if (onProgress) {
            onProgress(downloaded + errors, total, relativePath);
          }
          
          // Délai entre les téléchargements pour éviter le rate limiting
          if (i < pathsToDownload.length - 1) {
            await sleep(DOWNLOAD_DELAY_MS);
          }
        } catch (error) {
          errors++;
          console.warn(`⚠️ Erreur traitement couverture ${relativePath}:`, error.message);
          if (onProgress) {
            onProgress(downloaded + errors, total, relativePath);
          }
        } finally {
          activeDownloads--;
        }
      })();
      
      downloadQueue.push(downloadPromise);
    }
    
    // Attendre que tous les téléchargements soient terminés
    await Promise.all(downloadQueue);
    
    console.log(`✅ Download couvertures terminé: ${downloaded} téléchargées, ${errors} erreurs`);
    return { success: true, downloaded, errors };
  } catch (error) {
    console.error('❌ Erreur download couvertures:', error);
    return { success: false, error: error.message, downloaded: 0, errors: 0 };
  }
}

/**
 * Vérifie si une image de couverture existe dans R2
 * @param {string} relativePath - Chemin relatif de l'image (comme stocké dans la base de données)
 * @param {string} bucketName - Nom du bucket R2
 * @param {string} endpoint - Endpoint R2
 * @param {string} accessKeyId - Access Key ID
 * @param {string} secretAccessKey - Secret Access Key
 * @returns {Promise<{exists: boolean, r2Path?: string, error?: string}>}
 */
async function checkCoverExists(relativePath, bucketName, endpoint, accessKeyId, secretAccessKey) {
  try {
    const hash = getCoverHash(relativePath);
    const ext = path.extname(relativePath) || '.png';
    const fileName = `covers/${hash}${ext}`;
    
    const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName
    });

    try {
      await client.send(command);
      return { exists: true, r2Path: fileName };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return { exists: false, r2Path: fileName };
      }
      throw error;
    }
  } catch (error) {
    return { exists: false, error: error.message || 'Erreur lors de la vérification' };
  }
}

module.exports = {
  uploadCover,
  downloadCover,
  uploadAllCovers,
  downloadMissingCovers,
  extractCoverPathsFromDatabase,
  checkCoverExists,
  getCoverHash // Exporter pour permettre de calculer le hash depuis l'extérieur
};
