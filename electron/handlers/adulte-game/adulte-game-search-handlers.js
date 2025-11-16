const coverManager = require('../../services/cover/cover-manager');
const { fetchWithSession, fetchWithPuppeteer, parseF95ZoneGameData } = require('./utils');

/**
 * Enregistre les handlers IPC pour la recherche de jeux adultes par ID
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerAdulteGameSearchHandlers(ipcMain, getDb, store, getPathManager) {
  
  // Rechercher un jeu par ID F95Zone
  ipcMain.handle('search-adulte-game-by-f95-id', async (event, f95Id) => {
    try {
      console.log(`🔍 Recherche jeu F95 ID: ${f95Id}`);
      
      const threadUrl = `https://f95zone.to/threads/${f95Id}/`;
      console.log(`🌐 Scraping: ${threadUrl}`);
      
      // Utiliser directement Puppeteer pour récupérer le DOM complet avec JavaScript exécuté
      // Cela garantit de récupérer tous les tags, même ceux chargés dynamiquement
      let html = await fetchWithPuppeteer(threadUrl);
      
      // Fallback vers fetch classique si Puppeteer échoue
      if (!html) {
        console.log('  ⚠️ Puppeteer a échoué, fallback vers fetch classique...');
        const response = await fetchWithSession(threadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Thread F95Zone introuvable: ${response.status}`);
        }
        
        html = response.body;
      }
      
      // Utiliser la fonction commune de parsing
      const gameData = parseF95ZoneGameData(html);
      
      const name = gameData.name;
      const version = gameData.version;
      const developer = gameData.developer;
      const status = gameData.status;
      const engine = gameData.engine;
      const tags = gameData.tags;
      let image = gameData.image;
      
      console.log(`✅ Jeu trouvé: ${name}`);
      console.log(`📝 Version: ${version || 'N/A'}`);
      console.log(`👤 Développeur: ${developer || 'N/A'}`);
      console.log(`📊 Statut: ${status}`);
      console.log(`🛠️ Moteur: ${engine}`);
      console.log(`🔍 gameData complet:`, JSON.stringify(gameData, null, 2));
      
      const autoDownload = store.get('autoDownloadCovers', false) === true;
      let localImage = null;
      if (image) {
        const isF95Image = image.includes('f95zone.to') || image.includes('attachments.f95zone');
        
        if (isF95Image) {
          console.log(`🔗 Image F95Zone détectée, utilisation de l'URL directe (téléchargement impossible)`);
          localImage = image;
        } else {
          try {
            if (autoDownload) {
              console.log(`📥 Téléchargement de l'image...`);
              const downloadResult = await coverManager.downloadCover(
                getPathManager(),
                image,
                name,
                'adulte-game',
                parseInt(f95Id),
                threadUrl
              );
              
              if (downloadResult.success && downloadResult.localPath) {
                localImage = downloadResult.localPath;
                console.log(`✅ Image téléchargée: ${localImage}`);
              } else {
                console.warn(`⚠️ Échec du téléchargement de l'image:`, downloadResult.error);
                localImage = image;
              }
            } else {
              localImage = image;
            }
          } catch (error) {
            console.error(`❌ Erreur téléchargement image:`, error);
            localImage = image;
          }
        }
      }
      
      const returnData = {
        id: parseInt(f95Id),
        name: name,
        version: version,
        developer: developer,
        status: status,
        engine: engine,
        tags: tags,
        image: localImage || image,
        thread_url: threadUrl
      };
      
      console.log(`📤 Données retournées au frontend:`, JSON.stringify(returnData, null, 2));
      
      return {
        success: true,
        data: returnData
      };
      
    } catch (error) {
      console.error('❌ Erreur recherche F95:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Rechercher un jeu par ID LewdCorner
  ipcMain.handle('search-adulte-game-by-lewdcorner-id', async (event, lewdcornerId) => {
    try {
      console.log(`🔍 Recherche jeu LewdCorner ID: ${lewdcornerId}`);
      
      // DÉSACTIVER SCRAPING LEWDCORNER (erreur 403)
      return {
        success: false,
        error: 'Le scraping LewdCorner est désactivé (403 Forbidden). Utilisez l\'import JSON pour ajouter/mettre à jour les jeux LewdCorner.'
      };
      
    } catch (error) {
      console.error('❌ Erreur recherche LewdCorner:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerAdulteGameSearchHandlers };
