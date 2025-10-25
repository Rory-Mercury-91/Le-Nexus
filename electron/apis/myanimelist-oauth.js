/**
 * Module d'authentification OAuth 2.0 PKCE pour MyAnimeList
 * Documentation: https://myanimelist.net/apiconfig/references/authorization
 */

const { shell } = require('electron');
const http = require('http');
const crypto = require('crypto');
const fetch = require('node-fetch');

/**
 * Convertit un Buffer en base64url (RFC 4648)
 * @param {Buffer} buffer - Buffer à convertir
 * @returns {string} String encodée en base64url
 */
function base64urlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Génère un challenge PKCE conforme RFC 7636
 * @returns {Object} { code_verifier, code_challenge }
 */
function generatePKCEChallenge() {
  // Générer 32 bytes aléatoires (43 caractères en base64url)
  const verifierBuffer = crypto.randomBytes(32);
  const code_verifier = base64urlEncode(verifierBuffer);
  
  // Générer le challenge: SHA256(code_verifier) en base64url
  const challengeBuffer = crypto.createHash('sha256').update(code_verifier).digest();
  const code_challenge = base64urlEncode(challengeBuffer);
  
  console.log('🔑 PKCE Debug:');
  console.log('  code_verifier length:', code_verifier.length);
  console.log('  code_challenge length:', code_challenge.length);
  
  return { code_verifier, code_challenge };
}

// Configuration OAuth MAL
const MAL_CLIENT_ID = 'e72b02a7bb078afbca8c4184caa53477'; // Client ID de l'app Ma Mangathèque
const MAL_REDIRECT_URI = 'http://localhost:8888/callback';
const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';
const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

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
  
  // Créer un serveur local temporaire pour recevoir le callback
  let callbackReceived = false;
  const server = http.createServer(async (req, res) => {
    if (callbackReceived) return;
    
    const url = new URL(req.url, `http://localhost:8888`);
    
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
              .message { font-size: 16px; color: #aaa; }
              .close-btn { margin-top: 30px; padding: 12px 24px; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
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
        const tokens = await exchangeCodeForTokens(code, code_verifier);
        
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
    console.log('🔐 Serveur OAuth callback démarré sur http://localhost:8888');
    
    // Construire l'URL d'autorisation
    const authUrl = new URL(MAL_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', MAL_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', MAL_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', code_challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
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
 * @returns {Promise<Object>} { access_token, refresh_token, expires_in }
 */
async function exchangeCodeForTokens(code, codeVerifier) {
  console.log('🔄 Échange du code contre les tokens...');
  console.log('  Code:', code ? `${code.substring(0, 10)}...` : 'MANQUANT');
  console.log('  Code verifier length:', codeVerifier ? codeVerifier.length : 'MANQUANT');
  console.log('  Redirect URI:', MAL_REDIRECT_URI);
  
  const params = new URLSearchParams();
  params.set('client_id', MAL_CLIENT_ID);
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', MAL_REDIRECT_URI);
  params.set('code_verifier', codeVerifier);
  
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
  const params = new URLSearchParams();
  params.set('client_id', MAL_CLIENT_ID);
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
  getUserInfo,
  MAL_CLIENT_ID
};

