const path = require('path');
const fs = require('fs');
const {
  createAddVideoFromUrlHandlerJson,
  createAddVideoFromFileHandlerJson,
  createGetVideosHandlerJson,
  createDeleteVideoHandlerJson
} = require('../common/json-gallery-handlers-helpers');

/**
 * Enregistre les handlers IPC pour la gestion des vidéos utilisateur des jeux RAWG
 */
function registerRawgGameVideoHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  const getPaths = () => {
    const pm = getPathManager();
    if (!pm) {
      return { base: '', videos: '' };
    }
    const paths = pm.getPaths();
    // Créer un dossier galleries/rawg-games/videos pour stocker les vidéos utilisateur
    const videosDir = path.join(paths.base, 'galleries', 'rawg-games', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    return { ...paths, videos: videosDir };
  };

  const config = {
    handlerName: 'rawg-game',
    getDb,
    store,
    dialog,
    getMainWindow,
    itemTableName: 'adulte_game_games',
    itemTitleColumn: 'titre',
    itemNotFoundError: 'Jeu RAWG introuvable',
    userDataTableName: 'adulte_game_user_data',
    itemIdColumnName: 'game_id',
    userIdColumnName: 'user_id',
    defaultStatus: { column: 'completion_perso', value: 'À jouer' },
    imageColumnName: 'user_images',
    videoColumnName: 'user_videos',
    galleryFolderName: 'rawg-games',
    filePrefix: 'rawg_game_',
    getPathsFn: getPaths
  };

  // Vérifier que le jeu est bien un jeu RAWG avant d'ajouter une vidéo
  const addVideoFromUrl = createAddVideoFromUrlHandlerJson(config);
  ipcMain.handle('add-rawg-game-user-video-url', async (event, params) => {
    const db = getDb();
    const gameId = params.gameId || params.itemId;
    const game = db.prepare('SELECT id, titre FROM adulte_game_games WHERE id = ? AND game_site = \'RAWG\'').get(gameId);
    if (!game) {
      return { success: false, error: 'Jeu RAWG introuvable' };
    }
    return await addVideoFromUrl(event, params);
  });

  const addVideoFromFile = createAddVideoFromFileHandlerJson(config);
  ipcMain.handle('add-rawg-game-user-video-file', async (event, gameId, title = null, isReference = false) => {
    const db = getDb();
    const game = db.prepare('SELECT id, titre FROM adulte_game_games WHERE id = ? AND game_site = \'RAWG\'').get(gameId);
    if (!game) {
      return { success: false, error: 'Jeu RAWG introuvable' };
    }
    return await addVideoFromFile(event, gameId, title, isReference);
  });

  const getVideos = createGetVideosHandlerJson(config);
  ipcMain.handle('get-rawg-game-user-videos', (event, gameId) => {
    return getVideos(event, gameId);
  });

  const deleteVideo = createDeleteVideoHandlerJson(config);
  ipcMain.handle('delete-rawg-game-user-video', (event, gameId, videoId) => {
    return deleteVideo(event, gameId, videoId);
  });
}

module.exports = { registerRawgGameVideoHandlers };
