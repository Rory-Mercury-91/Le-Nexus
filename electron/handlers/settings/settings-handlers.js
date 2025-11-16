/**
 * Point d'entrée principal pour tous les handlers IPC des paramètres
 * Ce fichier importe et enregistre tous les handlers spécialisés
 */

const { registerEmplacementHandlers } = require('./emplacement-handlers');
const { registerImagesHandlers } = require('./images-handlers');
const { registerUsersHandlers } = require('./users-handlers');
const { registerDatabaseHandlers } = require('./database-handlers');
const { registerAppearanceHandlers } = require('./appearance-handlers');
const { registerAiHandlers } = require('./ai-handlers');
const { registerTampermonkeyHandlers } = require('./tampermonkey-handlers');
const { registerBackupHandlers } = require('./backup-handlers');
const { registerNotificationHandlers } = require('./notification-handlers');
const { registerTraductionHandlers } = require('./traduction-handlers');
const { registerMediaSettingsHandlers } = require('./media-handlers');

/**
 * Enregistre tous les handlers IPC pour les paramètres et la configuration
 * @param {IpcMain} ipcMain - Module ipcMain d'Electron
 * @param {Dialog} dialog - Module dialog d'Electron
 * @param {Function} getMainWindow - Fonction pour récupérer la fenêtre principale
 * @param {Function} getDb - Fonction pour récupérer l'instance de la base de données
 * @param {Store} store - Instance d'electron-store
 * @param {Function} getPathManager - Fonction pour récupérer le PathManager
 * @param {Function} initDatabase - Fonction pour réinitialiser la base de données
 * @param {App} app - Module app d'Electron
 */
function registerSettingsHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase, app) {
  // Enregistrer tous les handlers spécialisés
  registerEmplacementHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase);
  registerImagesHandlers(ipcMain, dialog, getMainWindow, getPathManager);
  registerUsersHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager);
  registerDatabaseHandlers(ipcMain, dialog, getMainWindow, getDb, store, getPathManager, initDatabase);
  registerAppearanceHandlers(ipcMain, store, app);
  registerAiHandlers(ipcMain, getDb, getMainWindow, store, getPathManager);
  registerMediaSettingsHandlers(ipcMain, store);
  registerTampermonkeyHandlers(ipcMain, app);
  registerBackupHandlers(ipcMain, getPathManager, store, getDb, initDatabase);
  registerNotificationHandlers(ipcMain, getDb, store, getMainWindow, getPathManager);
  registerTraductionHandlers(ipcMain, getDb, store);
}

module.exports = { registerSettingsHandlers };
