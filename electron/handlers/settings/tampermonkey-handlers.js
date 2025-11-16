const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

/**
 * Enregistre les handlers IPC pour Tampermonkey
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {App} app - Module app d'Electron
 */
function registerTampermonkeyHandlers(ipcMain, app) {
  
  ipcMain.handle('open-tampermonkey-installation', async () => {
    try {
      const htmlPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'tampermonkey', 'INSTALLATION.html')
        : path.join(__dirname, '..', '..', '..', 'tampermonkey', 'INSTALLATION.html');

      if (!fs.existsSync(htmlPath)) {
        console.error('❌ Fichier INSTALLATION.html introuvable:', htmlPath);
        return { success: false, error: 'Fichier introuvable' };
      }

      const url = `file://${htmlPath}`;
      await shell.openExternal(url);
      
      console.log('✅ Page d\'installation des scripts ouverte dans le navigateur');
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de l\'ouverture de la page d\'installation:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTampermonkeyHandlers };
