/**
 * Intercepteur de requêtes pour LewdCorner
 * Ajoute automatiquement les cookies aux requêtes vers lewdcorner.com
 */

const { session } = require('electron');

/**
 * Configure l'intercepteur pour ajouter les cookies LewdCorner
 */
function setupLewdCornerInterceptor() {
  console.log('🔧 Configuration de l\'intercepteur LewdCorner...');

  // Utiliser la session persistante
  const persistentSession = session.fromPartition('persist:lenexus');

  // Intercepter les requêtes avant envoi
  persistentSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://lewdcorner.com/*'] },
    async (details, callback) => {
      // Récupérer les cookies LewdCorner
      const cookies = await persistentSession.cookies.get({ 
        domain: '.lewdcorner.com' 
      });

      if (cookies.length > 0) {
        // Construire le header Cookie
        const cookieHeader = cookies
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');

        // Ajouter le header Cookie à la requête
        details.requestHeaders['Cookie'] = cookieHeader;
        
        console.log(`🍪 Cookies ajoutés à la requête: ${details.url.substring(0, 60)}...`);
      }

      callback({ requestHeaders: details.requestHeaders });
    }
  );

  console.log('✅ Intercepteur LewdCorner configuré');
}

module.exports = { setupLewdCornerInterceptor };

