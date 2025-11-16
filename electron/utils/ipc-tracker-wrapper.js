/**
 * Wrapper global pour intercepter tous les appels IPC
 * Intercepte ipcMain.handle et ipcMain.on automatiquement
 */

const tracker = require('./ipc-tracker');

/**
 * Crée un proxy pour ipcMain qui intercepte tous les appels
 */
function wrapIpcMain(ipcMain) {
  const originalHandle = ipcMain.handle.bind(ipcMain);
  const originalOn = ipcMain.on.bind(ipcMain);

  // Wrapper pour handle
  ipcMain.handle = function(channel, originalHandler) {
    // Capturer le fichier source lors de l'enregistrement
    const stack = new Error().stack;
    const stackLines = stack.split('\n');
    let sourceFilePath = 'unknown';
    
    for (let i = 0; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (line.includes('electron/handlers') || line.includes('electron\\handlers')) {
        const match = line.match(/\(([^)]+):\d+:\d+\)/);
        if (match) {
          sourceFilePath = match[1].replace(/\\/g, '/').split('/').pop();
          break;
        }
      }
    }
    
    const functionName = originalHandler.name || 'anonymous';
    
    // Enregistrer le handler avec un wrapper qui tracke les appels
    return originalHandle(channel, async (event, ...args) => {
      // Enregistrer l'appel lors de l'exécution
      if (tracker.isEnabled) {
        tracker.track(channel, sourceFilePath, functionName);
      }
      
      try {
        const result = await originalHandler(event, ...args);
        return result;
      } catch (error) {
        if (tracker.isEnabled) {
          tracker.trackError(channel, error);
        }
        throw error;
      }
    });
  };

  // Wrapper pour on
  ipcMain.on = function(channel, originalHandler) {
    // Capturer le fichier source lors de l'enregistrement
    const stack = new Error().stack;
    const stackLines = stack.split('\n');
    let sourceFilePath = 'unknown';
    
    for (let i = 0; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (line.includes('electron/handlers') || line.includes('electron\\handlers')) {
        const match = line.match(/\(([^)]+):\d+:\d+\)/);
        if (match) {
          sourceFilePath = match[1].replace(/\\/g, '/').split('/').pop();
          break;
        }
      }
    }
    
    const functionName = originalHandler.name || 'anonymous';
    
    // Enregistrer le listener avec un wrapper qui tracke les appels
    return originalOn(channel, (event, ...args) => {
      // Enregistrer l'appel lors de l'exécution
      if (tracker.isEnabled) {
        tracker.track(channel, sourceFilePath, functionName);
      }
      
      try {
        originalHandler(event, ...args);
      } catch (error) {
        if (tracker.isEnabled) {
          tracker.trackError(channel, error);
        }
        console.error(`Erreur dans listener ${channel}:`, error);
      }
    });
  };

  return ipcMain;
}

module.exports = { wrapIpcMain };
