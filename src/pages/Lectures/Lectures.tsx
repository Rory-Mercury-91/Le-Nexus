import { ChevronDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookCard, MangaCard } from '../../components/cards';
import CollectionFiltersBar from '../../components/collections/CollectionFiltersBar';
import CollectionHeader from '../../components/collections/CollectionHeader';
import CollectionSearchBar from '../../components/collections/CollectionSearchBar';
import FilterToggle from '../../components/collections/FilterToggle';
import Pagination from '../../components/collections/Pagination';
import ProgressionHeader, { ProgressionStats } from '../../components/collections/ProgressionHeader';
import CollectionView from '../../components/common/CollectionView';
import AddContentTypeModal from '../../components/modals/lectures/AddContentTypeModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { BookListItem, Serie, SerieFilters } from '../../types';
import { getSerieStatusLabel } from '../../utils/manga-status';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { translateGenre, translateTheme } from '../../utils/translations';

type ContentType = 'all' | 'manga' | 'manhwa' | 'manhua' | 'lightNovel' | 'webtoon' | 'comics' | 'bd' | 'books' | 'unclassified';

interface ContentTypeInfo {
  type: ContentType;
  label: string;
  icon: string;
  count: number;
}

// Type combiné pour les items (Serie ou BookListItem)
type LectureItem = Serie | BookListItem;

// Helper pour déterminer si un item est une Serie
const isSerie = (item: LectureItem): item is Serie => {
  return 'media_type' in item;
};

// Constantes pour les filtres
const MANGA_VOLUME_TYPE_OPTIONS: Array<{ value: Serie['type_volume']; label: string }> = [
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

const MANGA_STATUS_TO_TAG: Record<(typeof COMMON_STATUSES.MANGA)[number], string> = {
  'À lire': 'a_lire',
  'En cours': 'en_cours',
  'En pause': 'en_pause',
  'Terminé': 'lu',
  'Abandonné': 'abandonne'
};

const MANGA_TAG_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '🔍 Tous les tags' },
  ...COMMON_STATUSES.MANGA.map(status => ({
    value: MANGA_STATUS_TO_TAG[status],
    label: formatStatusLabel(status, { category: 'manga' })
  }))
];

