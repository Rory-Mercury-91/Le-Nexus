export type SerieTag = 'a_lire' | 'en_cours' | 'lu' | 'abandonne' | 'en_pause';
export type AnimeTag = 'a_regarder' | 'en_cours' | 'termine' | 'abandonne';

export interface ContentPreferences {
  showMangas: boolean;
  showAnimes: boolean;
  showMovies: boolean;
  showSeries: boolean;
  showAdulteGame: boolean;
}

export interface Serie {
  id: number;
  titre: string;
  titre_alternatif?: string | null; // Titre alternatif depuis Nautiljon (peut contenir plusieurs titres séparés par " / ")
  statut: 'En cours' | 'Terminée' | 'Abandonnée';
  type_volume: 'Broché' | 'Broché Collector' | 'Coffret' | 'Kindle' | 'Webtoon' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon' | 'Numérique';
  type_contenu?: 'volume' | 'chapitre' | 'volume+chapitre';
  couverture_url: string | null;
  description?: string | null;
  statut_publication?: string | null;
  statut_publication_vf?: string | null;
  annee_publication?: number | null;
  annee_vf?: number | null;
  genres?: string | null;
  nb_chapitres?: number | null;
  nb_chapitres_vf?: number | null;
  chapitres_lus?: number | null;
  langue_originale?: string | null;
  demographie?: string | null;
  editeur?: string | null;
  editeur_vo?: string | null;
  rating?: string | null;
  serialization?: string | null;
  
  // Nouveaux champs MAL
  mal_id?: number | null;
  titre_romaji?: string | null;
  titre_natif?: string | null;
  titre_anglais?: string | null;
  titres_alternatifs?: string | null; // JSON string pour les titres MAL
  nb_volumes?: number | null;
  nb_volumes_vf?: number | null;
  date_debut?: string | null;
  date_fin?: string | null;
  media_type?: string | null; // "Manga", "Manhwa", "Manhua", "Light Novel"
  themes?: string | null;
  auteurs?: string | null;
  score_mal?: number | null;
  rank_mal?: number | null;
  popularity_mal?: number | null;
  background?: string | null;
  prequel_mal_id?: number | null;
  sequel_mal_id?: number | null;
  anime_adaptation_mal_id?: number | null;
  light_novel_mal_id?: number | null;
  manga_adaptation_mal_id?: number | null;
  volumes_lus?: number | null;
  statut_lecture?: string | null; // "En cours", "Terminée", "Abandonnée"
  score_utilisateur?: number | null;
  date_debut_lecture?: string | null;
  date_fin_lecture?: string | null;
  tags?: string | null; // Tags MAL de l'utilisateur
  relations?: string | null; // JSON string
  source_donnees?: 'mal' | 'nautiljon' | 'mal+nautiljon' | null;
  nautiljon_url?: string | null; // URL de la page Nautiljon (extrait de relations)
  
  created_at?: string;
  updated_at?: string;
  tomes?: Tome[];
  tag?: SerieTag | null;
  is_favorite?: boolean;
  is_masquee?: boolean | number;
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
  type_tome?: 'Standard' | 'Collector' | 'Deluxe' | 'Intégrale' | 'Coffret' | 'Numérique' | 'Autre';
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
  chapitresLus: number;
  chapitresTotal: number;
  progressionTomes?: number | null;
  progressionChapitres?: number | null;
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
  mal_url?: string;
  titre: string;
  titre_romaji?: string;
  titre_natif?: string;
  titre_anglais?: string;
  titres_alternatifs?: string;
  type: string;
  source?: string;
  nb_episodes: number;
  couverture_url?: string;
  description?: string;
  statut_diffusion?: string;
  en_cours_diffusion?: boolean;
  date_debut?: string;
  date_fin?: string;
  date_sortie_vf?: string;
  date_debut_streaming?: string;
  duree?: string;
  statut_visionnage?: 'En cours' | 'Terminé' | 'Abandonné' | 'En attente' | 'En pause' | 'À regarder';
  annee?: number;
  saison_diffusion?: string;
  genres?: string;
  themes?: string;
  demographics?: string;
  studios?: string;
  producteurs?: string;
  diffuseurs?: string;
  editeur?: string;
  site_web?: string;
  rating?: string;
  age_conseille?: string;
  score?: number;
  rank_mal?: number;
  popularity_mal?: number;
  scored_by?: number;
  favorites?: number;
  background?: string;
  liens_externes?: string;
  liens_streaming?: string;
  franchise_name?: string;
  franchise_order?: number;
  prequel_mal_id?: number;
  sequel_mal_id?: number;
  manga_source_mal_id?: number;
  light_novel_source_mal_id?: number;
  relations?: string | null;
  movie_relations?: string | null;
  source_import?: string;
  utilisateur_ajout: string;
  episodes_vus?: number;
  created_at?: string;
  updated_at?: string;
  // Tags utilisateur
  tag?: AnimeTag | null;
  is_favorite?: boolean;
  is_masquee?: boolean | number;
}

