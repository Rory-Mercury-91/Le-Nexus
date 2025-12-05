import { useEffect, useMemo, useState } from 'react';

/**
 * Configuration pour la recherche dans les collections
 */
export interface SearchConfig<T> {
  /** Fonction pour obtenir le titre de l'item */
  getTitle: (item: T) => string;
  /** Fonction pour obtenir le titre original de l'item */
  getOriginalTitle?: (item: T) => string | null | undefined;
  /** Fonction pour obtenir l'ID externe (tmdb_id, mal_id, etc.) pour recherche par ID */
  getExternalId?: (item: T) => number | null | undefined;
  /** Fonction pour détecter et extraire un ID depuis une URL ou un texte (ex: URL MAL) */
  detectIdFromSearch?: (searchTerm: string) => { id: number | null } | null;
}

/**
 * Configuration pour le filtrage
 */
export interface FilterConfig<T> {
  /** Fonction pour obtenir si l'item est masqué */
  getIsHidden?: (item: T) => boolean;
  /** Fonction pour obtenir si l'item est favori */
  getIsFavorite?: (item: T) => boolean;
  /** Fonction pour obtenir le statut de l'item */
  getStatus?: (item: T) => string | null | undefined;
  /** Fonction pour obtenir si l'item a des mises à jour disponibles (optionnel, pour Series/Animes) */
  getHasUpdates?: (item: T) => boolean;
  /** Fonction pour obtenir si l'item est dans la watchlist (optionnel, pour Movies) */
  getIsInWatchlist?: (item: T) => boolean;
  /** Fonction personnalisée pour filtres additionnels */
  customFilter?: (item: T) => boolean;
}

/**
 * Configuration pour le tri
 */
export interface SortConfig<T> {
  /** Options de tri disponibles */
  sortOptions: Record<string, {
    label: string;
    compare: (a: T, b: T) => number;
  }>;
  /** Option de tri par défaut */
  defaultSort: string;
}

/**
 * Configuration complète pour useCollectionFilters
 */
export interface CollectionFiltersConfig<T> {
  /** Items à filtrer et trier */
  items: T[];
  /** Terme de recherche */
  search: string;
  /** Filtre par statut */
  statusFilter?: string;
  /** Afficher uniquement les favoris */
  showFavoriteOnly?: boolean;
  /** Afficher les éléments masqués */
  showHidden?: boolean;
  /** Afficher uniquement les éléments avec mises à jour */
  showMajOnly?: boolean;
  /** Afficher uniquement la watchlist */
  showWatchlistOnly?: boolean;
  /** Option de tri actuelle */
  sortBy: string;
  /** Configuration de recherche */
  searchConfig: SearchConfig<T>;
  /** Configuration de filtrage */
  filterConfig: FilterConfig<T>;
  /** Configuration de tri */
  sortConfig: SortConfig<T>;
}

/**
 * Résultat du hook useCollectionFilters
 */
export interface CollectionFiltersResult<T> {
  /** Items filtrés */
  filteredItems: T[];
  /** Items triés */
  sortedItems: T[];
  /** Indique si des filtres sont actifs */
  hasActiveFilters: boolean;
  /** Terme de recherche normalisé (pour affichage) */
  normalizedSearch: string;
}

/**
 * Hook générique pour filtrer, rechercher et trier des collections
 * 
 * @example
 * ```tsx
 * const {
 *   filteredItems,
 *   sortedItems,
 *   hasActiveFilters,
 *   normalizedSearch
 * } = useCollectionFilters({
 *   items: movies,
 *   search,
 *   statusFilter,
 *   showFavoriteOnly,
 *   showHidden,
 *   sortBy,
 *   searchConfig: {
 *     getTitle: (m) => m.titre,
 *     getOriginalTitle: (m) => m.titre_original,
 *     getExternalId: (m) => m.tmdb_id
 *   },
 *   filterConfig: {
 *     getIsHidden: (m) => m.is_hidden,
 *     getIsFavorite: (m) => m.is_favorite,
 *     getStatus: (m) => m.statut_visionnage || 'À regarder'
 *   },
 *   sortConfig: {
 *     sortOptions: {
 *       'title-asc': { label: 'Titre A-Z', compare: (a, b) => a.titre.localeCompare(b.titre) },
 *       'date-desc': { label: 'Date ↓', compare: (a, b) => new Date(b.date_sortie).getTime() - new Date(a.date_sortie).getTime() }
 *     },
 *     defaultSort: 'date-desc'
 *   }
 * });
 * ```
 */
