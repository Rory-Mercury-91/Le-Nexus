import { COMMON_STATUSES } from '../../../../utils/status';

/**
 * Options de tri disponibles pour les vidéos
 */
export const VIDEO_SORT_OPTIONS = [
  'title-asc',
  'title-desc',
  'date-desc',
  'date-asc',
  'score-desc',
  'popularite-desc'
] as const;

export type VideoSortOption = typeof VIDEO_SORT_OPTIONS[number];

/**
 * Types d'animes reconnus
 */
export const RECOGNIZED_ANIME_TYPES = ['TV', 'OVA', 'ONA', 'Movie', 'Special', 'Music'] as const;

/**
 * Options de statut pour les animes
 */
export const VIDEO_STATUS_OPTIONS = COMMON_STATUSES.ANIME;

/**
 * Validateur pour les options de tri vidéo
 */
const VIDEO_SORT_SET = new Set<string>(VIDEO_SORT_OPTIONS);
export const isVideoSortOption = (value: unknown): value is VideoSortOption =>
  typeof value === 'string' && VIDEO_SORT_SET.has(value);

/**
 * Validateur pour les filtres de statut vidéo
 */
const VIDEO_STATUS_SET = new Set<string>(VIDEO_STATUS_OPTIONS);
export const isVideoStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || VIDEO_STATUS_SET.has(value));
