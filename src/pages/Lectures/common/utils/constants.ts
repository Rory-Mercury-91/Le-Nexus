import { Serie } from '../../../../types';
import { COMMON_STATUSES } from '../../../../utils/status';

/**
 * Options de tri disponibles pour les lectures
 */
export const LECTURE_SORT_OPTIONS = [
  'title-asc',
  'title-desc',
  'date-desc',
  'date-asc',
  'cost-desc',
  'cost-asc'
] as const;

export type LectureSortOption = typeof LECTURE_SORT_OPTIONS[number];

/**
 * Options de statut pour les lectures (manga)
 */
export const LECTURE_STATUS_OPTIONS = COMMON_STATUSES.MANGA;

/**
 * Options de types de volumes pour les mangas
 */
export const MANGA_VOLUME_TYPE_OPTIONS: Array<{ value: Serie['type_volume']; label: string }> = [
  { value: 'Broché', label: '📚 Broché' },
  { value: 'Broché Collector', label: '💎 Broché Collector' },
  { value: 'Coffret', label: '🎁 Coffret' },
  { value: 'Kindle', label: '📱 Kindle' },
  { value: 'Webtoon', label: '🌐 Webtoon' },
  { value: 'Webtoon Physique', label: '📘 Webtoon Physique' },
  { value: 'Light Novel', label: '📖 Light Novel' },
  { value: 'Scan Manga', label: '📰 Scan Manga' },
  { value: 'Scan Webtoon', label: '📰 Scan Webtoon' }
];

/**
 * Mapping des statuts manga vers les tags
 */
export const MANGA_STATUS_TO_TAG: Record<(typeof COMMON_STATUSES.MANGA)[number], string> = {
  'À lire': 'a_lire',
  'En cours': 'en_cours',
  'En pause': 'en_pause',
  'Terminé': 'lu',
  'Abandonné': 'abandonne'
};

/**
 * Validateur pour les options de tri lecture
 */
const LECTURE_SORT_SET = new Set<string>(LECTURE_SORT_OPTIONS);
export const isLectureSortOption = (value: unknown): value is LectureSortOption =>
  typeof value === 'string' && LECTURE_SORT_SET.has(value);
