/**
 * Module d'authentification OAuth 2.0 PKCE pour MyAnimeList
 * Documentation: https://myanimelist.net/apiconfig/references/authorization
 */

const { shell, app } = require('electron');
const http = require('http');
const crypto = require('crypto');
const fetch = require('node-fetch');
const Store = require('electron-store');

const store = new Store();

/**
 * Génère un challenge PKCE conforme RFC 7636
 * Approche: Générer une string aléatoire directement (pas de conversion Buffer)
 * @returns {Object} { code_verifier, code_challenge }
 */
function generatePKCEChallenge() {
  // IMPORTANT: MyAnimeList ne supporte que la méthode "plain" (pas S256)
  // Documentation: https://myanimelist.net/apiconfig/references/authorization
  // "NOTE: Currently, only the plain method is supported."

  // Charset alphanumérique (A-Z, a-z, 0-9)
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  // Générer un code_verifier de 128 caractères (longueur max recommandée)
  let code_verifier = '';
  const randomBytes = crypto.randomBytes(128);
  for (let i = 0; i < 128; i++) {
    code_verifier += charset[randomBytes[i] % charset.length];
  }

  // MÉTHODE PLAIN: code_challenge = code_verifier (pas de hash !)
  const code_challenge = code_verifier;

  // Logs de debug uniquement en mode verbose ou développement
  const isDev = app && !app.isPackaged;
  const verboseLogging = store.get('verboseLogging', false);
  if (isDev || verboseLogging) {
    console.log('🔑 PKCE Debug (méthode PLAIN):');
    console.log('  code_verifier:', code_verifier.substring(0, 30) + '...');
    console.log('  code_verifier length:', code_verifier.length);
    console.log('  code_challenge = code_verifier:', code_challenge === code_verifier ? '✅' : '❌');
  }

  return { code_verifier, code_challenge };
}

const { PORTS, URLS, MAL_CONFIG } = require('../config/constants');

// Configuration OAuth MAL
const LEGACY_MAL_CLIENT_ID = MAL_CONFIG.LEGACY_CLIENT_ID;
const DEFAULT_REDIRECT_URI = MAL_CONFIG.DEFAULT_REDIRECT_URI;
const MAL_AUTH_URL = URLS.MAL_AUTH;
const MAL_TOKEN_URL = URLS.MAL_TOKEN;

function getConfiguredMalClientId() {
  // Utiliser uniquement la clé depuis secrets.js ou variable d'environnement
  if (LEGACY_MAL_CLIENT_ID) {
    return LEGACY_MAL_CLIENT_ID;
  }
  throw new Error('Client ID MAL manquant. Configurez la variable d\'environnement MAL_CLIENT_ID ou ajoutez-la dans electron/config/secrets.js');
}

function getConfiguredRedirectUri() {
  // Utiliser uniquement l'URI par défaut
  return DEFAULT_REDIRECT_URI;
}

/**
 * Génère un code PKCE et démarre le flow OAuth
 * @param {Function} onSuccess - Callback appelé avec les tokens en cas de succès
 * @param {Function} onError - Callback appelé en cas d'erreur
 * @returns {Object} { server, codeVerifier } pour annulation si nécessaire
 */
