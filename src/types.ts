export type SerieTag = 'a_lire' | 'en_cours' | 'lu' | 'abandonne';
export type AnimeTag = 'a_regarder' | 'en_cours' | 'termine' | 'abandonne';

export interface Serie {
  id: number;
  titre: string;
  statut: 'En cours' | 'Terminée' | 'Abandonnée';
  type_volume: 'Broché' | 'Broché Collector' | 'Coffret' | 'Kindle' | 'Webtoon' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon';
  couverture_url: string | null;
  description?: string | null;
  statut_publication?: string | null;
  annee_publication?: number | null;
  genres?: string | null;
  nb_chapitres?: number | null;
  langue_originale?: string | null;
  demographie?: string | null;
  editeur?: string | null;
  rating?: string | null;
  created_at?: string;
  updated_at?: string;
  tomes?: Tome[];
  tag?: SerieTag | null;
  is_favorite?: boolean;
}

export interface Tome {
  id: number;
  serie_id: number;
  numero: number;
  prix: number;
  proprietaire?: string | null; // Deprecated: pour compatibilité
  proprietaires?: Array<{ id: number; name: string; color: string }>;
  proprietaireIds?: number[];
  date_sortie?: string | null;
  date_achat?: string | null;
  couverture_url?: string | null;
  created_at?: string;
  lu?: number; // 0 = non lu, 1 = lu
  date_lecture?: string | null;
}

export interface Statistics {
  totaux: {
    [userId: number]: number; // Coût par utilisateur (user_id)
  };
  parType: {
    [key: string]: {
      count: number;
      total: number;
    };
  };
  parStatut: {
    [key: string]: number;
  };
  nbSeries: number;
  nbTomes: number;
  nbTomesParProprietaire: {
    [userId: number]: number; // Nombre de tomes par utilisateur (user_id)
  };
  nbTomesParProprietaireParType: {
    [userId: number]: { // Par utilisateur
      [typeVolume: string]: number; // Nombre de tomes par type (Broché, Kindle, Scan Manga, etc.)
    };
  };
  users: Array<{ // Liste des utilisateurs avec leurs infos
    id: number;
    name: string;
    color: string;
    emoji: string;
  }>;
}

export interface LectureStatistics {
  tomesLus: number;
  tomesTotal: number;
  seriesCompletes: number;
  seriesTotal: number;
  progression: number;
  derniersTomesLus: Array<{
    id: number;
    serieId: number;
    serieTitre: string;
    numero: number;
    couvertureUrl: string;
    dateLecture: string;
  }>;
}

export interface EvolutionStatistics {
  parMois: {
    [mois: string]: {
      count: number;
      total: number;
    };
  };
  parAnnee: {
    [annee: string]: {
      count: number;
      total: number;
    };
  };
  totalTomes: number;
}

export interface SerieFilters {
  statut?: string;
  type_volume?: string;
  proprietaire?: string;
  search?: string;
  afficherMasquees?: boolean;
  tag?: SerieTag | 'aucun';
}

export interface MangaDexResult {
  source?: string; // Source principale
  sources?: string[]; // Toutes les sources (pour les résultats mergés)
  id: string;
  titre: string;
  description: string;
  couverture: string | null;
  statut_publication?: string | null;
  annee_publication?: number | null;
  genres?: string | null;
  nb_chapitres?: number | null;
  langue_originale?: string | null;
  demographie?: string | null;
  rating?: string | null;
}

export interface AnimeSearchResult {
  source: string; // 'anilist', 'kitsu'
  id: string;
  titre: string;
  titre_romaji?: string;
  titre_natif?: string;
  description: string;
  couverture: string | null;
  statut: string;
  annee_debut?: number | null;
  annee_fin?: number | null;
  genres?: string | null;
  episodes?: number | null;
  duree_episode?: number | null;
  format?: string | null;
  saison?: string | null;
  annee_saison?: number | null;
  studios?: string | null;
  rating?: string | null;
}

