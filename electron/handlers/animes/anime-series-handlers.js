/**
 * Point d'entrée pour tous les handlers IPC des séries d'animes
 * Ce fichier importe et enregistre tous les handlers spécialisés
 */

const { registerAnimeSeriesCrudHandlers } = require('./anime-crud-handlers');

/**
 * Enregistre tous les handlers IPC pour les séries d'animes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 */
function registerAnimeSeriesHandlers(ipcMain, getDb, store) {
  // Enregistrer tous les handlers spécialisés
  registerAnimeSeriesCrudHandlers(ipcMain, getDb, store);
}

module.exports = { registerAnimeSeriesHandlers };
