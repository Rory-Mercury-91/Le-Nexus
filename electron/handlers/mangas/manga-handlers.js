/**
 * Point d'entrée principal pour tous les handlers IPC des mangas
 * Ce fichier importe et enregistre tous les handlers spécialisés
 */

const { registerMangaSeriesHandlers } = require('./manga-series-handlers');
const { registerMangaTomesHandlers } = require('./tomes-handlers');
const { registerMangaTagsHandlers } = require('./tags-handlers');
const { registerMangaEnrichmentHandlers } = require('./enrichment-handlers');

/**
 * Enregistre tous les handlers IPC pour les mangas (séries et tomes)
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Store} store - Instance d'electron-store
 */
function registerMangaHandlers(ipcMain, getDb, getPathManager, store, getMainWindow = null) {
  // Enregistrer tous les handlers spécialisés
  registerMangaSeriesHandlers(ipcMain, getDb, getPathManager, store, getMainWindow);
  registerMangaTomesHandlers(ipcMain, getDb, getPathManager, store);
  registerMangaTagsHandlers(ipcMain, getDb);
  registerMangaEnrichmentHandlers(ipcMain, getDb, getPathManager, store);
}

module.exports = { registerMangaHandlers };
