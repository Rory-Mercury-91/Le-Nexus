const streamingLinks = require('../../services/animes/streaming-links');
const { getStreamingLinksFromAniList } = require('../../apis/anilist');

/**
 * Enregistre les handlers IPC pour la gestion des liens de streaming d'animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 */
function registerAnimeStreamingHandlers(ipcMain, getDb) {
  
  /**
   * Récupérer les liens de streaming (AniList + manuels)
   */
  ipcMain.handle('get-streaming-links', async (event, animeId, malId) => {
    try {
      const db = getDb();
      
      // Récupérer les liens AniList
      let anilistLinks = [];
      if (malId) {
        anilistLinks = await getStreamingLinksFromAniList(malId);
      }
      
      // Récupérer les liens manuels
      const manualLinks = streamingLinks.getManualLinks(db, animeId);
      
      // Combiner les deux
      const allLinks = [...anilistLinks, ...manualLinks];
      
      return { success: true, links: allLinks };
    } catch (error) {
      console.error('❌ Erreur get-streaming-links:', error);
      return { success: false, error: error.message, links: [] };
    }
  });
  
  /**
   * Ajouter un lien de streaming manuel
   */
  ipcMain.handle('add-streaming-link', async (event, animeId, linkData) => {
    try {
      const db = getDb();
      const result = streamingLinks.addManualLink(db, animeId, linkData);
      return result;
    } catch (error) {
      console.error('❌ Erreur add-streaming-link:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * Supprimer un lien de streaming manuel
   */
  ipcMain.handle('delete-streaming-link', async (event, linkId) => {
    try {
      const db = getDb();
      const result = streamingLinks.deleteManualLink(db, linkId);
      return result;
    } catch (error) {
      console.error('❌ Erreur delete-streaming-link:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAnimeStreamingHandlers };
