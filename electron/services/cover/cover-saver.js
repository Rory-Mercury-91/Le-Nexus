/**
 * Sauvegarde des couvertures
 * Gère l'upload et la sauvegarde de couvertures depuis des fichiers locaux
 */

const fs = require('fs');
const path = require('path');
const { createSlug } = require('../../utils/slug');
const { determineMediaCategory } = require('./cover-downloader');

/**
 * Upload une couverture personnalisée via dialog
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {BrowserWindow} mainWindow - Fenêtre principale
 * @param {PathManager} pathManager - Gestionnaire de chemins
 * @param {string} serieTitre - Titre de la série
 * @param {string} type - 'serie' ou 'tome'
 * @returns {Promise<{success: boolean, localPath?: string, error?: string}>}
 */
async function uploadCustomCover(dialog, mainWindow, pathManager, serieTitre, type = 'serie', options = {}) {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner une image de couverture',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false };
    }

    return await saveCoverFromPath(pathManager, result.filePaths[0], serieTitre, type, options);
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
async function saveCoverFromPath(pathManager, sourcePath, serieTitre, type = 'serie', options = {}) {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Fichier source introuvable' };
    }

    const ext = path.extname(sourcePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    if (!validExtensions.includes(ext)) {
      return { success: false, error: 'Type de fichier non supporté' };
    }

    const slug = createSlug(serieTitre);
    const category = determineMediaCategory(pathManager, type, options);
    const seriesPath = pathManager.getSeriesPath(slug, category);
    const tomesPath = pathManager.getTomesPath(slug, category);

    if (!fs.existsSync(seriesPath)) fs.mkdirSync(seriesPath, { recursive: true });
    if (type === 'tome' && !fs.existsSync(tomesPath)) fs.mkdirSync(tomesPath, { recursive: true });

    const targetDirectory = type === 'tome' ? tomesPath : seriesPath;
    const timestamp = Date.now();
    const fileName = `custom-${timestamp}${ext}`;
    const fullPath = path.join(targetDirectory, fileName);
    const baseRelative = `${category}/${slug}`;
    const relativePath = type === 'tome'
      ? `${baseRelative}/tomes/${fileName}`
      : `${baseRelative}/${fileName}`;

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
async function saveCoverFromBuffer(pathManager, buffer, fileName, serieTitre, type = 'serie', options = {}) {
  try {
    const ext = path.extname(fileName).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    if (!validExtensions.includes(ext)) {
      return { success: false, error: 'Type de fichier non supporté' };
    }

    const slug = createSlug(serieTitre);
    const category = determineMediaCategory(pathManager, type, options);
    const seriesPath = pathManager.getSeriesPath(slug, category);
    const tomesPath = pathManager.getTomesPath(slug, category);

    if (!fs.existsSync(seriesPath)) fs.mkdirSync(seriesPath, { recursive: true });
    if (type === 'tome' && !fs.existsSync(tomesPath)) fs.mkdirSync(tomesPath, { recursive: true });

    const targetDirectory = type === 'tome' ? tomesPath : seriesPath;
    const timestamp = Date.now();
    const newFileName = `custom-${timestamp}${ext}`;
    const fullPath = path.join(targetDirectory, newFileName);
    const baseRelative = `${category}/${slug}`;
    const relativePath = type === 'tome'
      ? `${baseRelative}/tomes/${newFileName}`
      : `${baseRelative}/${newFileName}`;

    fs.writeFileSync(fullPath, buffer);

    return { success: true, localPath: relativePath };
  } catch (error) {
    console.error('Erreur save-cover-from-buffer:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadCustomCover,
  saveCoverFromPath,
  saveCoverFromBuffer
};
