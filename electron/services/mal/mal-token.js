/**
 * Gestion des tokens d'accès MAL
 * Récupère et rafraîchit les tokens d'accès MyAnimeList
 */

const { refreshAccessToken } = require('../../apis/myanimelist-oauth');

/**
 * Récupère un token d'accès valide, en rafraîchissant si nécessaire
 * @param {Store} store - Instance d'electron-store
 * @returns {Promise<string>} Access token valide
 */
async function getValidAccessToken(store) {
  let accessToken = store.get('mal_access_token', null);
  const expiresAt = store.get('mal_token_expires_at', 0);
  const refreshToken = store.get('mal_refresh_token', null);
  
  if (!accessToken) {
    throw new Error('Aucun token d\'accès MAL trouvé. Veuillez vous reconnecter à MyAnimeList.');
  }
  
  // Vérifier si le token est expiré (avec une marge de 5 minutes)
  const now = Date.now();
  const expiresSoon = expiresAt - now < 5 * 60 * 1000; // 5 minutes
  
  if (expiresSoon || !expiresAt) {
    if (!refreshToken) {
      throw new Error('Token expiré et aucun refresh token trouvé. Veuillez vous reconnecter à MyAnimeList.');
    }
    
    try {
      console.log('🔄 Rafraîchissement du token MAL...');
      const newTokens = await refreshAccessToken(refreshToken);
      
      // Sauvegarder les nouveaux tokens
      store.set('mal_access_token', newTokens.access_token);
      store.set('mal_refresh_token', newTokens.refresh_token);
      store.set('mal_token_expires_at', newTokens.expires_at);
      
      console.log('✅ Token rafraîchi avec succès');
      return newTokens.access_token;
    } catch (error) {
      // Si le refresh token est invalide, déconnecter l'utilisateur
      if (error.message && (error.message.includes('401') || error.message.includes('invalid_request') || error.message.includes('refresh token is invalid'))) {
        console.error('❌ Refresh token invalide, déconnexion automatique...');
        
        // Supprimer les tokens invalides
        store.delete('mal_access_token');
        store.delete('mal_refresh_token');
        store.delete('mal_token_expires_at');
        store.delete('mal_user_info');
        store.set('mal_connected', false);
        
        throw new Error('Votre session MyAnimeList a expiré. Veuillez vous reconnecter dans les paramètres.');
      }
      throw error;
    }
  }
  
  return accessToken;
}

module.exports = {
  getValidAccessToken
};