function startOAuthFlow(onSuccess, onError) {
  // Générer le challenge PKCE
  const { code_verifier, code_challenge } = generatePKCEChallenge();

  // State pour prévenir CSRF
  const state = crypto.randomBytes(16).toString('hex');
  const clientId = getConfiguredMalClientId();
  const redirectUri = getConfiguredRedirectUri();

  if (!clientId) {
    const error = new Error('Client ID MyAnimeList manquant. Configurez votre clé dans les paramètres.');
    onError(error);
    return { server: null, codeVerifier: null };
  }

  // Créer un serveur local temporaire pour recevoir le callback
  let callbackReceived = false;
  const server = http.createServer(async (req, res) => {
    if (callbackReceived) return;

    const url = new URL(req.url, `http://localhost:${PORTS.OAUTH_CALLBACK}`);

    if (url.pathname === '/callback') {
      callbackReceived = true;

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Page HTML de réponse
      const htmlSuccess = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Connexion réussie</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a2e; color: #eee; }
              .success { color: #10b981; font-size: 24px; margin-bottom: 20px; }
              .message { font-size: 16px; color: #aaa; margin-bottom: 10px; }
              .info { font-size: 14px; color: #888; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="success">✅ Connexion réussie !</div>
            <div class="message">Vous pouvez retourner à l'application.</div>
            <div class="info">Vous pouvez fermer cet onglet en toute sécurité.</div>
          </body>
        </html>
      `;

      const htmlError = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Erreur de connexion</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a2e; color: #eee; }
              .error { color: #ef4444; font-size: 24px; margin-bottom: 20px; }
              .message { font-size: 16px; color: #aaa; margin-bottom: 10px; }
              .info { font-size: 14px; color: #888; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="error">❌ Erreur de connexion</div>
            <div class="message">Veuillez réessayer dans l'application.</div>
            <div class="info">Vous pouvez fermer cet onglet en toute sécurité.</div>
          </body>
        </html>
      `;

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlError);
        server.close();
        onError(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code || returnedState !== state) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlError);
        server.close();
        onError(new Error('Invalid state or missing code'));
        return;
      }

      // Échanger le code contre des tokens
      try {
        const tokens = await exchangeCodeForTokens(code, code_verifier, clientId, redirectUri);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlSuccess);

        server.close();
        onSuccess(tokens);
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlError);
        server.close();
        onError(err);
      }
    }
  });

  // Démarrer le serveur
  server.listen(8888, () => {
    console.log(`🔐 Serveur OAuth callback démarré sur http://localhost:${PORTS.OAUTH_CALLBACK}`);

    // Construire l'URL d'autorisation
    const authUrl = new URL(MAL_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', code_challenge);
    authUrl.searchParams.set('code_challenge_method', 'plain'); // MAL ne supporte que 'plain'

    // Ouvrir le navigateur pour autorisation
    // Note: shell.openExternal ouvre dans le navigateur par défaut
    // Pour éviter les conflits de cookies, l'utilisateur devrait utiliser la navigation privée
    console.log('📋 URL d\'autorisation OAuth:');
    console.log(authUrl.toString());
    console.log('💡 Si vous avez des problèmes (erreur 401), copiez cette URL et ouvrez-la en navigation privée');

    shell.openExternal(authUrl.toString());
  });

  // Timeout de 5 minutes
  setTimeout(() => {
    if (!callbackReceived) {
      server.close();
      onError(new Error('OAuth timeout: aucune réponse après 5 minutes'));
    }
  }, 5 * 60 * 1000);

  return { server, codeVerifier: code_verifier };
}

/**
 * Échange le code d'autorisation contre des tokens
 * @param {string} code - Code d'autorisation OAuth
 * @param {string} codeVerifier - Code verifier PKCE
 * @param {string} clientId - Client ID MAL
 * @param {string} redirectUri - Redirect URI MAL
 * @returns {Promise<Object>} { access_token, refresh_token, expires_in }
 */
async function exchangeCodeForTokens(code, codeVerifier, clientId, redirectUri) {
  console.log('🔄 Échange du code contre les tokens...');
  console.log('  Code:', code ? `${code.substring(0, 10)}...` : 'MANQUANT');
  console.log('  Code verifier:', codeVerifier ? `${codeVerifier.substring(0, 20)}...` : 'MANQUANT');
  console.log('  Code verifier length:', codeVerifier ? codeVerifier.length : 'MANQUANT');
  console.log('  Redirect URI:', redirectUri);

  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', redirectUri);
  params.set('code_verifier', codeVerifier);

  console.log('📤 Body envoyé:', params.toString().substring(0, 150) + '...');

  const response = await fetch(MAL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur échange tokens:', response.status, errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in * 1000)
  };
}

/**
 * Rafraîchit l'access token en utilisant le refresh token
 * @param {string} refreshToken - Refresh token MAL
 * @returns {Promise<Object>} { access_token, refresh_token, expires_in }
 */
async function refreshAccessToken(refreshToken) {
  const clientId = getConfiguredMalClientId();
  if (!clientId) {
    throw new Error('Client ID MAL manquant. Configurez votre clé dans les paramètres.');
  }
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);

  const response = await fetch(MAL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in * 1000)
  };
}

/**
 * Récupère les informations du profil utilisateur MAL
 * @param {string} accessToken - Access token MAL
 * @returns {Promise<Object>} { id, name, picture, joined_at }
 */
async function getUserInfo(accessToken) {
  const response = await fetch('https://api.myanimelist.net/v2/users/@me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return await response.json();
}

module.exports = {
  startOAuthFlow,
  refreshAccessToken,
  getUserInfo
};
