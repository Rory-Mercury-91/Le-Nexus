const fs = require('fs');
const path = require('path');
const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { getStreamingUrl, needsTranscoding, getVideoTracks } = require('../../services/video-streaming-server');
const { detectVideoPlatform } = require('../common/video-handlers-helpers');

/**
 * Helper pour s'assurer qu'une ligne movie_user_data existe
 */
function ensureMovieUserDataRow(db, movieId, userId) {
  const existing = db.prepare('SELECT id FROM movie_user_data WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO movie_user_data (movie_id, user_id, statut_visionnage, user_images, user_videos, created_at, updated_at)
      VALUES (?, ?, 'À regarder', '[]', '[]', datetime('now'), datetime('now'))
    `).run(movieId, userId);
  }
}

/**
 * Helper pour obtenir le JSON array des vidéos
 */
function getUserVideos(db, movieId, userId) {
  const row = db.prepare('SELECT user_videos FROM movie_user_data WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
  if (!row || !row.user_videos) {
    return [];
  }
  return safeJsonParse(row.user_videos, []);
}

/**
 * Helper pour sauvegarder le JSON array des vidéos
 */
function saveUserVideos(db, movieId, userId, videos) {
  const videosJson = JSON.stringify(videos);
  db.prepare(`
    UPDATE movie_user_data 
    SET user_videos = ?, updated_at = datetime('now')
    WHERE movie_id = ? AND user_id = ?
  `).run(videosJson, movieId, userId);
}

/**
 * Enregistre les handlers IPC pour la gestion des vidéos utilisateur des films
 */
function registerMovieVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  const getPaths = () => {
    const pm = getPathManager();
    if (!pm) {
      return { base: '', videos: '' };
    }
    const paths = pm.getPaths();
    // Créer un dossier galleries/movies/videos pour stocker les vidéos utilisateur
    const videosDir = path.join(paths.base, 'galleries', 'movies', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    return { ...paths, videos: videosDir };
  };

  // Ajouter une vidéo depuis une URL
  ipcMain.handle('add-movie-user-video-url', async (event, params) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const movieId = params.movieId;
      const url = params.url;
      const title = params.title;

      const movie = db.prepare('SELECT id, titre FROM movies WHERE id = ?').get(movieId);
      if (!movie) {
        return { success: false, error: 'Film introuvable' };
      }

      const currentUser = store.get('currentUser', '');
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

      ensureMovieUserDataRow(db, movieId, userId);

      // Détecter la plateforme vidéo
      const { site, videoKey } = detectVideoPlatform(url);

      // Ajouter la vidéo au JSON array
      const videos = getUserVideos(db, movieId, userId);
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
      saveUserVideos(db, movieId, userId, videos);

      console.log(`✅ Vidéo utilisateur ajoutée depuis URL pour film ${movieId}`);
      return {
        success: true,
        video: newVideo
      };
    } catch (error) {
      console.error('❌ Erreur add-movie-user-video-url:', error);
      return { success: false, error: error.message };
    }
  });

  // Ajouter une vidéo depuis un fichier local
  ipcMain.handle('add-movie-user-video-file', async (event, movieId, title = null, isReference = false) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const movie = db.prepare('SELECT id, titre FROM movies WHERE id = ?').get(movieId);
      if (!movie) {
        return { success: false, error: 'Film introuvable' };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      ensureMovieUserDataRow(db, movieId, userId);

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

      const paths = getPaths();
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
        // Copier le fichier dans le dossier galleries
        const fileName = `movie_${movieId}_user_${userId}_${Date.now()}${ext}`;
        const destPath = path.join(paths.videos, fileName);
        fs.copyFileSync(sourcePath, destPath);
        finalFilePath = `galleries/movies/videos/${fileName}`;
        finalFileName = fileName;
        finalFileSize = fs.statSync(destPath).size;
      }

      // Ajouter la vidéo au JSON array
      const videos = getUserVideos(db, movieId, userId);
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
      saveUserVideos(db, movieId, userId, videos);

      console.log(`✅ Vidéo utilisateur ajoutée depuis fichier pour film ${movieId} (référence: ${isReference})`);
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
      console.error('❌ Erreur add-movie-user-video-file:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer les vidéos utilisateur
  ipcMain.handle('get-movie-user-videos', async (event, movieId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', videos: [] };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: true, videos: [] };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: true, videos: [] };
      }

      const videos = getUserVideos(db, movieId, userId);
      const paths = getPaths();

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
      console.error('❌ Erreur get-movie-user-videos:', error);
      return { success: false, error: error.message, videos: [] };
    }
  });

  // Supprimer une vidéo utilisateur
  ipcMain.handle('delete-movie-user-video', (event, movieId, videoId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      const videos = getUserVideos(db, movieId, userId);
      const videoIndex = videos.findIndex(vid => vid.id === videoId || vid.id?.toString() === videoId?.toString());
      
      if (videoIndex === -1) {
        return { success: false, error: 'Vidéo introuvable' };
      }

      const video = videos[videoIndex];
      const paths = getPaths();

      // Supprimer le fichier si c'est un fichier local (seulement si ce n'est pas une référence)
      if (video.type === 'file' && video.file_path && !video.is_reference) {
        let absolutePath;
        if (video.is_reference === 1 || video.is_reference === true) {
          // C'est une référence, utiliser le chemin absolu directement
          absolutePath = video.file_path;
        } else {
          // C'est une copie, construire le chemin depuis la base
          absolutePath = path.join(paths.base, video.file_path);
        }
        
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
            console.log(`✅ Fichier vidéo supprimé: ${absolutePath}`);
          } catch (error) {
            console.warn('⚠️ Impossible de supprimer le fichier:', error.message);
          }
        }
      }

      // Retirer la vidéo du JSON array
      videos.splice(videoIndex, 1);
      saveUserVideos(db, movieId, userId, videos);

      console.log(`✅ Vidéo utilisateur supprimée pour film ${movieId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur delete-movie-user-video:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler spécifique aux vidéos (pas de duplication, gardé tel quel)
  ipcMain.handle('get-video-tracks', async (event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Fichier introuvable', tracks: { audio: [], subtitles: [] } };
      }

      const tracks = await getVideoTracks(filePath);
      return { success: true, tracks };
    } catch (error) {
      console.error('❌ Erreur get-video-tracks:', error);
      return { success: false, error: error.message, tracks: { audio: [], subtitles: [] } };
    }
  });
}

module.exports = { registerMovieVideoHandlers };
