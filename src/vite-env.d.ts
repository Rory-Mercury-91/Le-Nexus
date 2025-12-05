/// <reference types="vite/client" />

type MovieListItem = import('./types').MovieListItem;
type MovieDetail = import('./types').MovieDetail;
type TvShowListItem = import('./types').TvShowListItem;
type TvShowDetail = import('./types').TvShowDetail;
type TvEpisode = import('./types').TvEpisode;
type TmdbMovieSearchResult = import('./types').TmdbMovieSearchResult;
type TmdbSeriesSearchResult = import('./types').TmdbSeriesSearchResult;
type TmdbSearchResponse<T> = import('./types').TmdbSearchResponse<T>;

type EnrichmentConfig = {
  enabled?: boolean;
  autoTranslate?: boolean;
  imageSource?: 'mal' | 'anilist' | 'tmdb';
  fields?: Record<string, boolean>;
  [key: string]: unknown;
};
type EnrichmentProgress = {
  current: number;
  total: number;
  item: string;
  elapsedMs?: number;
  etaMs?: number;
  speed?: number;
  processed?: number;
  enriched?: number;
  errors?: number;
};
type EnrichmentStats = {
  processed: number;
  enriched: number;
  errors: number;
  durationMs?: number;
  cancelled?: boolean;
  message?: string;
  alreadyRunning?: boolean;
};
type MalSyncProgress = {
  type: 'anime' | 'manga';
  total: number;
  current: number;
  imported?: number;
  updated?: number;
  item: string;
  elapsedMs?: number;
  etaMs?: number;
  speed?: number;
};
type MalSyncResult = {
  mangas?: { created?: number; updated?: number };
  animes?: { created?: number; updated?: number };
};
type TranslationProgress = {
  current: number;
  total: number;
  translated: number;
  skipped: number;
  currentAnime: string;
};
type AnimeImportProgress = import('./types').AnimeImportProgress;
type AnimeImportResult = import('./types').AnimeImportResult;
type ContentPreferences = import('./types').ContentPreferences;

type UserSummary = {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
};

type NotificationConfig = {
  enabled: boolean;
  checkAnimes: boolean;
  checkAdulteGame: boolean;
  notifyNautiljonSync: boolean;
  notifyMalSync: boolean;
  notifyEnrichment: boolean;
  notifyBackup: boolean;
  frequency?: string;
  soundEnabled: boolean;
  checkOnStartup: boolean;
};

type MovieQueryFilters = Partial<{
  search: string;
  orderBy: 'date_sortie' | 'note_moyenne' | 'popularite' | 'created_at';
  sort: 'ASC' | 'DESC';
  limit: number;
  offset: number;
}>;

type TvQueryFilters = Partial<{
  search: string;
  statut: string;
  orderBy: 'date_premiere' | 'note_moyenne' | 'popularite' | 'created_at' | 'titre';
  sort: 'ASC' | 'DESC';
  limit: number;
  offset: number;
}>;

