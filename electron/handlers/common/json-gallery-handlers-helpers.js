const fs = require('fs');
const path = require('path');
const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { downloadImageFromUrl, getMimeTypeFromExt } = require('./gallery-handlers-helpers');

/**
 * Helpers génériques pour gérer les galeries d'images/vidéos stockées dans des colonnes JSON
 * Utilisé pour movies, tv_shows, et rawg-games
 */

/**
 * Helper pour s'assurer qu'une ligne user_data existe avec les colonnes nécessaires
 */
function ensureUserDataRow(db, tableName, itemIdColumnName, userIdColumnName, itemId, userId, defaultStatus, imageColumnName, videoColumnName) {
  // S'assurer que les colonnes existent
  try {
    const { ensureColumn } = require('../../services/database');
    ensureColumn(db, tableName, imageColumnName, 'TEXT');
    ensureColumn(db, tableName, videoColumnName, 'TEXT');
  } catch (error) {
    // Colonnes déjà existantes ou erreur, continuer
  }

  const existing = db.prepare(`SELECT id FROM ${tableName} WHERE ${itemIdColumnName} = ? AND ${userIdColumnName} = ?`).get(itemId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO ${tableName} (${itemIdColumnName}, ${userIdColumnName}, ${defaultStatus.column}, ${imageColumnName}, ${videoColumnName}, created_at, updated_at)
      VALUES (?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))
    `).run(itemId, userId, defaultStatus.value);
  }
}

/**
 * Helper pour obtenir le JSON array des images
 */
function getUserImages(db, tableName, itemIdColumnName, userIdColumnName, itemId, userId, imageColumnName) {
  // Vérifier si la colonne existe
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = tableInfo.some(col => col.name === imageColumnName);

  if (!hasColumn) {
    // Ajouter la colonne si elle n'existe pas
    try {
      const { ensureColumn } = require('../../services/database');
      ensureColumn(db, tableName, imageColumnName, 'TEXT');
    } catch (error) {
      console.warn(`⚠️ Impossible d'ajouter la colonne ${imageColumnName}:`, error.message);
      return [];
    }
  }

  const row = db.prepare(`SELECT ${imageColumnName} FROM ${tableName} WHERE ${itemIdColumnName} = ? AND ${userIdColumnName} = ?`).get(itemId, userId);
  if (!row || !row[imageColumnName]) {
    return [];
  }
  return safeJsonParse(row[imageColumnName], []);
}

/**
 * Helper pour sauvegarder le JSON array des images
 */
function saveUserImages(db, tableName, itemIdColumnName, userIdColumnName, itemId, userId, images, imageColumnName) {
  // S'assurer que la colonne existe
  try {
    const { ensureColumn } = require('../../services/database');
    ensureColumn(db, tableName, imageColumnName, 'TEXT');
  } catch (error) {
    // Colonne déjà existante ou erreur, continuer
  }

  const imagesJson = JSON.stringify(images);
  db.prepare(`
    UPDATE ${tableName} 
    SET ${imageColumnName} = ?, updated_at = datetime('now')
    WHERE ${itemIdColumnName} = ? AND ${userIdColumnName} = ?
  `).run(imagesJson, itemId, userId);
}

/**
 * Helper pour obtenir le JSON array des vidéos
 */
function getUserVideos(db, tableName, itemIdColumnName, userIdColumnName, itemId, userId, videoColumnName) {
  // Vérifier si la colonne existe
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = tableInfo.some(col => col.name === videoColumnName);

  if (!hasColumn) {
    // Ajouter la colonne si elle n'existe pas
    try {
      const { ensureColumn } = require('../../services/database');
      ensureColumn(db, tableName, videoColumnName, 'TEXT');
    } catch (error) {
      console.warn(`⚠️ Impossible d'ajouter la colonne ${videoColumnName}:`, error.message);
      return [];
    }
  }

  const row = db.prepare(`SELECT ${videoColumnName} FROM ${tableName} WHERE ${itemIdColumnName} = ? AND ${userIdColumnName} = ?`).get(itemId, userId);
  if (!row || !row[videoColumnName]) {
    return [];
  }
  return safeJsonParse(row[videoColumnName], []);
}

/**
 * Helper pour sauvegarder le JSON array des vidéos
 */
