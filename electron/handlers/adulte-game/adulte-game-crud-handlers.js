/**
 * Point d'entrée pour tous les handlers IPC des opérations CRUD sur les jeux adultes
 * Ce fichier importe et enregistre tous les handlers spécialisés par opération
 */

const { registerAdulteGameReadHandlers } = require('./adulte-game-read-handlers');
const { registerAdulteGameCreateHandlers } = require('./adulte-game-create-handlers');
const { registerAdulteGameUpdateHandlers } = require('./adulte-game-update-handlers');
const { registerAdulteGameDeleteHandlers } = require('./adulte-game-delete-handlers');

/**
 * Enregistre tous les handlers IPC pour les opérations CRUD sur les jeux adultes
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerAdulteGameCrudHandlers(ipcMain, getDb, store, getPathManager) {
  // Enregistrer tous les handlers spécialisés par opération
  registerAdulteGameReadHandlers(ipcMain, getDb, store);
  registerAdulteGameCreateHandlers(ipcMain, getDb, store, getPathManager);
  registerAdulteGameUpdateHandlers(ipcMain, getDb, store);
  registerAdulteGameDeleteHandlers(ipcMain, getDb, store);
}

module.exports = { registerAdulteGameCrudHandlers };
