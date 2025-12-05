import { AnimeSerie, MovieListItem, TvShowListItem } from '../../../../types';

/**
 * Normalise le type d'anime pour gérer les variantes (tv_special -> Special, TV Special -> Special, etc.)
 */
export function normalizeAnimeType(type: string | null | undefined): string {
  if (!type) return '';

  const trimmed = type.trim();

  // Si c'est déjà un type reconnu (avec majuscules), le retourner tel quel
  const recognizedTypes = ['TV', 'OVA', 'ONA', 'Movie', 'Special', 'Music'];
  if (recognizedTypes.includes(trimmed)) {
    return trimmed;
  }

  // Normaliser en minuscules et remplacer underscores/tirets par espaces
  const normalized = trimmed.toLowerCase().replace(/[_-]/g, ' ').trim();

  // Mapping des variantes vers les types standardisés (ordre important : plus spécifique d'abord)
  // Vérifier d'abord les types contenant "special" (tv special, tv_special, etc.)
  if (normalized.includes('special')) {
    return 'Special';
  }
  // Vérifier ensuite les types TV simples (mais pas "tv special" qui a déjà été capturé)
  if (normalized === 'tv') {
    return 'TV';
  }
  if (normalized === 'ova') {
    return 'OVA';
  }
  if (normalized === 'ona') {
    return 'ONA';
  }
  if (normalized === 'movie' || normalized === 'film') {
    return 'Movie';
  }
  if (normalized === 'music') {
    return 'Music';
  }

  // Vérifier aussi les variantes avec majuscules directement (TV Special, TV_Special, etc.)
  const upperNormalized = trimmed.replace(/[_-]/g, ' ').trim();
  if (upperNormalized === 'TV Special' || upperNormalized === 'TV SPECIAL' || upperNormalized.toLowerCase().includes('special')) {
    return 'Special';
  }

  // Si aucune correspondance, retourner le type original (sera classé comme "Non classé")
  return trimmed;
}

/**
 * Normalise le statut de l'œuvre (statut de diffusion/publication) vers un format standardisé
 */
export function normalizeWorkStatus(status: string | null | undefined): string {
  if (!status) return '';
  
  const frenchToAnimeMap: Record<string, string> = {
    'En cours de diffusion': 'Currently Airing',
    'Terminé': 'Finished Airing',
    'Terminée': 'Finished Airing',
    'Pas encore diffusé': 'Not yet aired'
  };
  
  if (frenchToAnimeMap[status]) {
    status = frenchToAnimeMap[status];
  }
  
  const standardStatuses = ['Currently Airing', 'Finished Airing', 'Not yet aired', 'On Hiatus'];
  if (standardStatuses.includes(status)) {
    return status;
  }
  
  // Normaliser les statuts TMDb vers les statuts anime
  const tmdbToAnimeMap: Record<string, string> = {
    'Ended': 'Finished Airing',
    'Returning Series': 'Currently Airing',
    'Canceled': 'On Hiatus',
    'Planned': 'Not yet aired',
    'In Production': 'Currently Airing',
    'Pilot': 'Not yet aired',
    'Released': 'Finished Airing',
    'Rumored': 'Not yet aired',
    'Post Production': 'Currently Airing'
  };

  if (tmdbToAnimeMap[status]) {
    status = tmdbToAnimeMap[status];
  }
  
  return status;
}

/**
 * Résout le statut de visionnage d'un anime basé sur la progression des épisodes
 */
export function resolveAnimeStatus(anime: AnimeSerie): string {
  const episodesVus = anime.episodes_vus || 0;
  const episodesTotal = anime.nb_episodes || 0;

  // Priorité 1 : Si tous les épisodes sont vus, c'est terminé (peu importe le statut_visionnage)
  if (episodesTotal > 0 && episodesVus >= episodesTotal) {
    return 'Terminé';
  }

  // Priorité 2 : Si au moins 1 épisode est vu, c'est en cours
  if (episodesVus > 0) {
    return 'En cours';
  }

  // Priorité 3 : Utiliser le statut_visionnage s'il existe, sinon "À regarder"
  return anime.statut_visionnage || 'À regarder';
}

/**
 * Résout le statut de visionnage d'une vidéo (anime, movie, series)
 */
export function resolveVideoStatus(
  item: AnimeSerie | MovieListItem | TvShowListItem,
  videoType: 'anime' | 'movie' | 'series'
): string {
  if (videoType === 'anime') {
    return resolveAnimeStatus(item as AnimeSerie);
  } else if (videoType === 'movie' || videoType === 'series') {
    return (item as MovieListItem | TvShowListItem).statut_visionnage || 'À regarder';
  }
  return 'À regarder';
}

/**
 * Détecte et extrait l'ID depuis une URL MAL/AniList ou un nombre
 * Retourne un objet avec malId et anilistId pour permettre la recherche sur les deux plateformes
 */
export function detectMalUrlOrId(input: string): { id: number | null; malId?: number | null; anilistId?: number | null } {
  const trimmed = input.trim();

  // Détecter URL AniList (anime)
  const anilistUrlMatch = trimmed.match(/anilist\.co\/anime\/(\d+)/i);
  if (anilistUrlMatch) {
    return { id: null, malId: null, anilistId: parseInt(anilistUrlMatch[1], 10) };
  }

  // Détecter URL MAL (anime ou manga)
  if (trimmed.includes('myanimelist.net/anime/') || trimmed.includes('myanimelist.net/manga/')) {
    const match = trimmed.match(/myanimelist\.net\/(?:anime|manga)\/(\d+)/);
    if (match) {
      const malId = parseInt(match[1], 10);
      return { id: malId, malId, anilistId: null };
    }
  }

  // Si c'est juste un nombre, on assume que c'est un ID MAL (plus commun)
  // On retourne aussi dans 'id' pour compatibilité avec le code existant
  if (/^\d+$/.test(trimmed)) {
    const malId = parseInt(trimmed, 10);
    return { id: malId, malId, anilistId: null };
  }

  return { id: null, malId: null, anilistId: null };
}
