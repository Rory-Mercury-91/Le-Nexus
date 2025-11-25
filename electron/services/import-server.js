const http = require('http');
const { handleOptionsRequest, sendSuccessResponse, sendErrorResponse, notifyImportStart, notifyImportComplete } = require('./import-server-common');
const { registerMangaRoutes } = require('./mangas/import-routes');
const { registerAnimeRoutes } = require('./animes/import-routes');
const { registerAdulteGameRoutes } = require('./adulte-game/import-routes');
const { PORTS } = require('../config/constants');

/**
 * Crée un serveur HTTP local pour recevoir les imports depuis le navigateur
 * @param {number} port - Port du serveur (défaut: PORTS.IMPORT_SERVER)
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {BrowserWindow} mainWindow - Fenêtre principale pour envoyer des événements
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager actuel (mis à jour dynamiquement)
 */
function createImportServer(port, getDb, store, mainWindow, getPathManager) {
  const server = http.createServer((req, res) => {
    // Répondre aux requêtes OPTIONS (preflight CORS)
    if (req.method === 'OPTIONS') {
      console.log(`✅ [IMPORT-SERVER] Requête OPTIONS (preflight) reçue, envoi headers CORS`);
      handleOptionsRequest(res);
      return;
    }

    // Route: POST /api/import-start (déclencher l'overlay avant le scraping)
    if (req.method === 'POST' && req.url === '/api/import-start') {
      notifyImportStart(mainWindow, 'Extraction des données en cours...');
      sendSuccessResponse(res);
      return;
    }

    // Route: POST /api/import-cancel (fermer l'overlay si l'utilisateur annule)
    if (req.method === 'POST' && req.url === '/api/import-cancel') {
      notifyImportComplete(mainWindow, 0); // Fermer immédiatement sans délai
      sendSuccessResponse(res, { message: 'Import annulé' });
      return;
    }

    // Router vers les modules spécialisés
    // Les modules retournent true si la route est gérée, false sinon
    
    // Routes manga
    if (registerMangaRoutes(req, res, getDb, store, mainWindow, getPathManager)) {
            return;
          }

    // Routes anime
    if (registerAnimeRoutes(req, res, getDb, store, mainWindow, getPathManager)) {
            return;
          }

    // Routes jeux adultes
    if (registerAdulteGameRoutes(req, res, getDb, store)) {
      return;
    }

    // Route: GET / (healthcheck)
    if (req.method === 'GET' && req.url === '/') {
      sendSuccessResponse(res, {
        status: 'ok', 
        message: 'Nexus Import Server',
        version: '1.0.0'
      });
      return;
    }

    // Route: GET /api/proxy-image?url=... (Proxy pour images protégées)
    if (req.method === 'GET' && req.url.startsWith('/api/proxy-image')) {
      const { net } = require('electron');
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const imageUrl = urlParams.get('url');
      
      if (!imageUrl) {
        return sendErrorResponse(res, 400, 'URL manquante');
      }

      console.log(`🖼️ Proxy image: ${imageUrl}`);

      const request = net.request({
        url: imageUrl,
        method: 'GET',
        redirect: 'follow'
      });

      // Headers pour contourner les protections
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
      request.setHeader('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
      
      if (imageUrl.includes('lewdcorner')) {
        request.setHeader('Referer', 'https://lewdcorner.com/');
      } else if (imageUrl.includes('f95zone')) {
        request.setHeader('Referer', 'https://f95zone.to/');
      }

      const chunks = [];

      request.on('response', (response) => {
        // Transférer les headers pertinents avec CORS complets
        res.writeHead(response.statusCode, {
          'Content-Type': response.headers['content-type'] || 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          res.end(buffer);
        });

        response.on('error', (error) => {
          console.error('❌ Erreur response proxy image:', error);
          sendErrorResponse(res, 500, error.message);
        });
      });

      request.on('error', (error) => {
        console.error('❌ Erreur request proxy image:', error);
        sendErrorResponse(res, 500, error.message);
      });

      request.end();
      return;
    }

    // Route non trouvée
    sendErrorResponse(res, 404, 'Route non trouvée');
  });

  // Démarrer le serveur
  // Écouter sur localhost (sans IP spécifique = toutes les interfaces)
  server.listen(port, () => {
    console.log(`🌐 Serveur d'import démarré sur http://localhost:${port}`);
  });

  // Gestion des erreurs
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`⚠️ Le port ${port} est déjà utilisé. Import depuis le navigateur désactivé.`);
    } else if (error.code === 'EACCES') {
      console.warn(`⚠️ Permission refusée sur le port ${port}. Vérifiez qu'aucun autre processus n'utilise ce port.`);
    } else {
      console.error('❌ Erreur serveur d\'import:', error);
    }
  });

  return server;
}

module.exports = { createImportServer };
