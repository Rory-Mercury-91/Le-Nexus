const { ipcMain } = require('electron');
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
        (result) => resolve(result),
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

