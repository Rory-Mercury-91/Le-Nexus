export const STATUS_SETS = {
  manga: ['À lire', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const,
  anime: ['À regarder', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const,
  adulteGame: ['À jouer', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const,
  movie: ['À regarder', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const,
  series: ['À regarder', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const,
  book: ['À lire', 'En cours', 'En pause', 'Terminé', 'Abandonné'] as const
};

export const COMMON_STATUSES = {
  MANGA: STATUS_SETS.manga,
  ANIME: STATUS_SETS.anime,
  ADULTE_GAME: STATUS_SETS.adulteGame,
  MOVIE: STATUS_SETS.movie,
  SERIES: STATUS_SETS.series,
  BOOK: STATUS_SETS.book
} as const;

export type StatusCategory = keyof typeof STATUS_SETS;

const BASE_STATUS_EMOJIS: Record<string, string> = {
  'À regarder': '👁️',
  'À lire': '📚',
  'À jouer': '🎮',
  'En cours': '📺',
  'En pause': '⏸️',
  'Terminé': '✅',
  'Abandonné': '❌'
};

const STATUS_EMOJI_OVERRIDES: Partial<Record<StatusCategory, Record<string, string>>> = {
  manga: {
    'En cours': '📖'
  },
  adulteGame: {
    'À jouer': '🎮',
    'En cours': '🎮'
  }
};

export function getStatusOptions(category: StatusCategory): readonly string[] {
  return STATUS_SETS[category];
}

export function formatStatusLabel(status: string, options?: { category?: StatusCategory }): string {
  const emoji =
    (options?.category && STATUS_EMOJI_OVERRIDES[options.category]?.[status]) ?? BASE_STATUS_EMOJIS[status];
  return emoji ? `${emoji} ${status}` : status;
}

export function getStatusEmoji(status: string, options?: { category?: StatusCategory }): string | undefined {
  return (options?.category && STATUS_EMOJI_OVERRIDES[options.category]?.[status]) ?? BASE_STATUS_EMOJIS[status];
}
