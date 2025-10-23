const fs = require('fs');
const path = require('path');
const { createSlug } = require('../utils/slug');

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
      console.log(`Dossier renommé: ${oldSlug} → ${newSlug}`);

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

      console.log(`Chemins mis à jour en base de données pour la série ${serieId}`);
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
    console.log(`Image tome renommée: ${oldFileName} → ${newFileName}`);
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
    console.log(`Image série renommée: ${oldFileName} → ${newFileName}`);
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
async function downloadCover(pathManager, imageUrl, serieTitre, type = 'serie', identifier = null) {
  try {
    const slug = createSlug(serieTitre);
    let targetDirectory;
    let fileName;
    let relativePath;

    if (type === 'anime') {
      // Pour les animes : dossier animes/<slug>/
      const animesBasePath = path.join(pathManager.getPaths().covers, 'animes');
      const animePath = path.join(animesBasePath, slug);
      
      if (!fs.existsSync(animesBasePath)) fs.mkdirSync(animesBasePath, { recursive: true });
      if (!fs.existsSync(animePath)) fs.mkdirSync(animePath, { recursive: true });
      
      targetDirectory = animePath;
      const ext = path.extname(imageUrl).split('?')[0] || '.jpg';
      fileName = `cover${ext}`;
      relativePath = `animes/${slug}/${fileName}`;
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

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(fullPath, Buffer.from(buffer));
    console.log(`Image téléchargée: ${relativePath}`);
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
    console.log(`Image copiée: ${relativePath}`);
    return { success: true, localPath: relativePath };
  } catch (error) {
    console.error('Erreur save-cover-from-path:', error);
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
  getCoverFullPath
};
