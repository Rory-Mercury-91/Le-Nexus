/**
 * Configuration pour les pages de collection d'animes
 */
export interface AnimeCollectionPageConfig {
  /** Type d'anime à filtrer ('TV', 'ONA', 'OVA', 'Movie', 'Special', ou 'Unclassified') */
  animeType: 'TV' | 'ONA' | 'OVA' | 'Movie' | 'Special' | 'Unclassified';
  /** Clé de stockage pour la persistance (ex: 'videos.tv', 'videos.ona') */
  storageKey: string;
  /** Titre de la page (ex: 'Collection Anime - TV') */
  title: string;
  /** Icône de la page (ex: '📺') */
  icon: string;
  /** Placeholder pour la barre de recherche */
  searchPlaceholder: string;
  /** Message vide par défaut (ex: 'Aucun animé TV dans votre collection') */
  emptyMessage: string;
  /** Emoji pour l'icône vide (ex: '📺') */
  emptyIconEmoji: string;
}