export interface MovieListItem {
  id: number;
  tmdb_id: number;
  titre: string;
  titre_original?: string | null;
  synopsis?: string | null;
  statut?: string | null;
  date_sortie?: string | null;
  duree?: number | null;
  note_moyenne?: number | null;
  popularite?: number | null;
  nb_votes?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres: Array<{ id: number; name: string }>;
  created_at?: string;
  updated_at?: string;
  statut_visionnage?: string | null;
  score?: number | null;
  date_visionnage?: string | null;
  is_favorite?: boolean;
  is_hidden?: boolean;
}

export interface MovieVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface MovieImage {
  aspect_ratio: number;
  file_path: string;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
}

export interface WatchProviderResult {
  link?: string;
  flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
  buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
  rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
}

export type WatchProviderMap = Record<string, WatchProviderResult>;

export interface WatchProviderResponse {
  results?: WatchProviderMap | null;
}

export interface MovieExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  wikidata_id?: string | null;
}

export interface MovieTranslations {
  synopsis?: string | null;
  tagline?: string | null;
}

export interface MovieDetail extends MovieListItem {
  imdb_id?: string | null;
  tagline?: string | null;
  budget?: number | null;
  revenus?: number | null;
  langues_parlees?: Array<{ english_name: string; name: string; iso_639_1: string }> | null;
  compagnies?: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }> | null;
  pays_production?: Array<{ iso_3166_1: string; name: string }> | null;
  site_officiel?: string | null;
  videos?: { results: MovieVideo[] } | null;
  images?: { backdrops?: MovieImage[]; posters?: MovieImage[] } | null;
  fournisseurs?: WatchProviderMap | WatchProviderResponse | null;
  ids_externes?: MovieExternalIds | null;
  traductions?: MovieTranslations | null;
  mots_cles?: Array<{ id: number; name: string }> | null;
  donnees_brutes?: Record<string, unknown> | null;
}

export interface TmdbMovieSearchResult {
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  releaseDate: string | null;
  overview: string;
  posterPath: string | null;
  voteAverage: number | null;
  inLibrary: boolean;
}

export interface TmdbSeriesSearchResult {
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  firstAirDate: string | null;
  overview: string;
  posterPath: string | null;
  voteAverage: number | null;
  inLibrary: boolean;
}

export interface TmdbSearchResponse<T> {
  results: T[];
  totalResults: number;
  totalPages: number;
  page: number;
}

export interface EpisodeSummary {
  air_date?: string | null;
  airdate?: string | null;
  episode_number?: number | null;
  id?: number | null;
  name?: string | null;
  overview?: string | null;
  production_code?: string | null;
  season_number?: number | null;
  still_path?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  url?: string | null;
}

