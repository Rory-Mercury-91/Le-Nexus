/**
 * Module d'authentification OAuth 2.0 pour AniList
 * Documentation: https://anilist.gitbook.io/anilist-apiv2-docs/overview/oauth/getting-started
 */

const { shell, app } = require('electron');
const http = require('http');
const crypto = require('crypto');
const fetch = require('node-fetch');
const Store = require('electron-store');

// Store par défaut (sera remplacé si un store est passé)
let store = new Store();

const { PORTS } = require('../config/constants');

// Configuration OAuth AniList
const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize';
const ANILIST_TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const DEFAULT_REDIRECT_URI = `http://localhost:${PORTS.OAUTH_CALLBACK}/anilist-callback`;

function getConfiguredAniListClientId(storeInstance = store) {
  const stored = (storeInstance.get('anilist.clientId', '') || '').trim();
  if (stored) {
    return stored;
  }
  const envClientId = (process.env.ANILIST_CLIENT_ID || '').trim();
  if (envClientId) {
    return envClientId;
  }
  return '';
}

function getConfiguredAniListClientSecret(storeInstance = store) {
  const stored = (storeInstance.get('anilist.clientSecret', '') || '').trim();
  if (stored) {
    return stored;
  }
  const envClientSecret = (process.env.ANILIST_CLIENT_SECRET || '').trim();
  if (envClientSecret) {
    return envClientSecret;
  }
  return '';
}

function getConfiguredRedirectUri(storeInstance = store) {
  const stored = (storeInstance.get('anilist.redirectUri', '') || '').trim();
  if (stored) {
    return stored;
  }
  const envRedirect = (process.env.ANILIST_REDIRECT_URI || '').trim();
  if (envRedirect) {
    return envRedirect;
  }
  return DEFAULT_REDIRECT_URI;
}

/**
 * Génère un state pour prévenir CSRF
 */
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Démarre le flow OAuth AniList
 * @param {Function} onSuccess - Callback appelé avec les tokens en cas de succès
 * @param {Function} onError - Callback appelé en cas d'erreur
 * @returns {Object} { server, state } pour annulation si nécessaire
 */
