const fs = require('fs');
const path = require('path');
const { getUserIdByName, safeJsonParse } = require('../common-helpers');
const { downloadImageFromUrl, getMimeTypeFromExt } = require('../common/gallery-handlers-helpers');

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
 * Helper pour obtenir le JSON array des images
 */
function getUserImages(db, movieId, userId) {
  const row = db.prepare('SELECT user_images FROM movie_user_data WHERE movie_id = ? AND user_id = ?').get(movieId, userId);
  if (!row || !row.user_images) {
    return [];
  }
  return safeJsonParse(row.user_images, []);
}

/**
 * Helper pour sauvegarder le JSON array des images
 */
function saveUserImages(db, movieId, userId, images) {
  const imagesJson = JSON.stringify(images);
  db.prepare(`
    UPDATE movie_user_data 
    SET user_images = ?, updated_at = datetime('now')
    WHERE movie_id = ? AND user_id = ?
  `).run(imagesJson, movieId, userId);
}

/**
 * Enregistre les handlers IPC pour la gestion de la galerie d'images utilisateur des films
 */
function registerMovieGalleryHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  const getPaths = () => {
    const pm = getPathManager();
    if (!pm) {
      return { base: '', covers: '', galleries: '' };
    }
    const paths = pm.getPaths();
    // Créer un dossier galleries/movies pour stocker les images utilisateur
    const galleriesDir = path.join(paths.base, 'galleries', 'movies');
    if (!fs.existsSync(galleriesDir)) {
      fs.mkdirSync(galleriesDir, { recursive: true });
    }
    return { ...paths, galleries: galleriesDir };
  };

  // Ajouter une image depuis une URL
  ipcMain.handle('add-movie-user-image-url', async (event, movieId, imageUrl, title = null) => {
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

      if (!imageUrl || !imageUrl.trim()) {
        return { success: false, error: 'URL requise' };
      }

      ensureMovieUserDataRow(db, movieId, userId);

      const paths = getPaths();
      const fileName = `movie_${movieId}_user_${userId}_${Date.now()}`;
      const destPath = path.join(paths.galleries, fileName);

      // Télécharger l'image
      const downloadResult = await downloadImageFromUrl(imageUrl.trim(), destPath);
      const finalPath = downloadResult.path;
      const fileSize = downloadResult.size;

      // Déterminer l'extension et le mime type
      const ext = path.extname(finalPath).toLowerCase();
      const mimeType = getMimeTypeFromExt(ext);
      const finalFileName = path.basename(finalPath);
      const relativePath = `galleries/movies/${finalFileName}`;

      // Ajouter l'image au JSON array
      const images = getUserImages(db, movieId, userId);
      const newImage = {
        id: Date.now().toString(), // ID temporaire basé sur timestamp
        title: title || null,
        file_path: relativePath,
        file_name: finalFileName,
        file_size: fileSize,
        mime_type: mimeType,
        created_at: new Date().toISOString()
      };
      images.push(newImage);
      saveUserImages(db, movieId, userId, images);

      console.log(`✅ Image utilisateur ajoutée depuis URL pour film ${movieId}`);
      return {
        success: true,
        image: newImage,
        filePath: relativePath,
        fileName: finalFileName
      };
    } catch (error) {
      console.error('❌ Erreur add-movie-user-image-url:', error);
      return { success: false, error: error.message };
    }
  });

  // Ajouter une image depuis un fichier local
  ipcMain.handle('add-movie-user-image-file', async (event, movieId, title = null) => {
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
        title: 'Sélectionner une image',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, error: 'Aucun fichier sélectionné' };
      }

      const sourcePath = result.filePaths[0];
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Fichier introuvable' };
      }

      const paths = getPaths();
      const ext = path.extname(sourcePath).toLowerCase();
      const fileName = `movie_${movieId}_user_${userId}_${Date.now()}${ext}`;
      const destPath = path.join(paths.galleries, fileName);

      // Copier le fichier
      fs.copyFileSync(sourcePath, destPath);
      const fileSize = fs.statSync(destPath).size;
      const mimeType = getMimeTypeFromExt(ext);
      const relativePath = `galleries/movies/${fileName}`;

      // Ajouter l'image au JSON array
      const images = getUserImages(db, movieId, userId);
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
      saveUserImages(db, movieId, userId, images);

      console.log(`✅ Image utilisateur ajoutée depuis fichier pour film ${movieId}`);
      return {
        success: true,
        image: newImage,
        filePath: relativePath,
        fileName: fileName
      };
    } catch (error) {
      console.error('❌ Erreur add-movie-user-image-file:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer les images utilisateur
  ipcMain.handle('get-movie-user-images', (event, movieId) => {
    try {
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', images: [] };
      }

      const currentUser = store.get('currentUser', '');
      if (!currentUser) {
        return { success: true, images: [] };
      }

      const userId = getUserIdByName(db, currentUser);
      if (!userId) {
        return { success: true, images: [] };
      }

      const images = getUserImages(db, movieId, userId);
      const paths = getPaths();

      // Construire les URLs avec le protocole manga:// pour chaque image
      const imagesWithUrls = images.map(img => {
        const absolutePath = path.join(paths.base, img.file_path);
        // Normaliser le chemin pour le protocole manga://
        const normalizedPath = absolutePath.replace(/\\/g, '/');
        return {
          ...img,
          url: `manga://${encodeURIComponent(normalizedPath)}`,
          absolute_path: absolutePath
        };
      });

      return { success: true, images: imagesWithUrls };
    } catch (error) {
      console.error('❌ Erreur get-movie-user-images:', error);
      return { success: false, error: error.message, images: [] };
    }
  });

  // Supprimer une image utilisateur
  ipcMain.handle('delete-movie-user-image', (event, movieId, imageId) => {
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

      const images = getUserImages(db, movieId, userId);
      const imageIndex = images.findIndex(img => img.id === imageId || img.id?.toString() === imageId?.toString());
      
      if (imageIndex === -1) {
        return { success: false, error: 'Image introuvable' };
      }

      const image = images[imageIndex];
      const paths = getPaths();
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
      saveUserImages(db, movieId, userId, images);

      console.log(`✅ Image utilisateur supprimée pour film ${movieId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur delete-movie-user-image:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerMovieGalleryHandlers };
