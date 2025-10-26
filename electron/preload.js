const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Séries
  getSeries: (filters) => ipcRenderer.invoke('get-series', filters),
  getSerie: (id) => ipcRenderer.invoke('get-serie', id),
  createSerie: (serie) => ipcRenderer.invoke('create-serie', serie),
  updateSerie: (id, serie) => ipcRenderer.invoke('update-serie', id, serie),
  translateSerieDescription: (serieId) => ipcRenderer.invoke('translate-serie-description', serieId),
  deleteSerie: (id) => ipcRenderer.invoke('delete-serie', id),
  masquerSerie: (serieId) => ipcRenderer.invoke('masquer-serie', serieId),
  demasquerSerie: (serieId) => ipcRenderer.invoke('demasquer-serie', serieId),
  isSerieMasquee: (serieId) => ipcRenderer.invoke('is-serie-masquee', serieId),
  
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
  changeBaseDirectory: () => ipcRenderer.invoke('change-base-directory'),
  copyToNewLocation: (newBasePath) => ipcRenderer.invoke('copy-to-new-location', newBasePath),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  
  // Groq AI
  getGroqApiKey: () => ipcRenderer.invoke('get-groq-api-key'),
  setGroqApiKey: (apiKey) => ipcRenderer.invoke('set-groq-api-key', apiKey),
  translateText: (text, targetLang) => ipcRenderer.invoke('translate-text', text, targetLang),
  
  // MyAnimeList Sync
  malConnect: () => ipcRenderer.invoke('mal-connect'),
  malDisconnect: () => ipcRenderer.invoke('mal-disconnect'),
  malGetStatus: () => ipcRenderer.invoke('mal-get-status'),
  malSyncNow: () => ipcRenderer.invoke('mal-sync-now'),
  malTranslateSynopsis: () => ipcRenderer.invoke('mal-translate-synopsis'),
  malSetAutoSync: (enabled, intervalHours) => ipcRenderer.invoke('mal-set-auto-sync', enabled, intervalHours),
  malGetAutoSyncSettings: () => ipcRenderer.invoke('mal-get-auto-sync-settings'),
  getAnimeImageSource: () => ipcRenderer.invoke('get-anime-image-source'),
  setAnimeImageSource: (source) => ipcRenderer.invoke('set-anime-image-source', source),
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
  
  downloadCover: (imageUrl, fileName, type) => ipcRenderer.invoke('download-cover', imageUrl, fileName, type),
  uploadCustomCover: (serieTitre, type) => ipcRenderer.invoke('upload-custom-cover', serieTitre, type),
  saveCoverFromPath: (sourcePath, serieTitre, type) => ipcRenderer.invoke('save-cover-from-path', sourcePath, serieTitre, type),
  saveCoverFromBuffer: (buffer, fileName, serieTitre, type) => ipcRenderer.invoke('save-cover-from-buffer', buffer, fileName, serieTitre, type),
  deleteCoverImage: (relativePath) => ipcRenderer.invoke('delete-cover-image', relativePath),
  getCoverFullPath: (relativePath) => ipcRenderer.invoke('get-cover-full-path', relativePath),
  cleanEmptyFolders: () => ipcRenderer.invoke('clean-empty-folders'),
  getUserProfileImage: (userName) => ipcRenderer.invoke('get-user-profile-image', userName),
  setUserProfileImage: (userName) => ipcRenderer.invoke('set-user-profile-image', userName),
  getUserAvatar: (userName) => ipcRenderer.invoke('get-user-profile-image', userName), // Alias pour compatibilité
  
  // Gestion des utilisateurs
  getAllUsers: () => ipcRenderer.invoke('users:get-all'),
  createUser: (userData) => ipcRenderer.invoke('users:create', userData),
  updateUser: (userData) => ipcRenderer.invoke('users:update', userData),
  deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),
  chooseAvatarFile: () => ipcRenderer.invoke('users:choose-avatar-file'),
  setUserAvatarFromPath: (userId, sourcePath) => ipcRenderer.invoke('users:set-avatar-from-path', userId, sourcePath),
  setUserAvatar: (userId) => ipcRenderer.invoke('users:set-avatar', userId),
  removeUserAvatar: (userId) => ipcRenderer.invoke('users:remove-avatar', userId),
  getUserAvatar: (userId) => ipcRenderer.invoke('users:get-avatar', userId),
  
  // AVN (Adult Visual Novels)
  getAvnGames: (filters) => ipcRenderer.invoke('get-avn-games', filters),
  getAvnGame: (id) => ipcRenderer.invoke('get-avn-game', id),
  createAvnGame: (gameData) => ipcRenderer.invoke('create-avn-game', gameData),
  importAvnFromJson: (jsonData) => ipcRenderer.invoke('import-avn-from-json', jsonData),
  updateAvnGame: (id, gameData) => ipcRenderer.invoke('update-avn-game', id, gameData),
  deleteAvnGame: (id) => ipcRenderer.invoke('delete-avn-game', id),
  markAvnUpdateSeen: (id) => ipcRenderer.invoke('mark-avn-update-seen', id),
  launchAvnGame: (id) => ipcRenderer.invoke('launch-avn-game', id),
  checkAvnUpdates: () => ipcRenderer.invoke('check-avn-updates'),
  searchAvnByF95Id: (f95Id) => ipcRenderer.invoke('search-avn-by-f95-id', f95Id),
  searchAvnByLewdCornerId: (lewdcornerId) => ipcRenderer.invoke('search-avn-by-lewdcorner-id', lewdcornerId),

  // LewdCorner Auth
  lewdCornerConnect: () => ipcRenderer.invoke('lewdcorner-connect'),
  lewdCornerCheckSession: () => ipcRenderer.invoke('lewdcorner-check-session'),
  lewdCornerDisconnect: () => ipcRenderer.invoke('lewdcorner-disconnect'),
  
  // F95Zone Auth
  f95zoneConnect: () => ipcRenderer.invoke('f95zone-connect'),
  f95zoneCheckSession: () => ipcRenderer.invoke('f95zone-check-session'),
  f95zoneDisconnect: () => ipcRenderer.invoke('f95zone-disconnect'),
  
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
  marquerSerieLue: (serieId) => ipcRenderer.invoke('marquer-serie-lue', serieId),
  getLectureStatistics: () => ipcRenderer.invoke('get-lecture-statistics'),
  getRecentProgress: () => ipcRenderer.invoke('get-recent-progress'),
  
  // Animes
  createAnime: (animeData) => ipcRenderer.invoke('create-anime', animeData),
  addAnimeByMalId: (malIdOrUrl) => ipcRenderer.invoke('add-anime-by-mal-id', malIdOrUrl),
  importAnimeXml: (xmlContent) => ipcRenderer.invoke('import-anime-xml', xmlContent),
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
  
  // Sélection de fichiers AVN
  selectAvnExecutable: () => ipcRenderer.invoke('select-avn-executable'),
  selectAvnCoverImage: () => ipcRenderer.invoke('select-avn-cover-image')
});
