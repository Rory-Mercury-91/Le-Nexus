const { getConfiguration } = require('../../apis/tmdb');

function registerMediaSettingsHandlers(ipcMain, store) {
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

  const defaultMovieDisplay = {
    banner: true,
    synopsis: true,
    metadata: true,
    credits: true,
    videos: true,
    images: true,
    providers: true,
    keywords: true,
    recommendations: true
  };

  const defaultSeriesDisplay = {
    banner: true,
    synopsis: true,
    nextEpisode: true,
    seasons: true,
    episodes: true,
    metadata: true,
    streaming: true,
    externalLinks: true
  };

  ipcMain.handle('get-movie-display-settings', () => {
    const saved = store.get('movies.displaySettings', {});
    return {
      ...defaultMovieDisplay,
      ...saved
    };
  });

  ipcMain.handle('save-movie-display-settings', (event, settings) => {
    store.set('movies.displaySettings', settings);
    return { success: true };
  });

  ipcMain.handle('get-series-display-settings', () => {
    const saved = store.get('series.displaySettings', {});
    return {
      ...defaultSeriesDisplay,
      ...saved
    };
  });

  ipcMain.handle('save-series-display-settings', (event, settings) => {
    store.set('series.displaySettings', settings);
    return { success: true };
  });
}

module.exports = {
  registerMediaSettingsHandlers
};