function saveUserVideos(db, tableName, itemIdColumnName, userIdColumnName, itemId, userId, videos, videoColumnName) {
  // S'assurer que la colonne existe
  try {
    const { ensureColumn } = require('../../services/database');
    ensureColumn(db, tableName, videoColumnName, 'TEXT');
  } catch (error) {
    // Colonne déjà existante ou erreur, continuer
  }

  const videosJson = JSON.stringify(videos);
  db.prepare(`
    UPDATE ${tableName} 
    SET ${videoColumnName} = ?, updated_at = datetime('now')
    WHERE ${itemIdColumnName} = ? AND ${userIdColumnName} = ?
  `).run(videosJson, itemId, userId);
}

/**
 * Créer un handler pour ajouter une image depuis une URL (pour colonnes JSON)
 */
function createAddImageFromUrlHandlerJson(config) {
  const {
    handlerName,
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    defaultStatus,
    imageColumnName,
    videoColumnName,
    galleryFolderName,
    filePrefix,
    getPathsFn
  } = config;

  return async (event, itemId, imageUrl, title = null) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const item = db.prepare(`SELECT id, ${itemTitleColumn} FROM ${itemTableName} WHERE id = ?`).get(itemId);
      if (!item) {
        return { success: false, error: itemNotFoundError };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      if (!imageUrl || !imageUrl.trim()) {
        return { success: false, error: 'URL requise' };
      }

      ensureUserDataRow(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, defaultStatus, imageColumnName, videoColumnName);

      const paths = getPathsFn();
      const fileName = `${filePrefix}${itemId}_user_${userId}_${Date.now()}`;
      const destPath = path.join(paths.galleries, fileName);

      // Télécharger l'image
      const downloadResult = await downloadImageFromUrl(imageUrl.trim(), destPath);
      const finalPath = downloadResult.path;
      const fileSize = downloadResult.size;

      // Déterminer l'extension et le mime type
      const ext = path.extname(finalPath).toLowerCase();
      const mimeType = getMimeTypeFromExt(ext);
      const finalFileName = path.basename(finalPath);
      const relativePath = `galleries/${galleryFolderName}/${finalFileName}`;

      // Ajouter l'image au JSON array
      const images = getUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, imageColumnName);
      const newImage = {
        id: Date.now().toString(),
        title: title || null,
        file_path: relativePath,
        file_name: finalFileName,
        file_size: fileSize,
        mime_type: mimeType,
        created_at: new Date().toISOString()
      };
      images.push(newImage);
      saveUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, images, imageColumnName);

      console.log(`✅ Image utilisateur ajoutée depuis URL pour ${handlerName} ${itemId}`);
      return {
        success: true,
        image: newImage,
        filePath: relativePath,
        fileName: finalFileName
      };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-add-image-url:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour ajouter une image depuis un fichier local (pour colonnes JSON)
 */
function createAddImageFromFileHandlerJson(config) {
  const {
    handlerName,
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    defaultStatus,
    imageColumnName,
    videoColumnName,
    galleryFolderName,
    filePrefix,
    getPathsFn,
    dialog,
    getMainWindow
  } = config;

  return async (event, itemId, title = null) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const item = db.prepare(`SELECT id, ${itemTitleColumn} FROM ${itemTableName} WHERE id = ?`).get(itemId);
      if (!item) {
        return { success: false, error: itemNotFoundError };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      ensureUserDataRow(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, defaultStatus, imageColumnName, videoColumnName);

      // Ouvrir le dialogue de sélection de fichier
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Sélectionner une image',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const sourcePath = result.filePaths[0];
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Fichier introuvable' };
      }

      const paths = getPathsFn();
      const ext = path.extname(sourcePath).toLowerCase();
      const fileName = `${filePrefix}${itemId}_user_${userId}_${Date.now()}${ext}`;
      const destPath = path.join(paths.galleries, fileName);

      // Copier le fichier
      fs.copyFileSync(sourcePath, destPath);
      const fileSize = fs.statSync(destPath).size;
      const mimeType = getMimeTypeFromExt(ext);
      const relativePath = `galleries/${galleryFolderName}/${fileName}`;

      // Ajouter l'image au JSON array
      const images = getUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, imageColumnName);
      const newImage = {
        id: Date.now().toString(),
        title: title || null,
        file_path: relativePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        created_at: new Date().toISOString()
      };
      images.push(newImage);
      saveUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, images, imageColumnName);

      console.log(`✅ Image utilisateur ajoutée depuis fichier pour ${handlerName} ${itemId}`);
      return {
        success: true,
        image: newImage,
        filePath: relativePath,
        fileName: fileName
      };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-add-image-file:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour récupérer les images (pour colonnes JSON)
 */
