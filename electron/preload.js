const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ========== MANGAS ==========
  // Séries
  getSeries: (filters) => ipcRenderer.invoke('get-series', filters),
  getSerie: (id) => ipcRenderer.invoke('get-serie', id),
  debugGetSerieData: (serieId) => ipcRenderer.invoke('debug-get-serie-data', serieId),
  getMangaByMalId: (malId) => ipcRenderer.invoke('get-manga-by-mal-id', malId),
  getAvailableSources: () => ipcRenderer.invoke('get-available-sources'),
  createSerie: (serie) => ipcRenderer.invoke('create-serie', serie),
  updateSerie: (id, serie) => ipcRenderer.invoke('update-serie', id, serie),
  importFromNautiljonUrl: (url) => ipcRenderer.invoke('import-from-nautiljon-url', url),
  translateSerieDescription: (serieId) => ipcRenderer.invoke('translate-serie-description', serieId),
  translateSerieBackground: (serieId) => ipcRenderer.invoke('translate-serie-background', serieId),
  deleteSerie: (id) => ipcRenderer.invoke('delete-serie', id),
  masquerSerie: (serieId) => ipcRenderer.invoke('masquer-serie', serieId),
  demasquerSerie: (serieId) => ipcRenderer.invoke('demasquer-serie', serieId),
  isSerieMasquee: (serieId) => ipcRenderer.invoke('is-serie-masquee', serieId),

  // Tags de séries
  setSerieTag: (serieId, userId, tag) => ipcRenderer.invoke('set-serie-tag', serieId, userId, tag),
  toggleSerieFavorite: (serieId, userId) => ipcRenderer.invoke('toggle-serie-favorite', serieId, userId),
  getSerieTag: (serieId, userId) => ipcRenderer.invoke('get-serie-tag', serieId, userId),
  removeSerieTag: (serieId, userId) => ipcRenderer.invoke('remove-serie-tag', serieId, userId),

  // Labels de séries
  getMangaLabels: (serieId) => ipcRenderer.invoke('get-manga-labels', serieId),
  getAllMangaLabels: () => ipcRenderer.invoke('get-all-manga-labels'),
  addMangaLabel: (serieId, label, color) => ipcRenderer.invoke('add-manga-label', serieId, label, color),
  removeMangaLabel: (serieId, label) => ipcRenderer.invoke('remove-manga-label', serieId, label),

  // Genres et thèmes de séries
  getAllMangaGenres: () => ipcRenderer.invoke('get-all-manga-genres'),
  getAllMangaThemes: () => ipcRenderer.invoke('get-all-manga-themes'),

  // Tomes
  createTome: (tome) => ipcRenderer.invoke('create-tome', tome),
  updateTome: (id, tome) => ipcRenderer.invoke('update-tome', id, tome),
  deleteTome: (id) => ipcRenderer.invoke('delete-tome', id),

  // Mangas (Quick Add)
  addMangaByMalId: (malIdOrUrl, options = {}) => ipcRenderer.invoke('add-manga-by-mal-id', malIdOrUrl, options),
  addMangaByAnilistId: (anilistIdOrUrl, options = {}) => ipcRenderer.invoke('add-manga-by-anilist-id', anilistIdOrUrl, options),

  // Lecture
  toggleTomeLu: (tomeId, lu) => ipcRenderer.invoke('toggle-tome-lu', tomeId, lu),
  toggleTomePossede: (tomeId, possede) => ipcRenderer.invoke('toggle-tome-possede', tomeId, possede),
  toggleTomeMihon: (tomeId, mihon) => ipcRenderer.invoke('toggle-tome-mihon', tomeId, mihon),
  possederTousLesTomes: (serieId) => ipcRenderer.invoke('posseder-tous-les-tomes', serieId),
  serieMarkAsOwned: (payload) => ipcRenderer.invoke('serie-mark-as-owned', payload),
  marquerSerieLue: (serieId) => ipcRenderer.invoke('marquer-serie-lue', serieId),
  getLectureStatistics: () => ipcRenderer.invoke('get-lecture-statistics'),
  getRecentProgress: () => ipcRenderer.invoke('get-recent-progress'),


  // Enrichissement mangas
  getMangaEnrichmentConfig: () => ipcRenderer.invoke('get-manga-enrichment-config'),
  saveMangaEnrichmentConfig: (config) => ipcRenderer.invoke('save-manga-enrichment-config', config),
  startMangaEnrichment: () => ipcRenderer.invoke('start-manga-enrichment'),
  stopMangaEnrichment: () => ipcRenderer.invoke('stop-manga-enrichment'),
  pauseMangaEnrichment: () => ipcRenderer.invoke('pause-manga-enrichment'),
  resumeMangaEnrichment: () => ipcRenderer.invoke('resume-manga-enrichment'),
  enrichMangaNow: (mangaId, force = false) => ipcRenderer.invoke('enrich-manga-now', mangaId, force),
  onMangaEnrichmentProgress: (callback) => {
    ipcRenderer.on('manga-enrichment-progress', callback);
    return () => ipcRenderer.removeListener('manga-enrichment-progress', callback);
  },
  onMangaEnrichmentComplete: (callback) => {
    ipcRenderer.on('manga-enrichment-complete', callback);
    return () => ipcRenderer.removeListener('manga-enrichment-complete', callback);
  },

  // Import backup Mihon
  selectMihonBackupFile: () => ipcRenderer.invoke('select-mihon-backup-file'),
  importMihonBackup: (filePath) => ipcRenderer.invoke('import-mihon-backup', filePath),
  onMihonImportProgress: (callback) => {
    ipcRenderer.on('mihon-import-progress', callback);
    return () => ipcRenderer.removeListener('mihon-import-progress', callback);
  },

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

  // ========== ANIMES ==========
  getAnimeByMalId: (malId) => ipcRenderer.invoke('get-anime-by-mal-id', malId),
  masquerAnime: (animeId) => ipcRenderer.invoke('masquer-anime', animeId),
  demasquerAnime: (animeId) => ipcRenderer.invoke('demasquer-anime', animeId),
  isAnimeMasquee: (animeId) => ipcRenderer.invoke('is-anime-masquee', animeId),

  // Tags d'animes
  setAnimeTag: (animeId, userId, tag) => ipcRenderer.invoke('set-anime-tag', animeId, userId, tag),
  toggleAnimeFavorite: (animeId, userId) => ipcRenderer.invoke('toggle-anime-favorite', animeId, userId),
  getAnimeTag: (animeId, userId) => ipcRenderer.invoke('get-anime-tag', animeId, userId),
  removeAnimeTag: (animeId, userId) => ipcRenderer.invoke('remove-anime-tag', animeId, userId),

  // Labels d'animes
  getAnimeLabels: (animeId) => ipcRenderer.invoke('get-anime-labels', animeId),
  getAllAnimeLabels: () => ipcRenderer.invoke('get-all-anime-labels'),
  addAnimeLabel: (animeId, label, color) => ipcRenderer.invoke('add-anime-label', animeId, label, color),
  removeAnimeLabel: (animeId, label) => ipcRenderer.invoke('remove-anime-label', animeId, label),

  // Genres et thèmes d'animes
  getAllAnimeGenres: () => ipcRenderer.invoke('get-all-anime-genres'),
  getAllAnimeThemes: () => ipcRenderer.invoke('get-all-anime-themes'),

  // Animes
  createAnime: (animeData) => ipcRenderer.invoke('create-anime', animeData),
  addAnimeByMalId: (malIdOrUrl, options = {}) => ipcRenderer.invoke('add-anime-by-mal-id', malIdOrUrl, options),
  addAnimeByAnilistId: (anilistIdOrUrl, options = {}) => ipcRenderer.invoke('add-anime-by-anilist-id', anilistIdOrUrl, options),
  importAnimeXml: (xmlContent) => ipcRenderer.invoke('import-anime-xml', xmlContent),
  onAnimeImportProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('anime-import-progress', subscription);
    return () => ipcRenderer.removeListener('anime-import-progress', subscription);
  },
  getAnimeSeries: (filters) => ipcRenderer.invoke('get-anime-series', filters),
  getAnimeDetail: (animeId) => ipcRenderer.invoke('get-anime-detail', animeId),
  toggleEpisodeVu: (animeId, episodeNumero, vu) => ipcRenderer.invoke('toggle-episode-vu', animeId, episodeNumero, vu),
  marquerAnimeComplet: (animeId) => ipcRenderer.invoke('marquer-anime-complet', animeId),
  deleteAnime: (animeId) => ipcRenderer.invoke('delete-anime', animeId),
  setAnimeStatutVisionnage: (animeId, statutVisionnage) => ipcRenderer.invoke('set-anime-statut-visionnage', animeId, statutVisionnage),
  updateAnime: (id, animeData) => ipcRenderer.invoke('update-anime', id, animeData),

  // Liens de streaming
  getStreamingLinks: (animeId, malId) => ipcRenderer.invoke('get-streaming-links', animeId, malId),
  addStreamingLink: (animeId, linkData) => ipcRenderer.invoke('add-streaming-link', animeId, linkData),
  deleteStreamingLink: (linkId) => ipcRenderer.invoke('delete-streaming-link', linkId),
  addExternalLink: (animeId, linkData) => ipcRenderer.invoke('add-external-link', animeId, linkData),


  // Enrichissement animes
  getAnimeImageSource: () => ipcRenderer.invoke('get-anime-image-source'),
  setAnimeImageSource: (source) => ipcRenderer.invoke('set-anime-image-source', source),
  getAnimeEnrichmentConfig: () => ipcRenderer.invoke('get-anime-enrichment-config'),
  saveAnimeEnrichmentConfig: (config) => ipcRenderer.invoke('save-anime-enrichment-config', config),
  startAnimeEnrichment: () => ipcRenderer.invoke('start-anime-enrichment'),
  stopAnimeEnrichment: () => ipcRenderer.invoke('stop-anime-enrichment'),
  pauseAnimeEnrichment: () => ipcRenderer.invoke('pause-anime-enrichment'),
  resumeAnimeEnrichment: () => ipcRenderer.invoke('resume-anime-enrichment'),
  enrichAnimeNow: (animeId, force = false) => ipcRenderer.invoke('enrich-anime-now', animeId, force),
  onAnimeEnrichmentProgress: (callback) => {
    ipcRenderer.on('anime-enrichment-progress', callback);
    return () => ipcRenderer.removeListener('anime-enrichment-progress', callback);
  },
  onAnimeEnrichmentComplete: (callback) => {
    ipcRenderer.on('anime-enrichment-complete', callback);
    return () => ipcRenderer.removeListener('anime-enrichment-complete', callback);
  },

  // Événements d'import pour les animes
  onAnimeImportComplete: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('refresh-anime-list', subscription);
    return () => ipcRenderer.removeListener('refresh-anime-list', subscription);
  },

  // ========== MEDIA (MOVIES & TV) ==========
  // TMDb / TV Maze / médias
  getTmdbCredentials: () => ipcRenderer.invoke('get-tmdb-credentials'),
  setTmdbCredentials: (credentials) => ipcRenderer.invoke('set-tmdb-credentials', credentials),
  getRawgCredentials: () => ipcRenderer.invoke('get-rawg-credentials'),
  setRawgCredentials: (credentials) => ipcRenderer.invoke('set-rawg-credentials', credentials),
  testRawgConnection: (credentials) => ipcRenderer.invoke('test-rawg-connection', credentials),
  searchTmdbMovies: (query, page) => ipcRenderer.invoke('movies-search-tmdb', { query, page }),
  searchTmdbSeries: (query, page) => ipcRenderer.invoke('tv-search-tmdb', { query, page }),
  testTmdbConnection: (credentials) => ipcRenderer.invoke('test-tmdb-connection', credentials),
  getMediaSyncSettings: () => ipcRenderer.invoke('get-media-sync-settings'),
  saveMediaSyncSettings: (config) => ipcRenderer.invoke('save-media-sync-settings', config),

  // Movies
  syncMovieFromTmdb: (tmdbId, options = {}) => ipcRenderer.invoke('movies-sync-from-tmdb', { tmdbId, ...options }),
  getMovies: (filters) => ipcRenderer.invoke('movies-get', filters),
  getMovieDetail: (identifiers) => ipcRenderer.invoke('movies-get-detail', identifiers),
  setMovieStatus: (payload) => ipcRenderer.invoke('movies-set-status', payload),
  toggleMovieFavorite: (movieId) => ipcRenderer.invoke('movies-toggle-favorite', { movieId }),
  toggleMovieHidden: (movieId) => ipcRenderer.invoke('movies-toggle-hidden', { movieId }),
  createMovie: (movieData) => ipcRenderer.invoke('create-movie', movieData),
  updateMovie: (movieId, movieData) => ipcRenderer.invoke('update-movie', { movieId, movieData }),
  deleteMovie: (movieId) => ipcRenderer.invoke('delete-movie', movieId),

  // Genres de films
  getAllMovieGenres: () => ipcRenderer.invoke('get-all-movie-genres'),

  // Galerie d'images utilisateur
  addMovieUserImageUrl: (movieId, imageUrl) => ipcRenderer.invoke('add-movie-user-image-url', movieId, imageUrl),
  addMovieUserImageFile: (movieId, title) => ipcRenderer.invoke('add-movie-user-image-file', movieId, title),
  getMovieUserImages: (movieId) => ipcRenderer.invoke('get-movie-user-images', movieId),
  deleteMovieUserImage: (movieId, imageId) => ipcRenderer.invoke('delete-movie-user-image', movieId, imageId),
  addMovieUserVideoUrl: (movieId, url, title) => ipcRenderer.invoke('add-movie-user-video-url', { movieId, url, title }),
  addMovieUserVideoFile: (movieId, title, isReference) => ipcRenderer.invoke('add-movie-user-video-file', movieId, title, isReference),
  getMovieUserVideos: (movieId) => ipcRenderer.invoke('get-movie-user-videos', movieId),
  deleteMovieUserVideo: (movieId, videoId) => ipcRenderer.invoke('delete-movie-user-video', movieId, videoId),
  getVideoTracks: (filePath) => ipcRenderer.invoke('get-video-tracks', filePath),

  // TV Shows
  syncTvShowFromTmdb: (tmdbId, options = {}) => ipcRenderer.invoke('tv-sync-from-tmdb', { tmdbId, ...options }),
  getTvShows: (filters) => ipcRenderer.invoke('tv-get', filters),
  getTvShowDetail: (identifiers) => ipcRenderer.invoke('tv-get-detail', identifiers),
  getTvEpisodes: (filters) => ipcRenderer.invoke('tv-get-episodes', filters),
  setTvShowStatus: (payload) => ipcRenderer.invoke('tv-set-status', payload),
  toggleTvFavorite: (showId) => ipcRenderer.invoke('tv-toggle-favorite', { showId }),
  toggleTvHidden: (showId) => ipcRenderer.invoke('tv-toggle-hidden', { showId }),
  createTvShow: (tvShowData) => ipcRenderer.invoke('create-tv-show', tvShowData),
  updateTvShow: (showId, tvShowData) => ipcRenderer.invoke('update-tv-show', { showId, tvShowData }),
  createTvSeason: (payload) => ipcRenderer.invoke('tv-create-season', payload),
  updateTvSeason: (payload) => ipcRenderer.invoke('tv-update-season', payload),
  deleteTvSeason: (showId, seasonId) => ipcRenderer.invoke('tv-delete-season', { showId, seasonId }),
  updateTvEpisode: (payload) => ipcRenderer.invoke('tv-update-episode', payload),
  deleteTvEpisode: (showId, episodeId) => ipcRenderer.invoke('tv-delete-episode', { showId, episodeId }),
  reorderTvEpisodes: (payload) => ipcRenderer.invoke('tv-reorder-episodes', payload),

  // Genres de séries TV
  getAllTvGenres: () => ipcRenderer.invoke('get-all-tv-genres'),
  updateTvSeasonPoster: (payload) => ipcRenderer.invoke('tv-update-season-poster', payload),
  deleteTvShow: (showId) => ipcRenderer.invoke('delete-tv-show', showId),
  markTvEpisode: (payload) => ipcRenderer.invoke('tv-mark-episode', payload),
  markAllTvEpisodes: (payload) => ipcRenderer.invoke('tv-mark-all-episodes', payload),

  // Galerie d'images utilisateur pour séries TV
  addTvShowUserImageUrl: (showId, imageUrl) => ipcRenderer.invoke('add-tv-show-user-image-url', showId, imageUrl),
  addTvShowUserImageFile: (showId, title) => ipcRenderer.invoke('add-tv-show-user-image-file', showId, title),
  addTvShowUserVideoUrl: (showId, url, title) => ipcRenderer.invoke('add-tv-show-user-video-url', { showId, url, title }),
  addTvShowUserVideoFile: (showId, title, isReference) => ipcRenderer.invoke('add-tv-show-user-video-file', showId, title, isReference),
  getTvShowUserVideos: (showId) => ipcRenderer.invoke('get-tv-show-user-videos', showId),
  deleteTvShowUserVideo: (showId, videoId) => ipcRenderer.invoke('delete-tv-show-user-video', showId, videoId),
  getTvShowUserImages: (showId) => ipcRenderer.invoke('get-tv-show-user-images', showId),
  deleteTvShowUserImage: (showId, imageId) => ipcRenderer.invoke('delete-tv-show-user-image', showId, imageId),

  // Vidéos utilisateur pour épisodes de séries TV
  addTvEpisodeUserVideoUrl: (episodeId, url, title) => ipcRenderer.invoke('add-tv-episode-user-video-url', { episodeId, url, title }),
  addTvEpisodeUserVideoFile: (episodeId, title, isReference) => ipcRenderer.invoke('add-tv-episode-user-video-file', episodeId, title, isReference),
  getTvEpisodeUserVideos: (episodeId) => ipcRenderer.invoke('get-tv-episode-user-videos', episodeId),
  deleteTvEpisodeUserVideo: (episodeId, videoId) => ipcRenderer.invoke('delete-tv-episode-user-video', episodeId, videoId),

  // ========== BOOKS ==========
  booksGet: (filters) => ipcRenderer.invoke('books-get', filters),
  booksGetDetail: (bookId) => ipcRenderer.invoke('books-get-detail', bookId),

  // ========== LECTURES ==========
  getAvailableContentTypes: () => ipcRenderer.invoke('get-available-content-types'),

  // ========== COMICS ==========
  comicsSearch: (payload) => ipcRenderer.invoke('comics-search', payload),
  comicsImportFromGoogleBooks: (googleBooksId) => ipcRenderer.invoke('comics-import-from-google-books', googleBooksId),

  // ========== BD ==========
  bdSearch: (payload) => ipcRenderer.invoke('bd-search', payload),
  bdImportFromBnf: (bnfId) => ipcRenderer.invoke('bd-import-from-bnf', bnfId),
  bdImportFromGoogleBooks: (googleBooksId) => ipcRenderer.invoke('bd-import-from-google-books', googleBooksId),
  booksCreate: (bookData) => ipcRenderer.invoke('books-create', bookData),
  booksUpdate: (payload) => ipcRenderer.invoke('books-update', payload),
  booksDelete: (bookId) => ipcRenderer.invoke('books-delete', bookId),
  booksSetStatus: (payload) => ipcRenderer.invoke('books-set-status', payload),
  booksToggleFavorite: (payload) => ipcRenderer.invoke('books-toggle-favorite', payload),
  booksToggleHidden: (payload) => ipcRenderer.invoke('books-toggle-hidden', payload),
  booksSearch: (payload) => ipcRenderer.invoke('books-search', payload),
  booksImportFromGoogle: (googleBooksId) => ipcRenderer.invoke('books-import-from-google', googleBooksId),
  booksImportFromOpenLibrary: (openLibraryId) => ipcRenderer.invoke('books-import-from-open-library', openLibraryId),
  booksImportFromBnf: (bnfId) => ipcRenderer.invoke('books-import-from-bnf', bnfId),
  getBookLabels: (bookId) => ipcRenderer.invoke('get-book-labels', bookId),
  getAllBookLabels: () => ipcRenderer.invoke('get-all-book-labels'),
  addBookLabel: (bookId, label, color) => ipcRenderer.invoke('add-book-label', bookId, label, color),
  removeBookLabel: (bookId, label) => ipcRenderer.invoke('remove-book-label', bookId, label),
  updateBookLabels: (bookId, labels) => ipcRenderer.invoke('update-book-labels', bookId, labels),
  booksAddProprietaire: (payload) => ipcRenderer.invoke('books-add-proprietaire', payload),
  booksRemoveProprietaire: (payload) => ipcRenderer.invoke('books-remove-proprietaire', payload),
  booksMarkAsRead: (bookId) => ipcRenderer.invoke('books-mark-as-read', bookId),
  booksMarkAsOwned: (payload) => ipcRenderer.invoke('books-mark-as-owned', payload),

  // ========== ADULTE GAME ==========
  masquerAdulteGame: (adulteGameId) => ipcRenderer.invoke('masquer-adulte-game', adulteGameId),
  demasquerAdulteGame: (adulteGameId) => ipcRenderer.invoke('demasquer-adulte-game', adulteGameId),
  isAdulteGameMasquee: (adulteGameId) => ipcRenderer.invoke('is-adulte-game-masquee', adulteGameId),

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

  // Possession des jeux
  adulteGameMarkAsOwned: (payload) => ipcRenderer.invoke('adulte-game-mark-as-owned', payload),
  adulteGameGetOwners: (gameId) => ipcRenderer.invoke('adulte-game-get-owners', gameId),

  // ========== ABONNEMENTS ==========
  subscriptionsGet: (filters) => ipcRenderer.invoke('subscriptions-get', filters),
  subscriptionsCreate: (subscriptionData) => ipcRenderer.invoke('subscriptions-create', subscriptionData),
  subscriptionsUpdate: (id, subscriptionData) => ipcRenderer.invoke('subscriptions-update', id, subscriptionData),
  subscriptionsDelete: (id) => ipcRenderer.invoke('subscriptions-delete', id),
  subscriptionsUpdateNextPayments: () => ipcRenderer.invoke('subscriptions-update-next-payments'),

  // ========== ACHATS PONCTUELS ==========
  purchaseSitesGet: () => ipcRenderer.invoke('purchase-sites-get'),
  purchaseSitesCreate: (name) => ipcRenderer.invoke('purchase-sites-create', name),
  oneTimePurchasesGet: (filters) => ipcRenderer.invoke('one-time-purchases-get', filters),
  oneTimePurchasesCreate: (purchaseData) => ipcRenderer.invoke('one-time-purchases-create', purchaseData),
  oneTimePurchasesUpdate: (id, purchaseData) => ipcRenderer.invoke('one-time-purchases-update', id, purchaseData),
  oneTimePurchasesDelete: (id) => ipcRenderer.invoke('one-time-purchases-delete', id),

  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  getAdulteGameTagPreferences: (userId) => ipcRenderer.invoke('get-adulte-game-tag-preferences', userId),
  toggleAdulteGameTagPreference: (userId, tag) => ipcRenderer.invoke('toggle-adulte-game-tag-preference', userId, tag),

  markAdulteGameUpdateSeen: (id) => ipcRenderer.invoke('mark-adulte-game-update-seen', id),
  launchAdulteGameGame: (id, versionToLaunch) => ipcRenderer.invoke('launch-adulte-game-game', id, versionToLaunch),
  checkAdulteGameUpdates: (gameId, force = false) => ipcRenderer.invoke('check-adulte-game-updates', gameId, force),
  stopAdulteGameUpdatesCheck: () => ipcRenderer.invoke('stop-adulte-game-updates-check'),
  pauseAdulteGameUpdatesCheck: () => ipcRenderer.invoke('pause-adulte-game-updates-check'),
  resumeAdulteGameUpdatesCheck: () => ipcRenderer.invoke('resume-adulte-game-updates-check'),
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


  // Sélection de fichiers jeux adultes
  selectAdulteGameExecutable: () => ipcRenderer.invoke('select-adulte-game-executable'),
  selectAdulteGameCoverImage: () => ipcRenderer.invoke('select-adulte-game-cover-image'),

  // Scan des exécutables
  scanAdulteGameExecutables: () => ipcRenderer.invoke('scan-adulte-game-executables'),
  searchAdulteGameGamesMinimal: (searchTerm) => ipcRenderer.invoke('search-adulte-game-games-minimal', searchTerm),
  getAdulteGameCurrentExecutables: (gameId) => ipcRenderer.invoke('get-adulte-game-current-executables', gameId),
  bulkUpdateAdulteGameExecutables: (assignments) => ipcRenderer.invoke('bulk-update-adulte-game-executables', assignments),

  // ========== RAWG API ==========
  searchRawgGames: (query, page) => ipcRenderer.invoke('games-search-rawg', { query, page }),
  getRawgGameDetails: (rawgId) => ipcRenderer.invoke('games-get-rawg-details', rawgId),
  syncGameFromRawg: (rawgId, gameId, autoTranslate) => ipcRenderer.invoke('games-sync-from-rawg', { rawgId, gameId, autoTranslate }),
  enrichGameFromRawg: (gameId, rawgId, autoTranslate) => ipcRenderer.invoke('games-enrich-from-rawg', { gameId, rawgId, autoTranslate }),
  createGameFromRawg: (rawgId, autoTranslate) => ipcRenderer.invoke('create-game-from-rawg', { rawgId, autoTranslate }),
  getRawgGameDetail: (gameId) => ipcRenderer.invoke('get-rawg-game-detail', gameId),

  // Galerie d'images et vidéos utilisateur pour jeux RAWG
  addRawgGameUserImageUrl: (gameId, imageUrl, title) => ipcRenderer.invoke('add-rawg-game-user-image-url', gameId, imageUrl, title),
  addRawgGameUserImageFile: (gameId, title) => ipcRenderer.invoke('add-rawg-game-user-image-file', gameId, title),
  getRawgGameUserImages: (gameId) => ipcRenderer.invoke('get-rawg-game-user-images', gameId),
  deleteRawgGameUserImage: (gameId, imageId) => ipcRenderer.invoke('delete-rawg-game-user-image', gameId, imageId),
  addRawgGameUserVideoUrl: (gameId, url, title) => ipcRenderer.invoke('add-rawg-game-user-video-url', { gameId, url, title }),
  addRawgGameUserVideoFile: (gameId, title, isReference) => ipcRenderer.invoke('add-rawg-game-user-video-file', gameId, title, isReference),
  getRawgGameUserVideos: (gameId) => ipcRenderer.invoke('get-rawg-game-user-videos', gameId),
  deleteRawgGameUserVideo: (gameId, videoId) => ipcRenderer.invoke('delete-rawg-game-user-video', gameId, videoId),

  // Synchronisation traductions
  getTraductionConfig: () => ipcRenderer.invoke('get-traduction-config'),
  saveTraductionConfig: (config) => ipcRenderer.invoke('save-traduction-config', config),
  syncTraductionsNow: () => ipcRenderer.invoke('sync-traductions-now'),
  traductionGetAutoSyncSettings: () => ipcRenderer.invoke('traduction-get-auto-sync-settings'),
  traductionSetAutoSyncInterval: (intervalHours) => ipcRenderer.invoke('traduction-set-auto-sync-interval', intervalHours),
  updateTraductionManually: (gameId, tradData) => ipcRenderer.invoke('update-traduction-manually', gameId, tradData),
  clearTraduction: (gameId) => ipcRenderer.invoke('clear-traduction', gameId),
  fetchTraducteurs: () => ipcRenderer.invoke('fetch-traducteurs'),

  // ========== SETTINGS ==========
  // Configuration
  getBaseDirectory: () => ipcRenderer.invoke('get-base-directory'),
  chooseBaseDirectory: () => ipcRenderer.invoke('choose-base-directory'),
  setBaseDirectory: (newBasePath) => ipcRenderer.invoke('set-base-directory', newBasePath),
  checkDatabasesInLocation: (basePath) => ipcRenderer.invoke('check-databases-in-location', basePath),
  changeBaseDirectory: () => ipcRenderer.invoke('change-base-directory'),
  setupBaseDirectory: (newBasePath) => ipcRenderer.invoke('setup-base-directory', newBasePath),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  normalizeSerieOwnership: (serieId) => ipcRenderer.invoke('normalize-serie-ownership', serieId),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoDownloadCovers: () => ipcRenderer.invoke('get-auto-download-covers'),
  setAutoDownloadCovers: (enabled) => ipcRenderer.invoke('set-auto-download-covers', enabled),
  getDevMode: () => ipcRenderer.invoke('get-dev-mode'),
  setDevMode: (enabled) => ipcRenderer.invoke('set-dev-mode', enabled),
  getVerboseLogging: () => ipcRenderer.invoke('get-verbose-logging'),
  setVerboseLogging: (enabled) => ipcRenderer.invoke('set-verbose-logging', enabled),
  exportApiKeys: () => ipcRenderer.invoke('export-api-keys'),
  importApiKeys: () => ipcRenderer.invoke('import-api-keys'),
  getDevMergePreview: (payload) => ipcRenderer.invoke('dev-merge-preview', payload),
  performDevMerge: (payload) => ipcRenderer.invoke('dev-merge-apply', payload),
  onBackendLog: (callback) => {
    const subscription = (_event, logData) => callback(logData);
    ipcRenderer.on('backend-log', subscription);
    return () => ipcRenderer.removeListener('backend-log', subscription);
  },
  exportEntityData: (type, id) => ipcRenderer.invoke('export-entity-data', { type, id }),

  // Groq AI
  getGroqApiKey: () => ipcRenderer.invoke('get-groq-api-key'),
  setGroqApiKey: (apiKey) => ipcRenderer.invoke('set-groq-api-key', apiKey),
  testGroqConnection: (apiKey) => ipcRenderer.invoke('test-groq-connection', apiKey),
  translateText: (text, targetLang) => ipcRenderer.invoke('translate-text', text, targetLang),

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

  // AniList Sync
  anilistGetCredentials: () => ipcRenderer.invoke('anilist-get-credentials'),
  anilistSetCredentials: (credentials) => ipcRenderer.invoke('anilist-set-credentials', credentials),
  anilistConnect: () => ipcRenderer.invoke('anilist-connect'),
  anilistDisconnect: () => ipcRenderer.invoke('anilist-disconnect'),
  anilistGetStatus: () => ipcRenderer.invoke('anilist-get-status'),
  anilistSyncNow: () => ipcRenderer.invoke('anilist-sync-now'),
  anilistSyncStatus: () => ipcRenderer.invoke('anilist-sync-status'),
  anilistSetAutoSync: (enabled, intervalHours) => ipcRenderer.invoke('anilist-set-auto-sync', enabled, intervalHours),
  anilistGetAutoSyncSettings: () => ipcRenderer.invoke('anilist-get-auto-sync-settings'),
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
  onAnilistSyncProgress: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('anilist-sync-progress', subscription);
    return () => ipcRenderer.removeListener('anilist-sync-progress', subscription);
  },
  onAnilistSyncCompleted: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('anilist-sync-completed', subscription);
    return () => ipcRenderer.removeListener('anilist-sync-completed', subscription);
  },
  onAnilistSyncError: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('anilist-sync-error', subscription);
    return () => ipcRenderer.removeListener('anilist-sync-error', subscription);
  },
  onCloudSyncProgress: (callback) => {
    const subscription = (_event, data) => callback(_event, data);
    ipcRenderer.on('cloud-sync-progress', subscription);
    return () => ipcRenderer.removeListener('cloud-sync-progress', subscription);
  },
  openTampermonkeyInstallation: () => ipcRenderer.invoke('open-tampermonkey-installation'),

  // Cloud Sync (Cloudflare R2)
  getCloudSyncConfig: () => ipcRenderer.invoke('get-cloud-sync-config'),
  getUserNameFromUuid: (uuid) => ipcRenderer.invoke('get-user-name-from-uuid', uuid),
  getCloudSyncHistory: () => ipcRenderer.invoke('get-cloud-sync-history'),
  saveCloudSyncConfig: (config) => ipcRenderer.invoke('save-cloud-sync-config', config),
  testCloudSyncConnection: (config) => ipcRenderer.invoke('test-cloud-sync-connection', config),
  getCurrentUserUuid: () => ipcRenderer.invoke('get-current-user-uuid'),
  listCloudSyncDatabases: () => ipcRenderer.invoke('list-cloud-sync-databases'),
  uploadCloudSyncDatabase: () => ipcRenderer.invoke('upload-cloud-sync-database'),
  downloadCloudSyncDatabase: (uuid) => ipcRenderer.invoke('download-cloud-sync-database', uuid),
  performCloudSync: () => ipcRenderer.invoke('perform-cloud-sync'),
  generateAllUserUUIDs: () => ipcRenderer.invoke('generate-all-user-uuids'),
  exportCloudSyncConfig: () => ipcRenderer.invoke('export-cloud-sync-config'),
  importCloudSyncConfig: () => ipcRenderer.invoke('import-cloud-sync-config'),

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

  // ========== COMMON ==========
  // Statistiques
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  getEvolutionStatistics: () => ipcRenderer.invoke('get-evolution-statistics'),

  // Import/Export
  exportDatabase: () => ipcRenderer.invoke('export-database'),
  importDatabase: () => ipcRenderer.invoke('import-database'),

  searchManga: (titre) => ipcRenderer.invoke('search-manga', titre),
  searchAnime: (titre) => ipcRenderer.invoke('search-anime', titre),
  globalSearch: (query, currentUser) => ipcRenderer.invoke('global-search', query, currentUser),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  saveImageToDisk: (imageUrl, defaultFileName) => ipcRenderer.invoke('save-image-to-disk', { imageUrl, defaultFileName }),

  // Gestion des images
  downloadCover: (imageUrl, fileName, serieTitre, type, options) => ipcRenderer.invoke('download-cover', imageUrl, fileName, serieTitre, type, options),
  uploadCustomCover: (serieTitre, type, options) => ipcRenderer.invoke('upload-custom-cover', serieTitre, type, options),
  saveCoverFromPath: (sourcePath, serieTitre, type, options) => ipcRenderer.invoke('save-cover-from-path', sourcePath, serieTitre, type, options),
  saveCoverFromBuffer: (buffer, fileName, serieTitre, type, options) => ipcRenderer.invoke('save-cover-from-buffer', buffer, fileName, serieTitre, type, options),
  deleteCoverImage: (relativePath) => ipcRenderer.invoke('delete-cover-image', relativePath),
  getCoverFullPath: (relativePath) => ipcRenderer.invoke('get-cover-full-path', relativePath),
  diagnoseBrokenCovers: () => ipcRenderer.invoke('diagnose-broken-covers'),
  repairBrokenCovers: () => ipcRenderer.invoke('repair-broken-covers'),
  cleanEmptyFolders: () => ipcRenderer.invoke('clean-empty-folders'),

  // Gestion des utilisateurs
  getAllUsers: () => ipcRenderer.invoke('users:get-all'),
  createUser: (userData) => ipcRenderer.invoke('users:create', userData),
  updateUser: (userData) => ipcRenderer.invoke('users:update', userData),
  deleteUser: (userName) => ipcRenderer.invoke('users:delete', userName),
  devInitTestUser: () => ipcRenderer.invoke('dev:init-test-user'),
  chooseAvatarFile: () => ipcRenderer.invoke('users:choose-avatar-file'),
  setUserProfileImage: (userName) => ipcRenderer.invoke('get-user-profile-image', userName),
  setUserAvatar: (userId) => ipcRenderer.invoke('users:set-avatar', userId),
  setUserAvatarFromPath: (userId, sourcePath, userName) => ipcRenderer.invoke('users:set-avatar-from-path', userId, sourcePath, userName),
  removeUserAvatar: (userId) => ipcRenderer.invoke('users:remove-avatar', userId),
  getUserProfileImage: (userName) => ipcRenderer.invoke('get-user-profile-image', userName),

  // Gestion du mot de passe jeux adultes maître (partagé sur la machine)
  setAdulteGamePassword: (password) => ipcRenderer.invoke('users:set-adulte-game-password', { password }),
  checkAdulteGamePassword: (password) => ipcRenderer.invoke('users:check-adulte-game-password', { password }),
  removeAdulteGamePassword: (password) => ipcRenderer.invoke('users:remove-adulte-game-password', { password }),
  hasAdulteGamePassword: () => ipcRenderer.invoke('users:has-adulte-game-password'),

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
  deleteUserData: (userName) => ipcRenderer.invoke('delete-user-data', userName),
  deleteAllData: () => ipcRenderer.invoke('delete-all-data'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  copyToClipboard: (text) => {
    return ipcRenderer.invoke('copy-to-clipboard', text).then(result => {
      if (result.success) {
        return true;
      }
      throw new Error(result.error || 'Erreur lors de la copie');
    });
  }
});
