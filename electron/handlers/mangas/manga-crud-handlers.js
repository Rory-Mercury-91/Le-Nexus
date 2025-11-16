/**
 * Point d'entrée pour tous les handlers IPC des opérations CRUD sur les séries de mangas
 * Ce fichier importe et enregistre tous les handlers spécialisés par opération
 */

const { registerMangaSeriesReadHandlers } = require('./manga-read-handlers');
const { registerMangaSeriesCreateHandlers } = require('./manga-create-handlers');
const { registerMangaSeriesUpdateHandlers } = require('./manga-update-handlers');
const { registerMangaSeriesDeleteHandlers } = require('./manga-delete-handlers');

/**
 * Enregistre tous les handlers IPC pour les opérations CRUD sur les séries de mangas
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 */
function registerMangaSeriesCrudHandlers(ipcMain, getDb, getPathManager, store, getMainWindow = null) {
  // Enregistrer tous les handlers spécialisés par opération
  registerMangaSeriesReadHandlers(ipcMain, getDb, store);
  registerMangaSeriesCreateHandlers(ipcMain, getDb, getPathManager, store);
  registerMangaSeriesUpdateHandlers(ipcMain, getDb, getPathManager, store);
  registerMangaSeriesDeleteHandlers(ipcMain, getDb, getPathManager, store);
}

module.exports = { registerMangaSeriesCrudHandlers };
