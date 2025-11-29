/**
 * Point d'entrée principal pour tous les handlers IPC des jeux adultes
 * Ce fichier importe et enregistre tous les handlers spécialisés
 */

const { registerAdulteGameCrudHandlers } = require('./adulte-game-crud-handlers');
const { registerBlacklistHandlers } = require('./blacklist-handlers');
const { registerLabelsHandlers } = require('./labels-handlers');
const { registerTagsHandlers } = require('./tags-handlers');
const { registerVisibilityHandlers } = require('./visibility-handlers');
const { registerLaunchHandlers } = require('./launch-handlers');
const { registerAdulteGameUpdatesCheckHandlers } = require('./adulte-game-updates-check-handlers');
const { registerAdulteGameSearchHandlers } = require('./adulte-game-search-handlers');
const { registerF95ConnectionHandlers } = require('./f95-connection-handlers');
const { registerScanHandlers } = require('./scan-handlers');

/**
 * Enregistre tous les handlers IPC pour la gestion des jeux adultes
 * @param {Electron.IpcMain} ipcMain 
 * @param {Function} getDb 
 * @param {Object} store 
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 */
function registerAdulteGameHandlers(ipcMain, getDb, store, getPathManager) {
  registerAdulteGameCrudHandlers(ipcMain, getDb, store, getPathManager);
  registerBlacklistHandlers(ipcMain, getDb, store);
  registerLabelsHandlers(ipcMain, getDb, store);
  registerTagsHandlers(ipcMain, getDb);
  registerVisibilityHandlers(ipcMain, getDb, store);
  registerLaunchHandlers(ipcMain, getDb, store);
  registerAdulteGameUpdatesCheckHandlers(ipcMain, getDb, store, getPathManager);
  registerAdulteGameSearchHandlers(ipcMain, getDb, store, getPathManager);
  registerF95ConnectionHandlers(ipcMain);
  registerScanHandlers(ipcMain, getDb, store);
  
  console.log('✅ Handlers jeux adultes enregistrés');
}

module.exports = { registerAdulteGameHandlers };
