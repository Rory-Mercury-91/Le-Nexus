/**
 * Routes HTTP d'import pour les mangas
 * Orchestration principale des routes d'import HTTP (serveur local pour Tampermonkey)
 */

const { handleImportTomesOnly } = require('./tomes-import-service');
const { handleImportManga } = require('./manga-import-service');
const { handleAddManga } = require('./manga-add-service');

/**
 * Enregistre les routes manga
 */
function registerMangaRoutes(req, res, getDb, store, mainWindow, getPathManager) {
  if (req.method === 'POST' && req.url === '/api/import-tomes-only') {
    handleImportTomesOnly(req, res, getDb, store, mainWindow, getPathManager);
    return true;
  }
  
  if (req.method === 'POST' && req.url === '/api/import-manga') {
    handleImportManga(req, res, getDb, store, mainWindow, getPathManager);
    return true;
  }
  
  if (req.method === 'POST' && req.url === '/add-manga') {
    handleAddManga(req, res, mainWindow);
    return true;
  }
  
  return false;
}

module.exports = {
  registerMangaRoutes,
  handleImportTomesOnly,
  handleImportManga,
  handleAddManga
};
