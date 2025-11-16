/**
 * Point d'entrée pour tous les handlers IPC des opérations CRUD sur les séries d'animes
 * Ce fichier importe et enregistre tous les handlers spécialisés par opération
 */

const { registerAnimeSeriesReadHandlers } = require('./anime-read-handlers');
const { registerAnimeSeriesCreateHandlers } = require('./anime-create-handlers');
const { registerAnimeSeriesUpdateHandlers } = require('./anime-update-handlers');
const { registerAnimeSeriesDeleteHandlers } = require('./anime-delete-handlers');

/**
 * Enregistre tous les handlers IPC pour les opérations CRUD sur les séries d'animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeSeriesCrudHandlers(ipcMain, getDb, store) {
  // Enregistrer tous les handlers spécialisés par opération
  registerAnimeSeriesReadHandlers(ipcMain, getDb, store);
  registerAnimeSeriesCreateHandlers(ipcMain, getDb, store);
  registerAnimeSeriesUpdateHandlers(ipcMain, getDb);
  registerAnimeSeriesDeleteHandlers(ipcMain, getDb);
}

module.exports = { registerAnimeSeriesCrudHandlers };
