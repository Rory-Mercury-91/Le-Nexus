import { AnimeSerie, MovieListItem, TvShowListItem } from '../../../../types';

/**
 * Type pour une vidéo pouvant être un anime, un film ou une série
 */
export type VideoItem = 
  | (AnimeSerie & { videoType: 'anime' })
  | (MovieListItem & { videoType: 'movie' })
  | (TvShowListItem & { videoType: 'series' });

/**
 * Types de vidéos supportés
 */
export type VideoItemType = 'anime' | 'movie' | 'series';

/**
 * Types d'animes reconnus
 */
export type AnimeType = 'TV' | 'OVA' | 'ONA' | 'Movie' | 'Special' | 'Music' | 'Unclassified';

/**
 * Configuration pour le chargement de vidéos
 */
export interface VideoCollectionConfig {
  /** Type de vidéo à charger */
  videoType: VideoItemType;
  /** Type d'anime spécifique (uniquement pour videoType='anime') */
  animeType?: AnimeType;
  /** Clé de stockage pour la persistance */
  storageKey: string;
  /** Titre de la page */
  title: string;
  /** Icône de la page */
  icon: string;
}
