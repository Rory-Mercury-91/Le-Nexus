const { BrowserWindow, session, app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Enregistre les handlers IPC pour la connexion à F95Zone
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 */
function registerF95ConnectionHandlers(ipcMain) {
  
  // Handler de diagnostic des cookies (accessible via DevTools)
  ipcMain.handle('diagnose-f95-cookies', async () => {
    try {
      const persistentSession = session.fromPartition('persist:lenexus');
      const userDataPath = app.getPath('userData');
      const cookiesPath = path.join(userDataPath, 'Partitions', 'persist_lenexus', 'Cookies');
      
      // Récupérer tous les cookies pour f95zone.to
      const cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
      const cookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
      const allCookies = [...cookies, ...cookiesWww];
      
      // Informations sur les cookies
      const cookieInfo = allCookies.map(cookie => ({
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString() : 'Session',
        valueLength: cookie.value ? cookie.value.length : 0
      }));
      
      // Vérifier les permissions d'écriture
      let canWrite = false;
      let writeError = null;
      try {
        const testFile = path.join(userDataPath, 'test-write-permissions.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        canWrite = true;
      } catch (error) {
        canWrite = false;
        writeError = error.message;
      }
      
      // Vérifier si le dossier des cookies existe
      const cookiesDirExists = fs.existsSync(path.dirname(cookiesPath));
      const cookiesFileExists = fs.existsSync(cookiesPath);
      
      return {
        success: true,
        userDataPath,
        cookiesPath,
        cookiesDirExists,
        cookiesFileExists,
        canWrite,
        writeError,
        cookieCount: allCookies.length,
        cookies: cookieInfo,
        hasSessionCookie: allCookies.some(c => 
          c.name === 'xf_session' || c.name === 'xf_user' || c.name.includes('session')
        ),
        installationPath: app.isPackaged ? process.resourcesPath : 'dev',
        isPackaged: app.isPackaged
      };
    } catch (error) {
      console.error('❌ Erreur diagnostic cookies F95:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue',
        stack: error.stack
      };
    }
  });
  
  // Vérifier si l'utilisateur est connecté à F95Zone (présence de cookies)
  ipcMain.handle('check-f95-connection', async () => {
    try {
      const persistentSession = session.fromPartition('persist:lenexus');
      
      // Récupérer les cookies pour f95zone.to
      const cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
      const cookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
      
      const allCookies = [...cookies, ...cookiesWww];
      
      // Vérifier si on a des cookies de session (généralement xf_session ou xf_user)
      const hasSessionCookie = allCookies.some(cookie => 
        cookie.name === 'xf_session' || 
        cookie.name === 'xf_user' ||
        cookie.name.includes('session')
      );
      
      return hasSessionCookie;
    } catch (error) {
      console.error('❌ Erreur vérification connexion F95:', error);
      return false;
    }
  });
  
  // Ouvrir une fenêtre pour se connecter à F95Zone
  ipcMain.handle('connect-f95', async () => {
    return new Promise((resolve) => {
      try {
        const persistentSession = session.fromPartition('persist:lenexus');
        
        // Créer une fenêtre de connexion
        const loginWindow = new BrowserWindow({
          width: 900,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            session: persistentSession
          },
          title: 'Connexion à F95Zone',
          autoHideMenuBar: true
        });
        
        // Charger la page de connexion F95Zone
        loginWindow.loadURL('https://f95zone.to/login');
        
        // Détecter quand l'utilisateur est connecté
        const checkConnection = async () => {
          try {
            const cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
            const cookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
            const allCookies = [...cookies, ...cookiesWww];
            
            const hasSessionCookie = allCookies.some(cookie => 
              cookie.name === 'xf_session' || 
              cookie.name === 'xf_user' ||
              cookie.name.includes('session')
            );
            
            if (hasSessionCookie) {
              loginWindow.close();
              resolve({ success: true });
            }
          } catch (error) {
            console.error('Erreur vérification connexion:', error);
          }
        };
        
        // Vérifier périodiquement si l'utilisateur est connecté
        const connectionCheckInterval = setInterval(checkConnection, 1000);
        
        // Détecter quand l'utilisateur est connecté (redirection vers la page d'accueil ou profil)
        loginWindow.webContents.on('did-navigate', async (event, url) => {
          // Si on est redirigé vers la page d'accueil ou le profil, la connexion a réussi
          if (url.includes('f95zone.to') && !url.includes('/login')) {
            await checkConnection();
          }
        });
        
        // Détecter aussi les changements de frame (pour les redirections dans des iframes)
        loginWindow.webContents.on('did-frame-navigate', async (event, url) => {
          if (url.includes('f95zone.to') && !url.includes('/login')) {
            await checkConnection();
          }
        });
        
        // Détecter la fermeture de la fenêtre
        loginWindow.on('closed', async () => {
          clearInterval(connectionCheckInterval);
          
          // Vérifier si la connexion a réussi
          try {
            const cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
            const cookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
            const allCookies = [...cookies, ...cookiesWww];
            
            const hasSessionCookie = allCookies.some(cookie => 
              cookie.name === 'xf_session' || cookie.name === 'xf_user'
            );
            
            if (!hasSessionCookie) {
              resolve({ success: false, error: 'Connexion annulée ou échouée' });
            }
          } catch (error) {
            console.error('Erreur vérification cookies à la fermeture:', error);
            resolve({ success: false, error: 'Erreur lors de la vérification de la connexion' });
          }
        });
        
        // Timeout après 5 minutes
        setTimeout(() => {
          clearInterval(connectionCheckInterval);
          if (!loginWindow.isDestroyed()) {
            loginWindow.close();
            resolve({ success: false, error: 'Timeout - La connexion a pris trop de temps' });
          }
        }, 300000);
        
      } catch (error) {
        console.error('❌ Erreur connexion F95:', error);
        resolve({ success: false, error: error.message || 'Erreur inconnue' });
      }
    });
  });
  
  // Déconnecter de F95Zone (supprimer les cookies)
  ipcMain.handle('disconnect-f95', async () => {
    try {
      const persistentSession = session.fromPartition('persist:lenexus');
      
      // Récupérer tous les cookies pour f95zone.to
      const cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
      const cookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
      
      const allCookies = [...cookies, ...cookiesWww];
      
      // Supprimer tous les cookies
      for (const cookie of allCookies) {
        try {
          const url = `https://${cookie.domain || 'f95zone.to'}${cookie.path || '/'}`;
          await persistentSession.cookies.remove(url, cookie.name);
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer le cookie ${cookie.name}:`, error.message);
        }
      }
      
      console.log('✅ Déconnecté de F95Zone');
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur déconnexion F95:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  });
}

module.exports = { registerF95ConnectionHandlers };