export interface AnimeSerie {
  id: number;
  mal_id: number;
  titre: string;
  titre_romaji?: string;
  titre_natif?: string;
  titre_anglais?: string;
  type: string;
  nb_episodes: number;
  couverture_url?: string;
  description?: string;
  statut_diffusion?: string;
  statut_visionnage?: 'En cours' | 'Terminé' | 'Abandonné' | 'En attente';
  annee?: number;
  saison_diffusion?: string;
  genres?: string;
  studios?: string;
  rating?: string;
  score?: number;
  franchise_name?: string;
  franchise_order?: number;
  prequel_mal_id?: number;
  sequel_mal_id?: number;
  source_import?: string;
  utilisateur_ajout: string;
  episodes_vus?: number;
  created_at?: string;
  updated_at?: string;
  // Tags utilisateur
  tag?: AnimeTag | null;
  is_favorite?: boolean;
}

export interface AnimeFilters {
  mesAnimes?: boolean;
  statut?: string;
  type?: string;
}

export interface AnimeImportResult {
  total: number;
  imported: number;
  updated: number;
  errors: Array<{ titre?: string; malId?: number; error: string }>;
}

export interface AnimeImportProgress {
  phase: 'batch' | 'anime' | 'pause' | 'complete';
  currentBatch?: number;
  totalBatches?: number;
  currentAnime?: string;
  currentIndex?: number;
  total: number;
  imported: number;
  updated: number;
  errors: number;
  isPausing?: boolean;
  remainingPauseSeconds?: number;
}

export interface User {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
  created_at?: string;
  updated_at?: string;
}

declare global {
  interface Window {
    electronAPI: {
      getSeries: (filters?: SerieFilters) => Promise<Serie[]>;
      getSerie: (id: number) => Promise<Serie | null>;
      createSerie: (serie: Partial<Serie>) => Promise<number>;
      updateSerie: (id: number, serie: Partial<Serie>) => Promise<boolean>;
      deleteSerie: (id: number) => Promise<boolean>;
      masquerSerie: (serieId: number) => Promise<{ success: boolean }>;
      demasquerSerie: (serieId: number) => Promise<{ success: boolean }>;
      isSerieMasquee: (serieId: number) => Promise<boolean>;
      setSerieTag: (serieId: number, userId: number, tag: SerieTag) => Promise<{ success: boolean; tag: string }>;
      toggleSerieFavorite: (serieId: number, userId: number) => Promise<{ success: boolean; is_favorite: boolean }>;
      getSerieTag: (serieId: number, userId: number) => Promise<{ tag: SerieTag | null; is_favorite: boolean } | null>;
      removeSerieTag: (serieId: number, userId: number) => Promise<{ success: boolean }>;
      setAnimeTag: (animeId: number, userId: number, tag: AnimeTag) => Promise<{ success: boolean; tag: string }>;
      toggleAnimeFavorite: (animeId: number, userId: number) => Promise<{ success: boolean; is_favorite: boolean }>;
      getAnimeTag: (animeId: number, userId: number) => Promise<{ tag: AnimeTag | null; is_favorite: boolean } | null>;
      removeAnimeTag: (animeId: number, userId: number) => Promise<{ success: boolean }>;
      createTome: (tome: Partial<Tome>) => Promise<number>;
      updateTome: (id: number, tome: Partial<Tome>) => Promise<boolean>;
      deleteTome: (id: number) => Promise<boolean>;
      getStatistics: () => Promise<Statistics>;
      getEvolutionStatistics: () => Promise<EvolutionStatistics>;
      exportDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>;
      importDatabase: () => Promise<{ success: boolean; error?: string }>;
      searchMangadex: (titre: string) => Promise<MangaDexResult[]>;
      searchManga: (titre: string) => Promise<MangaDexResult[]>;
      searchAnime: (titre: string) => Promise<AnimeSearchResult[]>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      getBaseDirectory: () => Promise<string>;
      changeBaseDirectory: () => Promise<{ success: boolean; path?: string; message?: string; error?: string }>;
      copyToNewLocation: (newBasePath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      getCurrentUser: () => Promise<string>;
      getTheme: () => Promise<string>;
      setTheme: (theme: string) => Promise<{ success: boolean }>;
      getAutoLaunch: () => Promise<boolean>;
      setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
      getGroqApiKey: () => Promise<string>;
      setGroqApiKey: (apiKey: string) => Promise<{ success: boolean }>;
      translateText: (text: string, targetLang?: string) => Promise<{ success: boolean; text: string; error?: string }>;
      downloadCover: (imageUrl: string, fileName: string, serieTitre: string, type?: 'serie' | 'tome') => Promise<{ success: boolean; localPath?: string; url?: string }>;
      uploadCustomCover: (serieTitre: string, type?: 'serie' | 'tome') => Promise<{ success: boolean; localPath?: string; error?: string }>;
      saveCoverFromPath: (sourcePath: string, serieTitre: string, type?: 'serie' | 'tome') => Promise<{ success: boolean; localPath?: string; error?: string }>;
      deleteCoverImage: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
      getCoverFullPath: (relativePath: string) => Promise<string | null>;
      cleanEmptyFolders: () => Promise<{ success: boolean; count?: number; error?: string }>;
      getUserProfileImage: (userName: string) => Promise<string | null>;
      setUserProfileImage: (userName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      getUserAvatar: (userId: number) => Promise<string | null>;
      mergeDatabase: () => Promise<{ merged: boolean; seriesCount: number; tomesCount: number }>;
      setCurrentUser: (userName: string) => Promise<void>;
      saveUserDatabase: () => Promise<void>;
      quitApp: (options?: { shouldRelaunch?: boolean }) => Promise<void>;
      minimizeToTray: () => Promise<void>;
      toggleTomeLu: (tomeId: number, lu: boolean) => Promise<{ success: boolean }>;
      marquerSerieLue: (serieId: number) => Promise<{ success: boolean; tomesMarques: number }>;
      getLectureStatistics: () => Promise<LectureStatistics>;
      addAnimeByMalId: (malIdOrUrl: string | number) => Promise<{ success: boolean; animeId?: number; anime?: AnimeSerie; relatedAnimes?: Array<{ mal_id: number; title: string; relation: string }>; error?: string }>;
      importAnimeXml: (xmlContent: string) => Promise<AnimeImportResult>;
      onAnimeImportProgress: (callback: (progress: AnimeImportProgress) => void) => () => void;
      getAnimeSeries: (filters?: AnimeFilters) => Promise<{ success: boolean; animes: AnimeSerie[] }>;
      getAnimeDetail: (animeId: number) => Promise<{ success: boolean; anime?: AnimeSerie; episodes?: Array<{ numero: number; vu: boolean; date_visionnage?: string }>; franchiseAnimes?: AnimeSerie[]; error?: string }>;
      toggleEpisodeVu: (animeId: number, episodeNumero: number, vu: boolean) => Promise<{ success: boolean }>;
      marquerAnimeComplet: (animeId: number) => Promise<{ success: boolean }>;
      deleteAnime: (animeId: number) => Promise<{ success: boolean }>;
      setAnimeStatutVisionnage: (animeId: number, statutVisionnage: 'En cours' | 'Terminé' | 'Abandonné' | 'En attente') => Promise<{ success: boolean }>;
      updateAnime: (id: number, animeData: any) => Promise<{ success: boolean }>;
      deleteUserData: (userName: string) => Promise<{ success: boolean }>;
      deleteAllData: () => Promise<{ success: boolean }>;
      onMangaImportStart?: (callback: (data: { message: string }) => void) => () => void;
      onMangaImportComplete?: (callback: () => void) => () => void;
      getAllUsers: () => Promise<User[]>;
      createUser: (userData: { name: string; emoji: string; color: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
      updateUser: (userData: { id: number; name: string; emoji: string; color: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
      deleteUser: (userId: number) => Promise<{ success: boolean; error?: string }>;
      chooseAvatarFile: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      setUserAvatarFromPath: (userId: number, sourcePath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      setUserAvatar: (userId: number) => Promise<{ success: boolean; path?: string; error?: string }>;
      removeUserAvatar: (userId: number) => Promise<{ success: boolean; error?: string }>;
      getUserAvatar: (userId: number) => Promise<string | null>;
    };
  }
}
