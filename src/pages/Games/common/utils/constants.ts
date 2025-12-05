/**
 * Options de tri disponibles pour les jeux
 */
export const GAME_SORT_OPTIONS = [
  'title-asc',
  'title-desc',
  'date-desc',
  'date-asc',
  'platform-asc',
  'platform-desc'
] as const;

export type GameSortOption = typeof GAME_SORT_OPTIONS[number];

/**
 * Types de moteurs reconnus
 */
export const RECOGNIZED_GAME_ENGINES = [
  'ADRIFT',
  'Flash',
  'HTML',
  'Java',
  'Others',
  'QSP',
  'RAGS',
  'RPGM',
  'RenPy',
  'Ren\'Py',
  'Tads',
  'Unity',
  'Unreal Engine',
  'Unreal',
  'WebGL',
  'WolfRPG',
  'Wolf RPG',
  'Autre'
] as const;

/**
 * Options de statut pour les jeux (statut du jeu)
 */
export const GAME_STATUS_OPTIONS = ['TERMINÉ', 'EN COURS', 'ABANDONNÉ'] as const;

/**
 * Options de statut personnel (completion utilisateur)
 */
export const GAME_COMPLETION_OPTIONS = ['À lire', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const;

/**
 * Options de plateforme
 */
export const GAME_PLATFORM_OPTIONS = ['F95Zone', 'LewdCorner', 'Autre'] as const;

/**
 * Options de traduction
 */
export const GAME_TRANSLATION_OPTIONS = ['all', 'translated', 'not-translated', 'integrated'] as const;

/**
 * Validateur pour les options de tri jeu
 */
const GAME_SORT_SET = new Set<string>(GAME_SORT_OPTIONS);
export const isGameSortOption = (value: unknown): value is GameSortOption =>
  typeof value === 'string' && GAME_SORT_SET.has(value);

/**
 * Validateur pour les filtres de statut de jeu
 */
const GAME_STATUS_SET = new Set<string>(GAME_STATUS_OPTIONS);
export const isGameStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || value === 'all' || GAME_STATUS_SET.has(value));

/**
 * Validateur pour les filtres de completion
 */
const GAME_COMPLETION_SET = new Set<string>(GAME_COMPLETION_OPTIONS);
export const isGameCompletionFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || value === 'all' || GAME_COMPLETION_SET.has(value));

/**
 * Validateur pour les filtres de plateforme
 */
const GAME_PLATFORM_SET = new Set<string>(GAME_PLATFORM_OPTIONS);
export const isGamePlatformFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || value === 'all' || GAME_PLATFORM_SET.has(value));

/**
 * Validateur pour les filtres de traduction
 */
const GAME_TRANSLATION_SET = new Set<string>(GAME_TRANSLATION_OPTIONS);
export const isGameTranslationFilter = (value: unknown): value is string =>
  typeof value === 'string' && GAME_TRANSLATION_SET.has(value);
