const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Séries
  getSeries: (filters) => ipcRenderer.invoke('get-series', filters),
  getSerie: (id) => ipcRenderer.invoke('get-serie', id),
  debugGetSerieData: (serieId) => ipcRenderer.invoke('debug-get-serie-data', serieId),
  getMangaByMalId: (malId) => ipcRenderer.invoke('get-manga-by-mal-id', malId),
  getAnimeByMalId: (malId) => ipcRenderer.invoke('get-anime-by-mal-id', malId),
  createSerie: (serie) => ipcRenderer.invoke('create-serie', serie),
  updateSerie: (id, serie) => ipcRenderer.invoke('update-serie', id, serie),
  importFromNautiljonUrl: (url) => ipcRenderer.invoke('import-from-nautiljon-url', url),
  translateSerieDescription: (serieId) => ipcRenderer.invoke('translate-serie-description', serieId),
  translateSerieBackground: (serieId) => ipcRenderer.invoke('translate-serie-background', serieId),
  deleteSerie: (id) => ipcRenderer.invoke('delete-serie', id),
  masquerSerie: (serieId) => ipcRenderer.invoke('masquer-serie', serieId),
  demasquerSerie: (serieId) => ipcRenderer.invoke('demasquer-serie', serieId),
  isSerieMasquee: (serieId) => ipcRenderer.invoke('is-serie-masquee', serieId),
  masquerAnime: (animeId) => ipcRenderer.invoke('masquer-anime', animeId),
  demasquerAnime: (animeId) => ipcRenderer.invoke('demasquer-anime', animeId),
  isAnimeMasquee: (animeId) => ipcRenderer.invoke('is-anime-masquee', animeId),
  masquerAdulteGame: (adulteGameId) => ipcRenderer.invoke('masquer-adulte-game', adulteGameId),
  demasquerAdulteGame: (adulteGameId) => ipcRenderer.invoke('demasquer-adulte-game', adulteGameId),
  isAdulteGameMasquee: (adulteGameId) => ipcRenderer.invoke('is-adulte-game-masquee', adulteGameId),
  
  // Tags de séries
  setSerieTag: (serieId, userId, tag) => ipcRenderer.invoke('set-serie-tag', serieId, userId, tag),
  toggleSerieFavorite: (serieId, userId) => ipcRenderer.invoke('toggle-serie-favorite', serieId, userId),
  getSerieTag: (serieId, userId) => ipcRenderer.invoke('get-serie-tag', serieId, userId),
  removeSerieTag: (serieId, userId) => ipcRenderer.invoke('remove-serie-tag', serieId, userId),

  // Tags d'animes
  setAnimeTag: (animeId, userId, tag) => ipcRenderer.invoke('set-anime-tag', animeId, userId, tag),
  toggleAnimeFavorite: (animeId, userId) => ipcRenderer.invoke('toggle-anime-favorite', animeId, userId),
  getAnimeTag: (animeId, userId) => ipcRenderer.invoke('get-anime-tag', animeId, userId),
  removeAnimeTag: (animeId, userId) => ipcRenderer.invoke('remove-anime-tag', animeId, userId),

  // Tomes
  createTome: (tome) => ipcRenderer.invoke('create-tome', tome),
  updateTome: (id, tome) => ipcRenderer.invoke('update-tome', id, tome),
  deleteTome: (id) => ipcRenderer.invoke('delete-tome', id),
  
  // Statistiques
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  getEvolutionStatistics: () => ipcRenderer.invoke('get-evolution-statistics'),
  
  // Import/Export
  exportDatabase: () => ipcRenderer.invoke('export-database'),
  importDatabase: () => ipcRenderer.invoke('import-database'),
  
  // MangaDex
  searchMangadex: (titre) => ipcRenderer.invoke('search-mangadex', titre),
  searchManga: (titre) => ipcRenderer.invoke('search-manga', titre),
  searchAnime: (titre) => ipcRenderer.invoke('search-anime', titre),
  globalSearch: (query, currentUser) => ipcRenderer.invoke('global-search', query, currentUser),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Configuration
  getBaseDirectory: () => ipcRenderer.invoke('get-base-directory'),
  chooseBaseDirectory: () => ipcRenderer.invoke('choose-base-directory'),
  setBaseDirectory: (newBasePath) => ipcRenderer.invoke('set-base-directory', newBasePath),
  changeBaseDirectory: () => ipcRenderer.invoke('change-base-directory'),
  setupBaseDirectory: (newBasePath) => ipcRenderer.invoke('setup-base-directory', newBasePath),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  normalizeSerieOwnership: (serieId) => ipcRenderer.invoke('normalize-serie-ownership', serieId),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getDevMode: () => ipcRenderer.invoke('get-dev-mode'),
  setDevMode: (enabled) => ipcRenderer.invoke('set-dev-mode', enabled),
  getVerboseLogging: () => ipcRenderer.invoke('get-verbose-logging'),
  setVerboseLogging: (enabled) => ipcRenderer.invoke('set-verbose-logging', enabled),
  onBackendLog: (callback) => {
    const subscription = (_event, logData) => callback(logData);
    ipcRenderer.on('backend-log', subscription);
    return () => ipcRenderer.removeListener('backend-log', subscription);
  },
  exportEntityData: (type, id) => ipcRenderer.invoke('export-entity-data', { type, id }),
  // Préférences d'affichage mangas
  getMangaDisplaySettings: () => ipcRenderer.invoke('get-manga-display-settings'),
  saveMangaDisplaySettings: (prefs) => ipcRenderer.invoke('save-manga-display-settings', prefs),
  getMangaDisplayOverrides: (mangaId) => ipcRenderer.invoke('get-manga-display-overrides', mangaId),
  saveMangaDisplayOverrides: (mangaId, prefs) => ipcRenderer.invoke('save-manga-display-overrides', mangaId, prefs),
  deleteMangaDisplayOverrides: (mangaId, champKeys) => ipcRenderer.invoke('delete-manga-display-overrides', mangaId, champKeys),
  
  // Préférences d'affichage animés
  getAnimeDisplaySettings: () => ipcRenderer.invoke('get-anime-display-settings'),
  saveAnimeDisplaySettings: (prefs) => ipcRenderer.invoke('save-anime-display-settings', prefs),
  getAnimeDisplayOverrides: (animeId) => ipcRenderer.invoke('get-anime-display-overrides', animeId),
  saveAnimeDisplayOverrides: (animeId, prefs) => ipcRenderer.invoke('save-anime-display-overrides', animeId, prefs),
  deleteAnimeDisplayOverrides: (animeId, champKeys) => ipcRenderer.invoke('delete-anime-display-overrides', animeId, champKeys),
  
  // Préférences d'affichage jeux adultes
  getAdulteGameDisplaySettings: () => ipcRenderer.invoke('get-adulte-game-display-settings'),
  saveAdulteGameDisplaySettings: (prefs) => ipcRenderer.invoke('save-adulte-game-display-settings', prefs),
  getAdulteGameDisplayOverrides: (gameId) => ipcRenderer.invoke('get-adulte-game-display-overrides', gameId),
  saveAdulteGameDisplayOverrides: (gameId, prefs) => ipcRenderer.invoke('save-adulte-game-display-overrides', gameId, prefs),
  deleteAdulteGameDisplayOverrides: (gameId, champKeys) => ipcRenderer.invoke('delete-adulte-game-display-overrides', gameId, champKeys),

  // Groq AI
  getGroqApiKey: () => ipcRenderer.invoke('get-groq-api-key'),
  setGroqApiKey: (apiKey) => ipcRenderer.invoke('set-groq-api-key', apiKey),
  testGroqConnection: (apiKey) => ipcRenderer.invoke('test-groq-connection', apiKey),
  translateText: (text, targetLang) => ipcRenderer.invoke('translate-text', text, targetLang),
  
  // TMDb / TV Maze / médias
  getTmdbCredentials: () => ipcRenderer.invoke('get-tmdb-credentials'),
  setTmdbCredentials: (credentials) => ipcRenderer.invoke('set-tmdb-credentials', credentials),
  searchTmdbMovies: (query, page) => ipcRenderer.invoke('movies-search-tmdb', { query, page }),
  searchTmdbSeries: (query, page) => ipcRenderer.invoke('tv-search-tmdb', { query, page }),
  testTmdbConnection: (credentials) => ipcRenderer.invoke('test-tmdb-connection', credentials),
  getMediaSyncSettings: () => ipcRenderer.invoke('get-media-sync-settings'),
  saveMediaSyncSettings: (config) => ipcRenderer.invoke('save-media-sync-settings', config),
  getMovieDisplaySettings: () => ipcRenderer.invoke('get-movie-display-settings'),
  saveMovieDisplaySettings: (prefs) => ipcRenderer.invoke('save-movie-display-settings', prefs),
  getSeriesDisplaySettings: () => ipcRenderer.invoke('get-series-display-settings'),
  saveSeriesDisplaySettings: (prefs) => ipcRenderer.invoke('save-series-display-settings', prefs),
  syncMovieFromTmdb: (tmdbId, options = {}) => ipcRenderer.invoke('movies-sync-from-tmdb', { tmdbId, ...options }),
  getMovies: (filters) => ipcRenderer.invoke('movies-get', filters),
  getMovieDetail: (identifiers) => ipcRenderer.invoke('movies-get-detail', identifiers),
  setMovieStatus: (payload) => ipcRenderer.invoke('movies-set-status', payload),
  toggleMovieFavorite: (movieId) => ipcRenderer.invoke('movies-toggle-favorite', { movieId }),
  toggleMovieHidden: (movieId) => ipcRenderer.invoke('movies-toggle-hidden', { movieId }),
  syncTvShowFromTmdb: (tmdbId, options = {}) => ipcRenderer.invoke('tv-sync-from-tmdb', { tmdbId, ...options }),
  getTvShows: (filters) => ipcRenderer.invoke('tv-get', filters),
  getTvShowDetail: (identifiers) => ipcRenderer.invoke('tv-get-detail', identifiers),
  getTvEpisodes: (filters) => ipcRenderer.invoke('tv-get-episodes', filters),
  setTvShowStatus: (payload) => ipcRenderer.invoke('tv-set-status', payload),
  toggleTvFavorite: (showId) => ipcRenderer.invoke('tv-toggle-favorite', { showId }),
  toggleTvHidden: (showId) => ipcRenderer.invoke('tv-toggle-hidden', { showId }),
  markTvEpisode: (payload) => ipcRenderer.invoke('tv-mark-episode', payload),
  markAllTvEpisodes: (payload) => ipcRenderer.invoke('tv-mark-all-episodes', payload),

  // MyAnimeList Sync
  getMalCredentials: () => ipcRenderer.invoke('mal-get-credentials'),
  setMalCredentials: (credentials) => ipcRenderer.invoke('mal-set-credentials', credentials),
  malConnect: () => ipcRenderer.invoke('mal-connect'),
  malDisconnect: () => ipcRenderer.invoke('mal-disconnect'),
  malGetStatus: () => ipcRenderer.invoke('mal-get-status'),
  malSyncNow: () => ipcRenderer.invoke('mal-sync-now'),
  malSyncStatus: () => ipcRenderer.invoke('mal-sync-status'),
  malTranslateSynopsis: () => ipcRenderer.invoke('mal-translate-synopsis'),
  malSetAutoSync: (enabled, intervalHours) => ipcRenderer.invoke('mal-set-auto-sync', enabled, intervalHours),
  malGetAutoSyncSettings: () => ipcRenderer.invoke('mal-get-auto-sync-settings'),
  nautiljonSetAutoSync: (enabled, intervalHours, includeTomes) => ipcRenderer.invoke('nautiljon-set-auto-sync', enabled, intervalHours, includeTomes),
  nautiljonGetAutoSyncSettings: () => ipcRenderer.invoke('nautiljon-get-auto-sync-settings'),
  nautiljonSyncNow: () => ipcRenderer.invoke('nautiljon-sync-now'),
  onNautiljonSyncProgress: (callback) => {
    ipcRenderer.on('nautiljon-sync-progress', callback);
    return () => ipcRenderer.removeListener('nautiljon-sync-progress', callback);
  },
  onNautiljonSyncCompleted: (callback) => {
    ipcRenderer.on('nautiljon-sync-completed', callback);
    return () => ipcRenderer.removeListener('nautiljon-sync-completed', callback);
  },
  onNautiljonSyncError: (callback) => {
    ipcRenderer.on('nautiljon-sync-error', callback);
    return () => ipcRenderer.removeListener('nautiljon-sync-error', callback);
  },
  getAnimeImageSource: () => ipcRenderer.invoke('get-anime-image-source'),
  setAnimeImageSource: (source) => ipcRenderer.invoke('set-anime-image-source', source),
  getAnimeEnrichmentConfig: () => ipcRenderer.invoke('get-anime-enrichment-config'),
  saveAnimeEnrichmentConfig: (config) => ipcRenderer.invoke('save-anime-enrichment-config', config),
  startAnimeEnrichment: () => ipcRenderer.invoke('start-anime-enrichment'),
  stopAnimeEnrichment: () => ipcRenderer.invoke('stop-anime-enrichment'),
  onAnimeEnrichmentProgress: (callback) => {
    ipcRenderer.on('anime-enrichment-progress', callback);
    return () => ipcRenderer.removeListener('anime-enrichment-progress', callback);
  },
  onAnimeEnrichmentComplete: (callback) => {
    ipcRenderer.on('anime-enrichment-complete', callback);
    return () => ipcRenderer.removeListener('anime-enrichment-complete', callback);
  },
  getMangaEnrichmentConfig: () => ipcRenderer.invoke('get-manga-enrichment-config'),
  saveMangaEnrichmentConfig: (config) => ipcRenderer.invoke('save-manga-enrichment-config', config),
  startMangaEnrichment: () => ipcRenderer.invoke('start-manga-enrichment'),
  stopMangaEnrichment: () => ipcRenderer.invoke('stop-manga-enrichment'),
  enrichMangaNow: (mangaId, force = false) => ipcRenderer.invoke('enrich-manga-now', mangaId, force),
  enrichAnimeNow: (animeId, force = false) => ipcRenderer.invoke('enrich-anime-now', animeId, force),
  onMangaEnrichmentProgress: (callback) => {
    ipcRenderer.on('manga-enrichment-progress', callback);
    return () => ipcRenderer.removeListener('manga-enrichment-progress', callback);
  },
  onMangaEnrichmentComplete: (callback) => {
    ipcRenderer.on('manga-enrichment-complete', callback);
    return () => ipcRenderer.removeListener('manga-enrichment-complete', callback);
  },
  openTampermonkeyInstallation: () => ipcRenderer.invoke('open-tampermonkey-installation'),
  
  // Backup automatique
  getBackupConfig: () => ipcRenderer.invoke('get-backup-config'),
  saveBackupConfig: (config) => ipcRenderer.invoke('save-backup-config', config),
  createBackup: () => ipcRenderer.invoke('create-backup'),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('restore-backup', backupPath),
  deleteBackup: (backupPath) => ipcRenderer.invoke('delete-backup', backupPath),
  
  // Notifications
  getNotificationConfig: () => ipcRenderer.invoke('get-notification-config'),
  saveNotificationConfig: (config) => ipcRenderer.invoke('save-notification-config', config),
  checkNotificationsNow: () => ipcRenderer.invoke('check-notifications-now'),
  
  // Synchronisation traductions
  getTraductionConfig: () => ipcRenderer.invoke('get-traduction-config'),
  saveTraductionConfig: (config) => ipcRenderer.invoke('save-traduction-config', config),
  syncTraductionsNow: () => ipcRenderer.invoke('sync-traductions-now'),
  updateTraductionManually: (gameId, tradData) => ipcRenderer.invoke('update-traduction-manually', gameId, tradData),
  clearTraduction: (gameId) => ipcRenderer.invoke('clear-traduction', gameId),
  fetchTraducteurs: () => ipcRenderer.invoke('fetch-traducteurs'),
  
  onMalSyncProgress: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('mal-sync-progress', subscription);
    return () => ipcRenderer.removeListener('mal-sync-progress', subscription);
  },
  onMalSyncCompleted: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('mal-sync-completed', subscription);
    return () => ipcRenderer.removeListener('mal-sync-completed', subscription);
  },
  onMalSyncError: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('mal-sync-error', subscription);
    return () => ipcRenderer.removeListener('mal-sync-error', subscription);
  },
  onMalTranslationStarted: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('mal-translation-started', subscription);
    return () => ipcRenderer.removeListener('mal-translation-started', subscription);
  },
  onMalTranslationProgress: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('mal-translation-progress', subscription);
    return () => ipcRenderer.removeListener('mal-translation-progress', subscription);
  },
  onMalTranslationCompleted: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('mal-translation-completed', subscription);
    return () => ipcRenderer.removeListener('mal-translation-completed', subscription);
  },
  onMalTranslationError: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('mal-translation-error', subscription);
    return () => ipcRenderer.removeListener('mal-translation-error', subscription);
  },
  
  downloadCover: (imageUrl, fileName, serieTitre, type, options) => ipcRenderer.invoke('download-cover', imageUrl, fileName, serieTitre, type, options),
  uploadCustomCover: (serieTitre, type, options) => ipcRenderer.invoke('upload-custom-cover', serieTitre, type, options),
  saveCoverFromPath: (sourcePath, serieTitre, type, options) => ipcRenderer.invoke('save-cover-from-path', sourcePath, serieTitre, type, options),
  saveCoverFromBuffer: (buffer, fileName, serieTitre, type, options) => ipcRenderer.invoke('save-cover-from-buffer', buffer, fileName, serieTitre, type, options),
  deleteCoverImage: (relativePath) => ipcRenderer.invoke('delete-cover-image', relativePath),
  getCoverFullPath: (relativePath) => ipcRenderer.invoke('get-cover-full-path', relativePath),
  cleanEmptyFolders: () => ipcRenderer.invoke('clean-empty-folders'),
  getUserProfileImage: (userName) => ipcRenderer.invoke('get-user-profile-image', userName),
  setUserProfileImage: (userName) => ipcRenderer.invoke('set-user-profile-image', userName),
  
  // Gestion des utilisateurs
  getAllUsers: () => ipcRenderer.invoke('users:get-all'),
  createUser: (userData) => ipcRenderer.invoke('users:create', userData),
  updateUser: (userData) => ipcRenderer.invoke('users:update', userData),
  deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),
  devInitTestUser: () => ipcRenderer.invoke('dev:init-test-user'),
  chooseAvatarFile: () => ipcRenderer.invoke('users:choose-avatar-file'),
  setUserAvatarFromPath: (userId, sourcePath, userName) => ipcRenderer.invoke('users:set-avatar-from-path', userId, sourcePath, userName),
  setUserAvatar: (userId) => ipcRenderer.invoke('users:set-avatar', userId),
  
  // Gestion du mot de passe jeux adultes maître (partagé sur la machine)
  setAdulteGamePassword: (password) => ipcRenderer.invoke('users:set-adulte-game-password', { password }),
  checkAdulteGamePassword: (password) => ipcRenderer.invoke('users:check-adulte-game-password', { password }),
  removeAdulteGamePassword: (password) => ipcRenderer.invoke('users:remove-adulte-game-password', { password }),
  hasAdulteGamePassword: () => ipcRenderer.invoke('users:has-adulte-game-password'),
  removeUserAvatar: (userId) => ipcRenderer.invoke('users:remove-avatar', userId),
  
  // Jeux adultes (Adult Visual Novels)
  getAdulteGameGames: (filters) => ipcRenderer.invoke('get-adulte-game-games', filters),
  getAdulteGameGame: (id) => ipcRenderer.invoke('get-adulte-game-game', id),
  createAdulteGameGame: (gameData) => ipcRenderer.invoke('create-adulte-game-game', gameData),
  importAdulteGameFromJson: (jsonData) => ipcRenderer.invoke('import-adulte-game-from-json', jsonData),
  updateAdulteGameGame: (id, gameData) => ipcRenderer.invoke('update-adulte-game-game', id, gameData),
  deleteAdulteGameGame: (id) => ipcRenderer.invoke('delete-adulte-game-game', id),
  toggleAdulteGameFavorite: (gameId) => ipcRenderer.invoke('toggle-adulte-game-favorite', gameId),
  
  // Blacklist
  getAdulteGameBlacklist: () => ipcRenderer.invoke('get-adulte-game-blacklist'),
  removeFromBlacklist: (id) => ipcRenderer.invoke('remove-from-blacklist', id),
  
  // Labels
  getAdulteGameLabels: (gameId) => ipcRenderer.invoke('get-adulte-game-labels', gameId),
  getAllAdulteGameLabels: () => ipcRenderer.invoke('get-all-adulte-game-labels'),
  addAdulteGameLabel: (gameId, label, color) => ipcRenderer.invoke('add-adulte-game-label', gameId, label, color),
  removeAdulteGameLabel: (gameId, label) => ipcRenderer.invoke('remove-adulte-game-label', gameId, label),

  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  getAdulteGameTagPreferences: (userId) => ipcRenderer.invoke('get-adulte-game-tag-preferences', userId),
  toggleAdulteGameTagPreference: (userId, tag) => ipcRenderer.invoke('toggle-adulte-game-tag-preference', userId, tag),
  
  markAdulteGameUpdateSeen: (id) => ipcRenderer.invoke('mark-adulte-game-update-seen', id),
  launchAdulteGameGame: (id, versionToLaunch) => ipcRenderer.invoke('launch-adulte-game-game', id, versionToLaunch),
  checkAdulteGameUpdates: (gameId) => ipcRenderer.invoke('check-adulte-game-updates', gameId),
  onAdulteGameUpdatesProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress);
    ipcRenderer.on('adulte-game-updates-progress', subscription);
    return () => ipcRenderer.removeListener('adulte-game-updates-progress', subscription);
  },
  searchAdulteGameByF95Id: (f95Id) => ipcRenderer.invoke('search-adulte-game-by-f95-id', f95Id),
  
  // Connexion F95Zone
  checkF95Connection: () => ipcRenderer.invoke('check-f95-connection'),
  connectF95: () => ipcRenderer.invoke('connect-f95'),
  disconnectF95: () => ipcRenderer.invoke('disconnect-f95'),
  diagnoseF95Cookies: () => ipcRenderer.invoke('diagnose-f95-cookies'),
  
  // Jeux adultes - Notes privées
  updateAdulteGameNotes: (gameId, notes) => ipcRenderer.invoke('update-adulte-game-notes', gameId, notes),
  searchAdulteGameByLewdCornerId: (lewdcornerId) => ipcRenderer.invoke('search-adulte-game-by-lewdcorner-id', lewdcornerId),
  
  // Fusion
  mergeDatabase: () => ipcRenderer.invoke('merge-database'),
  setCurrentUser: (userName) => ipcRenderer.invoke('set-current-user', userName),
  setContentPreferences: (userName, preferences) => ipcRenderer.invoke('set-content-preferences', userName, preferences),
  getContentPreferences: (userName) => ipcRenderer.invoke('get-content-preferences', userName),
  onContentPreferencesChanged: (callback) => {
    const subscription = (event, userName, preferences) => callback(userName, preferences);
    ipcRenderer.on('content-preferences-changed', subscription);
    return () => ipcRenderer.removeListener('content-preferences-changed', subscription);
  },
  saveUserDatabase: () => ipcRenderer.invoke('save-user-database'),
  quitApp: (options) => ipcRenderer.invoke('quit-app', options),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  
  // Lecture
  toggleTomeLu: (tomeId, lu) => ipcRenderer.invoke('toggle-tome-lu', tomeId, lu),
  toggleTomePossede: (tomeId, possede) => ipcRenderer.invoke('toggle-tome-possede', tomeId, possede),
  possederTousLesTomes: (serieId) => ipcRenderer.invoke('posseder-tous-les-tomes', serieId),
  marquerSerieLue: (serieId) => ipcRenderer.invoke('marquer-serie-lue', serieId),
  getLectureStatistics: () => ipcRenderer.invoke('get-lecture-statistics'),
  getRecentProgress: () => ipcRenderer.invoke('get-recent-progress'),
  
  // Animes
  createAnime: (animeData) => ipcRenderer.invoke('create-anime', animeData),
  addAnimeByMalId: (malIdOrUrl, options = {}) => ipcRenderer.invoke('add-anime-by-mal-id', malIdOrUrl, options),
  importAnimeXml: (xmlContent) => ipcRenderer.invoke('import-anime-xml', xmlContent),
  
  // Mangas (Quick Add)
  addMangaByMalId: (malIdOrUrl, options = {}) => ipcRenderer.invoke('add-manga-by-mal-id', malIdOrUrl, options),
  onAnimeImportProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('anime-import-progress', subscription);
    // Retourner une fonction de nettoyage
    return () => ipcRenderer.removeListener('anime-import-progress', subscription);
  },
  getAnimeSeries: (filters) => ipcRenderer.invoke('get-anime-series', filters),
  getAnimeDetail: (animeId) => ipcRenderer.invoke('get-anime-detail', animeId),
  toggleEpisodeVu: (animeId, episodeNumero, vu) => ipcRenderer.invoke('toggle-episode-vu', animeId, episodeNumero, vu),
  marquerAnimeComplet: (animeId) => ipcRenderer.invoke('marquer-anime-complet', animeId),
  deleteAnime: (animeId) => ipcRenderer.invoke('delete-anime', animeId),
  setAnimeStatutVisionnage: (animeId, statutVisionnage) => ipcRenderer.invoke('set-anime-statut-visionnage', animeId, statutVisionnage),
  updateAnime: (id, animeData) => ipcRenderer.invoke('update-anime', id, animeData),
  deleteUserData: (userName) => ipcRenderer.invoke('delete-user-data', userName),
  deleteAllData: () => ipcRenderer.invoke('delete-all-data'),
  
  // Liens de streaming
  getStreamingLinks: (animeId, malId) => ipcRenderer.invoke('get-streaming-links', animeId, malId),
  addStreamingLink: (animeId, linkData) => ipcRenderer.invoke('add-streaming-link', animeId, linkData),
  deleteStreamingLink: (linkId) => ipcRenderer.invoke('delete-streaming-link', linkId),
  addExternalLink: (animeId, linkData) => ipcRenderer.invoke('add-external-link', animeId, linkData),
  
  // Événements d'import depuis Tampermonkey
  onMangaImportStart: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('manga-import-start', subscription);
    return () => ipcRenderer.removeListener('manga-import-start', subscription);
  },
  onMangaImportComplete: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('manga-import-complete', subscription);
    return () => ipcRenderer.removeListener('manga-import-complete', subscription);
  },
  onMangaImported: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('manga-imported', subscription);
    return () => ipcRenderer.removeListener('manga-imported', subscription);
  },
  offMangaImported: (callback) => {
    ipcRenderer.removeListener('manga-imported', callback);
  },
  // Événements d'import pour les animes
  onAnimeImportComplete: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('refresh-anime-list', subscription);
    return () => ipcRenderer.removeListener('refresh-anime-list', subscription);
  },
  
  // Sélection de fichiers jeux adultes
  selectAdulteGameExecutable: () => ipcRenderer.invoke('select-adulte-game-executable'),
  selectAdulteGameCoverImage: () => ipcRenderer.invoke('select-adulte-game-cover-image')
});