export default function Lectures() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showToast, ToastContainer } = useToast();

  const [contentTypes, setContentTypes] = useState<{
    manga: number;
    manhwa: number;
    manhua: number;
    lightNovel: number;
    webtoon: number;
    comics: number;
    bd: number;
    books: number;
    unclassified?: number;
  } | null>(null);

  const [selectedType, setSelectedType] = useState<ContentType>('all');
  const [series, setSeries] = useState<Serie[]>([]);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState<ProgressionStats>({});

  // États pour les filtres
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    'collection.lectures.search',
    '',
    { storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    'collection.lectures.statusFilter',
    '',
    { storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.lectures.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.lectures.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<string>(
    'collection.lectures.sortBy',
    'title-asc',
    { storage: 'session' }
  );
  const [viewMode, handleViewModeChange] = useCollectionViewMode('mangas'); // Utiliser 'mangas' pour la persistance

  // Filtres additionnels (comme Mangas)
  const [filters, setFilters] = usePersistentState<SerieFilters>(
    'collection.lectures.filters',
    {},
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'collection.lectures.filters.showMajOnly',
    false,
    { storage: 'session' }
  );
  const [mihonFilter, setMihonFilter] = usePersistentState<string>(
    'collection.lectures.filters.mihonFilter',
    'all',
    { storage: 'session' }
  );
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    'collection.lectures.filters.selectedLabels',
    [],
    { storage: 'session' }
  );
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    'collection.lectures.filters.selectedGenres',
    [],
    { storage: 'session' }
  );
  const [selectedThemes, setSelectedThemes] = usePersistentState<string[]>(
    'collection.lectures.filters.selectedThemes',
    [],
    { storage: 'session' }
  );
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [serieLabels, setSerieLabels] = useState<Record<number, Array<{ label: string; color: string }>>>({});
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);
  const [showThemesFilter, setShowThemesFilter] = useState(false);
  const [availableSites, setAvailableSites] = useState<Array<{ id: string; name: string; baseUrl: string }>>([]);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useScrollRestoration('collection.lectures.scroll', !loading);

  useEffect(() => {
    loadContentTypes();
    const typeParam = searchParams.get('type') as ContentType | null;
    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (contentTypes) {
      loadContent();
      loadStats();
    }
  }, [selectedType, contentTypes, filters, showHidden, searchTerm]);

  // Debounce de la recherche
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      // La recherche est gérée par useCollectionFilters
    }, 200);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  const loadContentTypes = async () => {
    try {
      const types = await window.electronAPI.getAvailableContentTypes?.();
      if (types) {
        setContentTypes(types);
      }
    } catch (error) {
      console.error('Erreur chargement types de contenu:', error);
    }
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      if (selectedType === 'all') {
        await Promise.all([
          loadMangaSeries(),
          loadBooks()
        ]);
      } else if (selectedType === 'books') {
        await loadBooks();
        setSeries([]);
      } else {
        await loadMangaSeries();
        setBooks([]);
      }
    } catch (error) {
      console.error('Erreur chargement contenu:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du chargement du contenu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMangaSeries = async () => {
    try {
      const trimmed = searchTerm.trim();
      const filtersWithHidden: SerieFilters = {
        ...filters,
        ...(trimmed ? { search: trimmed } : {}),
        ...(showHidden ? { afficherMasquees: true } : {})
      };

      const allSeries = await window.electronAPI.getSeries(filtersWithHidden);

      // Extraire les labels depuis les données
      const labelsMap: Record<number, Array<{ label: string; color: string }>> = {};
      for (const serie of allSeries || []) {
        if (serie.labels && Array.isArray(serie.labels)) {
          labelsMap[serie.id] = serie.labels;
        }
      }
      setSerieLabels(labelsMap);

      // Charger tous les labels disponibles
      try {
        const allLabels = await window.electronAPI.getAllMangaLabels();
        setAvailableLabels(allLabels);
      } catch (error) {
        console.error('Erreur chargement labels:', error);
      }

      // Charger tous les genres et thèmes disponibles
      try {
        const allGenres = await window.electronAPI.getAllMangaGenres();
        setAvailableGenres(allGenres);
        const allThemes = await window.electronAPI.getAllMangaThemes();
        setAvailableThemes(allThemes);
      } catch (error) {
        console.error('Erreur chargement genres/thèmes:', error);
      }

      if (selectedType === 'all') {
        setSeries(allSeries || []);
      } else {
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
          unclassified: null  // null signifie media_type NULL
        };

        const targetMediaType = mediaTypeMap[selectedType];
        const filtered = (allSeries || []).filter((serie: Serie) => {
          // Pour "unclassified", on filtre les séries avec media_type NULL ou vide
          if (selectedType === 'unclassified') {
            return !serie.media_type || serie.media_type === '';
          }

          const serieMediaType = (serie.media_type || '').toLowerCase();
          const target = targetMediaType ? targetMediaType.toLowerCase() : '';

          if (selectedType === 'lightNovel') {
            return serieMediaType.includes('light novel') || serieMediaType.includes('novel');
          }

          return serieMediaType === target || serieMediaType.includes(target);
        });

        setSeries(filtered);
      }
    } catch (error) {
      console.error('Erreur chargement séries manga:', error);
    }
  };

  // Charger les sites disponibles
  useEffect(() => {
    const loadAvailableSites = async () => {
      try {
        if (!window.electronAPI.getAvailableSources) return;
        const result = await window.electronAPI.getAvailableSources();
        if (result.success && result.sources) {
          setAvailableSites(result.sources.map((source: any) => ({
            ...source,
            baseUrl: ''
          })));
        } else {
          // Fallback : charger depuis toutes les séries
          try {
            const allSeries = await window.electronAPI.getSeries({});
            const domains = new Set<string>();
            (allSeries || []).forEach((serie: Serie) => {
              if (serie.source_url) {
                try {
                  const url = new URL(serie.source_url);
                  const hostname = url.hostname.replace(/^www\./, '');
                  if (hostname) {
                    domains.add(hostname);
                  }
                } catch (e) {
                  // Ignorer les erreurs
                }
              }
            });
            const fallbackSites = Array.from(domains).map(domain => ({
              id: domain,
              name: domain,
              baseUrl: `https://${domain}`
            }));
            setAvailableSites(fallbackSites);
          } catch (fallbackError) {
            console.error('Erreur chargement sites (fallback):', fallbackError);
          }
        }
      } catch (error) {
        console.error('Erreur chargement sites:', error);
      }
    };
    loadAvailableSites();
  }, []);

  const loadBooks = async () => {
    try {
      const booksData = await window.electronAPI.booksGet?.({});
      setBooks(booksData || []);
    } catch (error) {
      console.error('Erreur chargement livres:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Charger les stats des mangas
      const lectureStats = await window.electronAPI.getLectureStatistics?.();

      // Combiner les stats
      setStats({
        seriesEnCours: lectureStats ? (lectureStats.seriesTotal - lectureStats.seriesCompletes) : 0,
        seriesTerminees: lectureStats?.seriesCompletes || 0,
        tomesLus: lectureStats?.tomesLus || 0,
        tomesTotal: lectureStats?.tomesTotal || 0,
        chapitresLus: lectureStats?.chapitresLus || 0,
        chapitresTotal: lectureStats?.chapitresTotal || 0,
        progressionTomes: lectureStats?.progressionTomes ?? null,
        progressionChapitres: lectureStats?.progressionChapitres ?? null
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // Combiner les items pour le filtrage
  const allItems: LectureItem[] = [
    ...series,
    ...books
  ];

  // Configuration pour useCollectionFilters
  const {
    sortedItems,
    hasActiveFilters: hasActiveFiltersBase
  } = useCollectionFilters({
    items: allItems,
    search: searchTerm,
    statusFilter,
    showFavoriteOnly,
    showHidden,
    showMajOnly,
    sortBy,
    searchConfig: {
      getTitle: (item) => isSerie(item) ? item.titre : item.titre,
      getOriginalTitle: (item) => isSerie(item) ? undefined : undefined,
      getExternalId: (item) => isSerie(item) ? (item.mal_id ? parseInt(item.mal_id.toString(), 10) : null) : null
    },
    filterConfig: {
      getIsHidden: (item) => isSerie(item) ? !!item.is_masquee : !!item.is_hidden,
      getIsFavorite: (item) => isSerie(item) ? !!item.is_favorite : !!item.is_favorite,
      getStatus: (item) => {
        if (isSerie(item)) {
          return getSerieStatusLabel(item);
        } else {
          return item.statut_lecture || 'À lire';
        }
      },
      getHasUpdates: (item) => {
        if (!isSerie(item)) return false;
        // Vérifier si la série a des mises à jour disponibles
        return false; // TODO: Implémenter la logique de détection des MAJ
      },
      customFilter: (item) => {
        // Filtrer par type de contenu si nécessaire
        if (selectedType !== 'all') {
          if (selectedType === 'books' && isSerie(item)) {
            return false;
          }
          if (selectedType !== 'books' && !isSerie(item)) {
            return false;
          }

          // Pour les séries, vérifier le media_type
          if (isSerie(item) && selectedType !== 'books') {
            // Pour "unclassified", on filtre les séries avec media_type NULL ou vide
            if (selectedType === 'unclassified') {
              return !item.media_type || item.media_type === '';
            }

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
              unclassified: null
            };
            const targetMediaType = mediaTypeMap[selectedType];
            const serieMediaType = (item.media_type || '').toLowerCase();
            const target = targetMediaType ? targetMediaType.toLowerCase() : '';

            if (selectedType === 'lightNovel') {
              return serieMediaType.includes('light novel') || serieMediaType.includes('novel');
            }

            return serieMediaType === target || serieMediaType.includes(target);
          }
        }

        // Filtre par genres
        if (selectedGenres.length > 0 && isSerie(item)) {
          if (!item.genres) return false;
          const serieGenres = item.genres.split(',').map(g => g.trim()).filter(Boolean);
          const hasAllGenres = selectedGenres.every(genre => serieGenres.includes(genre));
          if (!hasAllGenres) return false;
        }

        // Filtre par thèmes
        if (selectedThemes.length > 0 && isSerie(item)) {
          if (!item.themes) return false;
          const serieThemes = item.themes.split(',').map(t => t.trim()).filter(Boolean);
          const hasAllThemes = selectedThemes.every(theme => serieThemes.includes(theme));
          if (!hasAllThemes) return false;
        }

        // Filtre par labels
        if (selectedLabels.length > 0 && isSerie(item)) {
          const labels = serieLabels[item.id] || [];
          const hasAnyLabel = selectedLabels.some(label => labels.some(l => l.label === label));
          if (!hasAnyLabel) return false;
        }

        // Filtre Mihon/Source
        if (mihonFilter !== 'all' && isSerie(item)) {
          const hasTomesMihon = item.tomes?.some(tome => tome.mihon === 1);
          const hasChapitresMihon = item.chapitres_mihon === 1;
          const isMihon = hasTomesMihon || hasChapitresMihon;
          const sourceDonnees = item.source_donnees;
          const isMal = sourceDonnees === 'mal' || sourceDonnees === 'mal+nautiljon';
          const isNautiljon = sourceDonnees === 'nautiljon' || sourceDonnees === 'mal+nautiljon';

          switch (mihonFilter) {
            case 'mihon':
              if (!isMihon) return false;
              break;
            case 'not_mihon':
              if (isMihon) return false;
              if (!isMal && !isNautiljon) return false;
              break;
            case 'mal':
              if (!isMal) return false;
              break;
            case 'not_mal':
              if (isMal) return false;
              if (!isMihon && !isNautiljon) return false;
              break;
            case 'nautiljon':
              if (!isNautiljon) return false;
              break;
            case 'not_nautiljon':
              if (isNautiljon) return false;
              if (!isMihon && !isMal) return false;
              break;
          }
        }

        // Filtres additionnels depuis filters
        if (filters.type_volume && isSerie(item) && item.type_volume !== filters.type_volume) {
          return false;
        }
        if (filters.statut && isSerie(item) && item.statut_publication !== filters.statut) {
          return false;
        }
        if (filters.tag && isSerie(item)) {
          // TODO: Vérifier le tag
        }
        if (filters.source_id && isSerie(item) && item.source_id !== filters.source_id) {
          return false;
        }

        return true;
      }
    },
    sortConfig: {
      sortOptions: {
        'title-asc': {
          label: 'Titre A-Z',
          compare: (a, b) => {
            const titleA = isSerie(a) ? a.titre : a.titre;
            const titleB = isSerie(b) ? b.titre : b.titre;
            return titleA.localeCompare(titleB);
          }
        },
        'title-desc': {
          label: 'Titre Z-A',
          compare: (a, b) => {
            const titleA = isSerie(a) ? a.titre : a.titre;
            const titleB = isSerie(b) ? b.titre : b.titre;
            return titleB.localeCompare(titleA);
          }
        },
        'date-desc': {
          label: 'Date ↓',
          compare: (a, b) => {
            const dateA = isSerie(a) ? new Date(a.created_at || 0).getTime() : new Date(a.created_at || 0).getTime();
            const dateB = isSerie(b) ? new Date(b.created_at || 0).getTime() : new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          }
        },
        'date-asc': {
          label: 'Date ↑',
          compare: (a, b) => {
            const dateA = isSerie(a) ? new Date(a.created_at || 0).getTime() : new Date(a.created_at || 0).getTime();
            const dateB = isSerie(b) ? new Date(b.created_at || 0).getTime() : new Date(b.created_at || 0).getTime();
            return dateA - dateB;
          }
        },
        'cost-desc': {
          label: 'Coût ↓',
          compare: (a, b) => {
            if (isSerie(a) && isSerie(b)) {
              const costA = a.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
              const costB = b.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
              return costB - costA;
            }
            return 0;
          }
        },
        'cost-asc': {
          label: 'Coût ↑',
          compare: (a, b) => {
            if (isSerie(a) && isSerie(b)) {
              const costA = a.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
              const costB = b.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
              return costA - costB;
            }
            return 0;
          }
        }
      },
      defaultSort: 'title-asc'
    }
  });

  // Pagination
  const {
    paginatedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  } = usePagination({
    items: sortedItems,
    defaultItemsPerPage: 50,
    storageKey: 'lectures-items-per-page',
    scrollStorageKey: 'collection.lectures.scroll'
  });

  const getContentTypeInfo = (): ContentTypeInfo[] => {
    if (!contentTypes) return [];

    return [
      { type: 'all', label: 'Tout', icon: '📚', count: Object.values(contentTypes).reduce((a, b) => a + (b || 0), 0) },
      { type: 'manga', label: 'Manga', icon: '📘', count: contentTypes.manga },
      { type: 'manhwa', label: 'Manhwa', icon: '📙', count: contentTypes.manhwa },
      { type: 'manhua', label: 'Manhua', icon: '📕', count: contentTypes.manhua },
      { type: 'lightNovel', label: 'Light Novel', icon: '📓', count: contentTypes.lightNovel },
      { type: 'webtoon', label: 'Webtoon', icon: '📱', count: contentTypes.webtoon },
      { type: 'comics', label: 'Comics', icon: '🦸', count: contentTypes.comics },
      { type: 'bd', label: 'BD', icon: '📗', count: contentTypes.bd },
      { type: 'books', label: 'Livres', icon: '📖', count: contentTypes.books },
      ...((contentTypes.unclassified || 0) > 0 ? [{ type: 'unclassified' as ContentType, label: 'Non classé', icon: '❓', count: contentTypes.unclassified || 0 }] : [])
    ];
  };

  const handleTypeChange = (type: ContentType) => {
    setSelectedType(type);
    navigate(`/lectures${type !== 'all' ? `?type=${type}` : ''}`);
  };

  const handleAddClick = () => {
    setShowAddModal(true);
  };

  const handleAddComplete = () => {
    setShowAddModal(false);
    loadContentTypes();
    loadContent();
    loadStats();
  };

  const handleFilterChange = (key: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key as keyof SerieFilters];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const handleLabelToggle = useCallback((label: string) => {
    setSelectedLabels(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  }, [setSelectedLabels]);

  const handleGenreToggle = useCallback((genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  }, [setSelectedGenres]);

  const handleThemeToggle = useCallback((theme: string) => {
    setSelectedThemes(prev => {
      if (prev.includes(theme)) {
        return prev.filter(t => t !== theme);
      } else {
        return [...prev, theme];
      }
    });
  }, [setSelectedThemes]);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowMajOnly(false);
    setMihonFilter('all');
    setSelectedLabels([]);
    setSelectedGenres([]);
    setSelectedThemes([]);
  }, [setFilters, setSearchTerm, setStatusFilter, setShowFavoriteOnly, setShowHidden, setShowMajOnly, setMihonFilter, setSelectedLabels, setSelectedGenres, setSelectedThemes]);

  const handleToggleFavorite = async (item: LectureItem) => {
    try {
      if (isSerie(item)) {
        const currentUser = await window.electronAPI.getCurrentUser();
        if (currentUser) {
          const users = await window.electronAPI.getAllUsers();
          const user = users.find((u) => u.name === currentUser);
          if (user) {
            await window.electronAPI.toggleSerieFavorite(item.id, user.id);
          }
        }
      } else {
        await window.electronAPI.booksToggleFavorite?.({ bookId: item.id });
      }
      loadContent();
      loadStats();
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
    }
  };

  const handleChangeStatus = async (item: LectureItem, status: string) => {
    try {
      if (isSerie(item)) {
        // TODO: Implémenter changement de statut pour les séries
      } else {
        await window.electronAPI.booksSetStatus?.({ bookId: item.id, statut: status });
      }
      loadContent();
      loadStats();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  };

  const handleToggleHidden = async (item: LectureItem) => {
    try {
      if (isSerie(item)) {
        const isMasquee = await window.electronAPI.isSerieMasquee(item.id);
        if (isMasquee) {
          await window.electronAPI.demasquerSerie(item.id);
        } else {
          await window.electronAPI.masquerSerie(item.id);
        }
      } else {
        await window.electronAPI.booksToggleHidden?.({ bookId: item.id });
      }
      loadContent();
      loadStats();
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
    }
  };

  const contentTypeInfo = getContentTypeInfo();
  const visibleTypes = contentTypeInfo.filter(ct => ct.count > 0 || ct.type === 'all');
  // Utiliser sortedItems.length pour avoir le total des éléments filtrés et affichés
  const totalCount = sortedItems.length;

  return (
    <>
      {ToastContainer}
      {showAddModal && (
        <AddContentTypeModal
          onClose={() => setShowAddModal(false)}
          onComplete={handleAddComplete}
        />
      )}

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Tout"
            icon="📚"
            count={totalCount}
            countLabel={totalCount > 1 ? 'œuvres' : 'œuvre'}
            onAdd={handleAddClick}
            addButtonLabel="Ajouter"
            extraButtons={(
              <button
                onClick={() => {
                  loadContent();
                  loadStats();
                }}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Recharger
              </button>
            )}
          />

          {/* Stats de progression */}
          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="manga" stats={stats} />
          </div>

          {/* Filtres par type de contenu */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            {visibleTypes.map(ct => (
              <button
                key={ct.type}
                onClick={() => handleTypeChange(ct.type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: selectedType === ct.type ? 'var(--primary)' : 'var(--bg-secondary)',
                  color: selectedType === ct.type ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: selectedType === ct.type ? '600' : '400',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (selectedType !== ct.type) {
                    e.currentTarget.style.background = 'var(--hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedType !== ct.type) {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }
                }}
              >
                {ct.icon} {ct.label}{ct.count > 0 ? ` (${ct.count})` : ''}
              </button>
            ))}
          </div>

          {/* Recherche et filtres */}
          <CollectionFiltersBar
            hasActiveFilters={(hasActiveFiltersBase || mihonFilter !== 'all' ||
              !!filters.type_volume || !!filters.tag || !!filters.source_id ||
              selectedLabels.length > 0 || selectedGenres.length > 0 || selectedThemes.length > 0) || selectedType !== 'all'}
            onClearFilters={handleClearFilters}
          >
            <CollectionSearchBar
              placeholder="Rechercher une série (titre ou MAL ID)..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSubmit={() => undefined}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="title-asc">📖 Titre (A → Z)</option>
                <option value="title-desc">📖 Titre (Z → A)</option>
                <option value="date-desc">🆕 Ajout récent</option>
                <option value="date-asc">🕐 Ajout ancien</option>
                <option value="cost-desc">💰 Coût total (décroissant)</option>
                <option value="cost-asc">💰 Coût total (croissant)</option>
              </select>

              <select
                className="select"
                value={filters.statut || ''}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="">🔍 Tous les statuts</option>
                <option value="En cours">🔵 En cours</option>
                <option value="Terminée">✅ Terminée</option>
                <option value="Abandonnée">🚫 Abandonnée</option>
              </select>

              <select
                className="select"
                value={filters.type_volume || ''}
                onChange={(e) => handleFilterChange('type_volume', e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="">🔍 Tous les types</option>
                {MANGA_VOLUME_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={filters.tag || ''}
                onChange={(e) => handleFilterChange('tag', e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                {MANGA_TAG_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={mihonFilter}
                onChange={(e) => setMihonFilter(e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="all">🔍 Tout</option>
                <option value="mihon">Mihon</option>
                <option value="not_mihon">Pas sur Mihon</option>
                <option value="mal">My Anime List</option>
                <option value="not_mal">Pas sur MyAnimeList</option>
                <option value="nautiljon">Nautiljon</option>
                <option value="not_nautiljon">Pas sur Nautiljon</option>
              </select>

              {availableSites.length > 0 && (
                <select
                  className="select"
                  value={filters.source_id || ''}
                  onChange={(e) => handleFilterChange('source_id', e.target.value)}
                  style={{ width: 'auto', flex: '0 0 auto' }}
                >
                  <option value="">🔍 Tous les sites</option>
                  {availableSites.map((site: { id: string; name: string; baseUrl: string }) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Ligne 2 : Toggles MAJ, Favoris et Masqués */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', marginTop: '12px' }}>
              <FilterToggle
                checked={showMajOnly}
                onChange={setShowMajOnly}
                label="🔔 MAJ"
                icon="🔔"
                activeColor="#22c55e"
              />

              <FilterToggle
                checked={showFavoriteOnly}
                onChange={setShowFavoriteOnly}
                label="❤️ Favoris"
                icon="❤️"
                activeColor="var(--error)"
              />

              <FilterToggle
                checked={showHidden}
                onChange={setShowHidden}
                label="👁️ Lectures masquées"
                icon="👁️"
                activeColor="#f59e0b"
              />
            </div>

            {/* Filtre par genres */}
            {availableGenres.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowGenresFilter(!showGenresFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: showGenresFilter ? '12px' : '0'
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🎭 Filtrer par genres
                    {selectedGenres.length > 0 && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                        {selectedGenres.length}
                      </span>
                    )}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: showGenresFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {showGenresFilter && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                    {availableGenres.map(genre => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => handleGenreToggle(genre)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '500',
                            border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(34, 197, 94, 0.3)',
                            background: isSelected ? 'var(--primary)' : 'rgba(34, 197, 94, 0.15)',
                            color: isSelected ? 'white' : '#86efac',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {translateGenre(genre)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Filtre par thèmes */}
            {availableThemes.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowThemesFilter(!showThemesFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: showThemesFilter ? '12px' : '0'
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🎨 Filtrer par thèmes
                    {selectedThemes.length > 0 && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                        {selectedThemes.length}
                      </span>
                    )}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: showThemesFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {showThemesFilter && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                    {availableThemes.map(theme => {
                      const isSelected = selectedThemes.includes(theme);
                      return (
                        <button
                          key={theme}
                          onClick={() => handleThemeToggle(theme)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '500',
                            border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(168, 85, 247, 0.3)',
                            background: isSelected ? 'var(--primary)' : 'rgba(168, 85, 247, 0.15)',
                            color: isSelected ? 'white' : '#c4b5fd',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {translateTheme(theme)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Filtre par labels */}
            {availableLabels.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowLabelsFilter(!showLabelsFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: showLabelsFilter ? '12px' : '0'
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🏷️ Filtrer par labels
                    {selectedLabels.length > 0 && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                        {selectedLabels.length}
                      </span>
                    )}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: showLabelsFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {showLabelsFilter && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                    {availableLabels.map(labelObj => (
                      <button
                        key={labelObj.label}
                        onClick={() => handleLabelToggle(labelObj.label)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '600',
                          border: selectedLabels.includes(labelObj.label) ? `2px solid ${labelObj.color}` : `2px solid ${labelObj.color}40`,
                          background: selectedLabels.includes(labelObj.label) ? labelObj.color : `${labelObj.color}20`,
                          color: selectedLabels.includes(labelObj.label) ? 'white' : labelObj.color,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {labelObj.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CollectionFiltersBar>

          {/* Contenu */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Chargement...</p>
            </div>
          ) : (
            <>
              <CollectionView
                items={paginatedItems}
                viewMode={viewMode}
                gridMinWidth={200}
                imageMinWidth={200}
                renderCard={(item) => {
                  if (isSerie(item)) {
                    return (
                      <MangaCard
                        serie={item}
                        onClick={() => {
                          const currentPath = location.pathname + location.search;
                          navigate(`/serie/${item.id}`, { state: { from: currentPath } });
                        }}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                        onChangeStatus={(status) => handleChangeStatus(item, status)}
                        onToggleHidden={() => handleToggleHidden(item)}
                      />
                    );
                  } else {
                    return (
                      <BookCard
                        book={item}
                        onClick={() => {
                          const currentPath = location.pathname + location.search;
                          navigate(`/books/${item.id}`, { state: { from: currentPath } });
                        }}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                        onChangeStatus={(status) => handleChangeStatus(item, status)}
                        onToggleHidden={() => handleToggleHidden(item)}
                      />
                    );
                  }
                }}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={sortedItems.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                onFirstPage={goToFirstPage}
                onLastPage={goToLastPage}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
