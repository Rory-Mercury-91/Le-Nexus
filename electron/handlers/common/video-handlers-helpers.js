const fs = require('fs');
const path = require('path');
const { getUserIdByName } = require('../common-helpers');

/**
 * Détecter la plateforme vidéo depuis une URL (YouTube, Vimeo, Dailymotion)
 */
function detectVideoPlatform(url) {
  let site = null;
  let videoKey = null;
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  if (youtubeMatch) {
    site = 'YouTube';
    videoKey = youtubeMatch[1];
  } else {
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
    if (vimeoMatch) {
      site = 'Vimeo';
      videoKey = vimeoMatch[1];
    } else {
      // Dailymotion
      const dailymotionMatch = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([^"&?/\s]+)/);
      if (dailymotionMatch) {
        site = 'Dailymotion';
        videoKey = dailymotionMatch[1];
      }
      // Pour les autres plateformes, site reste null mais l'URL sera stockée
    }
  }
  
  return { site, videoKey };
}

/**
 * Créer un handler pour ajouter une vidéo depuis une URL
 */
function createAddVideoFromUrlHandler(config) {
  const {
    itemIdParamName = 'itemId',
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    videosTableName,
    itemIdColumnName,
    getPathsFn,
    ensureTableFn
  } = config;

  return async (event, params) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier et créer la table si nécessaire
      if (ensureTableFn) {
        ensureTableFn(db);
      }

      const itemId = params[itemIdParamName];
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

      // Détecter la plateforme vidéo
      const { site, videoKey } = detectVideoPlatform(url);

      // Enregistrer dans la base de données
      const insertStmt = db.prepare(`
        INSERT INTO ${videosTableName} (${itemIdColumnName}, user_id, type, title, url, site, video_key)
        VALUES (?, ?, 'url', ?, ?, ?, ?)
      `);
      
      const insertResult = insertStmt.run(
        itemId,
        userId,
        title || null,
        url.trim(),
        site,
        videoKey
      );

      console.log(`✅ Vidéo URL utilisateur ajoutée pour ${itemIdParamName} ${itemId} (ID: ${insertResult.lastInsertRowid})`);
      return {
        success: true,
        videoId: insertResult.lastInsertRowid,
        type: 'url',
        url: url.trim(),
        title: title || null,
        site,
        videoKey
      };
    } catch (error) {
      console.error(`❌ Erreur add-${itemIdParamName}-user-video-url:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour ajouter une vidéo depuis un fichier local
 */
function createAddVideoFromFileHandler(config) {
  const {
    itemIdParamName = 'itemId',
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    videosTableName,
    itemIdColumnName,
    galleryFolderName,
    filePrefix,
    getPathsFn,
    ensureTableFn,
    dialog,
    getMainWindow
  } = config;

  return async (event, itemId, title = null, isReference = false) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier et créer la table si nécessaire
      if (ensureTableFn) {
        ensureTableFn(db);
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

      // Ouvrir le dialogue de sélection de fichier
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: `Ajouter une vidéo pour "${item[itemTitleColumn]}"`,
        properties: ['openFile'],
        filters: [
          { name: 'Vidéos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'] }
        ]
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const sourcePath = result.filePaths[0];
      let ext = path.extname(sourcePath).toLowerCase();
      
      // Si pas d'extension, détecter depuis les magic bytes
      if (!ext) {
        try {
          const buffer = fs.readFileSync(sourcePath, { start: 0, end: 12 });
          // MKV: 1A 45 DF A3
          if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
            ext = '.mkv';
          }
          // AVI: RIFF...AVI 
          else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                   buffer[8] === 0x41 && buffer[9] === 0x56 && buffer[10] === 0x49 && buffer[11] === 0x20) {
            ext = '.avi';
          }
          // MP4: ftyp
          else if ((buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) ||
                   (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70)) {
            ext = '.mp4';
          }
        } catch (detectError) {
          console.warn('Impossible de détecter le type de fichier:', detectError);
        }
      }
      
      // Valider l'extension
      const supportedExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.wmv', '.flv'];
      if (!ext || !supportedExtensions.includes(ext)) {
        const supportedList = supportedExtensions.map(e => e.toUpperCase().substring(1)).join(', ');
        return { 
          success: false, 
          error: `Format vidéo non supporté. Formats supportés : ${supportedList}` 
        };
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Fichier introuvable. Le fichier a peut-être été déplacé ou supprimé.' };
      }

      const baseFileName = `${filePrefix}${itemId}_user_${userId}_${Date.now()}${ext}`;
      const displayName = title && title.trim() ? title.trim() : path.basename(sourcePath, ext);
      const paths = getPathsFn();
      
      let filePath, fileSize, relativePath;
      
      if (isReference) {
        // Référencer directement le fichier sans le copier
        filePath = sourcePath;
        fileSize = fs.statSync(sourcePath).size;
        relativePath = sourcePath; // Chemin absolu pour les références
      } else {
        // Copier le fichier
        const destPath = path.join(paths.videos, baseFileName);
        fs.copyFileSync(sourcePath, destPath);
        filePath = destPath;
        fileSize = fs.statSync(destPath).size;
        relativePath = `galleries/${galleryFolderName}/videos/${baseFileName}`;
      }

      // Vérifier si la colonne is_reference existe
      const columns = db.prepare(`PRAGMA table_info(${videosTableName})`).all();
      const hasIsReferenceColumn = columns.some(col => col.name === 'is_reference');

      // Enregistrer dans la base de données
      let insertQuery, insertParams;
      if (hasIsReferenceColumn) {
        insertQuery = `INSERT INTO ${videosTableName} (${itemIdColumnName}, user_id, type, title, file_path, file_name, file_size, is_reference) VALUES (?, ?, 'file', ?, ?, ?, ?, ?)`;
        insertParams = [itemId, userId, displayName, relativePath, baseFileName, fileSize, isReference ? 1 : 0];
      } else {
        insertQuery = `INSERT INTO ${videosTableName} (${itemIdColumnName}, user_id, type, title, file_path, file_name, file_size) VALUES (?, ?, 'file', ?, ?, ?, ?)`;
        insertParams = [itemId, userId, displayName, relativePath, baseFileName, fileSize];
      }

      const insertResult = db.prepare(insertQuery).run(...insertParams);

      console.log(`✅ Vidéo fichier utilisateur ajoutée pour ${itemIdParamName} ${itemId} (ID: ${insertResult.lastInsertRowid})`);
      return {
        success: true,
        videoId: insertResult.lastInsertRowid,
        type: 'file',
        filePath: relativePath,
        fileName: baseFileName,
        title: displayName,
        isReference
      };
    } catch (error) {
      console.error(`❌ Erreur add-${itemIdParamName}-user-video-file:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour récupérer les vidéos
 */
function createGetVideosHandler(config) {
  const {
    itemIdParamName = 'itemId',
    videosTableName,
    itemIdColumnName,
    getPathsFn,
    ensureTableFn,
    getStreamingUrlFn,
    needsTranscodingFn
  } = config;

  return (event, itemId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', videos: [] };
      }

      // Vérifier et créer la table si nécessaire
      if (ensureTableFn) {
        ensureTableFn(db);
      }

      const videos = db.prepare(`
        SELECT id, type, title, url, file_path, file_name, file_size, mime_type, site, video_key, created_at, is_reference
        FROM ${videosTableName}
        WHERE ${itemIdColumnName} = ?
        ORDER BY created_at DESC
      `).all(itemId);

      const paths = getPathsFn();
      const videosWithUrl = videos.map(video => {
        const result = {
          id: video.id,
          type: video.type,
          title: video.title,
          site: video.site,
          video_key: video.video_key,
          created_at: video.created_at,
          is_reference: video.is_reference === 1
        };
        
        if (video.type === 'url') {
          result.url = video.url;
        } else if (video.type === 'file') {
          result.file_path = video.file_path;
          result.file_name = video.file_name;
          result.file_size = video.file_size;
          result.mime_type = video.mime_type;
          
          // Si c'est une référence, utiliser directement le chemin absolu
          // Sinon, construire le chemin relatif depuis la base
          let fullPath;
          if (video.is_reference === 1) {
            // C'est un chemin absolu, l'utiliser directement
            fullPath = video.file_path;
          } else {
            // C'est un chemin relatif, construire le chemin complet
            fullPath = path.join(paths.base, video.file_path);
          }
          
          // Si c'est un MKV ou AVI, utiliser le serveur de streaming pour transcoder
          const ext = path.extname(fullPath).toLowerCase();
          if (needsTranscodingFn && needsTranscodingFn(fullPath)) {
            result.url = getStreamingUrlFn ? getStreamingUrlFn(fullPath) : null;
            console.log(`🔄 URL streaming (${ext.toUpperCase()}): ${result.url}`);
          } else {
            // Sinon, utiliser le protocole manga://
            result.url = `manga://${encodeURIComponent(fullPath.replace(/\\/g, '/'))}`;
            console.log(`📁 URL manga:// pour ${ext.toUpperCase()}: ${path.basename(fullPath)}`);
          }
        }
        
        return result;
      });

      return { success: true, videos: videosWithUrl };
    } catch (error) {
      console.error(`❌ Erreur get-${itemIdParamName}-user-videos:`, error);
      return { success: false, error: error.message, videos: [] };
    }
  };
}

/**
 * Créer un handler pour supprimer une vidéo
 */
function createDeleteVideoHandler(config) {
  const {
    itemIdParamName = 'itemId',
    videosTableName,
    getPathsFn,
    ensureTableFn
  } = config;

  return (event, videoId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier et créer la table si nécessaire
      if (ensureTableFn) {
        ensureTableFn(db);
      }

      const video = db.prepare(`SELECT id, type, file_path, is_reference FROM ${videosTableName} WHERE id = ?`).get(videoId);
      if (!video) {
        return { success: false, error: 'Vidéo introuvable' };
      }

      // Supprimer le fichier seulement si ce n'est pas une référence et si c'est un fichier local
      if (video.type === 'file' && !video.is_reference) {
        const paths = getPathsFn();
        const fullPath = path.join(paths.base, video.file_path);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (err) {
            console.warn(`⚠️ Impossible de supprimer le fichier ${fullPath}:`, err.message);
          }
        }
      }

      // Supprimer de la base de données
      db.prepare(`DELETE FROM ${videosTableName} WHERE id = ?`).run(videoId);

      console.log(`✅ Vidéo utilisateur supprimée (ID: ${videoId})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur delete-${itemIdParamName}-user-video:`, error);
      return { success: false, error: error.message };
    }
  };
}

module.exports = {
  detectVideoPlatform,
  createAddVideoFromUrlHandler,
  createAddVideoFromFileHandler,
  createGetVideosHandler,
  createDeleteVideoHandler
};
