const fs = require('fs');
const path = require('path');
const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { getStreamingUrl, needsTranscoding } = require('../../services/video-streaming-server');
const { detectVideoPlatform } = require('../common/video-handlers-helpers');

/**
 * Helper pour s'assurer qu'une ligne tv_show_user_data existe
 */
function ensureTvShowUserDataRow(db, showId, userId) {
  const existing = db.prepare('SELECT id FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO tv_show_user_data (show_id, user_id, statut_visionnage, user_images, user_videos, episode_videos, episode_progress, created_at, updated_at)
      VALUES (?, ?, 'À regarder', '[]', '[]', '{}', '{}', datetime('now'), datetime('now'))
    `).run(showId, userId);
  }
}

/**
 * Helper pour obtenir le JSON object des vidéos d'épisode
 */
function getEpisodeVideos(db, showId, userId) {
  const row = db.prepare('SELECT episode_videos FROM tv_show_user_data WHERE show_id = ? AND user_id = ?').get(showId, userId);
  if (!row || !row.episode_videos) {
    return {};
  }
  return safeJsonParse(row.episode_videos, {});
}

/**
 * Helper pour sauvegarder le JSON object des vidéos d'épisode
 */
function saveEpisodeVideos(db, showId, userId, episodeVideos) {
  const videosJson = JSON.stringify(episodeVideos);
  db.prepare(`
    UPDATE tv_show_user_data 
    SET episode_videos = ?, updated_at = datetime('now')
    WHERE show_id = ? AND user_id = ?
  `).run(videosJson, showId, userId);
}

/**
 * Enregistre les handlers IPC pour la gestion des vidéos utilisateur des épisodes de séries TV
 */
function registerTvEpisodeVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  const getPaths = () => {
    const pm = getPathManager();
    if (!pm) {
      return { base: '', videos: '' };
    }
    const paths = pm.getPaths();
    // Créer un dossier galleries/tv-shows/videos pour stocker les vidéos utilisateur
    const videosDir = path.join(paths.base, 'galleries', 'tv-shows', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    return { ...paths, videos: videosDir };
  };

  /**
   * Ajouter une vidéo URL à un épisode
   */
  ipcMain.handle('add-tv-episode-user-video-url', async (event, { episodeId, url, title }) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const episode = db.prepare('SELECT id, show_id, titre FROM tv_episodes WHERE id = ?').get(episodeId);
      if (!episode) {
        return { success: false, error: 'Épisode introuvable' };
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

      ensureTvShowUserDataRow(db, episode.show_id, userId);

      // Détecter la plateforme vidéo
      const { site, videoKey } = detectVideoPlatform(url);

      // Récupérer et mettre à jour episode_videos JSON
      const episodeVideos = getEpisodeVideos(db, episode.show_id, userId);
      const episodeIdStr = String(episodeId);
      
      if (!episodeVideos[episodeIdStr]) {
        episodeVideos[episodeIdStr] = [];
      }

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
      
      episodeVideos[episodeIdStr].push(newVideo);
      saveEpisodeVideos(db, episode.show_id, userId, episodeVideos);

      console.log(`✅ Vidéo URL utilisateur ajoutée pour l'épisode ${episodeId}`);
      return {
        success: true,
        videoId: newVideo.id,
        type: 'url',
        url: url.trim(),
        title: title || null,
        site,
        videoKey
      };
    } catch (error) {
      console.error('❌ Erreur add-tv-episode-user-video-url:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Ajouter une vidéo fichier local à un épisode
   * @param {boolean} isReference - Si true, référence directement le fichier sans le copier
   */
  ipcMain.handle('add-tv-episode-user-video-file', async (event, episodeId, title = null, isReference = false) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const episode = db.prepare('SELECT id, show_id, titre, saison_numero, episode_numero FROM tv_episodes WHERE id = ?').get(episodeId);
      if (!episode) {
        return { success: false, error: 'Épisode introuvable' };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      ensureTvShowUserDataRow(db, episode.show_id, userId);

      // Ouvrir le dialogue de sélection de fichier
      const episodeTitle = episode.titre || `S${episode.saison_numero}E${episode.episode_numero}`;
      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: `Ajouter une vidéo pour "${episodeTitle}"`,
        properties: ['openFile'],
        filters: [
          { name: 'Vidéos', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'] }
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
      const supportedExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
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

      // Récupérer les infos du fichier source
      const stats = fs.statSync(sourcePath);
      const mimeType = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.m4v': 'video/x-m4v'
      }[ext.toLowerCase()] || 'video/mp4';
      const displayName = title && title.trim() ? title.trim() : path.basename(sourcePath, ext);
      const sourceFileName = path.basename(sourcePath);

      let filePath, fileName;

      if (isReference) {
        // Mode référence : stocker le chemin absolu
        filePath = sourcePath;
        fileName = sourceFileName;
      } else {
        // Mode copie : copier le fichier dans le dossier de l'application
        const generatedFileName = `tv_episode_${episodeId}_user_${userId}_${Date.now()}${ext}`;
        const paths = getPaths();
        const destPath = path.join(paths.videos, generatedFileName);

        // Copier le fichier
        try {
          fs.copyFileSync(sourcePath, destPath);
        } catch (copyError) {
          return { 
            success: false, 
            error: `Impossible de copier le fichier : ${copyError.message}` 
          };
        }

        const relativePath = `galleries/tv-shows/videos/${generatedFileName}`;
        filePath = relativePath;
        fileName = generatedFileName;
      }

      // Récupérer et mettre à jour episode_videos JSON
      const episodeVideos = getEpisodeVideos(db, episode.show_id, userId);
      const episodeIdStr = String(episodeId);
      
      if (!episodeVideos[episodeIdStr]) {
        episodeVideos[episodeIdStr] = [];
      }

      const newVideo = {
        id: Date.now().toString(),
        type: 'file',
        title: displayName,
        url: null,
        file_path: filePath,
        file_name: fileName,
        file_size: stats.size,
        mime_type: mimeType,
        site: null,
        video_key: null,
        is_reference: isReference ? 1 : 0,
        created_at: new Date().toISOString()
      };
      
      episodeVideos[episodeIdStr].push(newVideo);
      saveEpisodeVideos(db, episode.show_id, userId, episodeVideos);

      console.log(`✅ Vidéo fichier utilisateur ${isReference ? 'référencée' : 'copiée'} pour l'épisode ${episodeId}`);
      return {
        success: true,
        videoId: newVideo.id,
        type: 'file',
        filePath: filePath,
        fileName: fileName,
        title: displayName,
        isReference: isReference
      };
    } catch (error) {
      console.error('❌ Erreur add-tv-episode-user-video-file:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Récupérer les vidéos utilisateur d'un épisode
   */
  ipcMain.handle('get-tv-episode-user-videos', async (event, episodeId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', videos: [] };
      }

      const episode = db.prepare('SELECT id, show_id FROM tv_episodes WHERE id = ?').get(episodeId);
      if (!episode) {
        return { success: false, error: 'Épisode introuvable', videos: [] };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: true, videos: [] };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: true, videos: [] };
      }

      // Récupérer les vidéos depuis episode_videos JSON
      const episodeVideos = getEpisodeVideos(db, episode.show_id, userId);
      const episodeIdStr = String(episodeId);
      const videos = episodeVideos[episodeIdStr] || [];

      const paths = getPaths();
      
      // Traiter les vidéos pour ajouter les URLs
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
      console.error('❌ Erreur get-tv-episode-user-videos:', error);
      return { success: false, error: error.message, videos: [] };
    }
  });

  /**
   * Supprimer une vidéo utilisateur d'un épisode
   */
  ipcMain.handle('delete-tv-episode-user-video', (event, episodeId, videoId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      const episode = db.prepare('SELECT id, show_id FROM tv_episodes WHERE id = ?').get(episodeId);
      if (!episode) {
        return { success: false, error: 'Épisode introuvable' };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: false, error: 'Aucun utilisateur connecté' };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: false, error: 'Utilisateur introuvable' };
      }

      // Récupérer et mettre à jour episode_videos JSON
      const episodeVideos = getEpisodeVideos(db, episode.show_id, userId);
      const episodeIdStr = String(episodeId);
      const videos = episodeVideos[episodeIdStr] || [];
      
      const videoIndex = videos.findIndex(vid => vid.id === videoId || vid.id?.toString() === videoId?.toString());
      
      if (videoIndex === -1) {
        return { success: false, error: 'Vidéo introuvable' };
      }

      const video = videos[videoIndex];
      const paths = getPaths();

      // Supprimer le fichier si c'est un fichier local et que ce n'est PAS une référence
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
      if (videos.length === 0) {
        delete episodeVideos[episodeIdStr];
      } else {
        episodeVideos[episodeIdStr] = videos;
      }
      saveEpisodeVideos(db, episode.show_id, userId, episodeVideos);

      console.log(`✅ Vidéo utilisateur supprimée pour épisode ${episodeId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur delete-tv-episode-user-video:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTvEpisodeVideoHandlers };
