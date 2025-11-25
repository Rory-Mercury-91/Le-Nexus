const fs = require('fs');
const path = require('path');
const { net, session } = require('electron');
const { getUserIdByName } = require('../common-helpers');

/**
 * Télécharger une image depuis une URL (fonction partagée)
 */
async function downloadImageFromUrl(imageUrl, destPath) {
  return new Promise((resolve, reject) => {
    // Utiliser Electron.net pour le téléchargement (support des cookies et headers)
    const persistentSession = session.fromPartition('persist:lenexus');
    
    const request = net.request({
      url: imageUrl,
      method: 'GET',
      redirect: 'follow',
      session: persistentSession
    });

    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    request.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
    request.setHeader('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');

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
            reject(new Error(`Image trop petite: ${buffer.byteLength} bytes`));
            return;
          }

          // Détecter le format depuis les magic bytes
          const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
          const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49;
          const isWEBP = buffer[8] === 0x57 && buffer[9] === 0x45;
          const isBMP = buffer[0] === 0x42 && buffer[1] === 0x4D;

          let detectedExt = '';
          if (isPNG) detectedExt = '.png';
          else if (isJPEG) detectedExt = '.jpg';
          else if (isGIF) detectedExt = '.gif';
          else if (isWEBP) detectedExt = '.webp';
          else if (isBMP) detectedExt = '.bmp';

          let finalPath = destPath;
          if (!destPath.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i)) {
            if (detectedExt) {
              finalPath = destPath + detectedExt;
            } else {
              // Par défaut, essayer de détecter depuis l'URL
              const urlExt = path.extname(new URL(imageUrl).pathname).toLowerCase();
              if (urlExt.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i)) {
                finalPath = destPath + urlExt;
              } else {
                finalPath = destPath + '.jpg'; // Par défaut
              }
            }
          }

          fs.writeFileSync(finalPath, buffer);
          resolve({ path: finalPath, size: buffer.byteLength });
        } catch (error) {
          reject(error);
        }
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
 * Obtenir le type MIME depuis l'extension
 */
function getMimeTypeFromExt(ext) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  };
  return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
}

/**
 * Créer un handler pour ajouter une image depuis une URL
 */
function createAddImageFromUrlHandler(config) {
  const {
    itemIdParamName = 'itemId',
    itemTableName, // 'movies', 'tv_shows', etc.
    itemTitleColumn = 'titre',
    itemNotFoundError, // 'Film introuvable', 'Série TV introuvable', etc.
    imagesTableName, // 'movie_user_images', 'tv_show_user_images', etc.
    itemIdColumnName, // 'movie_id', 'show_id', etc.
    galleryFolderName, // 'movies', 'tv-shows', etc.
    filePrefix, // 'movie_', 'tv_show_', etc.
    getPathsFn,
    ensureTableFn,
    hasTitleColumn = false
  } = config;

  return async (event, itemId, imageUrl) => {
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

      if (!imageUrl || !imageUrl.trim()) {
        return { success: false, error: 'URL requise' };
      }

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

      // Construire la requête INSERT selon la présence de la colonne title
      let insertQuery, insertParams;
      if (hasTitleColumn) {
        // Vérifier si la colonne title existe réellement
        const columns = db.prepare(`PRAGMA table_info(${imagesTableName})`).all();
        const titleColumnExists = columns.some(col => col.name === 'title');
        
        if (titleColumnExists) {
          insertQuery = `INSERT INTO ${imagesTableName} (${itemIdColumnName}, user_id, file_path, file_name, file_size, mime_type, title) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          insertParams = [itemId, userId, relativePath, finalFileName, fileSize, mimeType, null];
        } else {
          insertQuery = `INSERT INTO ${imagesTableName} (${itemIdColumnName}, user_id, file_path, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)`;
          insertParams = [itemId, userId, relativePath, finalFileName, fileSize, mimeType];
        }
      } else {
        insertQuery = `INSERT INTO ${imagesTableName} (${itemIdColumnName}, user_id, file_path, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)`;
        insertParams = [itemId, userId, relativePath, finalFileName, fileSize, mimeType];
      }

      const insertResult = db.prepare(insertQuery).run(...insertParams);

      console.log(`✅ Image utilisateur ajoutée depuis URL pour ${itemIdParamName} ${itemId} (ID: ${insertResult.lastInsertRowid})`);
      return {
        success: true,
        imageId: insertResult.lastInsertRowid,
        filePath: relativePath,
        fileName: finalFileName
      };
    } catch (error) {
      console.error(`❌ Erreur add-${itemIdParamName}-user-image-url:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour ajouter une image depuis un fichier local
 */
function createAddImageFromFileHandler(config) {
  const {
    itemIdParamName = 'itemId',
    itemTableName,
    itemTitleColumn = 'titre',
    itemNotFoundError,
    imagesTableName,
    itemIdColumnName,
    galleryFolderName,
    filePrefix,
    getPathsFn,
    ensureTableFn,
    dialog,
    getMainWindow,
    hasTitleColumn = false
  } = config;

  return async (event, itemId, title = null) => {
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
        title: `Ajouter une image pour "${item[itemTitleColumn]}"`,
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ]
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const sourcePath = result.filePaths[0];
      const ext = path.extname(sourcePath);
      const baseFileName = `${filePrefix}${itemId}_user_${userId}_${Date.now()}${ext}`;
      const displayName = title && title.trim() ? title.trim() : path.basename(sourcePath, ext);
      const paths = getPathsFn();
      const destPath = path.join(paths.galleries, baseFileName);

      // Copier le fichier
      fs.copyFileSync(sourcePath, destPath);

      // Récupérer les infos du fichier
      const stats = fs.statSync(destPath);
      const mimeType = getMimeTypeFromExt(ext.toLowerCase());

      const relativePath = `galleries/${galleryFolderName}/${baseFileName}`;

      // Construire la requête INSERT selon la présence de la colonne title
      let insertQuery, insertParams;
      if (hasTitleColumn) {
        // Vérifier si la colonne title existe réellement
        const columns = db.prepare(`PRAGMA table_info(${imagesTableName})`).all();
        const titleColumnExists = columns.some(col => col.name === 'title');
        
        if (titleColumnExists) {
          insertQuery = `INSERT INTO ${imagesTableName} (${itemIdColumnName}, user_id, title, file_path, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          insertParams = [itemId, userId, displayName, relativePath, displayName, stats.size, mimeType];
        } else {
          insertQuery = `INSERT INTO ${imagesTableName} (${itemIdColumnName}, user_id, file_path, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)`;
          insertParams = [itemId, userId, relativePath, baseFileName, stats.size, mimeType];
        }
      } else {
        insertQuery = `INSERT INTO ${imagesTableName} (${itemIdColumnName}, user_id, file_path, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)`;
        insertParams = [itemId, userId, relativePath, baseFileName, stats.size, mimeType];
      }

      const insertResult = db.prepare(insertQuery).run(...insertParams);

      console.log(`✅ Image utilisateur ajoutée depuis fichier pour ${itemIdParamName} ${itemId} (ID: ${insertResult.lastInsertRowid})`);
      return {
        success: true,
        imageId: insertResult.lastInsertRowid,
        filePath: relativePath,
        fileName: displayName || baseFileName
      };
    } catch (error) {
      console.error(`❌ Erreur add-${itemIdParamName}-user-image-file:`, error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * Créer un handler pour récupérer les images
 */
function createGetImagesHandler(config) {
  const {
    itemIdParamName = 'itemId',
    imagesTableName,
    itemIdColumnName,
    getPathsFn,
    ensureTableFn,
    hasTitleColumn = false
  } = config;

  return (event, itemId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', images: [] };
      }

      // Vérifier et créer la table si nécessaire
      if (ensureTableFn) {
        ensureTableFn(db);
      }

      // Construire la requête SELECT selon la présence de la colonne title
      let selectQuery;
      if (hasTitleColumn) {
        const columns = db.prepare(`PRAGMA table_info(${imagesTableName})`).all();
        const titleColumnExists = columns.some(col => col.name === 'title');
        
        if (titleColumnExists) {
          selectQuery = `SELECT id, title, file_path, file_name, file_size, mime_type, created_at FROM ${imagesTableName} WHERE ${itemIdColumnName} = ? ORDER BY created_at DESC`;
        } else {
          selectQuery = `SELECT id, file_path, file_name, file_size, mime_type, created_at FROM ${imagesTableName} WHERE ${itemIdColumnName} = ? ORDER BY created_at DESC`;
        }
      } else {
        selectQuery = `SELECT id, file_path, file_name, file_size, mime_type, created_at FROM ${imagesTableName} WHERE ${itemIdColumnName} = ? ORDER BY created_at DESC`;
      }

      const images = db.prepare(selectQuery).all(itemId);

      const paths = getPathsFn();
      const imagesWithUrl = images.map(img => {
        const fullPath = path.join(paths.base, img.file_path);
        const normalizedPath = fullPath.replace(/\\/g, '/');
        return {
          id: img.id,
          title: img.title || null,
          file_path: img.file_path,
          file_name: img.file_name,
          file_size: img.file_size,
          mime_type: img.mime_type,
          created_at: img.created_at,
          url: `manga://${encodeURIComponent(normalizedPath)}`
        };
      });

      return { success: true, images: imagesWithUrl };
    } catch (error) {
      console.error(`❌ Erreur get-${itemIdParamName}-user-images:`, error);
      return { success: false, error: error.message, images: [] };
    }
  };
}

/**
 * Créer un handler pour supprimer une image
 */
function createDeleteImageHandler(config) {
  const {
    itemIdParamName = 'itemId',
    imagesTableName,
    getPathsFn,
    ensureTableFn
  } = config;

  return (event, imageId) => {
    try {
      const db = config.getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée' };
      }

      // Vérifier et créer la table si nécessaire
      if (ensureTableFn) {
        ensureTableFn(db);
      }

      const image = db.prepare(`SELECT id, file_path FROM ${imagesTableName} WHERE id = ?`).get(imageId);
      if (!image) {
        return { success: false, error: 'Image introuvable' };
      }

      // Supprimer le fichier
      const paths = getPathsFn();
      const fullPath = path.join(paths.base, image.file_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.warn(`⚠️ Impossible de supprimer le fichier ${fullPath}:`, err.message);
        }
      }

      // Supprimer de la base de données
      db.prepare(`DELETE FROM ${imagesTableName} WHERE id = ?`).run(imageId);

      console.log(`✅ Image utilisateur supprimée (ID: ${imageId})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur delete-${itemIdParamName}-user-image:`, error);
      return { success: false, error: error.message };
    }
  };
}

module.exports = {
  downloadImageFromUrl,
  getMimeTypeFromExt,
  createAddImageFromUrlHandler,
  createAddImageFromFileHandler,
  createGetImagesHandler,
  createDeleteImageHandler
};
