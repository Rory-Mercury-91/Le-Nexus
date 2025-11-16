/**
 * Utilitaires partagés pour le serveur d'import
 */

/**
 * Configure les headers CORS pour les réponses
 * @param {Object} res - Objet response HTTP
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Répond à une requête OPTIONS (preflight CORS)
 * @param {Object} res - Objet response HTTP
 */
function handleOptionsRequest(res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

/**
 * Parse le body d'une requête HTTP
 * @param {Object} req - Objet request HTTP
 * @returns {Promise<string>} Le body de la requête
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      resolve(body);
    });
    
    req.on('error', reject);
  });
}

/**
 * Envoie une réponse JSON avec les headers appropriés
 * @param {Object} res - Objet response HTTP
 * @param {number} statusCode - Code de statut HTTP
 * @param {Object} data - Données à envoyer (seront sérialisées en JSON)
 */
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

/**
 * Envoie une réponse d'erreur
 * @param {Object} res - Objet response HTTP
 * @param {number} statusCode - Code de statut HTTP
 * @param {string} message - Message d'erreur
 */
function sendErrorResponse(res, statusCode, message) {
  sendJsonResponse(res, statusCode, {
    success: false,
    error: message
  });
}

/**
 * Envoie une réponse de succès
 * @param {Object} res - Objet response HTTP
 * @param {Object} data - Données supplémentaires à inclure
 */
function sendSuccessResponse(res, data = {}) {
  sendJsonResponse(res, 200, {
    success: true,
    ...data
  });
}

/**
 * Valide que la base de données et l'utilisateur sont disponibles
 * @param {Function} getDb - Fonction pour obtenir la DB
 * @param {Store} store - Instance electron-store
 * @returns {Object} { db, currentUser } ou null si erreur
 */
function validateDbAndUser(getDb, store) {
  const db = getDb();
  const currentUser = store.get('currentUser', '');
  
  if (!db) {
    throw new Error('Base de données non initialisée');
  }
  
  if (!currentUser) {
    throw new Error('Aucun utilisateur connecté');
  }
  
  return { db, currentUser };
}

/**
 * Notifie le début d'un import
 * @param {BrowserWindow} mainWindow - Fenêtre principale
 * @param {string} message - Message à afficher
 */
function notifyImportStart(mainWindow, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('manga-import-start', { message });
  }
}

/**
 * Notifie la fin d'un import
 * @param {BrowserWindow} mainWindow - Fenêtre principale
 * @param {number} delay - Délai en ms avant la notification
 */
function notifyImportComplete(mainWindow, delay = 500) {
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('manga-import-complete');
    }
  }, delay);
}

module.exports = {
  setCorsHeaders,
  handleOptionsRequest,
  parseRequestBody,
  sendJsonResponse,
  sendErrorResponse,
  sendSuccessResponse,
  validateDbAndUser,
  notifyImportStart,
  notifyImportComplete
};
