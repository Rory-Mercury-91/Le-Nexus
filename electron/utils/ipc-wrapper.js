/**
 * Wrapper pour intercepter tous les appels IPC
 * Permet de suivre en temps réel quelles fonctions sont appelées
 */

const path = require('path');
const { app } = require('electron');
const tracker = require('./ipc-tracker');

/**
 * Wrap ipcMain.handle pour suivre les appels
 */
function wrapHandle(ipcMain, channel, handler, filePath, functionName) {
  return ipcMain.handle(channel, async (event, ...args) => {
    // Enregistrer l'appel
    tracker.track(channel, filePath, functionName);
    
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
 * Wrap ipcMain.on pour suivre les appels
 */
function wrapOn(ipcMain, channel, handler, filePath, functionName) {
  return ipcMain.on(channel, (event, ...args) => {
    // Enregistrer l'appel
    tracker.track(channel, filePath, functionName);
    
    try {
      handler(event, ...args);
    } catch (error) {
      tracker.trackError(channel, error);
      console.error(`Erreur dans handler ${channel}:`, error);
    }
  });
}

/**
 * Active le suivi IPC automatiquement si en mode dev
 */
function enableIfDev() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    const outputPath = path.join(app.getPath('userData'), 'ipc-coverage.json');
    tracker.enable(outputPath);
    console.log('✅ Suivi IPC automatique activé');
  }
}

module.exports = {
  wrapHandle,
  wrapOn,
  enableIfDev,
  tracker
};
