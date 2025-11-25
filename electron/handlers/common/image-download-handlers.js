const fs = require('fs');
const os = require('os');
const path = require('path');
const { downloadImageFromUrl } = require('./gallery-handlers-helpers');

function sanitizeFileName(rawName = 'image') {
  // eslint-disable-next-line no-control-regex
  return rawName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '-')
    .trim()
    .slice(0, 120) || 'image';
}

function ensureExtension(fileName, fallbackExt) {
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName)) {
    return fileName;
  }
  if (fallbackExt && fallbackExt.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
    return `${fileName}${fallbackExt}`;
  }
  return `${fileName}.jpg`;
}

function registerImageDownloadHandlers(ipcMain, dialog, getMainWindow) {
  ipcMain.handle('save-image-to-disk', async (_event, { imageUrl, defaultFileName }) => {
    if (!imageUrl) {
      return { success: false, error: 'URL manquante' };
    }

    try {
      const urlObj = new URL(imageUrl);
      const urlExt = path.extname(urlObj.pathname);
      const sanitizedName = sanitizeFileName(defaultFileName || path.basename(urlObj.pathname) || 'image');
      const suggestedName = ensureExtension(sanitizedName, urlExt);

      const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Enregistrer l\'image',
        defaultPath: suggestedName,
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lenexus-img-'));
      const tempFile = path.join(tempDir, 'image');

      const downloadResult = await downloadImageFromUrl(imageUrl, tempFile);
      fs.copyFileSync(downloadResult.path, filePath);

      fs.rmSync(tempDir, { recursive: true, force: true });

      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Erreur save-image-to-disk:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerImageDownloadHandlers
};