export interface TvShowListItem {
  id: number;
  tmdb_id: number;
  tvmaze_id?: number | null;
  titre: string;
  titre_original?: string | null;
  synopsis?: string | null;
  statut?: string | null;
  type?: string | null;
  nb_saisons?: number | null;
  nb_episodes?: number | null;
  popularite?: number | null;
  date_premiere?: string | null;
  date_derniere?: string | null;
  note_moyenne?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres: Array<{ id: number; name: string }>;
  prochain_episode?: EpisodeSummary | null;
  dernier_episode?: EpisodeSummary | null;
  maj_disponible?: boolean;
  created_at?: string;
  updated_at?: string;
  statut_visionnage?: string | null;
  score?: number | null;
  saisons_vues?: number | null;
  episodes_vus?: number | null;
  date_debut?: string | null;
  date_fin?: string | null;
  is_favorite?: boolean;
  is_hidden?: boolean;
}

export interface EpisodeTranslation {
  synopsis?: string | null;
}

export interface EpisodeRawData {
  [key: string]: unknown;
}

export interface TvEpisode {
  id: number;
  show_id: number;
  season_id?: number | null;
  tmdb_id?: number | null;
  tvmaze_id?: number | null;
  saison_numero: number;
  episode_numero: number;
  titre?: string | null;
  synopsis?: string | null;
  date_diffusion?: string | null;
  duree?: number | null;
  note_moyenne?: number | null;
  nb_votes?: number | null;
  still_path?: string | null;
  vu?: boolean;
  date_visionnage?: string | null;
  translations?: EpisodeTranslation | null;
  donnees_brutes?: EpisodeRawData | null;
}

export interface TvShowExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  wikidata_id?: string | null;
  tvdb_id?: string | null;
}

export interface TvShowDetail extends TvShowListItem {
  imdb_id?: string | null;
  tagline?: string | null;
  duree_episode?: number | null;
  genres: Array<{ id: number; name: string }>;
  mots_cles?: Array<{ id: number; name: string }> | null;
  compagnies?: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }> | null;
  pays_production?: Array<{ iso_3166_1: string; name: string }> | null;
  reseaux?: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }> | null;
  plateformes?: Array<{ logo_path: string | null; provider_name?: string | null }> | null;
  images?: { backdrops?: MovieImage[]; posters?: MovieImage[] } | null;
  videos?: { results: MovieVideo[] } | null;
  fournisseurs?: WatchProviderMap | WatchProviderResponse | null;
  ids_externes?: TvShowExternalIds | null;
  traductions?: { synopsis?: string | null } | null;
  donnees_brutes?: Record<string, unknown> | null;
  seasons: Array<{
    id: number;
    show_id: number;
    numero: number;
    titre?: string | null;
    synopsis?: string | null;
    date_premiere?: string | null;
    nb_episodes?: number | null;
    poster_path?: string | null;
    translations?: EpisodeTranslation | null;
    donnees_brutes?: Record<string, unknown> | null;
  }>;
  episodes: TvEpisode[];
}

export interface AnimeFilters {
  mesAnimes?: boolean;
  statut?: string;
  type?: string;
  visionnage?: 'completed' | 'watching' | 'not_started' | '';
  search?: string;
}

export interface AnimeImportResult {
  total: number;
  imported: number;
  updated: number;
  errors: Array<{ titre?: string; malId?: number; error: string }>;
  skipped?: number;
  totalTimeMs?: number;
  speed?: number;
}

export interface AnimeImportProgress {
  phase: 'batch' | 'anime' | 'manga' | 'pause' | 'complete';
  type?: 'anime' | 'manga' | 'anime-enrichment' | 'manga-enrichment';
  currentBatch?: number;
  totalBatches?: number;
  currentAnime?: string;
  currentIndex?: number;
  total: number;
  imported: number;
  updated: number;
  errors: number;
  elapsedMs?: number;
  etaMs?: number;
  speed?: number;
  skipped?: number;
  isPausing?: boolean;
  remainingPauseSeconds?: number;
}

