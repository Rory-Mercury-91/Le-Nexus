/**
 * Intercepteur de requêtes pour F95Zone
 * Ajoute automatiquement les cookies aux requêtes vers f95zone.to
 */

const { session } = require('electron');

/**
 * Configure l'intercepteur pour ajouter les cookies F95Zone
 */
function setupF95ZoneInterceptor() {
  console.log('🔧 Configuration de l\'intercepteur F95Zone...');

  // Intercepter les requêtes avant envoi
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://f95zone.to/*', 'https://*.f95zone.to/*'] },
    async (details, callback) => {
      // Récupérer les cookies F95Zone
      const cookies = await session.defaultSession.cookies.get({ 
        domain: '.f95zone.to' 
      });

      if (cookies.length > 0) {
        // Construire le header Cookie
        const cookieHeader = cookies
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');

        // Ajouter le header Cookie à la requête
        details.requestHeaders['Cookie'] = cookieHeader;
        
        console.log(`🍪 Cookies F95Zone ajoutés à la requête: ${details.url.substring(0, 60)}...`);
      }

      callback({ requestHeaders: details.requestHeaders });
    }
  );

  console.log('✅ Intercepteur F95Zone configuré');
}

module.exports = { setupF95ZoneInterceptor };
