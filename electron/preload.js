const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Séries
  getSeries: (filters) => ipcRenderer.invoke('get-series', filters),
  getSerie: (id) => ipcRenderer.invoke('get-serie', id),
  createSerie: (serie) => ipcRenderer.invoke('create-serie', serie),
  updateSerie: (id, serie) => ipcRenderer.invoke('update-serie', id, serie),
  deleteSerie: (id) => ipcRenderer.invoke('delete-serie', id),
  masquerSerie: (serieId) => ipcRenderer.invoke('masquer-serie', serieId),
  demasquerSerie: (serieId) => ipcRenderer.invoke('demasquer-serie', serieId),
  isSerieMasquee: (serieId) => ipcRenderer.invoke('is-serie-masquee', serieId),
  
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
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Configuration
  getBaseDirectory: () => ipcRenderer.invoke('get-base-directory'),
  changeBaseDirectory: () => ipcRenderer.invoke('change-base-directory'),
  copyToNewLocation: (newBasePath) => ipcRenderer.invoke('copy-to-new-location', newBasePath),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  downloadCover: (imageUrl, fileName, type) => ipcRenderer.invoke('download-cover', imageUrl, fileName, type),
  uploadCustomCover: (serieTitre, type) => ipcRenderer.invoke('upload-custom-cover', serieTitre, type),
  saveCoverFromPath: (sourcePath, serieTitre, type) => ipcRenderer.invoke('save-cover-from-path', sourcePath, serieTitre, type),
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
  
  // Fusion
  mergeDatabase: () => ipcRenderer.invoke('merge-database'),
  setCurrentUser: (userName) => ipcRenderer.invoke('set-current-user', userName),
  saveUserDatabase: () => ipcRenderer.invoke('save-user-database'),
  quitApp: (options) => ipcRenderer.invoke('quit-app', options),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  
  // Lecture
  toggleTomeLu: (tomeId, lu) => ipcRenderer.invoke('toggle-tome-lu', tomeId, lu),
  marquerSerieLue: (serieId) => ipcRenderer.invoke('marquer-serie-lue', serieId),
  getLectureStatistics: () => ipcRenderer.invoke('get-lecture-statistics'),
  
  // Animes
  importAnimeXml: (xmlContent) => ipcRenderer.invoke('import-anime-xml', xmlContent),
  onAnimeImportProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('anime-import-progress', subscription);
    // Retourner une fonction de nettoyage
    return () => ipcRenderer.removeListener('anime-import-progress', subscription);
  },
  createAnime: (animeData) => ipcRenderer.invoke('create-anime', animeData),
  getAnimeSeries: (filters) => ipcRenderer.invoke('get-anime-series', filters),
  getAnimeDetail: (serieId) => ipcRenderer.invoke('get-anime-detail', serieId),
  toggleEpisodeVu: (saisonId, episodeNumero, vu) => ipcRenderer.invoke('toggle-episode-vu', saisonId, episodeNumero, vu),
  marquerSaisonVue: (saisonId) => ipcRenderer.invoke('marquer-saison-vue', saisonId),
  deleteAnime: (serieId) => ipcRenderer.invoke('delete-anime', serieId),
  setAnimeStatutVisionnage: (serieId, statutVisionnage) => ipcRenderer.invoke('set-anime-statut-visionnage', serieId, statutVisionnage),
  checkAnimeCompletion: (serieId) => ipcRenderer.invoke('check-anime-completion', serieId),
  updateAnime: (id, animeData) => ipcRenderer.invoke('update-anime', id, animeData),
  getAnimeSaisons: (serieId) => ipcRenderer.invoke('get-anime-saisons', serieId),
  deleteUserData: (userName) => ipcRenderer.invoke('delete-user-data', userName),
  deleteAllData: () => ipcRenderer.invoke('delete-all-data'),
  
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
  }
});
