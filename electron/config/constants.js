/**
 * Constantes de configuration de l'application
 * Centralise toutes les valeurs hardcodées pour faciliter la maintenance
 */

// Ports et URLs
const PORTS = {
  OAUTH_CALLBACK: 8888,
  DEV_SERVER: 3000,
  IMPORT_SERVER: 40000, // Port changé de 51234 à 40000 car 51234 est dans la plage réservée par Windows
  STREAMING_SERVER: 40001 // Port pour le serveur de streaming vidéo (changé de 8765 pour éviter les conflits)
};

const URLS = {
  DEV_SERVER: `http://localhost:${PORTS.DEV_SERVER}`,
  OAUTH_CALLBACK: `http://localhost:${PORTS.OAUTH_CALLBACK}/callback`,
  MAL_AUTH: 'https://myanimelist.net/v1/oauth2/authorize',
  MAL_TOKEN: 'https://myanimelist.net/v1/oauth2/token'
};

// Charger les secrets depuis le fichier secrets.js (non versionné)
// Ce fichier est créé automatiquement lors du build GitHub Actions
// Pour le développement local, utiliser les variables d'environnement
let secrets = null;
try {
  secrets = require('./secrets');
} catch (error) {
  // Fichier secrets.js n'existe pas (mode dev ou build local), c'est normal
  // Les variables d'environnement seront utilisées comme fallback
}

// Configuration OAuth MAL (Client ID partagé - OAuth public avec PKCE)
const MAL_CONFIG = {
  LEGACY_CLIENT_ID: secrets?.MAL_CLIENT_ID || process.env.MAL_CLIENT_ID || null,
  DEFAULT_REDIRECT_URI: URLS.OAUTH_CALLBACK
};

// Configuration Google Sheets API
const GOOGLE_SHEETS_API_KEY = secrets?.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || null;

const GOOGLE_SHEETS_CONFIG = {
  API_KEY: GOOGLE_SHEETS_API_KEY,
  SPREADSHEET_ID: '1ELRF0kpF8SoUlslX5ZXZoG4WXeWST6lN9bLws32EPfs'
};

module.exports = {
  PORTS,
  URLS,
  MAL_CONFIG,
  GOOGLE_SHEETS_CONFIG
};
