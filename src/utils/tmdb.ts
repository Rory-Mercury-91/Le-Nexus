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
