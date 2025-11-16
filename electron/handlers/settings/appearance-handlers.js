/**
 * Enregistre les handlers IPC pour le thème et le démarrage automatique
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Store} store - Instance d'electron-store
 * @param {App} app - Module app d'Electron
 */
function registerAppearanceHandlers(ipcMain, store, app) {
  const { setVerboseMode, getVerboseMode } = require('../../utils/backend-logger');
  
  // Récupérer le thème actuel
  ipcMain.handle('get-theme', () => {
    return store.get('theme', 'dark');
  });

  // Définir le thème
  ipcMain.handle('set-theme', (event, theme) => {
    store.set('theme', theme);
    return { success: true };
  });

  // Récupérer l'état du démarrage automatique
  ipcMain.handle('get-auto-launch', () => {
    if (!app.isPackaged) {
      return false;
    }
    
    const loginItemSettings = app.getLoginItemSettings();
    return loginItemSettings.openAtLogin;
  });

  // Définir le démarrage automatique
  ipcMain.handle('set-auto-launch', (event, enabled) => {
    try {
      if (!app.isPackaged) {
        return { success: true, message: 'Désactivé en mode développement' };
      }

      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: false,
        args: []
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur set-auto-launch:', error);
      return { success: false, error: error.message };
    }
  });

  // Mode développeur
  ipcMain.handle('get-dev-mode', () => {
    return store.get('devMode', false);
  });

  ipcMain.handle('set-dev-mode', (event, enabled) => {
    store.set('devMode', enabled);
    
    // Ouvrir/fermer les DevTools automatiquement
    const { BrowserWindow } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (enabled) {
        mainWindow.webContents.openDevTools();
      } else {
        mainWindow.webContents.closeDevTools();
      }
    }
    
    return { success: true };
  });

  // Mode verbose (logs backend vers frontend)
  ipcMain.handle('get-verbose-logging', () => {
    return getVerboseMode();
  });

  ipcMain.handle('set-verbose-logging', (event, enabled) => {
    setVerboseMode(enabled);
    return { success: true };
  });
}

module.exports = { registerAppearanceHandlers };