function createGetImagesHandlerJson(config) {
  const {
    handlerName,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    imageColumnName,
    getPathsFn
  } = config;

  return (event, itemId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', images: [] };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: true, images: [] };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: true, images: [] };
      }

      const images = getUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, imageColumnName);
      const paths = getPathsFn();

      // Construire les URLs avec le protocole manga:// pour chaque image
      const imagesWithUrls = images.map(img => {
        const absolutePath = path.join(paths.base, img.file_path);
        const normalizedPath = absolutePath.replace(/\\/g, '/');
        return {
          ...img,
          url: `manga://${encodeURIComponent(normalizedPath)}`,
          absolute_path: absolutePath
        };
      });

      return { success: true, images: imagesWithUrls };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-get-images:`, error);
      return { success: false, error: error.message, images: [] };
    }
  };
}

/**
 * Créer un handler pour supprimer une image (pour colonnes JSON)
 */
function createDeleteImageHandlerJson(config) {
  const {
    handlerName,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    imageColumnName,
    getPathsFn
  } = config;

  return (event, itemId, imageId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      const images = getUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, imageColumnName);
      const imageIndex = images.findIndex(img => img.id === imageId || img.id?.toString() === imageId?.toString());

      if (imageIndex === -1) {
        return { success: false, error: 'Image introuvable' };
      }

      const image = images[imageIndex];
      const paths = getPathsFn();
      const absolutePath = path.join(paths.base, image.file_path);

      // Supprimer le fichier
      if (fs.existsSync(absolutePath)) {
        try {
          fs.unlinkSync(absolutePath);
        } catch (error) {
          console.warn('⚠️ Impossible de supprimer le fichier:', error.message);
        }
      }

      // Retirer l'image du JSON array
      images.splice(imageIndex, 1);
      saveUserImages(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, images, imageColumnName);

      console.log(`✅ Image utilisateur supprimée pour ${handlerName} ${itemId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-delete-image:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour ajouter une vidéo depuis une URL (pour colonnes JSON)
 */
function createAddVideoFromUrlHandlerJson(config) {
  const {
    handlerName,
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    defaultStatus,
    imageColumnName,
    videoColumnName,
    getPathsFn
  } = config;
  const { detectVideoPlatform } = require('./video-handlers-helpers');

  return async (event, params) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const itemId = params[itemIdColumnName] || params.itemId || params.gameId || params.movieId;
      const url = params.url;
      const title = params.title;

      const item = db.prepare(`SELECT id, ${itemTitleColumn} FROM ${itemTableName} WHERE id = ?`).get(itemId);
      if (!item) {
        return { success: false, error: itemNotFoundError };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      if (!url || !url.trim()) {
        return { success: false, error: 'URL requise' };
      }

      ensureUserDataRow(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, defaultStatus, imageColumnName, videoColumnName);

      // Détecter la plateforme vidéo
      const { site, videoKey } = detectVideoPlatform(url);

      // Ajouter la vidéo au JSON array
      const videos = getUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videoColumnName);
      const newVideo = {
        id: Date.now().toString(),
        type: 'url',
        title: title || null,
        url: url.trim(),
        file_path: null,
        file_name: null,
        file_size: null,
        mime_type: null,
        site: site || null,
        video_key: videoKey || null,
        is_reference: 0,
        created_at: new Date().toISOString()
      };
      videos.push(newVideo);
      saveUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videos, videoColumnName);

      console.log(`✅ Vidéo utilisateur ajoutée depuis URL pour ${handlerName} ${itemId}`);
      return {
        success: true,
        video: newVideo
      };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-add-video-url:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour ajouter une vidéo depuis un fichier local (pour colonnes JSON)
 */
function createAddVideoFromFileHandlerJson(config) {
  const {
    handlerName,
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    defaultStatus,
    imageColumnName,
    videoColumnName,
    galleryFolderName,
    filePrefix,
    getPathsFn,
    dialog,
    getMainWindow
  } = config;
  const { getStreamingUrl, needsTranscoding } = require('../../services/video-streaming-server');

  return async (event, itemId, title = null, isReference = false) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const item = db.prepare(`SELECT id, ${itemTitleColumn} FROM ${itemTableName} WHERE id = ?`).get(itemId);
      if (!item) {
        return { success: false, error: itemNotFoundError };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      ensureUserDataRow(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, defaultStatus, imageColumnName, videoColumnName);

      // Ouvrir le dialogue de sélection de fichier
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Sélectionner une vidéo',
        filters: [
          { name: 'Vidéos', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const sourcePath = result.filePaths[0];
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Fichier introuvable' };
      }

      const paths = getPathsFn();
      const ext = path.extname(sourcePath).toLowerCase();

      // Déterminer le mime type
      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska'
      };
      const mimeType = mimeTypes[ext.toLowerCase()] || 'video/mp4';

      // Si isReference est true, utiliser le chemin source directement au lieu de copier
      let finalFilePath;
      let finalFileName;
      let finalFileSize;

      if (isReference) {
        // Pour les références, utiliser le chemin absolu du fichier source
        finalFilePath = sourcePath;
        finalFileName = path.basename(sourcePath);
        finalFileSize = fs.statSync(sourcePath).size;
      } else {
        // Créer le dossier videos si nécessaire
        const videosDir = path.join(paths.base, 'galleries', galleryFolderName, 'videos');
        if (!fs.existsSync(videosDir)) {
          fs.mkdirSync(videosDir, { recursive: true });
        }

        // Copier le fichier dans le dossier galleries
        const fileName = `${filePrefix}${itemId}_user_${userId}_${Date.now()}${ext}`;
        const destPath = path.join(videosDir, fileName);
        fs.copyFileSync(sourcePath, destPath);
        finalFilePath = `galleries/${galleryFolderName}/videos/${fileName}`;
        finalFileName = fileName;
        finalFileSize = fs.statSync(destPath).size;
      }

      // Ajouter la vidéo au JSON array
      const videos = getUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videoColumnName);
      const newVideo = {
        id: Date.now().toString(),
        type: 'file',
        title: title || null,
        url: null,
        file_path: finalFilePath,
        file_name: finalFileName,
        file_size: finalFileSize,
        mime_type: mimeType,
        site: null,
        video_key: null,
        is_reference: isReference ? 1 : 0,
        created_at: new Date().toISOString()
      };
      videos.push(newVideo);
      saveUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videos, videoColumnName);

      console.log(`✅ Vidéo utilisateur ajoutée depuis fichier pour ${handlerName} ${itemId} (référence: ${isReference})`);
      return {
        success: true,
        videoId: newVideo.id,
        type: 'file',
        video: newVideo,
        filePath: finalFilePath,
        fileName: finalFileName,
        title: newVideo.title,
        isReference: isReference
      };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-add-video-file:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour récupérer les vidéos (pour colonnes JSON)
 */
function createGetVideosHandlerJson(config) {
  const {
    handlerName,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    videoColumnName,
    getPathsFn
  } = config;
  const { getStreamingUrl, needsTranscoding } = require('../../services/video-streaming-server');

  return async (event, itemId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', videos: [] };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: true, videos: [] };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: true, videos: [] };
      }

      const videos = getUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videoColumnName);
      const paths = getPathsFn();

      // Traiter les vidéos pour ajouter les chemins absolus et les URLs de streaming
      const processedVideos = await Promise.all(videos.map(async (video) => {
        const processed = {
          id: video.id,
          type: video.type,
          title: video.title,
          site: video.site,
          video_key: video.video_key,
          created_at: video.created_at,
          is_reference: video.is_reference === 1 || video.is_reference === true
        };

        if (video.type === 'url' && video.url) {
          // Vidéo URL (YouTube, Vimeo, etc.)
          processed.url = video.url;
        } else if (video.type === 'file' && video.file_path) {
          // Vidéo fichier local
          processed.file_path = video.file_path;
          processed.file_name = video.file_name;
          processed.file_size = video.file_size;
          processed.mime_type = video.mime_type;

          // Si c'est une référence, utiliser directement le chemin absolu
          // Sinon, construire le chemin relatif depuis la base
          let fullPath;
          if (processed.is_reference) {
            // C'est un chemin absolu, l'utiliser directement
            fullPath = video.file_path;
          } else {
            // C'est un chemin relatif, construire le chemin complet
            fullPath = path.join(paths.base, video.file_path);
          }

          // Vérifier si le fichier existe
          if (fs.existsSync(fullPath)) {
            processed.exists = true;

            // Si c'est un MKV ou AVI, utiliser le serveur de streaming pour transcoder
            const ext = path.extname(fullPath).toLowerCase();
            if (needsTranscoding(fullPath)) {
              processed.url = getStreamingUrl(fullPath);
              console.log(`🔄 URL streaming (${ext.toUpperCase()}): ${processed.url}`);
            } else {
              // Sinon, utiliser le protocole manga://
              processed.url = `manga://${encodeURIComponent(fullPath.replace(/\\/g, '/'))}`;
              console.log(`📁 URL manga:// pour ${ext.toUpperCase()}: ${path.basename(fullPath)}`);
            }
          } else {
            processed.exists = false;
            console.warn(`⚠️ Fichier vidéo introuvable: ${fullPath}`);
          }
        }

        return processed;
      }));

      return { success: true, videos: processedVideos };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-get-videos:`, error);
      return { success: false, error: error.message, videos: [] };
    }
  };
}

/**
 * Créer un handler pour supprimer une vidéo (pour colonnes JSON)
 */
function createDeleteVideoHandlerJson(config) {
  const {
    handlerName,
    userDataTableName,
    itemIdColumnName,
    userIdColumnName,
    videoColumnName,
    getPathsFn
  } = config;

  return (event, itemId, videoId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const currentUser = config.store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      const videos = getUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videoColumnName);
      const videoIndex = videos.findIndex(vid => vid.id === videoId || vid.id?.toString() === videoId?.toString());

      if (videoIndex === -1) {
        return { success: false, error: 'Vidéo introuvable' };
      }

      const video = videos[videoIndex];
      const paths = getPathsFn();

      // Essayer de supprimer le fichier si c'est un fichier local (seulement si ce n'est pas une référence)
      // La suppression de l'entrée en base se fera même si le fichier n'existe plus
      if (video.type === 'file' && video.file_path && !video.is_reference) {
        let absolutePath;
        if (video.is_reference === 1 || video.is_reference === true) {
          // C'est une référence, utiliser le chemin absolu directement
          absolutePath = video.file_path;
        } else {
          // C'est une copie, construire le chemin depuis la base
          absolutePath = path.join(paths.base, video.file_path);
        }

        // Essayer de supprimer le fichier s'il existe, mais ne pas bloquer la suppression de l'entrée en base
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
            console.log(`✅ Fichier vidéo supprimé: ${absolutePath}`);
          } catch (error) {
            console.warn('⚠️ Impossible de supprimer le fichier:', error.message);
          }
        } else {
          console.warn(`⚠️ Fichier vidéo introuvable (peut-être déplacé): ${absolutePath}`);
        }
      }

      // Retirer la vidéo du JSON array (toujours effectué, même si le fichier n'existe plus)
      videos.splice(videoIndex, 1);
      saveUserVideos(db, userDataTableName, itemIdColumnName, userIdColumnName, itemId, userId, videos, videoColumnName);

      console.log(`✅ Vidéo utilisateur supprimée pour ${handlerName} ${itemId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur ${handlerName}-delete-video:`, error);
      return { success: false, error: error.message };
    }
  };
}

module.exports = {
  ensureUserDataRow,
  getUserImages,
  saveUserImages,
  getUserVideos,
  saveUserVideos,
  createAddImageFromUrlHandlerJson,
  createAddImageFromFileHandlerJson,
  createGetImagesHandlerJson,
  createDeleteImageHandlerJson,
  createAddVideoFromUrlHandlerJson,
  createAddVideoFromFileHandlerJson,
  createGetVideosHandlerJson,
  createDeleteVideoHandlerJson
};
