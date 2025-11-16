/**
 * Helper pour enregistrer les handlers IPC avec tracking automatique
 * Usage: Au lieu de ipcMain.handle(), utiliser registerHandler()
 */

const tracker = require('./ipc-tracker');

/**
 * Enregistre un handler IPC avec tracking automatique
 * @param {IpcMain} ipcMain - Module ipcMain
 * @param {string} channel - Canal IPC (ex: 'manga:getAll')
 * @param {Function} handler - Fonction handler
 * @param {string} filePath - Chemin du fichier source (__filename)
 * @param {string} functionName - Nom de la fonction handler
 */
function registerHandler(ipcMain, channel, handler, filePath, functionName) {
  // Obtenir le nom du fichier depuis le chemin
  const fileName = require('path').basename(filePath);
  
  ipcMain.handle(channel, async (event, ...args) => {
    // Enregistrer l'appel
    tracker.track(channel, fileName, functionName || handler.name || 'anonymous');
    
    try {
      const result = await handler(event, ...args);
      return result;
    } catch (error) {
      tracker.trackError(channel, error);
      throw error;
    }
  });
}

/**
 * Enregistre un handler IPC.on avec tracking automatique
 */
function registerListener(ipcMain, channel, handler, filePath, functionName) {
  const fileName = require('path').basename(filePath);
  
  ipcMain.on(channel, (event, ...args) => {
    tracker.track(channel, fileName, functionName || handler.name || 'anonymous');
    
    try {
      handler(event, ...args);
    } catch (error) {
      tracker.trackError(channel, error);
      console.error(`Erreur dans listener ${channel}:`, error);
    }
  });
}

module.exports = {
  registerHandler,
  registerListener
};
