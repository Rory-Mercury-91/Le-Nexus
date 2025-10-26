const { ipcMain, BrowserWindow } = require('electron');
const { 
  openLewdCornerLogin, 
  checkLewdCornerSession, 
  disconnectLewdCorner 
} = require('../apis/lewdcorner-auth');

function registerLewdCornerHandlers() {
  /**
   * Handler: Ouvrir la fenêtre de connexion LewdCorner
   */
  ipcMain.handle('lewdcorner-connect', async () => {
    console.log('🔗 Handler: lewdcorner-connect');
    
    return new Promise((resolve, reject) => {
      openLewdCornerLogin(
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
   * Handler: Vérifier la session LewdCorner
   */
  ipcMain.handle('lewdcorner-check-session', async () => {
    console.log('🔍 Handler: lewdcorner-check-session');
    
    try {
      const isConnected = await checkLewdCornerSession();
      return { success: true, connected: isConnected };
    } catch (error) {
      console.error('❌ Erreur check session:', error);
      return { success: false, connected: false, error: error.message };
    }
  });

  /**
   * Handler: Déconnecter de LewdCorner
   */
  ipcMain.handle('lewdcorner-disconnect', async () => {
    console.log('🔓 Handler: lewdcorner-disconnect');
    
    try {
      const success = await disconnectLewdCorner();
      return { success };
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Handlers LewdCorner enregistrés');
}

module.exports = { registerLewdCornerHandlers };