export interface ProgressItem {
  type: 'tome' | 'chapitre' | 'episode' | 'tv' | 'movie';
  // Pour les tomes
  id?: number;
  numero?: number;
  // Pour tous
  serieId?: number;
  serieTitre?: string;
  animeId?: number;
  animeTitre?: string;
  couvertureUrl?: string;
  dateProgression: string;
  // Pour chapitres
  chapitresLus?: number;
  nbChapitres?: number;
  // Pour épisodes
  episodesVus?: number;
  nbEpisodes?: number;
  // Séries TV
  showId?: number;
  showTitre?: string;
  posterPath?: string | null;
  statutVisionnage?: string | null;
  // Films
  movieId?: number;
  movieTitre?: string;
  tmdbId?: number | null;
}

export interface RecentProgress {
  tomes: ProgressItem[];
  chapitres: ProgressItem[];
  episodes: ProgressItem[];
  movies?: ProgressItem[];
  tvShows?: ProgressItem[];
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

// ========================================
// Jeux adultes (Adult Visual Novels)
// ========================================

export type AdulteGameStatutPerso = 'Terminé' | 'En cours' | 'En pause' | 'À lire' | 'Abandonné';
export type AdulteGameStatutJeu = 'TERMINÉ' | 'ABANDONNÉ' | 'EN COURS';
export type AdulteGameMoteur = 'RenPy' | 'Unity' | 'RPGM' | 'Unreal' | 'HTML' | 'Flash' | 'QSP' | 'Autre';
export type AdulteGameStatutTraduction = 'Traduction' | 'Traduction (Mod inclus)' | 'Traduction intégré' | '';
export type AdulteGameTypeTraduction = 'Manuelle' | 'Semi-automatique' | 'Automatique' | 'VO française' | '';

// Alias pour compatibilité rétroactive

export interface AdulteGame {
  id: number;
  f95_thread_id?: number | null;
  titre: string;
  version?: string | null;
  statut_jeu?: AdulteGameStatutJeu | null;
  moteur?: AdulteGameMoteur | null;
  developpeur?: string | null;
  plateforme?: 'F95Zone' | 'LewdCorner' | null;
  couverture_url?: string | null;
  tags?: string[]; // Parsé depuis JSON
  lien_f95?: string | null;
  lien_traduction?: string | null;
  lien_jeu?: string | null;
  
  // Données utilisateur
  statut_perso?: AdulteGameStatutPerso | null;
  notes_privees?: string | null;
  chemin_executable?: string | null;
  version_jouee?: string | null;
  derniere_session?: string | null;
  is_favorite?: boolean | number;
  is_hidden?: boolean | number;
  
  // Informations de traduction (anciennes)
  version_traduction?: string | null;
  statut_traduction?: AdulteGameStatutTraduction | null;
  type_traduction?: AdulteGameTypeTraduction | null;
  
  // Traduction FR (Google Sheets sync)
  traduction_fr_disponible?: boolean;
  version_traduite?: string | null;
  traducteur?: string | null;
  f95_trad_id?: number | null;
  statut_trad_fr?: string | null; // TERMINÉ, EN COURS, ABANDONNÉ
  type_trad_fr?: string | null; // Traduction Humaine, Semi-Automatique, Automatique
  derniere_sync_trad?: string | null;
  traductions_multiples?: string | null; // JSON array des traductions multiples
  
  // Contrôle de version
  version_disponible?: string | null;
  maj_disponible?: boolean;
  derniere_verif?: string | null;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
  
  // Relations
  proprietaires?: string[]; // Liste des propriétaires
}

// Alias pour compatibilité rétroactive

export interface AdulteGameFilters {
  utilisateur?: string;
  statut_perso?: AdulteGameStatutPerso;
  statut_jeu?: AdulteGameStatutJeu;
  moteur?: AdulteGameMoteur;
  maj_disponible?: boolean;
  traduction_fr_disponible?: boolean;
  show_hidden?: boolean;
  search?: string;
  [key: string]: unknown;
}

// Alias pour compatibilité rétroactive

// Note: Window.electronAPI interface is declared in vite-env.d.ts
