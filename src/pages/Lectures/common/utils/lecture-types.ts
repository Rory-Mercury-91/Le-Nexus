import { BookListItem, Serie } from '../../../../types';

/**
 * Types de contenu disponibles pour les lectures
 */
export type ContentType = 'all' | 'manga' | 'manhwa' | 'manhua' | 'lightNovel' | 'webtoon' | 'comics' | 'bd' | 'books' | 'oneShot' | 'unclassified';

/**
 * Type union pour les items de lecture (série ou livre)
 */
export type LectureItem = Serie | BookListItem;

/**
 * Helper pour déterminer si un item est une Serie
 */
export const isSerie = (item: LectureItem): item is Serie => {
  return 'media_type' in item;
};

/**
 * Configuration pour les pages de collection de lectures
 */
export interface LectureCollectionPageConfig {
  /** Type de contenu à filtrer */
  contentType: ContentType;
  /** Clé de stockage pour la persistance (ex: 'lectures.manga', 'lectures.books') */
  storageKey: string;
  /** Titre de la page (ex: 'Collection Manga') */
  title: string;
  /** Icône de la page (ex: '📘') */
  icon: string;
  /** Placeholder pour la barre de recherche */
  searchPlaceholder: string;
  /** Message vide par défaut (ex: 'Aucun manga dans votre collection') */
  emptyMessage: string;
  /** Emoji pour l'icône vide (ex: '📘') */
  emptyIconEmoji: string;
}
