export type SerieTag = 'a_lire' | 'en_cours' | 'lu' | 'abandonne' | 'en_pause';
export type AnimeTag = 'a_regarder' | 'en_cours' | 'termine' | 'abandonne';

// Type pour les erreurs (évite l'utilisation de 'any')
export interface AppError extends Error {
  message: string;
  code?: string | number;
  details?: unknown;
}

// Type pour les données JSON de jeux adultes
export interface AdulteGameJsonData {
  name?: string;
  version?: string;
  status?: string;
  engine?: string;
  developer?: string;
  developpeur?: string;
  image?: string;
  cover?: string;
  tags?: string[] | string;
  id?: string | number;
  thread_url?: string;
  link?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ContentPreferences {
  showMangas: boolean;
  showAnimes: boolean;
  showMovies: boolean;
  showSeries: boolean;
  showVideos?: boolean; // Option pour masquer/afficher toute la section Vidéos (remplace showAnimes/showMovies/showSeries)
  showAdulteGame: boolean;
  showBooks: boolean;
  showSubscriptions: boolean;
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
  chapitres_mihon?: number | null; // 0 = non mihon, 1 = mihon
  langue_originale?: string | null;
  demographie?: string | null;
  editeur?: string | null;
  editeur_vo?: string | null;
  rating?: string | null;
  serialization?: string | null;
  
  // Nouveaux champs MAL
  mal_id?: number | null;
  anilist_id?: number | null;
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
  source_donnees?: 'mal' | 'nautiljon' | 'mal+nautiljon' | 'mihon_import' | null;
  nautiljon_url?: string | null; // URL de la page Nautiljon (extrait de relations)
  source_url?: string | null; // URL de la source (site de scan, ex: sushiscan.fr)
  source_id?: string | null; // ID de la source Mihon/Tachiyomi (ex: "3196884165456788667")
  
  created_at?: string;
  updated_at?: string;
  user_modified_fields?: string | null; // JSON array des champs modifiés par l'utilisateur
  tomes?: Tome[];
  tag?: SerieTag | null;
  is_favorite?: boolean;
  is_masquee?: boolean | number;
  labels?: Array<{ label: string; color: string }>; // Labels personnalisés
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
  mihon?: number; // 0 = non mihon, 1 = mihon
  mihon_user_id?: number | null; // ID de l'utilisateur qui a coché la case Mihon
}

export interface Statistics {
  nbMangasParProprietaire?: Record<number, number>;
  nbBdParProprietaire?: Record<number, number>;
  nbComicsParProprietaire?: Record<number, number>;
  nbLivresParProprietaire?: Record<number, number>;
  nbJeuxParProprietaire?: Record<number, number>;
  nbJeuxVideosParProprietaire?: Record<number, number>;
  nbJeuxAdultesParProprietaire?: Record<number, number>;
  coutsMangasParProprietaire?: Record<number, number>;
  coutsBdParProprietaire?: Record<number, number>;
  coutsComicsParProprietaire?: Record<number, number>;
  coutsLivresParProprietaire?: Record<number, number>;
  coutsJeuxVideosParProprietaire?: Record<number, number>;
  coutsJeuxAdultesParProprietaire?: Record<number, number>;
  coutsAbonnementsParProprietaire?: Record<number, number>; // Coût mensuel des abonnements par propriétaire
  coutsAchatsPonctuelsParProprietaire?: Record<number, number>; // Coût total des achats ponctuels par propriétaire
  nbAbonnementsActifs?: number; // Nombre total d'abonnements actifs
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
  totalMihon: number;
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
  source_url?: string; // Déprécié, utiliser source_id
  source_id?: string; // ID de la source Mihon/Tachiyomi
}

export interface MangaSearchResult {
  source?: string; // Source principale (MyAnimeList, AniList)
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
  source: string; // 'MyAnimeList', 'AniList'
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
  anilist_id?: number | null;
  mal_url?: string;
  nautiljon_url?: string | null; // URL de la page Nautiljon (extrait de relations)
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
  user_modified_fields?: string | null; // JSON array des champs modifiés par l'utilisateur
  // Tags utilisateur
  tag?: AnimeTag | null;
  is_favorite?: boolean;
  is_masquee?: boolean | number;
  labels?: Array<{ label: string; color: string }>; // Labels personnalisés
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
  type?: 'anime' | 'manga' | 'anime-enrichment' | 'manga-enrichment' | 'mihon-import' | 'adulte-game-updates';
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

export type AdulteGameStatutPerso = 'Terminé' | 'En cours' | 'En pause' | 'À jouer' | 'Abandonné';
export type AdulteGameStatutJeu = 'TERMINÉ' | 'ABANDONNÉ' | 'EN COURS';
export type AdulteGameMoteur = 'ADRIFT' | 'Flash' | 'HTML' | 'Java' | 'Others' | 'QSP' | 'RAGS' | 'RPGM' | 'RenPy' | 'Ren\'Py' | 'Tads' | 'Unity' | 'Unreal Engine' | 'Unreal' | 'WebGL' | 'WolfRPG' | 'Wolf RPG' | 'Autre';
export type AdulteGameStatutTraduction = 'Traduction' | 'Traduction (Mod inclus)' | 'Traduction intégré' | '';
export type AdulteGameTypeTraduction = 'Manuelle' | 'Semi-automatique' | 'Automatique' | 'VO française' | '';

// Alias pour compatibilité rétroactive

export interface AdulteGame {
  id: number;
  
  // IDs des plateformes (nouveaux champs)
  f95_thread_id?: number | null;
  Lewdcorner_thread_id?: number | null;
  rawg_id?: number | null; // ID RAWG pour les jeux vidéo
  
  // Données générales (nouveaux noms)
  titre: string;
  game_version?: string | null; // Nouveau nom
  game_statut?: AdulteGameStatutJeu | null; // Nouveau nom
  game_engine?: AdulteGameMoteur | null; // Nouveau nom
  game_developer?: string | null; // Nouveau nom
  game_site?: 'F95Zone' | 'LewdCorner' | 'RAWG' | null; // Nouveau nom
  couverture_url?: string | null;
  tags?: string[]; // Parsé depuis JSON
  esrb_rating?: string | null; // Classification ESRB pour les jeux RAWG
  lien_f95?: string | null;
  lien_lewdcorner?: string | null; // Nouveau champ
  
  // Données utilisateur (depuis adulte_game_user_data)
  statut_perso?: AdulteGameStatutPerso | null; // Alias pour completion_perso
  completion_perso?: AdulteGameStatutPerso | null; // Nouveau nom
  notes_privees?: string | null;
  chemin_executable?: string | null;
  version_jouee?: string | null;
  derniere_session?: string | null;
  is_favorite?: boolean | number;
  is_hidden?: boolean | number;
  labels?: Array<{ label: string; color: string }>; // Nouveau : JSON array
  display_preferences?: Record<string, boolean>; // Nouveau : JSON object
  
  // Traduction
  statut_traduction?: AdulteGameStatutTraduction | null;
  type_traduction?: AdulteGameTypeTraduction | null;
  traduction_fr_disponible?: boolean;
  version_traduite?: string | null;
  traducteur?: string | null;
  derniere_sync_trad?: string | null;
  traductions_multiples?: string | null; // JSON array des traductions multiples
  
  // Contrôle de version
  maj_disponible?: boolean;
  derniere_verif?: string | null;
  user_modified_fields?: string | null; // JSON array des champs modifiés par l'utilisateur
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
  
  // Relations
  proprietaires?: string[]; // Liste des propriétaires
  