interface ElectronAPI {
  getTheme: () => Promise<'dark' | 'light'>;
  setTheme: (theme: 'dark' | 'light') => Promise<{ success: boolean }>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
  getAutoDownloadCovers?: () => Promise<boolean>;
  setAutoDownloadCovers?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getGroqApiKey: () => Promise<string>;
  setGroqApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  getBaseDirectory: () => Promise<string | null>;
  chooseBaseDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>;
  setBaseDirectory: (path: string) => Promise<{ success: boolean; error?: string }>;
  checkDatabasesInLocation: (basePath: string) => Promise<{ success: boolean; hasDatabases: boolean; count: number; databases?: string[]; error?: string }>;
  changeBaseDirectory: () => Promise<{ success: boolean; path?: string; message?: string; error?: string }>;
  exportDatabase: () => Promise<{ success: boolean; error?: string }>;
  importDatabase: () => Promise<{ success: boolean; error?: string }>;
  saveUserDatabase: () => Promise<void>;
  mergeDatabase: () => Promise<{
    merged: boolean;
    seriesCount?: number;
    tomesCount?: number;
    animesCount?: number;
    gamesCount?: number;
  }>;
  deleteUserData: (userName: string | null) => Promise<{ success: boolean; error?: string }>;
  deleteAllData: () => Promise<{ success: boolean; error?: string }>;
  quitApp: (options?: { shouldRelaunch?: boolean }) => Promise<void>;
  minimizeToTray: () => Promise<void>;
  toggleFullscreen: () => Promise<{ success: boolean; isFullScreen?: boolean; error?: string }>;
  isFullscreen: () => Promise<{ success: boolean; isFullScreen: boolean }>;
  copyToClipboard: (text: string) => Promise<boolean>;
  nautiljonGetAutoSyncSettings: () => Promise<{ enabled: boolean; intervalHours: number; includeTomes: boolean }>;
  nautiljonSetAutoSync: (enabled: boolean, intervalHours: number, includeTomes: boolean) => Promise<{ success: boolean; error?: string }>;
  chooseAvatarFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
  createUser: (userData: { name: string; emoji: string; color: string }) => Promise<{ success: boolean; user?: { id: number; name: string }; error?: string }>;
  setUserAvatarFromPath: (userId: number, sourcePath: string, userName: string) => Promise<{ success: boolean; error?: string }>;
  setCurrentUser: (userName: string) => Promise<{ success: boolean; error?: string }>;
  onContentPreferencesChanged: (callback: (userName: string, preferences: Partial<ContentPreferences>) => void) => () => void;
  getStatistics: () => Promise<Statistics>;
  getLectureStatistics: () => Promise<LectureStatistics>;
  getRecentProgress: () => Promise<RecentProgress>;
  globalSearch: (query: string, currentUser: string) => Promise<Array<{
    id: number;
    type: 'manga' | 'anime' | 'adulte-game';
    title: string;
    subtitle?: string;
    progress?: string;
    coverUrl?: string;
  }>>;
  getAnimeSeries: (filters: Record<string, unknown>) => Promise<{ success: boolean; animes: AnimeSerie[] }>;
  searchAnime: (titre: string) => Promise<import('./types').AnimeSearchResult[]>;
  translateText: (text: string, targetLang: string) => Promise<{ success: boolean; text?: string; error?: string }>;
  createAnime: (animeData: Record<string, unknown>) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateAnime: (id: number, animeData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  getAnimeDetail: (animeId: number) => Promise<{
    success: boolean;
    anime?: AnimeSerie;
    episodes?: Array<{
      numero: number;
      vu: boolean;
      date_visionnage: string | null;
    }>;
  }>;
  setAnimeStatutVisionnage: (animeId: number, statutVisionnage: string) => Promise<{ success: boolean }>;
  toggleAnimeFavorite: (animeId: number, userId: number) => Promise<{ success: boolean; isFavorite: boolean }>;
  toggleEpisodeVu: (animeId: number, episodeNumero: number, vu: boolean) => Promise<{ success: boolean }>;
  marquerAnimeComplet: (animeId: number) => Promise<{ success: boolean }>;
  deleteAnime: (animeId: number) => Promise<{ success: boolean }>;
  isAnimeMasquee: (animeId: number) => Promise<boolean>;
  demasquerAnime: (animeId: number) => Promise<{ success: boolean }>;
  masquerAnime: (animeId: number) => Promise<{ success: boolean }>;
  getEvolutionStatistics: () => Promise<EvolutionStatistics>;
  getAdulteGameGames: (filters: Record<string, unknown>) => Promise<AdulteGame[]>;
  getAdulteGameGame: (id: number) => Promise<AdulteGame | null>;
  checkAdulteGameUpdates: (gameId: number, force?: boolean) => Promise<{ updated: number; sheetSynced: number }>;
  markAdulteGameUpdateSeen: (id: number) => Promise<{ success: boolean }>;
  launchAdulteGameGame: (id: number, version?: string) => Promise<{ success: boolean; openedWebsite?: boolean }>;
  deleteAdulteGameGame: (id: number) => Promise<{ success: boolean }>;
  getAdulteGameTagPreferences: (userId: number) => Promise<Record<string, 'liked' | 'disliked' | 'neutral'>>;
  toggleAdulteGameTagPreference: (userId: number, tag: string) => Promise<{ preference: 'liked' | 'disliked' | 'neutral' }>;
  updateAdulteGameNotes: (gameId: number, notes: string) => Promise<{ success: boolean }>;
  updateAdulteGameGame: (id: number, gameData: Record<string, unknown>) => Promise<{ success: boolean }>;
  selectAdulteGameExecutable: () => Promise<{ success: boolean; path?: string }>;
  scanAdulteGameExecutables: () => Promise<{
    success: boolean;
    canceled?: boolean;
    error?: string;
    executables?: Array<{
      path: string;
      filename: string;
      folder: string;
      isDuplicate: boolean;
      duplicatePaths?: string[];
    }>;
  }>;
  searchAdulteGameGamesMinimal: (searchTerm: string) => Promise<Array<{
    id: number;
    titre: string;
    f95_thread_id?: number | null;
    Lewdcorner_thread_id?: number | null;
  }>>;
  getAdulteGameCurrentExecutables: (gameId: number) => Promise<Array<{
    version: string;
    path: string;
    label: string;
  }>>;
  bulkUpdateAdulteGameExecutables: (assignments: Array<{
    gameId: number;
    executablePath: string;
    action: 'add' | 'replace';
    label?: string;
  }>) => Promise<{ success: boolean; updated: number }>;
  updateUser: (userData: { id: number; name: string; emoji: string; color: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userName: string) => Promise<{ success: boolean; error?: string }>;
  onAnimeImportProgress: (callback: (progress: AnimeImportProgress) => void) => () => void;
  onAdulteGameUpdatesProgress: (callback: (progress: {
    phase: 'start' | 'sheet' | 'scraping' | 'complete' | 'error';
    total: number;
    current: number;
    message: string;
    gameTitle?: string;
    updated?: number;
    sheetSynced?: number;
  }) => void) => () => void;
  stopAdulteGameUpdatesCheck?: () => Promise<{ success: boolean; error?: string }>;
  pauseAdulteGameUpdatesCheck?: () => Promise<{ success: boolean; error?: string }>;
  resumeAdulteGameUpdatesCheck?: () => Promise<{ success: boolean; error?: string }>;
  openTampermonkeyInstallation: () => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Promise<UserSummary[]>;
  getUserProfileImage: (userName: string) => Promise<string | null>;
  getCurrentUser: () => Promise<string | null>;
  getContentPreferences: (userName: string) => Promise<ContentPreferences>;
  setContentPreferences: (userName: string, preferences: Partial<ContentPreferences>) => Promise<ContentPreferences>;
  getNotificationConfig: () => Promise<NotificationConfig>;
  saveNotificationConfig: (config: Partial<NotificationConfig>) => Promise<{ success: boolean; error?: string }>;
  importAnimeXml: (xmlContent: string) => Promise<AnimeImportResult & { success?: boolean; error?: string }>;
  downloadCover: (
    imageUrl: string,
    fileName: string,
    serieTitre: string,
    type?: 'serie' | 'tome' | 'anime' | 'adulte-game',
    options?: {
      mediaType?: string | null;
      typeVolume?: string | null;
      mediaCategory?: string | null;
      referer?: string | null;
    }
  ) => Promise<{ success: boolean; localPath?: string; error?: string }>;
  uploadCustomCover: (
    serieTitre: string,
    type?: 'serie' | 'tome' | 'anime' | 'adulte-game',
    options?: {
      mediaType?: string | null;
      typeVolume?: string | null;
      mediaCategory?: string | null;
    }
  ) => Promise<{ success: boolean; localPath?: string; error?: string }>;
  saveCoverFromPath: (
    sourcePath: string,
    serieTitre: string,
    type?: 'serie' | 'tome' | 'anime' | 'adulte-game',
    options?: {
      mediaType?: string | null;
      typeVolume?: string | null;
      mediaCategory?: string | null;
    }
  ) => Promise<{ success: boolean; localPath?: string; error?: string }>;
  saveCoverFromBuffer: (
    buffer: Uint8Array,
    fileName: string,
    serieTitre: string,
    type?: 'serie' | 'tome' | 'anime' | 'adulte-game',
    options?: {
      mediaType?: string | null;
      typeVolume?: string | null;
      mediaCategory?: string | null;
    }
  ) => Promise<{ success: boolean; localPath?: string; error?: string }>;
  deleteCoverImage: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
  getCoverFullPath: (relativePath: string) => Promise<string | null>;
  cleanEmptyFolders: () => Promise<{ success: boolean; count?: number; error?: string }>;
  openExternal?: (url: string) => Promise<void>;
  openPath?: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  saveImageToDisk?: (imageUrl: string, defaultFileName?: string) => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>;
  normalizeSerieOwnership: (serieId: number) => Promise<{ success: boolean; error?: string }>;
  addMangaByMalId: (
    malIdOrUrl: number | string,
    options?: {
      targetSerieId?: number;
      forceCreate?: boolean;
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresSelection?: boolean;
    candidates?: Array<{
      id: number;
      titre: string;
      media_type?: string | null;
      type_volume?: string | null;
      source_donnees?: string | null;
      statut?: string | null;
      mal_id?: number | null;
    }>;
    manga?: {
      id: number;
      titre: string;
      mal_id?: number | null;
    };
  }>;
  addMangaByAnilistId: (
    anilistIdOrUrl: number | string,
    options?: {
      targetSerieId?: number;
      forceCreate?: boolean;
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresSelection?: boolean;
    candidates?: Array<{
      id: number;
      titre: string;
      media_type?: string | null;
      type_volume?: string | null;
      source_donnees?: string | null;
      statut?: string | null;
      anilist_id?: number | null;
      mal_id?: number | null;
    }>;
    serie?: {
      id: number;
      titre: string;
      anilist_id?: number | null;
      mal_id?: number | null;
    };
  }>;
  addAnimeByMalId: (
    malIdOrUrl: number | string,
    options?: {
      targetSerieId?: number;
      forceCreate?: boolean;
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresSelection?: boolean;
    candidates?: Array<{
      id: number;
      titre: string;
      type?: string;
      source_donnees?: string;
      statut?: string;
      mal_id?: number;
      anilist_id?: number;
      similarity?: number;
      isExactMatch?: boolean;
      matchMethod?: string;
    }>;
    animeId?: number;
    anime?: {
      id: number;
      titre: string;
      type: string;
      nb_episodes: number;
      mal_id: number;
    };
    relatedAnimes?: Array<{
      mal_id: number;
      title: string;
      relation: string;
    }>;
  }>;
  addAnimeByAnilistId: (
    anilistIdOrUrl: number | string,
    options?: {
      targetSerieId?: number;
      forceCreate?: boolean;
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresSelection?: boolean;
    anilistId?: number;
    candidates?: Array<{
      id: number;
      titre: string;
      media_type?: string | null;
      type_volume?: string | null;
      source_donnees?: string | null;
      statut?: string | null;
      mal_id?: number | null;
    }>;
    anime?: {
      id: number;
      titre: string;
      mal_id?: number | null;
    };
  }>;
  addAnimeByAnilistId: (
    anilistIdOrUrl: number | string,
    options?: {
      targetSerieId?: number;
      forceCreate?: boolean;
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresSelection?: boolean;
    anilistId?: number;
    candidates?: Array<{
      id: number;
      titre: string;
      type?: string;
      source_donnees?: string;
      statut?: string;
      anilist_id?: number;
      mal_id?: number;
      similarity?: number;
      isExactMatch?: boolean;
      matchMethod?: string;
    }>;
    animeId?: number;
    anime?: {
      id: number;
      titre: string;
      type?: string;
      anilist_id?: number;
      mal_id?: number;
    };
  }>;

  fetchTraducteurs: () => Promise<{
    success: boolean;
    traducteurs: string[];
    error?: string;
  }>;
  getTraductionConfig: () => Promise<{
    enabled: boolean;
    traducteurs: string[];
    sheetUrl: string;
    syncFrequency: '1h' | '3h' | '6h' | '12h' | '24h' | 'manual';
    lastSync: string | null;
    gamesCount: number;
    discordWebhookUrl: string;
    discordMentions: Record<string, string>;
    discordNotifyGameUpdates: boolean;
    discordNotifyTranslationUpdates: boolean;
  }>;
  saveTraductionConfig: (config: {
    enabled: boolean;
    traducteurs: string[];
    sheetUrl: string;
    syncFrequency: '1h' | '3h' | '6h' | '12h' | '24h' | 'manual';
    lastSync?: string | null;
    gamesCount?: number;
    discordWebhookUrl: string;
    discordMentions: Record<string, string>;
    discordNotifyGameUpdates: boolean;
    discordNotifyTranslationUpdates: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  syncTraductionsNow: () => Promise<{
    success: boolean;
    created?: number;
    updated?: number;
    matched?: number;
    error?: string;
  }>;
  getBackupConfig: () => Promise<{
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'manual';
    day: number;
    hour: string;
    keepCount: number;
    lastBackup: string | null;
    backupOnStartup: boolean;
    backupOnShutdown: boolean;
  }>;
  saveBackupConfig: (config: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'manual';
    day: number;
    hour: string;
    keepCount: number;
    lastBackup: string | null;
    backupOnStartup: boolean;
    backupOnShutdown: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  createBackup: () => Promise<{ success: boolean; error?: string; fileName?: string; timestamp?: number | string }>;
  listBackups: () => Promise<{
    success: boolean;
    backups: Array<{
      name: string;
      path: string;
      size: number;
      date: string | number | Date;
      timestamp: number;
    }>;
    error?: string;
  }>;
  restoreBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  deleteBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  
  // JEUX ADULTES Labels
  getAdulteGameLabels: (gameId: number) => Promise<Array<{
    id: number;
    game_id: number;
    user_id: number;
    label: string;
    color: string;
  }>>;
  getAllAdulteGameLabels: () => Promise<Array<{
    label: string;
    color: string;
  }>>;
  addAdulteGameLabel: (gameId: number, label: string, color?: string) => Promise<{ success: boolean }>;
  removeAdulteGameLabel: (gameId: number, label: string) => Promise<{ success: boolean }>;

  // JEUX ADULTES Tags
  getAllTags: () => Promise<string[]>;

  // JEUX ADULTES Favorites
  toggleAdulteGameFavorite: (gameId: number) => Promise<{ success: boolean; isFavorite: boolean }>;
  adulteGameMarkAsOwned: (payload: {
    gameId: number;
    prix: number;
    dateAchat: string | null;
    partageAvec: number[];
    platforms: string[] | null;
  }) => Promise<{ success: boolean; error?: string }>;
  adulteGameGetOwners: (gameId: number) => Promise<{
    success: boolean;
    owners: Array<{
      id: number;
      user_id: number;
      prix: number;
      date_achat: string | null;
      platforms: string | null;
      user_name: string;
      user_color: string;
      user_emoji: string;
    }>;
    error?: string;
  }>;
  getRawgGameDetail: (gameId: number) => Promise<any>;
  getRawgGameDisplaySettings: () => Promise<Record<string, boolean>>;
  getRawgGameDisplayOverrides: (gameId: number) => Promise<Record<string, boolean>>;
  saveRawgGameDisplaySettings: (prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  saveRawgGameDisplayOverrides: (gameId: number, overrides: Record<string, boolean>) => Promise<{ success: boolean }>;
  deleteRawgGameDisplayOverrides: (gameId: number, keys: string[]) => Promise<{ success: boolean }>;
  getRawgGameUserImages: (gameId: number) => Promise<Array<{
    id: number;
    type: 'url' | 'file';
    title?: string | null;
    url?: string;
    file_path?: string;
    file_name?: string;
  }>>;
  getRawgGameUserVideos: (gameId: number) => Promise<Array<{
    id: number;
    type: 'url' | 'file';
    title?: string | null;
    url?: string;
    file_path?: string;
    file_name?: string;
  }>>;
  addRawgGameUserImageUrl: (gameId: number, imageUrl: string, title?: string) => Promise<{ success: boolean; id?: number; error?: string }>;
  addRawgGameUserImageFile: (gameId: number, title?: string) => Promise<{ success: boolean; id?: number; error?: string }>;
  deleteRawgGameUserImage: (gameId: number, imageId: number) => Promise<{ success: boolean; error?: string }>;
  addRawgGameUserVideoUrl: (gameId: number, url: string, title: string) => Promise<{ success: boolean; id?: number; error?: string }>;
  addRawgGameUserVideoFile: (gameId: number, title?: string, isReference?: boolean) => Promise<{ success: boolean; id?: number; error?: string }>;
  deleteRawgGameUserVideo: (gameId: number, videoId: number) => Promise<{ success: boolean; error?: string }>;

  // JEUX ADULTES Masquer/Démasquer
  isAdulteGameMasquee: (gameId: number) => Promise<boolean>;
  demasquerAdulteGame: (gameId: number) => Promise<{ success: boolean }>;
  masquerAdulteGame: (gameId: number) => Promise<{ success: boolean }>;

  // JEUX ADULTES Import/Création
  searchAdulteGameByF95Id: (f95Id: string) => Promise<{
    success: boolean;
    data?: {
      name: string;
      version?: string;
      status?: string;
      engine?: string;
      image?: string;
      tags?: string[];
      thread_url?: string;
      developer?: string;
      developpeur?: string;
      cover?: string;
      id?: string | number;
      link?: string;
    };
    error?: string;
  }>;
  checkF95Connection?: () => Promise<boolean>;
  connectF95?: () => Promise<{ success: boolean; error?: string }>;
  disconnectF95?: () => Promise<{ success: boolean; error?: string }>;
  createAdulteGameGame: (gameData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  importAdulteGameFromJson: (jsonData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  selectAdulteGameCoverImage: () => Promise<{ success: boolean; path?: string; error?: string }>;
  searchRawgGames: (query: string, page?: number) => Promise<{
    results: Array<{
      rawgId: number;
      name: string;
      released: string | null;
      backgroundImage: string | null;
      rating: number | null;
      metacritic: number | null;
      platforms: string[];
      genres: string[];
      inLibrary: boolean;
    }>;
    totalResults: number;
    totalPages: number;
    page: number;
  }>;
  createGameFromRawg: (rawgId: number, autoTranslate?: boolean) => Promise<{
    success: boolean;
    id?: number;
    error?: string;
  }>;
  getRawgCredentials: () => Promise<{ apiKey?: string } | null>;
  setRawgCredentials: (credentials: { apiKey: string }) => Promise<{ success: boolean; error?: string }>;
  testRawgConnection: (credentials: { apiKey: string }) => Promise<{ success: boolean; error?: string }>;

  // JEUX ADULTES Blacklist
  getAdulteGameBlacklist: () => Promise<Array<{
    id: number;
    f95_thread_id: number | null;
    titre: string;
    plateforme: string;
    traducteur: string | null;
    date_blacklist: string;
    raison: string | null;
  }>>;
  removeFromBlacklist: (id: number) => Promise<{ success: boolean }>;

  // Jeux adultes Password Protection
  // Mot de passe maître jeux adultes (partagé sur la machine, pas dans la BDD)
  setAdulteGamePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  checkAdulteGamePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  removeAdulteGamePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  hasAdulteGamePassword: () => Promise<{ hasPassword: boolean }>;

  // Dev Mode
  getDevMode?: () => Promise<boolean>;
  setDevMode?: (enabled: boolean) => Promise<{ success: boolean }>;
  getVerboseLogging?: () => Promise<boolean>;
  setVerboseLogging?: (enabled: boolean) => Promise<{ success: boolean }>;
  onBackendLog?: (callback: (logData: {
    type: 'log' | 'buffer';
    level?: 'log' | 'warn' | 'error' | 'info' | 'debug';
    args?: string[];
    timestamp?: string;
    logs?: Array<{
      level: string;
      args: string[];
      timestamp: string;
    }>;
  }) => void) => () => void;
  exportEntityData?: (type: 'manga' | 'anime' | 'adulte-game' | 'movie' | 'serie' | 'book', id: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // Anime Enrichment Config
  getAnimeEnrichmentConfig: () => Promise<EnrichmentConfig>;
  saveAnimeEnrichmentConfig: (config: EnrichmentConfig) => Promise<void>;
  startAnimeEnrichment: () => Promise<{ success: boolean; error?: string }>;
  stopAnimeEnrichment: () => Promise<{ success: boolean; error?: string }>;
  pauseAnimeEnrichment?: () => Promise<{ success: boolean; error?: string }>;
  resumeAnimeEnrichment?: () => Promise<{ success: boolean; error?: string }>;
  onAnimeEnrichmentProgress?: (callback: (event: unknown, progress: EnrichmentProgress) => void) => () => void;
  onAnimeEnrichmentComplete?: (callback: (event: unknown, stats: EnrichmentStats) => void) => () => void;
  
  // Manga Enrichment Config
  getMangaEnrichmentConfig: () => Promise<EnrichmentConfig>;
  saveMangaEnrichmentConfig: (config: EnrichmentConfig) => Promise<void>;
  startMangaEnrichment: () => Promise<{ success: boolean; error?: string }>;
  stopMangaEnrichment: () => Promise<{ success: boolean; error?: string }>;
  pauseMangaEnrichment?: () => Promise<{ success: boolean; error?: string }>;
  resumeMangaEnrichment?: () => Promise<{ success: boolean; error?: string }>;
  onMangaEnrichmentProgress?: (callback: (event: unknown, progress: EnrichmentProgress) => void) => () => void;
  onMangaEnrichmentComplete?: (callback: (event: unknown, stats: EnrichmentStats) => void) => () => void;
  onMangaImportStart?: (callback: (data: { message?: string }) => void) => () => void;
  onMangaImportComplete?: (callback: () => void) => () => void;
  onMihonImportProgress?: (callback: (event: unknown, progress: {
    step?: string;
    message?: string;
    progress?: number;
    total?: number;
    current?: number;
    imported?: number;
    updated?: number;
    errors?: number;
    item?: string;
    elapsedMs?: number;
    etaMs?: number;
    speed?: number;
  }) => void) => () => void;
  selectMihonBackupFile?: () => Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  importMihonBackup?: (filePath: string) => Promise<{ success: boolean; stats?: { created: number; updated: number; withMalId: number }; error?: string }>;
  
  // Manga Display Preferences
  getMangaDisplaySettings?: () => Promise<Record<string, boolean>>;
  saveMangaDisplaySettings?: (prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  getMangaDisplayOverrides?: (mangaId: number) => Promise<Record<string, boolean>>;
  saveMangaDisplayOverrides?: (mangaId: number, prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  deleteMangaDisplayOverrides?: (mangaId: number, champKeys: string[]) => Promise<{ success: boolean }>;
  
  // Manga Events
  onMangaImported?: (callback: (_event: unknown, data: { serieId: number }) => void) => (() => void) | undefined;
  offMangaImported?: (callback: (_event: unknown, data: { serieId: number }) => void) => void;
  
  // Manga Enrichment
  enrichMangaNow?: (mangaId: number, force?: boolean) => Promise<{ success: boolean; error?: string; skipped?: boolean; message?: string }>;
  enrichAnimeNow?: (animeId: number, force?: boolean) => Promise<{ success: boolean; error?: string; skipped?: boolean; message?: string }>;

  // Anime Display Preferences
  getAnimeDisplaySettings?: () => Promise<Record<string, boolean>>;
  saveAnimeDisplaySettings?: (prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  getAnimeDisplayOverrides?: (animeId: number) => Promise<Record<string, boolean>>;
  saveAnimeDisplayOverrides?: (animeId: number, prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  deleteAnimeDisplayOverrides?: (animeId: number, champKeys: string[]) => Promise<{ success: boolean }>;
  
  // Anime Streaming Links
  getStreamingLinks: (animeId: number, malId?: number) => Promise<{
    success: boolean;
    links: Array<{
      source: 'anilist' | 'manual';
      platform: string;
      url: string;
      language: string;
      id?: number;
      color?: string;
      icon?: string;
      createdAt?: string;
    }>;
  }>;
  addStreamingLink: (animeId: number, linkData: {
    platform: string;
    url: string;
    language: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteStreamingLink: (linkId: number) => Promise<{ success: boolean; error?: string }>;
  addExternalLink: (animeId: number, linkData: {
    name: string;
    url: string;
  }) => Promise<{ success: boolean; error?: string }>;
  
  // Adult Game Display Preferences
  getAdulteGameDisplaySettings?: () => Promise<Record<string, boolean>>;
  saveAdulteGameDisplaySettings?: (prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  getAdulteGameDisplayOverrides?: (gameId: number) => Promise<Record<string, boolean>>;
  saveAdulteGameDisplayOverrides?: (gameId: number, prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  deleteAdulteGameDisplayOverrides?: (gameId: number, champKeys: string[]) => Promise<{ success: boolean }>;

  // TMDb / TV Maze / Médias
  getTmdbCredentials: () => Promise<{ apiKey: string; apiToken: string }>;
  setTmdbCredentials: (credentials: { apiKey?: string; apiToken?: string }) => Promise<{ success: boolean }>;
  searchTmdbMovies: (query: string, page?: number) => Promise<TmdbSearchResponse<TmdbMovieSearchResult>>;
  searchTmdbSeries: (query: string, page?: number) => Promise<TmdbSearchResponse<TmdbSeriesSearchResult>>;
  getMediaSyncSettings?: () => Promise<{ language: string; region: string; autoTranslate: boolean }>;
  saveMediaSyncSettings: (settings: { language?: string; region?: string; autoTranslate?: boolean }) => Promise<{ success: boolean }>;
  testTmdbConnection: (credentials?: { apiKey?: string; apiToken?: string }) => Promise<{ success: boolean; images?: Record<string, unknown>; error?: string }>;
  syncMovieFromTmdb: (tmdbId: number, options?: { autoTranslate?: boolean }) => Promise<{ id: number | null; tmdbId: number; usedTranslation: boolean }>;
  getMovies: (filters?: MovieQueryFilters) => Promise<MovieListItem[]>;
  getMovieDetail: (identifiers: { movieId?: number; tmdbId?: number }) => Promise<MovieDetail | null>;
  setMovieStatus: (payload: { movieId: number; statut?: string; score?: number; dateVisionnage?: string | null }) => Promise<{ success: boolean; statut: string }>;
  getMovieDisplaySettings?: () => Promise<Record<string, boolean>>;
  saveMovieDisplaySettings?: (_prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  toggleMovieFavorite: (_movieId: number) => Promise<{ success: boolean; isFavorite: boolean }>;
  toggleMovieHidden: (_movieId: number) => Promise<{ success: boolean; isHidden: boolean }>;
  createMovie: (_movieData: Record<string, unknown>) => Promise<{ success: boolean; movieId?: number; error?: string }>;
  updateMovie: (_movieId: number, _movieData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteMovie: (_movieId: number) => Promise<{ success: boolean; error?: string }>;
  // Books
  booksGet?: (filters?: Record<string, unknown>) => Promise<import('./types').BookListItem[]>;
  booksGetDetail?: (bookId: number) => Promise<import('./types').Book | null>;
  getAvailableContentTypes?: () => Promise<{
    manga: number;
    manhwa: number;
    manhua: number;
    lightNovel: number;
    webtoon: number;
    comics: number;
    bd: number;
    books: number;
  }>;
  comicsSearch?: (payload: { query: string; page?: number }) => Promise<{
    results: Array<{
      source: string;
      title: string;
      description?: string;
      coverUrl?: string;
      year?: number;
      publisher?: string;
      issueCount?: number;
      sourceUrl?: string;
      inLibrary: boolean;
    }>;
    totalResults: number;
    totalPages: number;
    page: number;
  }>;
  comicsImportFromGoogleBooks?: (googleBooksId: string) => Promise<{
    success: boolean;
    serieId?: number;
    error?: string;
    alreadyExists?: boolean;
  }>;
  bdSearch?: (payload: { query: string; page?: number }) => Promise<{
    results: Array<{
      source: string;
      bnfId: string;
      title: string;
      authors?: string[];
      description?: string;
      coverUrl?: string;
      publisher?: string;
      publishedDate?: string;
      isbn?: string;
      sourceUrl?: string;
      inLibrary: boolean;
    }>;
    totalResults: number;
    totalPages: number;
    page: number;
  }>;
  bdImportFromBnf?: (bnfId: string) => Promise<{
    success: boolean;
    serieId?: number;
    error?: string;
    alreadyExists?: boolean;
  }>;
  booksCreate?: (bookData: Record<string, unknown>) => Promise<{ success: boolean; bookId?: number; error?: string }>;
  booksUpdate?: (payload: { bookId: number; bookData: Record<string, unknown> }) => Promise<{ success: boolean; error?: string }>;
  booksDelete?: (bookId: number) => Promise<{ success: boolean; error?: string }>;
  booksSetStatus?: (payload: { bookId: number; statut?: string; score?: number; dateDebut?: string | null; dateFin?: string | null }) => Promise<{ success: boolean; statut: string }>;
  booksToggleFavorite?: (payload: { bookId: number }) => Promise<void>;
  booksToggleHidden?: (payload: { bookId: number }) => Promise<void>;
  booksSearch?: (payload: { query: string; source?: 'google_books' | 'open_library' | 'all'; page?: number }) => Promise<{ results: Array<import('./hooks/common/useBookSearch').BookSearchResult>; totalResults: number; totalPages: number; page: number }>;
  booksImportFromGoogle?: (googleBooksId: string) => Promise<{ success: boolean; bookId?: number; error?: string; alreadyExists?: boolean }>;
  booksImportFromOpenLibrary?: (openLibraryId: string) => Promise<{ success: boolean; bookId?: number; error?: string; alreadyExists?: boolean }>;
  booksImportFromBnf?: (bnfId: string) => Promise<{ success: boolean; bookId?: number; error?: string; alreadyExists?: boolean }>;
  booksAddProprietaire?: (payload: { bookId: number; userId: number; prix: number; dateAchat?: string | null }) => Promise<{ success: boolean; error?: string }>;
  booksRemoveProprietaire?: (payload: { bookId: number; userId: number }) => Promise<{ success: boolean; error?: string }>;
  booksMarkAsRead?: (bookId: number) => Promise<{ success: boolean; error?: string }>;
  booksMarkAsOwned?: (payload: { bookId: number; prix?: number; dateAchat?: string | null; partageAvec?: number[] }) => Promise<{ success: boolean; error?: string }>;
  getBookLabels?: (bookId: number) => Promise<Array<{ label: string; color: string }>>;
  getAllBookLabels?: () => Promise<Array<{ label: string; color: string }>>;
  addBookLabel?: (bookId: number, label: string, color?: string) => Promise<{ success: boolean }>;
  removeBookLabel?: (bookId: number, label: string) => Promise<{ success: boolean }>;
  updateBookLabels?: (bookId: number, labels: Array<{ label: string; color: string }>) => Promise<{ success: boolean }>;
  getBooksDisplaySettings?: () => Promise<Record<string, boolean>>;
  saveBooksDisplaySettings?: (prefs: Record<string, boolean>) => Promise<void>;
  getBooksDisplayOverrides?: (bookId: number) => Promise<Record<string, boolean>>;
  saveBooksDisplayOverrides?: (bookId: number, overrides: Record<string, boolean>) => Promise<void>;
  deleteBooksDisplayOverrides?: (bookId: number, keys: string[]) => Promise<{ success: boolean; error?: string }>;
  // Galerie d'images utilisateur
  addMovieUserImageUrl: (movieId: number, imageUrl: string) => Promise<{ success: boolean; canceled?: boolean; imageId?: number; filePath?: string; fileName?: string; error?: string }>;
  addMovieUserImageFile: (movieId: number, title?: string) => Promise<{ success: boolean; canceled?: boolean; imageId?: number; filePath?: string; fileName?: string; error?: string }>;
  getMovieUserImages: (movieId: number) => Promise<{ success: boolean; images: Array<{ id: number; file_path: string; file_name: string; file_size?: number; mime_type?: string; created_at?: string; url: string }>; error?: string }>;
  deleteMovieUserImage: (movieId: number, imageId: number) => Promise<{ success: boolean; error?: string }>;
  addMovieUserVideoUrl: (movieId: number, url: string, title?: string) => Promise<{ success: boolean; canceled?: boolean; videoId?: number; type?: 'url'; url?: string; title?: string | null; site?: string | null; video_key?: string | null; error?: string }>;
  // Galerie d'images utilisateur pour séries TV
  addTvShowUserImageUrl: (showId: number, imageUrl: string) => Promise<{ success: boolean; canceled?: boolean; imageId?: number; filePath?: string; fileName?: string; error?: string }>;
  addTvShowUserImageFile: (showId: number, title?: string) => Promise<{ success: boolean; canceled?: boolean; imageId?: number; filePath?: string; fileName?: string; error?: string }>;
  getTvShowUserImages: (showId: number) => Promise<{ success: boolean; images: Array<{ id: number; title?: string; file_path: string; file_name: string; file_size?: number; mime_type?: string; created_at?: string; url: string }>; error?: string }>;
  deleteTvShowUserImage: (showId: number, imageId: number) => Promise<{ success: boolean; error?: string }>;
  
  // Vidéos utilisateur pour séries TV
  addTvShowUserVideoUrl: (showId: number, url: string, title?: string) => Promise<{ success: boolean; canceled?: boolean; videoId?: number; type?: 'url'; url?: string; title?: string | null; site?: string | null; video_key?: string | null; error?: string }>;
  addTvShowUserVideoFile: (showId: number, title?: string, isReference?: boolean) => Promise<{ success: boolean; canceled?: boolean; videoId?: number; type?: 'file'; filePath?: string; fileName?: string; title?: string; url?: string; isReference?: boolean; error?: string }>;
  getTvShowUserVideos: (showId: number) => Promise<{ success: boolean; videos: Array<{ id: number; type: 'url' | 'file'; title?: string | null; url?: string; file_path?: string; file_name?: string; file_size?: number; mime_type?: string; site?: string | null; video_key?: string | null; created_at?: string; is_reference?: boolean }>; error?: string }>;
  deleteTvShowUserVideo: (showId: number, videoId: number) => Promise<{ success: boolean; error?: string }>;
  
  // Vidéos utilisateur pour épisodes de séries TV
  addTvEpisodeUserVideoUrl: (episodeId: number, url: string, title?: string) => Promise<{ success: boolean; canceled?: boolean; videoId?: number; type?: 'url'; url?: string; title?: string | null; site?: string | null; video_key?: string | null; error?: string }>;
  addTvEpisodeUserVideoFile: (episodeId: number, title?: string, isReference?: boolean) => Promise<{ success: boolean; canceled?: boolean; videoId?: number; type?: 'file'; filePath?: string; fileName?: string; title?: string; url?: string; isReference?: boolean; error?: string }>;
  getTvEpisodeUserVideos: (episodeId: number) => Promise<{ success: boolean; videos: Array<{ id: number; type: 'url' | 'file'; title?: string | null; url?: string; file_path?: string; file_name?: string; file_size?: number; mime_type?: string; site?: string | null; video_key?: string | null; created_at?: string; is_reference?: boolean }>; error?: string }>;
  deleteTvEpisodeUserVideo: (episodeId: number, videoId: number) => Promise<{ success: boolean; error?: string }>;
  addMovieUserVideoFile: (movieId: number, title?: string, isReference?: boolean) => Promise<{ success: boolean; canceled?: boolean; videoId?: number; type?: 'file'; filePath?: string; fileName?: string; title?: string; url?: string; isReference?: boolean; error?: string }>;
  getMovieUserVideos: (movieId: number) => Promise<{ success: boolean; videos: Array<{ id: number; type: 'url' | 'file'; title?: string | null; url?: string; file_path?: string; file_name?: string; file_size?: number; mime_type?: string; site?: string | null; video_key?: string | null; created_at?: string }>; error?: string }>;
  deleteMovieUserVideo: (movieId: number, videoId: number) => Promise<{ success: boolean; error?: string }>;
  getVideoTracks: (filePath: string) => Promise<{ success: boolean; tracks?: { audio: Array<{ index: number; audioIndex?: number; language: string; title: string; codec: string }>; subtitles: Array<{ index: number; language: string; title: string; codec: string }> }; error?: string }>;
  syncTvShowFromTmdb: (_tmdbId: number, _options?: { autoTranslate?: boolean; includeEpisodes?: boolean }) => Promise<{ id: number | null; tmdbId: number; seasons: number; episodes: number }>;
  getTvShows: (_filters?: TvQueryFilters) => Promise<TvShowListItem[]>;
  getTvShowDetail: (_identifiers: { showId?: number; tmdbId?: number }) => Promise<TvShowDetail | null>;
  getTvEpisodes: (_filters: { showId: number; seasonNumber?: number | null }) => Promise<TvEpisode[]>;
  setTvShowStatus: (_payload: { showId: number; statut?: string; score?: number; saisonsVues?: number; episodesVus?: number; dateDebut?: string | null; dateFin?: string | null }) => Promise<{ success: boolean; statut: string }>;
  toggleTvFavorite: (_showId: number) => Promise<{ success: boolean; isFavorite: boolean }>;
  toggleTvHidden: (_showId: number) => Promise<{ success: boolean; isHidden: boolean }>;
  createTvShow: (_tvShowData: Record<string, unknown>) => Promise<{ success: boolean; showId?: number; error?: string }>;
  updateTvShow: (_showId: number, _tvShowData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  createTvSeason?: (_payload: {
    showId: number;
    seasonNumber: number;
    episodeCount?: number;
    title?: string | null;
    synopsis?: string | null;
    defaultEpisodeDuration?: number | null;
    duplicateFromSeasonId?: number | null;
  }) => Promise<{ success: boolean; seasonId?: number; seasons?: any[]; episodes?: any[]; error?: string }>;
  updateTvSeason?: (_payload: {
    showId: number;
    seasonId: number;
    title?: string | null;
    synopsis?: string | null;
    datePremiere?: string | null;
    posterPath?: string | null;
  }) => Promise<{ success: boolean; seasons?: any[]; episodes?: any[]; error?: string }>;
  deleteTvSeason?: (_showId: number, _seasonId: number) => Promise<{ success: boolean; seasons?: any[]; episodes?: any[]; error?: string }>;
  updateTvEpisode?: (_payload: {
    showId: number;
    episodeId: number;
    title?: string | null;
    synopsis?: string | null;
    dateDiffusion?: string | null;
    duree?: number | null;
  }) => Promise<{ success: boolean; seasons?: any[]; episodes?: any[]; error?: string }>;
  deleteTvEpisode?: (_showId: number, _episodeId: number) => Promise<{ success: boolean; seasons?: any[]; episodes?: any[]; error?: string }>;
  reorderTvEpisodes?: (_payload: { showId: number; seasonNumber: number; order: Array<{ episodeId: number; episodeNumber: number }> }) => Promise<{ success: boolean; seasons?: any[]; episodes?: any[]; error?: string }>;
  updateTvSeasonPoster?: (_payload: { showId: number; seasonId: number; posterPath: string }) => Promise<{ success: boolean; seasons?: any[]; episodes?: any[]; error?: string }>;
  deleteTvShow: (_showId: number) => Promise<{ success: boolean; error?: string }>;
  markTvEpisode: (_payload: { episodeId: number; userId: number; vu: boolean; dateVisionnage?: string | null }) => Promise<{ success: boolean; dateVisionnage?: string | null; episodesVus?: number; saisonsVues?: number }>;
  markAllTvEpisodes: (_payload: { showId: number; vu?: boolean }) => Promise<{ success: boolean; episodesVus?: number; saisonsVues?: number; dateVisionnage?: string | null; totalEpisodes?: number }>;
  getSeriesDisplaySettings?: () => Promise<Record<string, boolean>>;
  saveSeriesDisplaySettings?: (_prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  getSeriesDisplayOverrides?: (showId: number) => Promise<Record<string, boolean>>;
  saveSeriesDisplayOverrides?: (showId: number, prefs: Record<string, boolean>) => Promise<{ success: boolean }>;
  deleteSeriesDisplayOverrides?: (showId: number, keys: string[]) => Promise<{ success: boolean }>;
  getSeries: (filters?: import('./types').SerieFilters) => Promise<import('./types').Serie[]>;
  getSerie: (id: number) => Promise<import('./types').Serie | null>;
  createSerie: (serieData: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  searchManga: (titre: string) => Promise<import('./types').MangaSearchResult[]>;
  toggleSerieFavorite: (serieId: number, userId: number) => Promise<{ success: boolean; isFavorite: boolean }>;
  setSerieTag: (serieId: number, userId: number, tag: import('./types').SerieTag | null) => Promise<{ success: boolean }>;
  removeSerieTag: (serieId: number, userId: number) => Promise<{ success: boolean }>;
  updateSerie: (serieId: number, updates: Partial<import('./types').Serie>) => Promise<{ success: boolean }>;
  deleteSerie: (id: number) => Promise<{ success: boolean }>;
  translateSerieDescription: (serieId: number) => Promise<{ success: boolean; translatedDescription?: string; error?: string }>;
  translateSerieBackground?: (serieId: number) => Promise<{ success: boolean; translatedBackground?: string; error?: string }>;
  createTome: (tomeData: Record<string, unknown>) => Promise<number>;
  updateTome: (id: number, updates: Partial<import('./types').Tome>) => Promise<{ success: boolean }>;
  deleteTome: (id: number) => Promise<{ success: boolean }>;
  isSerieMasquee: (serieId: number) => Promise<boolean>;
  getDevMergePreview: (payload: { type: 'manga' | 'anime' | 'movie' | 'tv' | 'game' | 'book'; sourceId: number; targetId: number }) => Promise<{
    success: boolean;
    error?: string;
    type?: string;
    entityLabel?: string;
    source?: { id: number; title: string; cover?: string | null };
    target?: { id: number; title: string; cover?: string | null };
    fields?: Array<{
      key: string;
      label: string;
      type: string;
      sourceValue: any;
      sourceDisplayValue: string;
      targetValue: any;
      targetDisplayValue: string;
      targetHasValue: boolean;
      identical: boolean;
    }>;
  }>;
  performDevMerge: (payload: { type: 'manga' | 'anime' | 'movie' | 'tv' | 'game' | 'book'; sourceId: number; targetId: number; selectedFields: string[] }) => Promise<{
    success: boolean;
    error?: string;
    targetId?: number;
    targetTitle?: string;
    sourceTitle?: string;
    updatedFields?: string[];
    transfers?: Record<string, number>;
    reportPath?: string | null;
  }>;
  demasquerSerie: (serieId: number) => Promise<{ success: boolean }>;
  masquerSerie: (serieId: number) => Promise<{ success: boolean }>;
  marquerSerieLue: (serieId: number) => Promise<{ success: boolean }>;
  toggleTomeLu: (tomeId: number, lu: boolean) => Promise<{ success: boolean }>;
  // Labels de séries manga
  getMangaLabels: (serieId: number) => Promise<Array<{ label: string; color: string }>>;
  getAllMangaLabels: () => Promise<Array<{ label: string; color: string }>>;
  addMangaLabel: (serieId: number, label: string, color?: string) => Promise<{ success: boolean }>;
  removeMangaLabel: (serieId: number, label: string) => Promise<{ success: boolean }>;
  // Genres et thèmes de séries manga
  getAllMangaGenres: () => Promise<string[]>;
  getAllMangaThemes: () => Promise<string[]>;
  toggleTomePossede: (tomeId: number, possede: boolean) => Promise<{ success: boolean }>;
  toggleTomeMihon: (tomeId: number, mihon: boolean) => Promise<{ success: boolean }>;
  possederTousLesTomes: (serieId: number) => Promise<{ success: boolean; tomesUpdated?: number }>;
  serieMarkAsOwned: (payload: { serieId: number; prixTotal: number; dateAchat?: string | null; partageAvec?: number[] }) => Promise<{ success: boolean; error?: string; tomesUpdated?: number }>;

  // MyAnimeList (MAL)
  getMalCredentials?: () => Promise<{ clientId: string; redirectUri: string }>;
  setMalCredentials?: (credentials: { clientId?: string; redirectUri?: string }) => Promise<{ success: boolean }>;
  malGetStatus: () => Promise<{
    connected: boolean;
    user: { name?: string; picture?: string } | null;
    lastSync: { timestamp?: string; animes?: number; mangas?: number } | null;
    lastStatusSync?: { timestamp?: string } | null;
  }>;
  malSyncNow: () => Promise<{
    success?: boolean;
    error?: string;
    requiresReconnect?: boolean;
    mangas?: { total?: number; created?: number; updated?: number };
    animes?: { total?: number; created?: number; updated?: number };
  }>;
  malSyncStatus?: () => Promise<{
    success?: boolean;
    error?: string;
    requiresReconnect?: boolean;
    durationMs?: number;
    mangas?: { updated: number; missing: number };
    animes?: { updated: number; missing: number };
  }>;
  malTranslateSynopsis: () => Promise<{ translated?: number; total?: number; skipped?: number }>;
  malGetAutoSyncSettings: () => Promise<{ enabled: boolean; intervalHours: number }>;
  malSetAutoSync: (enabled: boolean, intervalHours: number) => Promise<{ success: boolean; error?: string }>;
  malConnect: () => Promise<{ success: boolean; user?: { name?: string } | null; error?: string }>;
  malDisconnect: () => Promise<{ success: boolean; error?: string }>;
  onMalSyncProgress?: (callback: (event: unknown, progress: MalSyncProgress) => void) => () => void;
  onMalSyncCompleted?: (callback: (event: unknown, result: MalSyncResult) => void) => () => void;
  onMalSyncError?: (callback: (event: unknown, payload: { error: string; timestamp?: string }) => void) => () => void;
  onMalTranslationStarted?: (callback: () => void) => () => void;
  onMalTranslationProgress?: (callback: (event: unknown, progress: TranslationProgress) => void) => () => void;
  onMalTranslationCompleted?: (callback: (event: unknown, result: { translated: number; total: number; skipped?: number }) => void) => () => void;
  onMalTranslationError?: (callback: (event: unknown, payload: { error?: string }) => void) => () => void;

  // AniList
  anilistGetCredentials?: () => Promise<{ clientId: string; clientSecret: string; redirectUri: string }>;
  anilistSetCredentials?: (credentials: { clientId?: string; clientSecret?: string; redirectUri?: string }) => Promise<{ success: boolean }>;
  anilistGetStatus: () => Promise<{
    connected: boolean;
    user: { name?: string; picture?: string } | null;
    lastSync: { timestamp?: string; animes?: number; mangas?: number } | null;
    lastStatusSync?: { timestamp?: string } | null;
  }>;
  anilistSyncNow: () => Promise<{
    success?: boolean;
    error?: string;
    requiresReconnect?: boolean;
    mangas?: { total?: number; created?: number; updated?: number };
    animes?: { total?: number; created?: number; updated?: number };
  }>;
  anilistSyncStatus?: () => Promise<{
    success?: boolean;
    error?: string;
    requiresReconnect?: boolean;
    durationMs?: number;
    mangas?: { updated: number; missing: number };
    animes?: { updated: number; missing: number };
  }>;
  anilistGetAutoSyncSettings: () => Promise<{ enabled: boolean; intervalHours: number }>;
  anilistSetAutoSync: (enabled: boolean, intervalHours: number) => Promise<{ success: boolean; error?: string }>;
  anilistConnect: () => Promise<{ success: boolean; user?: { name?: string } | null; error?: string }>;
  anilistDisconnect: () => Promise<{ success: boolean; error?: string }>;
  onAnilistSyncProgress?: (callback: (event: unknown, progress: MalSyncProgress) => void) => () => void;
  onAnilistSyncCompleted?: (callback: (event: unknown, result: MalSyncResult) => void) => () => void;
  onAnilistSyncError?: (callback: (event: unknown, payload: { error: string; timestamp?: string }) => void) => () => void;
  
  // Manga Relations
  getMangaByMalId: (_malId: number) => Promise<{ id: number; titre: string; mal_id: number } | null>;
  getAnimeByMalId: (_malId: number) => Promise<{ id: number; titre: string; mal_id: number } | null>;
  
  // Debug: Extraire toutes les données d'une série
  debugGetSerieData?: (_serieId: number) => Promise<Record<string, unknown>>;
  
  // Anime Import Events
  onAnimeImportComplete?: (_callback: () => void) => (() => void) | undefined;
  
  // Sources Mihon/Tachiyomi
  getAvailableSources?: () => Promise<{
    success: boolean;
    sources?: Array<{ id: string; name: string }>;
    error?: string;
  }>;
  
  // ========== ABONNEMENTS ==========
  subscriptionsGet: (filters?: Record<string, unknown>) => Promise<Array<{
    id: number;
    name: string;
    type: string;
    price: number;
    devise: string;
    frequency: string;
    start_date: string;
    next_payment_date: string | null;
    status: 'active' | 'expired' | 'cancelled';
    notes: string | null;
    proprietaires: Array<{ id: number; name: string; color: string; emoji: string }>;
  }>>;
  subscriptionsCreate: (subscriptionData: {
    name: string;
    type: string;
    price: number;
    devise?: string;
    frequency: string;
    start_date: string;
    notes?: string | null;
    proprietaires?: number[];
  }) => Promise<{ success: boolean; id?: number; error?: string }>;
  subscriptionsUpdate: (id: number, subscriptionData: {
    name?: string;
    type?: string;
    price?: number;
    devise?: string;
    frequency?: string;
    start_date?: string;
    status?: 'active' | 'expired' | 'cancelled';
    notes?: string | null;
    proprietaires?: number[];
  }) => Promise<{ success: boolean; error?: string }>;
  subscriptionsDelete: (id: number) => Promise<{ success: boolean; error?: string }>;
  subscriptionsUpdateNextPayments?: () => Promise<{ success: boolean }>;
  
  // ========== SITES D'ACHAT ==========
  purchaseSitesGet: () => Promise<{
    success: boolean;
    sites?: Array<{ id: number; name: string }>;
    error?: string;
  }>;
  purchaseSitesCreate: (name: string) => Promise<{ success: boolean; id?: number; error?: string }>;
  
  // ========== ACHATS PONCTUELS ==========
  oneTimePurchasesGet: (filters?: Record<string, unknown>) => Promise<Array<{
    id: number;
    site_id: number | null;
    site_name: string | null;
    amount: number;
    devise: string;
    purchase_date: string;
    credits_count: number | null;
    notes: string | null;
    proprietaires: Array<{ id: number; name: string; color: string; emoji: string }>;
  }>>;
  oneTimePurchasesCreate: (purchaseData: {
    site_id?: number | null;
    site_name?: string | null;
    purchase_date: string;
    amount: number;
    devise?: string;
    credits_count?: number | null;
    notes?: string | null;
    proprietaires?: number[];
  }) => Promise<{ success: boolean; id?: number; error?: string }>;
  oneTimePurchasesUpdate: (id: number, purchaseData: {
    site_id?: number | null;
    site_name?: string | null;
    name?: string;
    purchase_date?: string;
    amount?: number;
    devise?: string;
    credits_count?: number | null;
    notes?: string | null;
    proprietaires?: number[];
  }) => Promise<{ success: boolean; error?: string }>;
  oneTimePurchasesDelete: (id: number) => Promise<{ success: boolean; error?: string }>;
  
  [key: string]: unknown;
}

interface Window {
  electronAPI: ElectronAPI;
}
