/**
 * Point d'entrée pour tous les handlers IPC des séries de mangas
 * Ce fichier importe et enregistre tous les handlers spécialisés
 */

const { registerMangaSeriesCrudHandlers } = require('./manga-crud-handlers');
const { registerMangaSeriesVisibilityHandlers } = require('./manga-visibility-handlers');
const { registerMangaSeriesNautiljonHandlers } = require('./manga-nautiljon-handlers');

/**
 * Enregistre tous les handlers IPC pour les séries de mangas
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 */
function registerMangaSeriesHandlers(ipcMain, getDb, getPathManager, store, getMainWindow = null) {
  // Enregistrer tous les handlers spécialisés
  registerMangaSeriesCrudHandlers(ipcMain, getDb, getPathManager, store, getMainWindow);
  registerMangaSeriesVisibilityHandlers(ipcMain, getDb, store);
  registerMangaSeriesNautiljonHandlers(ipcMain, getDb, getPathManager, store, getMainWindow);
}

module.exports = { registerMangaSeriesHandlers };