export function useCollectionFilters<T>(config: CollectionFiltersConfig<T>): CollectionFiltersResult<T> {
  const {
    items,
    search,
    statusFilter = '',
    showFavoriteOnly = false,
    showHidden = false,
    showMajOnly = false,
    showWatchlistOnly = false,
    sortBy,
    searchConfig,
    filterConfig,
    sortConfig
  } = config;

  const { getTitle, getOriginalTitle, getExternalId, detectIdFromSearch } = searchConfig;
  const { getIsHidden, getIsFavorite, getStatus, getHasUpdates, getIsInWatchlist, customFilter } = filterConfig;
  const { sortOptions, defaultSort } = sortConfig;

  // Normaliser le terme de recherche
  const normalizedSearch = search.trim().toLowerCase();
  const [internalSearch, setInternalSearch] = useState(normalizedSearch);

  // Synchroniser internalSearch avec search (avec debounce implicite via useState)
  useEffect(() => {
    setInternalSearch(normalizedSearch);
  }, [normalizedSearch]);

  // Filtrer les items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filtre : éléments masqués
      // Si showHidden est true, afficher uniquement les masqués
      // Si showHidden est false, exclure les masqués
      if (getIsHidden) {
        const isHidden = getIsHidden(item);
        if (showHidden && !isHidden) {
          return false;
        }
        if (!showHidden && isHidden) {
          return false;
        }
      }

      // Filtre : favoris uniquement
      if (showFavoriteOnly && getIsFavorite && !getIsFavorite(item)) {
        return false;
      }

      // Filtre : mises à jour uniquement
      if (showMajOnly && getHasUpdates && !getHasUpdates(item)) {
        return false;
      }

      // Filtre : watchlist uniquement (pour Movies)
      if (showWatchlistOnly && getIsInWatchlist) {
        const status = getStatus ? (getStatus(item) || 'À regarder') : 'À regarder';
        if (status === 'Terminé') {
          return false;
        }
      }

      // Filtre : statut
      if (statusFilter) {
        const itemStatus = getStatus ? (getStatus(item) || 'À regarder') : 'À regarder';
        if (itemStatus !== statusFilter) {
          return false;
        }
      }

      // Recherche
      if (internalSearch) {
        const isNumeric = /^\d+$/.test(internalSearch);

        // Recherche par ID externe (tmdb_id, mal_id, etc.)
        if (isNumeric && getExternalId) {
          const externalId = getExternalId(item);
          if (externalId && externalId === Number(internalSearch)) {
            return true;
          }
        }

        // Recherche par ID depuis URL (ex: URL MAL)
        if (detectIdFromSearch) {
          const detectedId = detectIdFromSearch(internalSearch);
          if (detectedId?.id !== null && detectedId?.id !== undefined && getExternalId) {
            const externalId = getExternalId(item);
            if (externalId && externalId === detectedId.id) {
              return true;
            }
          }
        }

        // Recherche textuelle dans titre et titre original
        const title = getTitle(item).toLowerCase();
        const originalTitle = getOriginalTitle ? (getOriginalTitle(item) || '').toLowerCase() : '';

        if (!title.includes(internalSearch) && !originalTitle.includes(internalSearch)) {
          return false;
        }
      }

      // Filtre personnalisé
      if (customFilter && !customFilter(item)) {
        return false;
      }

      return true;
    });
  }, [
    items,
    internalSearch,
    showHidden,
    showFavoriteOnly,
    showMajOnly,
    showWatchlistOnly,
    statusFilter,
    getIsHidden,
    getIsFavorite,
    getStatus,
    getHasUpdates,
    getIsInWatchlist,
    getTitle,
    getOriginalTitle,
    getExternalId,
    detectIdFromSearch,
    customFilter
  ]);

  // Trier les items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    const sortOption = sortOptions[sortBy] || sortOptions[defaultSort];

    if (sortOption) {
      return list.sort(sortOption.compare);
    }

    // Fallback : pas de tri
    return list;
  }, [filteredItems, sortBy, sortOptions, defaultSort]);

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = useMemo(() => {
    return (
      normalizedSearch.length > 0 ||
      statusFilter !== '' ||
      showFavoriteOnly ||
      (showHidden && !!getIsHidden) ||
      showMajOnly ||
      showWatchlistOnly
    );
  }, [normalizedSearch, statusFilter, showFavoriteOnly, showHidden, showMajOnly, showWatchlistOnly, getIsHidden]);

  return {
    filteredItems,
    sortedItems,
    hasActiveFilters,
    normalizedSearch
  };
}
