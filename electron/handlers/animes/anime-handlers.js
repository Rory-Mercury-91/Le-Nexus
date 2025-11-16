/**
 * Point d'entrée principal pour tous les handlers IPC des animes
 * Ce fichier importe et enregistre tous les handlers spécialisés
 */

const { registerAnimeSeriesHandlers } = require('./anime-series-handlers');
const { registerAnimeEpisodesHandlers } = require('./episodes-handlers');
const { registerAnimeTagsHandlers } = require('./tags-handlers');
const { registerAnimeStreamingHandlers } = require('./streaming-handlers');
const { registerAnimeVisibilityHandlers } = require('./visibility-handlers');

/**
 * Enregistre tous les handlers IPC pour les animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeHandlers(ipcMain, getDb, store) {
  // Enregistrer tous les handlers spécialisés
  registerAnimeSeriesHandlers(ipcMain, getDb, store);
  registerAnimeEpisodesHandlers(ipcMain, getDb, store);
  registerAnimeTagsHandlers(ipcMain, getDb);
  registerAnimeStreamingHandlers(ipcMain, getDb);
  registerAnimeVisibilityHandlers(ipcMain, getDb, store);
}

module.exports = { registerAnimeHandlers };