function startOAuthFlow(onSuccess, onError, storeInstance = null) {
  // Utiliser le store passé en paramètre ou le store par défaut
  const actualStore = storeInstance || store;
  try {
    const state = generateState();
    const clientId = getConfiguredAniListClientId(actualStore);
    const clientSecret = getConfiguredAniListClientSecret(actualStore);
    const redirectUri = getConfiguredRedirectUri(actualStore);

    if (!clientId) {
      const error = new Error('Client ID AniList manquant. Configurez votre clé dans les paramètres.');
      onError(error);
      return { server: null, state: null };
    }

    if (!clientSecret) {
      const error = new Error('Client Secret AniList manquant. Configurez votre clé dans les paramètres.');
      onError(error);
      return { server: null, state: null };
    }

  // Créer un serveur local temporaire pour recevoir le callback
  let callbackReceived = false;
  const server = http.createServer(async (req, res) => {
    if (callbackReceived) return;

    const url = new URL(req.url, `http://localhost:${PORTS.OAUTH_CALLBACK}`);

    if (url.pathname === '/anilist-callback') {
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
              .message { font-size: 16px; color: #aaa; }
              .close-btn { margin-top: 30px; padding: 12px 24px; background: #02a9ff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="success">✅ Connexion réussie !</div>
            <div class="message">Vous pouvez fermer cette fenêtre et retourner à l'application.</div>
            <button class="close-btn" onclick="window.close()">Fermer cette fenêtre</button>
            <script>setTimeout(() => window.close(), 3000);</script>
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
              .message { font-size: 16px; color: #aaa; }
            </style>
          </head>
          <body>
            <div class="error">❌ Erreur de connexion</div>
            <div class="message">Veuillez réessayer dans l'application.</div>
            <script>setTimeout(() => window.close(), 3000);</script>
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
        const tokens = await exchangeCodeForTokens(code, clientId, redirectUri, actualStore);

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

  // Démarrer le serveur sur le même port que MAL (le path est différent)
  server.on('error', (err) => {
    console.error('❌ Erreur serveur OAuth AniList:', err);
    if (err.code === 'EADDRINUSE') {
      onError(new Error(`Le port ${PORTS.OAUTH_CALLBACK} est déjà utilisé. Fermez les autres applications qui l'utilisent.`));
    } else {
      onError(new Error(`Erreur serveur OAuth: ${err.message || err.toString()}`));
    }
  });

  server.listen(PORTS.OAUTH_CALLBACK, () => {
    console.log(`🔐 Serveur OAuth callback AniList démarré sur http://localhost:${PORTS.OAUTH_CALLBACK}`);

    try {
      // Construire l'URL d'autorisation
      const authUrl = new URL(ANILIST_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state);

      console.log('📋 URL d\'autorisation OAuth AniList:');
      console.log(authUrl.toString());

      shell.openExternal(authUrl.toString());
    } catch (err) {
      console.error('❌ Erreur ouverture URL OAuth AniList:', err);
      server.close();
      onError(new Error(`Erreur ouverture navigateur: ${err.message || err.toString()}`));
    }
  });

    // Timeout de 5 minutes
    setTimeout(() => {
      if (!callbackReceived) {
        server.close();
        onError(new Error('OAuth timeout: aucune réponse après 5 minutes'));
      }
    }, 5 * 60 * 1000);

    return { server, state };
  } catch (err) {
    console.error('❌ Erreur démarrage OAuth AniList:', err);
    onError(new Error(`Erreur démarrage OAuth: ${err.message || err.toString()}`));
    return { server: null, state: null };
  }
}

/**
 * Échange le code d'autorisation contre des tokens
 * @param {string} code - Code d'autorisation OAuth
 * @param {string} clientId - Client ID AniList
 * @param {string} redirectUri - Redirect URI AniList
 * @returns {Promise<Object>} { access_token, refresh_token, expires_in }
 */
async function exchangeCodeForTokens(code, clientId, redirectUri, storeInstance = store) {
  console.log('🔄 Échange du code contre les tokens AniList...');

  const clientSecret = getConfiguredAniListClientSecret(storeInstance);

  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('code', code);
  params.set('redirect_uri', redirectUri);

  const response = await fetch(ANILIST_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur échange tokens AniList:', response.status, errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600, // Par défaut 1 heure
    expires_at: Date.now() + ((data.expires_in || 3600) * 1000)
  };
}

/**
 * Rafraîchit l'access token en utilisant le refresh token
 * @param {string} refreshToken - Refresh token AniList
 * @returns {Promise<Object>} { access_token, refresh_token, expires_in }
 */
async function refreshAccessToken(refreshToken, storeInstance = store) {
  const clientId = getConfiguredAniListClientId(storeInstance);
  const clientSecret = getConfiguredAniListClientSecret(storeInstance);

  if (!clientId || !clientSecret) {
    throw new Error('Client ID ou Client Secret AniList manquant. Configurez vos clés dans les paramètres.');
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('refresh_token', refreshToken);

  const response = await fetch(ANILIST_TOKEN_URL, {
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
    refresh_token: data.refresh_token || refreshToken, // AniList peut ne pas retourner un nouveau refresh_token
    expires_in: data.expires_in || 3600,
    expires_at: Date.now() + ((data.expires_in || 3600) * 1000)
  };
}

/**
 * Récupère les informations du profil utilisateur AniList
 * @param {string} accessToken - Access token AniList
 * @returns {Promise<Object>} { id, name, avatar }
 */
async function getUserInfo(accessToken) {
  const query = `
    query {
      Viewer {
        id
        name
        avatar {
          large
          medium
        }
        options {
          profileColor
        }
      }
    }
  `;

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to get user info');
  }

  const viewer = data.data?.Viewer;
  if (!viewer) {
    throw new Error('No user data returned');
  }

  return {
    id: viewer.id,
    name: viewer.name,
    picture: viewer.avatar?.large || viewer.avatar?.medium || null
  };
}

module.exports = {
  startOAuthFlow,
  refreshAccessToken,
  getUserInfo,
  getConfiguredAniListClientId,
  getConfiguredAniListClientSecret,
  getConfiguredRedirectUri
};
