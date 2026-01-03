const { getConfiguration } = require('../../apis/tmdb');
const { getUserIdByName } = require('../common-helpers');
const { safeJsonParse } = require('../common-helpers');

function registerMediaSettingsHandlers(ipcMain, getDb, store) {
  ipcMain.handle('get-tmdb-credentials', () => {
    return {
      apiKey: store.get('tmdb.apiKey', ''),
      apiToken: store.get('tmdb.apiToken', '')
    };
  });

  ipcMain.handle('set-tmdb-credentials', (event, { apiKey, apiToken }) => {
    if (apiKey !== undefined) {
      const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : apiKey;
      store.set('tmdb.apiKey', normalizedKey || '');
      console.log('[TMDb] API key sauvegardée:', normalizedKey ? `${normalizedKey.slice(0, 4)}…` : '(vide)');
    }
    if (apiToken !== undefined) {
      const normalizedToken = typeof apiToken === 'string' ? apiToken.trim() : apiToken;
      store.set('tmdb.apiToken', normalizedToken || '');
      console.log('[TMDb] Token v4 sauvegardé:', normalizedToken ? '***' : '(vide)');
    }
    return { success: true };
  });

  ipcMain.handle('get-media-sync-settings', () => {
    return {
      language: store.get('tmdb.language', 'fr-FR'),
      region: store.get('tmdb.region', 'FR'),
      autoTranslate: store.get('media.autoTranslate', true)
    };
  });

  ipcMain.handle('save-media-sync-settings', (event, settings) => {
    if (settings.language) {
      store.set('tmdb.language', settings.language);
    }
    if (settings.region) {
      store.set('tmdb.region', settings.region);
    }
    if (typeof settings.autoTranslate === 'boolean') {
      store.set('media.autoTranslate', settings.autoTranslate);
    }
    return { success: true };
  });

  ipcMain.handle('test-tmdb-connection', async (event, credentials = {}) => {
    const apiKey = credentials.apiKey ?? store.get('tmdb.apiKey', process.env.TMDB_API_KEY || '');
    const apiToken = credentials.apiToken ?? store.get('tmdb.apiToken', process.env.TMDB_API_TOKEN || '');

    if (!apiKey && !apiToken) {
      return { success: false, error: 'Aucune clé API TMDb configurée' };
    }

    try {
      const configuration = await getConfiguration({ apiKey, apiToken });
      return {
        success: true,
        images: configuration?.images || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la connexion à TMDb'
      };
    }
  });

  // ========== RAWG API ==========
  ipcMain.handle('get-rawg-credentials', () => {
    return {
      apiKey: store.get('rawg.apiKey', '')
    };
  });

  ipcMain.handle('set-rawg-credentials', (event, { apiKey }) => {
    if (apiKey !== undefined) {
      const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : apiKey;
      store.set('rawg.apiKey', normalizedKey || '');
      console.log('[RAWG] API key sauvegardée:', normalizedKey ? `${normalizedKey.slice(0, 4)}…` : '(vide)');
    }
    return { success: true };
  });

  ipcMain.handle('test-rawg-connection', async (event, credentials = {}) => {
    const { searchGames } = require('../../apis/rawg');
    const apiKey = credentials.apiKey ?? store.get('rawg.apiKey', process.env.RAWG_API_KEY || '');

    if (!apiKey) {
      return { success: false, error: 'Aucune clé API RAWG configurée' };
    }

    try {
      // Tester avec une recherche simple
      const result = await searchGames('test', { apiKey, page: 1, pageSize: 1 });
      return {
        success: true,
        message: 'Connexion RAWG réussie'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la connexion à RAWG'
      };
    }
  });
}

module.exports = {
  registerMediaSettingsHandlers
};
