/**
 * Module d'authentification pour F95Zone
 * Ouvre une fenêtre de connexion et partage la session avec l'app principale
 */

const { BrowserWindow, session } = require('electron');

/**
 * Ouvre une fenêtre de connexion F95Zone
 * @param {Function} onSuccess - Callback appelé en cas de succès
 * @param {Function} onError - Callback appelé en cas d'erreur
 * @returns {BrowserWindow} La fenêtre d'authentification
 */
function openF95ZoneLogin(onSuccess, onError) {
  console.log('🌐 Ouverture de la fenêtre de connexion F95Zone...');
  
  // Utiliser la session persistante pour conserver les cookies
  const persistentSession = session.fromPartition('persist:lenexus');
  
  // Créer une fenêtre dédiée pour la connexion
  const authWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Utiliser la session persistante pour partager les cookies avec l'app principale
      session: persistentSession
    },
    title: 'Connexion à F95Zone',
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a'
  });

  // Charger la page de connexion
  authWindow.loadURL('https://f95zone.to/login');

  // Surveiller la navigation
  authWindow.webContents.on('did-navigate', async (event, url) => {
    console.log('📍 Navigation:', url);

    // Si l'URL ne contient plus "/login", l'utilisateur est probablement connecté
    if (url.includes('f95zone.to') && !url.includes('/login')) {
      console.log('✅ Connexion réussie détectée');
      
      // Vérifier les cookies pour confirmer
      const persistentSession = session.fromPartition('persist:lenexus');
      const cookies = await persistentSession.cookies.get({ 
        domain: '.f95zone.to' 
      });
      
      if (cookies.length > 0) {
        console.log(`🍪 ${cookies.length} cookies F95Zone trouvés`);
        onSuccess({ 
          success: true, 
          cookiesCount: cookies.length 
        });
        authWindow.close();
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
 * Vérifie si l'utilisateur est connecté à F95Zone
 * @returns {Promise<boolean>} True si connecté
 */
async function checkF95ZoneSession() {
  try {
    const persistentSession = session.fromPartition('persist:lenexus');
    const cookies = await persistentSession.cookies.get({ 
      domain: '.f95zone.to' 
    });
    
    const isConnected = cookies.length > 0;
    console.log(`🔍 Session F95Zone: ${isConnected ? '✅ Active' : '❌ Inactive'}`);
    
    return isConnected;
  } catch (error) {
    console.error('❌ Erreur vérification session:', error);
    return false;
  }
}

/**
 * Déconnecte l'utilisateur de F95Zone (supprime les cookies)
 * @returns {Promise<boolean>} True si succès
 */
async function disconnectF95Zone() {
  try {
    console.log('🔓 Déconnexion de F95Zone...');
    
    const persistentSession = session.fromPartition('persist:lenexus');
    const cookies = await persistentSession.cookies.get({ 
      domain: '.f95zone.to' 
    });
    
    for (const cookie of cookies) {
      await persistentSession.cookies.remove(
        `https://f95zone.to`, 
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
  openF95ZoneLogin,
  checkF95ZoneSession,
  disconnectF95Zone
};
