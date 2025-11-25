/**
 * Service d'ajout rapide de manga via MAL ID
 * Gère la logique métier d'ajout rapide de séries
 * Utilisé par les routes HTTP (import-routes.js)
 */

const { parseRequestBody, sendErrorResponse, sendSuccessResponse } = require('../import-server-common');
const { recordExtractedData } = require('../../utils/sync-error-reporter');

/**
 * Fonction principale d'ajout rapide de manga via MAL ID
 */
async function handleAddManga(req, res, mainWindow) {
  try {
    const body = await parseRequestBody(req);
    const data = JSON.parse(body);
    console.log('🆕 [IMPORT-SERVER] Quick Add MAL (manga) payload:', data);

    recordExtractedData({
      entityType: 'manga-mal-quick-add',
      entityId: data.mal_id || `payload-${Date.now()}`,
      data
    });
    const malId = data.mal_id;
    
    if (!malId || isNaN(parseInt(malId))) {
      return sendErrorResponse(res, 400, 'MAL ID invalide');
    }

    console.log(`📚 Import rapide manga MAL ID: ${malId} depuis Tampermonkey`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('manga-import-start', {
        message: `Import manga MAL ID: ${malId}...`
      });
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      // Préparer les options depuis le payload
      const options = {};
      if (data.targetSerieId || data._targetSerieId) {
        options.targetSerieId = data.targetSerieId || data._targetSerieId;
      }
      if (data.forceCreate === true || data._forceCreate === true) {
        options.forceCreate = true;
      }
      if (data.confirmMerge === true || data._confirmMerge === true) {
        options.confirmMerge = true;
      }
      
      // Ne pas forcer forceCreate: true par défaut, laisser le matching unifié fonctionner
      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.addMangaByMalId(${malId}, ${JSON.stringify(options)})
      `);

      // Ne pas envoyer manga-import-complete immédiatement si requiresSelection
      if (!result.requiresSelection) {
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('manga-import-complete');
            mainWindow.webContents.send('refresh-manga-list');
          }
        }, 1000);
      }

      if (result.success) {
        sendSuccessResponse(res, {
          manga: result.manga,
          message: `${result.manga.titre} ajouté avec succès !`
        });
      } else if (result.requiresSelection && Array.isArray(result.candidates)) {
        // Proposer un overlay de sélection côté navigateur (Tampermonkey)
        sendSuccessResponse(res, {
          requiresSelection: true,
          candidates: result.candidates,
          malId: malId,
          message: result.error || 'Série similaire trouvée'
        });
      } else {
        sendErrorResponse(res, 400, result.error || 'Erreur lors de l\'import');
      }
    } else {
      sendErrorResponse(res, 500, 'Fenêtre principale non disponible');
    }

  } catch (error) {
    console.error('❌ Erreur add-manga:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('manga-import-complete');
    }
    sendErrorResponse(res, 500, error.message);
  }
}

module.exports = {
  handleAddManga
};
