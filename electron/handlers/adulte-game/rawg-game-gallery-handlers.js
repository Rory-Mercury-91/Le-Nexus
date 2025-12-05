const path = require('path');
const fs = require('fs');
const {
  createAddImageFromUrlHandlerJson,
  createAddImageFromFileHandlerJson,
  createGetImagesHandlerJson,
  createDeleteImageHandlerJson
} = require('../common/json-gallery-handlers-helpers');

/**
 * Enregistre les handlers IPC pour la gestion de la galerie d'images utilisateur des jeux RAWG
 */
function registerRawgGameGalleryHandlers(ipcMain, getDb, store, dialog, getMainWindow, getPathManager) {
  const getPaths = () => {
    const pm = getPathManager();
    if (!pm) {
      return { base: '', covers: '', galleries: '' };
    }
    const paths = pm.getPaths();
    // Créer un dossier galleries/rawg-games pour stocker les images utilisateur
    const galleriesDir = path.join(paths.base, 'galleries', 'rawg-games');
    if (!fs.existsSync(galleriesDir)) {
      fs.mkdirSync(galleriesDir, { recursive: true });
    }
    return { ...paths, galleries: galleriesDir };
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

  // Vérifier que le jeu est bien un jeu RAWG avant d'ajouter une image
  const addImageFromUrl = createAddImageFromUrlHandlerJson(config);
  ipcMain.handle('add-rawg-game-user-image-url', async (event, gameId, imageUrl, title = null) => {
    const db = getDb();
    const game = db.prepare('SELECT id, titre FROM adulte_game_games WHERE id = ? AND game_site = \'RAWG\'').get(gameId);
    if (!game) {
      return { success: false, error: 'Jeu RAWG introuvable' };
    }
    return await addImageFromUrl(event, gameId, imageUrl, title);
  });

  const addImageFromFile = createAddImageFromFileHandlerJson(config);
  ipcMain.handle('add-rawg-game-user-image-file', async (event, gameId, title = null) => {
    const db = getDb();
    const game = db.prepare('SELECT id, titre FROM adulte_game_games WHERE id = ? AND game_site = \'RAWG\'').get(gameId);
    if (!game) {
      return { success: false, error: 'Jeu RAWG introuvable' };
    }
    return await addImageFromFile(event, gameId, title);
  });

  const getImages = createGetImagesHandlerJson(config);
  ipcMain.handle('get-rawg-game-user-images', getImages);

  const deleteImage = createDeleteImageHandlerJson(config);
  ipcMain.handle('delete-rawg-game-user-image', (event, gameId, imageId) => {
    return deleteImage(event, gameId, imageId);
  });
}

module.exports = { registerRawgGameGalleryHandlers };
