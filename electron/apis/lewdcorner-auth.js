/**
 * Module d'authentification pour LewdCorner
 * Ouvre une fenêtre de connexion et partage la session avec l'app principale
 */

const { BrowserWindow, session } = require('electron');

/**
 * Ouvre une fenêtre de connexion LewdCorner
 * @param {Function} onSuccess - Callback appelé en cas de succès
 * @param {Function} onError - Callback appelé en cas d'erreur
 * @returns {BrowserWindow} La fenêtre d'authentification
 */
function openLewdCornerLogin(onSuccess, onError) {
  console.log('🌐 Ouverture de la fenêtre de connexion LewdCorner...');
  
  // Créer une fenêtre dédiée pour la connexion
  const authWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Utiliser la session par défaut pour partager les cookies avec l'app principale
      session: session.defaultSession
    },
    title: 'Connexion à LewdCorner',
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a'
  });

  // Charger la page de connexion
  authWindow.loadURL('https://lewdcorner.com/login');

  // Surveiller la navigation
  authWindow.webContents.on('did-navigate', async (event, url) => {
    console.log('📍 Navigation:', url);

    // Si l'URL ne contient plus "/login", l'utilisateur est probablement connecté
    if (url.includes('lewdcorner.com') && !url.includes('/login')) {
      console.log('✅ Connexion réussie détectée');
      
      // Vérifier les cookies pour confirmer
      const cookies = await session.defaultSession.cookies.get({ 
        domain: '.lewdcorner.com' 
      });
      
      if (cookies.length > 0) {
        console.log(`🍪 ${cookies.length} cookies LewdCorner trouvés`);
        authWindow.close();
        onSuccess({ 
          success: true, 
          cookiesCount: cookies.length 
        });
      }
    }
  });

  // Gérer la fermeture manuelle
  authWindow.on('closed', () => {
    console.log('🔒 Fenêtre d\'authentification fermée');
  });

  // Gérer les erreurs de chargement
  authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Erreur de chargement:', errorDescription);
    onError({ error: errorDescription });
    authWindow.close();
  });

  return authWindow;
}

/**
 * Vérifie si l'utilisateur est connecté à LewdCorner
 * @returns {Promise<boolean>} True si connecté
 */
async function checkLewdCornerSession() {
  try {
    const cookies = await session.defaultSession.cookies.get({ 
      domain: '.lewdcorner.com' 
    });
    
    const isConnected = cookies.length > 0;
    console.log(`🔍 Session LewdCorner: ${isConnected ? '✅ Active' : '❌ Inactive'}`);
    
    return isConnected;
  } catch (error) {
    console.error('❌ Erreur vérification session:', error);
    return false;
  }
}

/**
 * Déconnecte l'utilisateur de LewdCorner (supprime les cookies)
 * @returns {Promise<boolean>} True si succès
 */
async function disconnectLewdCorner() {
  try {
    console.log('🔓 Déconnexion de LewdCorner...');
    
    const cookies = await session.defaultSession.cookies.get({ 
      domain: '.lewdcorner.com' 
    });
    
    for (const cookie of cookies) {
      await session.defaultSession.cookies.remove(
        `https://lewdcorner.com`, 
        cookie.name
      );
    }
    
    console.log(`✅ ${cookies.length} cookies supprimés`);
    return true;
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    return false;
  }
}

module.exports = {
  openLewdCornerLogin,
  checkLewdCornerSession,
  disconnectLewdCorner
};

