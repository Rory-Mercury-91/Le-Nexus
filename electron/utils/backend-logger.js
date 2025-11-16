/**
 * Système de logging backend vers frontend
 * Permet d'afficher les logs du backend dans les DevTools F12
 */

let mainWindow = null;
let verboseMode = false;
let logBuffer = [];
let consoleIntercepted = false;
const MAX_BUFFER_SIZE = 1000;

// Intercepter immédiatement pour capturer tous les logs dès le démarrage
// L'interception doit se faire AVANT que les logs soient désactivés en production
interceptConsole();

/**
 * Initialise le système de logging
 * @param {BrowserWindow} window - La fenêtre principale
 */
function initBackendLogger(window) {
  mainWindow = window;
  
  // Récupérer l'état initial depuis le store
  const Store = require('electron-store');
  const store = new Store();
  verboseMode = store.get('verboseLogging', false);
  
  // Envoyer les logs en buffer si le mode verbose est activé
  if (verboseMode && logBuffer.length > 0) {
    sendBufferedLogs();
  }
}

/**
 * Active ou désactive le mode verbose
 * @param {boolean} enabled - Activer ou désactiver
 */
function setVerboseMode(enabled) {
  verboseMode = enabled;
  const Store = require('electron-store');
  const store = new Store();
  store.set('verboseLogging', enabled);
  
  if (enabled && logBuffer.length > 0) {
    sendBufferedLogs();
  }
}

/**
 * Envoie les logs en buffer au frontend
 */
function sendBufferedLogs() {
  if (!mainWindow || !verboseMode) return;
  
  try {
    mainWindow.webContents.send('backend-log', {
      type: 'buffer',
      logs: logBuffer.slice(-100) // Envoyer les 100 derniers logs
    });
    logBuffer = []; // Vider le buffer après envoi
  } catch (error) {
    // Ignorer les erreurs si la fenêtre est fermée
  }
}

/**
 * Envoie un log au frontend
 * @param {string} level - Niveau du log (log, warn, error, info, debug)
 * @param {Array} args - Arguments du log
 */
function sendLogToFrontend(level, args) {
  if (!verboseMode || !mainWindow) {
    // Mettre en buffer même si le mode verbose n'est pas activé
    // pour pouvoir les envoyer plus tard si activé
    const logEntry = {
      level,
      args: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }),
      timestamp: new Date().toISOString()
    };
    
    logBuffer.push(logEntry);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.shift(); // Retirer le plus ancien
    }
    return;
  }
  
  try {
    // Convertir les arguments en strings pour l'envoi IPC
    const logArgs = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    });
    
    mainWindow.webContents.send('backend-log', {
      type: 'log',
      level,
      args: logArgs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Ignorer les erreurs si la fenêtre est fermée
  }
}

/**
 * Intercepte console.log, console.warn, console.error
 * Doit être appelé une seule fois au démarrage
 */
function interceptConsole() {
  if (consoleIntercepted) {
    return; // Déjà intercepté
  }
  consoleIntercepted = true;
  
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  
  // Intercepter console.log
  console.log = function(...args) {
    originalLog.apply(console, args);
    sendLogToFrontend('log', args);
  };
  
  // Intercepter console.warn
  console.warn = function(...args) {
    originalWarn.apply(console, args);
    sendLogToFrontend('warn', args);
  };
  
  // Intercepter console.error
  console.error = function(...args) {
    originalError.apply(console, args);
    sendLogToFrontend('error', args);
  };
  
  // Intercepter console.info
  console.info = function(...args) {
    originalInfo.apply(console, args);
    sendLogToFrontend('info', args);
  };
  
  // Intercepter console.debug
  console.debug = function(...args) {
    originalDebug.apply(console, args);
    sendLogToFrontend('debug', args);
  };
}

/**
 * Récupère l'état du mode verbose
 * @returns {boolean}
 */
function getVerboseMode() {
  return verboseMode;
}

module.exports = {
  initBackendLogger,
  setVerboseMode,
  getVerboseMode
};
