const { ipcMain, BrowserWindow } = require('electron');
const { 
  openF95ZoneLogin, 
  checkF95ZoneSession, 
  disconnectF95Zone 
} = require('../apis/f95zone-auth');

function registerF95ZoneHandlers() {
  /**
   * Handler: Ouvrir la fenêtre de connexion F95Zone
   */
  ipcMain.handle('f95zone-connect', async () => {
    console.log('🔗 Handler: f95zone-connect');
    
    return new Promise((resolve, reject) => {
      openF95ZoneLogin(
        (result) => {
          // Recharger la fenêtre principale pour appliquer les cookies
          // En dev: localhost, en prod: file:// + index.html
          const mainWindow = BrowserWindow.getAllWindows().find(w => {
            if (w.isDestroyed()) return false;
            const url = w.webContents.getURL();
            return url.includes('localhost') || url.includes('index.html');
          });
          
          if (mainWindow) {
            console.log('🔄 Rechargement de la fenêtre principale pour appliquer les cookies...');
            mainWindow.webContents.reload();
          } else {
            console.warn('⚠️ Fenêtre principale introuvable pour rechargement');
          }
          
          resolve(result);
        },
        (error) => reject(error)
      );
    });
  });

  /**
   * Handler: Vérifier la session F95Zone
   */
  ipcMain.handle('f95zone-check-session', async () => {
    console.log('🔍 Handler: f95zone-check-session');
    
    try {
      const isConnected = await checkF95ZoneSession();
      return { success: true, connected: isConnected };
    } catch (error) {
      console.error('❌ Erreur check session:', error);
      return { success: false, connected: false, error: error.message };
    }
  });

  /**
   * Handler: Déconnecter de F95Zone
   */
  ipcMain.handle('f95zone-disconnect', async () => {
    console.log('🔓 Handler: f95zone-disconnect');
    
    try {
      const success = await disconnectF95Zone();
      return { success };
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Handlers F95Zone enregistrés');
}

module.exports = { registerF95ZoneHandlers };