  // Alias pour compatibilité rétroactive (deprecated)
  version?: string | null; // Alias pour game_version
  statut_jeu?: AdulteGameStatutJeu | null; // Alias pour game_statut
  moteur?: AdulteGameMoteur | null; // Alias pour game_engine
  developpeur?: string | null; // Alias pour game_developer
  plateforme?: 'F95Zone' | 'LewdCorner' | null; // Alias pour game_site
  lien_traduction?: string | null; // Ancien champ, non utilisé
  lien_jeu?: string | null; // Ancien champ, non utilisé
  version_traduction?: string | null; // Ancien champ, non utilisé
  f95_trad_id?: number | null; // Ancien champ, non utilisé
  statut_trad_fr?: string | null; // Alias pour statut_traduction
  type_trad_fr?: string | null; // Alias pour type_traduction
  version_disponible?: string | null; // Ancien champ, non utilisé
}

// Alias pour compatibilité rétroactive

export interface AdulteGameFilters {
  utilisateur?: string;
  statut_perso?: AdulteGameStatutPerso;
  statut_jeu?: AdulteGameStatutJeu;
  moteur?: AdulteGameMoteur;
  maj_disponible?: boolean;
  traduction_fr_disponible?: boolean;
  statut_traduction?: AdulteGameStatutTraduction;
  show_hidden?: boolean;
  search?: string;
  [key: string]: unknown;
}

// ========================================
// TYPES LIVRES
// ========================================

export type BookType = 'Roman' | 'Biographie' | 'Autobiographie' | 'Essai' | 'Documentaire' | 'Polar' | 'Science-fiction' | 'Fantasy' | 'Horreur' | 'Romance' | 'Thriller' | 'Bande dessinée' | 'Comics' | 'Manga' | 'Autre';

export interface Book {
  id: number;
  titre: string;
  titre_original?: string | null;
  auteur?: string | null;
  auteurs?: string | null; // JSON array pour plusieurs auteurs
  isbn?: string | null;
  isbn13?: string | null;
  editeur?: string | null;
  date_publication?: string | null;
  date_publication_originale?: string | null;
  nombre_pages?: number | null;
  langue?: string | null;
  langue_originale?: string | null;
  type_livre?: BookType | null;
  genres?: string | null; // JSON array ou string séparé par virgules
  description?: string | null;
  couverture_url?: string | null;
  google_books_id?: string | null;
  open_library_id?: string | null;
  bnf_id?: string | null;
  source_donnees?: 'manual' | 'google_books' | 'open_library' | 'bnf' | null;
  source_url?: string | null;
  score_moyen?: number | null; // Score moyen de l'API (ex: Google Books sur 5)
  nb_votes?: number | null;
  rating?: string | null;
  prix_suggere?: number | null; // Prix suggéré depuis l'API
  devise?: string | null; // Code devise (EUR, USD, etc.)
  user_modified_fields?: string | null; // JSON array des champs modifiés par l'utilisateur
  created_at?: string;
  updated_at?: string;
  
  // Données utilisateur (depuis book_user_data)
  statut_lecture?: 'À lire' | 'En cours' | 'Terminé' | 'Abandonné' | 'En pause' | null;
  score?: number | null;
  date_debut?: string | null;
  date_fin?: string | null;
  is_favorite?: boolean | number;
  is_hidden?: boolean | number;
  notes_privees?: string | null;
  labels?: Array<{ label: string; color: string }>; // JSON array
  display_preferences?: Record<string, boolean>; // JSON object
  
  // Propriétaires et coûts
  proprietaires?: Array<{ id: number; name: string; color: string; prix: number; date_achat?: string | null }>;
  prix_total?: number; // Prix total du livre (somme des prix des propriétaires)
}

export interface BookListItem extends Book {
  // Pour la liste, on peut avoir des données simplifiées
}

export interface BookFilters {
  statut_lecture?: string;
  type_livre?: BookType;
  show_favorite_only?: boolean;
  show_hidden?: boolean;
  search?: string;
  genres?: string[];
  [key: string]: unknown;
}

// Alias pour compatibilité rétroactive

// Note: Window.electronAPI interface is declared in vite-env.d.ts
