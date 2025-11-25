/**
 * Constantes de configuration de l'application
 * Centralise toutes les valeurs hardcodées pour faciliter la maintenance
 */

// Ports et URLs
const PORTS = {
  OAUTH_CALLBACK: 8888,
  DEV_SERVER: 3000,
  IMPORT_SERVER: 40000, // Port changé de 51234 à 40000 car 51234 est dans la plage réservée par Windows
  STREAMING_SERVER: 8766 // Port pour le serveur de streaming vidéo (changé de 8765 pour éviter les conflits)
};

const URLS = {
  DEV_SERVER: `http://localhost:${PORTS.DEV_SERVER}`,
  OAUTH_CALLBACK: `http://localhost:${PORTS.OAUTH_CALLBACK}/callback`,
  MAL_AUTH: 'https://myanimelist.net/v1/oauth2/authorize',
  MAL_TOKEN: 'https://myanimelist.net/v1/oauth2/token'
};

// Configuration OAuth MAL
const MAL_CONFIG = {
  LEGACY_CLIENT_ID: 'e72b02a7bb078afbca8c4184caa53477', // Ancienne valeur codée en dur (fallback)
  DEFAULT_REDIRECT_URI: URLS.OAUTH_CALLBACK
};

module.exports = {
  PORTS,
  URLS,
  MAL_CONFIG
};
