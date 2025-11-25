const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function getTmdbImageUrl(path?: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342') {
  if (!path) {
    return undefined;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function formatRuntime(minutes?: number | null) {
  if (!minutes || Number.isNaN(minutes)) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }
  return `${minutes} min`;
}

export function formatAirDate(value?: string | null) {
  if (!value) {
    return null;
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return value;
  }
}

export function formatVoteAverage(score?: number | null) {
  if (score === undefined || score === null) {
    return null;
  }
  return (Math.round(score * 10) / 10).toFixed(1);
}

export function translateTmdbStatus(status?: string | null, _type: 'tv' | 'movie' = 'tv'): string {
  if (!status) {
    return 'Indisponible';
  }

  const statusTranslations: Record<string, string> = {
    // Statuts séries TV
    'Ended': 'Terminée',
    'Returning Series': 'En cours',
    'Planned': 'Prévue',
    'In Production': 'En production',
    'Canceled': 'Annulée',
    'Pilot': 'Pilote',
    // Statuts films
    'Released': 'Sorti',
    'Rumored': 'Rumeur',
    'Post Production': 'Post-production'
  };

  return statusTranslations[status] || status;
}

export type TmdbImageAsset = {
  file_path?: string | null;
  iso_639_1?: string | null;
};

export function getUniqueTmdbImages<T extends TmdbImageAsset>(images?: T[] | null, limit = 12): T[] {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const unique: T[] = [];

  for (const image of images) {
    if (!image?.file_path) {
      continue;
    }
    if (seen.has(image.file_path)) {
      continue;
    }
    seen.add(image.file_path);
    unique.push(image);
    if (unique.length >= limit) {
      break;
    }
  }

  return unique;
}
