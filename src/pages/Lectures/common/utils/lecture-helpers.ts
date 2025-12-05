import { getSerieStatusLabel } from '../../../../utils/manga-status';
import { ContentType, LectureItem, isSerie } from './lecture-types';

/**
 * Résout le statut de lecture d'un item (série ou livre)
 */
export function resolveLectureStatus(item: LectureItem): string {
  if (isSerie(item)) {
    return getSerieStatusLabel(item);
  }
  return item.statut_lecture || 'À lire';
}

/**
 * Détecte et extrait l'ID depuis une URL MAL/AniList ou un nombre
 */
export function detectMalUrlOrId(term: string): { id: number | null } {
  // Détecter URL AniList
  const anilistUrlMatch = term.match(/anilist\.co\/manga\/(\d+)/i);
  if (anilistUrlMatch) {
    return { id: parseInt(anilistUrlMatch[1], 10) };
  }
  // Détecter URL MAL
  const malUrlMatch = term.match(/myanimelist\.net\/(?:anime|manga)\/(\d+)/i);
  if (malUrlMatch) {
    return { id: parseInt(malUrlMatch[1], 10) };
  }
  // Si c'est juste un nombre, on assume que c'est un ID MAL (plus commun)
  if (/^\d+$/.test(term.trim())) {
    return { id: parseInt(term.trim(), 10) };
  }
  return { id: null };
}

/**
 * Mappe le type de contenu vers le media_type pour les séries
 */
export function getMediaTypeFromContentType(contentType: ContentType): string | null {
  const mediaTypeMap: Record<ContentType, string | null> = {
    all: '',
    manga: 'Manga',
    manhwa: 'Manhwa',
    manhua: 'Manhua',
    lightNovel: 'Light Novel',
    webtoon: 'Webtoon',
    comics: 'Comic',
    bd: 'BD',
    books: '',
    oneShot: 'One-shot',
    unclassified: null
  };
  return mediaTypeMap[contentType];
}
