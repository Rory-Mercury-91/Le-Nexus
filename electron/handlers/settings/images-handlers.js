const { cleanEmptyFolders, deleteImageWithCleanup } = require('../../utils/file-utils');
const { downloadCover, uploadCustomCover, saveCoverFromPath, saveCoverFromBuffer } = require('../../services/cover/cover-manager');

// Import des fonctions communes
const { getPaths } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des images et couvertures
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */

function registerImagesHandlers(ipcMain, dialog, getMainWindow, getPathManager) {
  const getPathsLocal = () => getPaths(getPathManager);

  // Télécharger une couverture
  ipcMain.handle('download-cover', async (event, imageUrl, fileName, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return await downloadCover(pm, imageUrl, serieTitre, type, null, options);
  });

  // Upload d'une couverture personnalisée
  ipcMain.handle('upload-custom-cover', async (event, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return await uploadCustomCover(dialog, getMainWindow(), pm, serieTitre, type, options);
  });

  // Sauvegarder une image depuis un chemin (drag & drop)
  ipcMain.handle('save-cover-from-path', async (event, sourcePath, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromPath(pm, sourcePath, serieTitre, type, options);
  });

  ipcMain.handle('save-cover-from-buffer', async (event, buffer, fileName, serieTitre, type = 'serie', options = {}) => {
    const pm = getPathManager();
    if (!pm) return { success: false, error: 'PathManager non initialisé' };
    return saveCoverFromBuffer(pm, buffer, fileName, serieTitre, type, options);
  });

  // Récupération du chemin complet d'une image
  ipcMain.handle('get-cover-full-path', (event, relativePath) => {
    const pm = getPathManager();
    if (!pm) return null;
    return require('../../services/cover/cover-manager').getCoverFullPath(pm, relativePath);
  });

  // Supprimer une image de couverture
  ipcMain.handle('delete-cover-image', async (event, relativePath) => {
    try {
      if (!relativePath) {
        return { success: false, error: 'Paramètres invalides' };
      }

      // Ne pas supprimer les URLs externes
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return { success: true };
      }

      return deleteImageWithCleanup(getPathsLocal().covers, relativePath);
    } catch (error) {
      console.error('Erreur delete-cover-image:', error);
      return { success: false, error: error.message };
    }
  });

  // Nettoyer les dossiers vides
  ipcMain.handle('clean-empty-folders', () => {
    try {
      const count = cleanEmptyFolders(getPathsLocal().series, getPathsLocal().series);
      return { success: true, count };
    } catch (error) {
      console.error('Erreur clean-empty-folders:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerImagesHandlers };
