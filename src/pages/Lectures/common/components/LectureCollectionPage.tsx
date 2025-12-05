import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookCard, MangaCard } from '../../../../components/cards';
import {
  BackToBottomButton,
  BackToTopButton,
  CollectionHeader,
  LectureCollectionFilters,
  Pagination,
  ProgressionHeader,
  ProgressionStats
} from '../../../../components/collections';
import CollectionView from '../../../../components/common/CollectionView';
import AddBookComicBdModal from '../../../../components/modals/lectures/AddBookComicBdModal';
import AddLectureTypeModal from '../../../../components/modals/lectures/AddLectureTypeModal';
import AddMangaModal from '../../../../components/modals/lectures/AddMangaModal';
import { useCollectionViewMode } from '../../../../hooks/collections/useCollectionViewMode';
import { useMultiDelete } from '../../../../hooks/collections/useMultiDelete';
import { usePagination } from '../../../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../../../hooks/common/usePersistentState';
import { useScrollRestoration } from '../../../../hooks/common/useScrollRestoration';
import { useToast } from '../../../../hooks/common/useToast';
import { BookListItem, Serie, SerieFilters } from '../../../../types';
import { isLectureSortOption, LectureSortOption } from '../utils/constants';
import { detectMalUrlOrId, getMediaTypeFromContentType, resolveLectureStatus } from '../utils/lecture-helpers';
import { ContentType, isSerie, LectureCollectionPageConfig, LectureItem } from '../utils/lecture-types';

interface LectureCollectionPageProps {
  config: LectureCollectionPageConfig;
}

export default function LectureCollectionPage({ config }: LectureCollectionPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [series, setSeries] = useState<Serie[]>([]);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProgressionStats>({});
  const [viewMode, handleViewModeChange] = useCollectionViewMode('mangas');
  const [showAddModal, setShowAddModal] = useState(false);

  // États de recherche et tri
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    `${config.storageKey}.search`,
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<LectureSortOption>(
    `${config.storageKey}.sortBy`,
    'title-asc',
    { validator: isLectureSortOption, storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    `${config.storageKey}.statusFilter`,
    '',
    { storage: 'session' }
  );

  // États de filtres booléens
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    `${config.storageKey}.filters.showFavoriteOnly`,
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    `${config.storageKey}.filters.showHidden`,
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    `${config.storageKey}.filters.showMajOnly`,
    false,
    { storage: 'session' }
  );

  // Filtres additionnels
  const [filters, setFilters] = usePersistentState<SerieFilters>(
    `${config.storageKey}.filters`,
    {},
    { storage: 'session' }
  );
  const [mihonFilter, setMihonFilter] = usePersistentState<string>(
    `${config.storageKey}.filters.mihonFilter`,
    'all',
    { storage: 'session' }
  );
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    `${config.storageKey}.filters.selectedLabels`,
    [],
    { storage: 'session' }
  );
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    `${config.storageKey}.filters.selectedGenres`,
    [],
    { storage: 'session' }
  );
  const [selectedThemes, setSelectedThemes] = usePersistentState<string[]>(
    `${config.storageKey}.filters.selectedThemes`,
    [],
    { storage: 'session' }
  );

  // États pour les données disponibles
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [serieLabels, setSerieLabels] = useState<Record<number, Array<{ label: string; color: string }>>>({});
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);
  const [showThemesFilter, setShowThemesFilter] = useState(false);
  const [availableSites, setAvailableSites] = useState<Array<{ id: string; name: string; baseUrl: string }>>([]);

  useScrollRestoration(`${config.storageKey}.scroll`, !loading);

  // Fonction pour charger les stats
  const loadStats = useCallback(async () => {
    try {
      const lectureStats = await window.electronAPI.getLectureStatistics?.();
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
  }, []);

  // Fonction pour charger les séries manga
  const loadMangaSeries = useCallback(async () => {
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

      // Filtrer par type de contenu si nécessaire
      if (config.contentType === 'all') {
        setSeries(allSeries || []);
      } else if (config.contentType === 'books') {
        setSeries([]);
      } else {
        const targetMediaType = getMediaTypeFromContentType(config.contentType);
        const filtered = (allSeries || []).filter((serie: Serie) => {
          // Pour "unclassified", on filtre les séries avec media_type NULL ou vide
          if (config.contentType === 'unclassified') {
            return !serie.media_type || serie.media_type === '';
          }

          const serieMediaType = (serie.media_type || '').toLowerCase();
          const target = targetMediaType ? targetMediaType.toLowerCase() : '';

          if (config.contentType === 'lightNovel') {
            return serieMediaType.includes('light novel') || serieMediaType.includes('novel');
          }

          if (config.contentType === 'oneShot') {
            return serieMediaType === 'one-shot' || serieMediaType === 'oneshot' || serieMediaType.includes('one-shot') || serieMediaType.includes('oneshot');
          }

          return serieMediaType === target || serieMediaType.includes(target);
        });
        setSeries(filtered);
      }
    } catch (error) {
      console.error('Erreur chargement séries manga:', error);
    }
  }, [config.contentType, searchTerm, filters, showHidden]);

  // Fonction pour charger les livres
  const loadBooks = useCallback(async () => {
    try {
      if (config.contentType === 'all' || config.contentType === 'books') {
        const booksData = await window.electronAPI.booksGet?.({});
        setBooks(booksData || []);
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error('Erreur chargement livres:', error);
    }
  }, [config.contentType]);

  // Fonction pour charger les sites disponibles
  const loadAvailableSites = useCallback(async () => {
    try {
      if (!window.electronAPI.getAvailableSources) return;
      const result = await window.electronAPI.getAvailableSources();
      if (result.success && result.sources) {
        setAvailableSites(result.sources.map((source: any) => ({
          ...source,
          baseUrl: ''
        })));
      } else {
        // Si l'index Mihon n'est pas disponible, ne pas charger de sites
        // car le filtre source_id nécessite les IDs de sources Mihon
        // Le fallback basé sur source_url ne fonctionnerait pas car il compare
        // des domaines avec des source_id (qui sont des IDs Mihon)
        setAvailableSites([]);
      }
    } catch (error) {
      console.error('Erreur chargement sites:', error);
    }
  }, []);

  // Fonction principale de chargement
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMangaSeries(),
        loadBooks()
      ]);
      await loadStats();
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
  }, [loadMangaSeries, loadBooks, loadStats, showToast]);

  // Référence stable pour loadContent
  const loadContentRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    loadContentRef.current = loadContent;
  }, [loadContent]);

  useEffect(() => {
    loadContent();
    loadAvailableSites();
  }, [loadContent, loadAvailableSites]);

  // Combiner les items pour le filtrage
  const allItems: LectureItem[] = [
    ...series,
    ...books
  ];

  // Fonction customFilter pour les filtres additionnels
  const customFilterFn = useCallback((item: LectureItem) => {
    // Filtrer par type de contenu si nécessaire
    if (config.contentType !== 'all') {
      if (config.contentType === 'books' && isSerie(item)) {
        return false;
      }
      if (config.contentType !== 'books' && !isSerie(item)) {
        return false;
      }

      // Pour les séries, vérifier le media_type
      if (isSerie(item) && config.contentType !== 'books') {
        // Pour "unclassified", on filtre les séries avec media_type NULL ou vide
        if (config.contentType === 'unclassified') {
          return !item.media_type || item.media_type === '';
        }

        const targetMediaType = getMediaTypeFromContentType(config.contentType);
        const serieMediaType = (item.media_type || '').toLowerCase();
        const target = targetMediaType ? targetMediaType.toLowerCase() : '';

        if (config.contentType === 'lightNovel') {
          return serieMediaType.includes('light novel') || serieMediaType.includes('novel');
        }

        if (config.contentType === 'oneShot') {
          return serieMediaType === 'one-shot' || serieMediaType === 'oneshot' || serieMediaType.includes('one-shot') || serieMediaType.includes('oneshot');
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
    if (mihonFilter !== 'all') {
      // Exclure explicitement les livres pour tous les filtres de source
      if (!isSerie(item)) {
        return false;
      }

      const hasTomesMihon = item.tomes?.some(tome => tome.mihon === 1);
      const hasChapitresMihon = item.chapitres_mihon === 1;
      const isMihon = hasTomesMihon || hasChapitresMihon;
      const sourceDonnees = item.source_donnees;
      const isMal = sourceDonnees === 'mal' || sourceDonnees === 'mal+nautiljon';
      const isNautiljon = sourceDonnees === 'nautiljon' || sourceDonnees === 'mal+nautiljon';
      const isAnilist = (item as any).anilist_id != null && (item as any).anilist_id !== 0;

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
          if (!isMihon && !isMal && !isAnilist) return false;
          break;
        case 'anilist':
          if (!isAnilist) return false;
          break;
        case 'not_anilist':
          if (isAnilist) return false;
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
    if (filters.source_id && isSerie(item) && item.source_id !== filters.source_id) {
      return false;
    }

    return true;
  }, [config.contentType, selectedGenres, selectedThemes, selectedLabels, serieLabels, mihonFilter, filters]);

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
      getExternalId: (item) => {
        if (!isSerie(item)) return null;
        if (item.mal_id) return parseInt(item.mal_id.toString(), 10);
        if ((item as any).anilist_id) return parseInt((item as any).anilist_id.toString(), 10);
        return null;
      },
      detectIdFromSearch: (term) => {
        const detected = detectMalUrlOrId(term);
        return { id: detected.id };
      }
    },
    filterConfig: {
      getIsHidden: (item) => isSerie(item) ? !!item.is_masquee : !!item.is_hidden,
      getIsFavorite: (item) => isSerie(item) ? !!item.is_favorite : !!item.is_favorite,
      getStatus: (item) => resolveLectureStatus(item),
      getHasUpdates: () => false,
      customFilter: customFilterFn
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
    storageKey: `${config.storageKey}-items-per-page`,
    scrollStorageKey: `${config.storageKey}.scroll`
  });

  // Handlers
  const handleFilterChange = useCallback((key: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key as keyof SerieFilters];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  }, [filters, setFilters]);

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

  const handleToggleFavorite = useCallback(async (item: LectureItem) => {
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
      await loadContent();
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
    }
  }, [loadContent]);

  const handleChangeStatus = useCallback(async (item: LectureItem, status: string) => {
    try {
      if (isSerie(item)) {
        // TODO: Implémenter changement de statut pour les séries
      } else {
        await window.electronAPI.booksSetStatus?.({ bookId: item.id, statut: status });
      }
      await loadContent();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  }, [loadContent]);

  const handleToggleHidden = useCallback(async (item: LectureItem) => {
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
      await loadContent();
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
    }
  }, [loadContent]);

  const hasActiveFilters = hasActiveFiltersBase ||
    mihonFilter !== 'all' ||
    !!filters.type_volume ||
    !!filters.source_id ||
    selectedLabels.length > 0 ||
    selectedGenres.length > 0 ||
    selectedThemes.length > 0;

  // Suppression multiple
  const {
    isSelectionMode,
    selectedCount,
    isDeleting,
    toggleSelectionMode,
    toggleItemSelection,
    selectAll,
    deselectAll,
    isItemSelected,
    handleDeleteSelected,
    ConfirmDialog: MultiDeleteConfirmDialog
  } = useMultiDelete<LectureItem>({
    deleteApi: async (id) => {
      const item = sortedItems.find(i => i.id === id);
      if (item && isSerie(item)) {
        return await window.electronAPI.deleteSerie(id as number);
      } else if (item) {
        return await window.electronAPI.booksDelete?.(id as number) || { success: false };
      }
      return { success: false };
    },
    itemName: 'œuvre',
    getItemTitle: (item) => isSerie(item) ? item.titre : (item as BookListItem).titre || 'Sans titre',
    onDeleteComplete: () => {
      loadContent();
      loadStats();
      window.dispatchEvent(new CustomEvent('serie-deleted'));
    }
  });

  const handleDeleteSelectedItems = useCallback(async () => {
    await handleDeleteSelected(sortedItems);
  }, [handleDeleteSelected, sortedItems]);

  const handleSelectAllItems = useCallback(() => {
    selectAll(sortedItems);
  }, [selectAll, sortedItems]);

  const countLabel = sortedItems.length > 1 ? 'œuvres' : 'œuvre';

  // Générer le label du bouton selon le type de contenu
  const getAddButtonLabel = (): string => {
    if (config.contentType === 'all') {
      return 'Ajouter une lecture';
    }

    const typeLabels: Record<ContentType, string> = {
      all: 'Ajouter une lecture',
      manga: 'Ajouter un manga',
      manhwa: 'Ajouter un manhwa',
      manhua: 'Ajouter un manhua',
      lightNovel: 'Ajouter un light novel',
      webtoon: 'Ajouter un webtoon',
      comics: 'Ajouter un comic',
      bd: 'Ajouter une BD',
      books: 'Ajouter un livre',
      oneShot: 'Ajouter un one-shot',
      unclassified: 'Ajouter une œuvre'
    };

    return typeLabels[config.contentType] || '+ Ajouter';
  };

  return (
    <>
      {ToastContainer}
      <MultiDeleteConfirmDialog />
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title={config.title}
            icon={config.icon}
            count={sortedItems.length}
            countLabel={countLabel}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel={getAddButtonLabel()}
            isSelectionMode={isSelectionMode}
            selectedCount={selectedCount}
            onToggleSelectionMode={toggleSelectionMode}
            onSelectAll={handleSelectAllItems}
            onDeselectAll={deselectAll}
            onDeleteSelected={handleDeleteSelectedItems}
            isDeleting={isDeleting}
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

          {/* Filtres */}
          <LectureCollectionFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={config.searchPlaceholder}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filters={filters}
            onFilterChange={handleFilterChange}
            mihonFilter={mihonFilter}
            onMihonFilterChange={setMihonFilter}
            availableSites={availableSites}
            showFavoriteOnly={showFavoriteOnly}
            onShowFavoriteOnlyChange={setShowFavoriteOnly}
            showHidden={showHidden}
            onShowHiddenChange={setShowHidden}
            showMajOnly={showMajOnly}
            onShowMajOnlyChange={setShowMajOnly}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            availableGenres={availableGenres}
            selectedGenres={selectedGenres}
            onGenreToggle={handleGenreToggle}
            showGenresFilter={showGenresFilter}
            onToggleGenresFilter={() => setShowGenresFilter(!showGenresFilter)}
            availableThemes={availableThemes}
            selectedThemes={selectedThemes}
            onThemeToggle={handleThemeToggle}
            showThemesFilter={showThemesFilter}
            onToggleThemesFilter={() => setShowThemesFilter(!showThemesFilter)}
            availableLabels={availableLabels}
            selectedLabels={selectedLabels}
            onLabelToggle={handleLabelToggle}
            showLabelsFilter={showLabelsFilter}
            onToggleLabelsFilter={() => setShowLabelsFilter(!showLabelsFilter)}
          />

          {/* Pagination en haut */}
          {!loading && sortedItems.length > 0 && (
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
          )}

          {/* Contenu */}
          <CollectionView
            items={paginatedItems}
            viewMode={viewMode}
            gridMinWidth={200}
            imageMinWidth={200}
            isSelectionMode={isSelectionMode}
            isItemSelected={isItemSelected}
            onToggleItemSelection={toggleItemSelection}
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
            loading={loading}
            emptyMessage={hasActiveFilters ? 'Aucune œuvre ne correspond à vos filtres' : config.emptyMessage}
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>{config.emptyIconEmoji}</span>}
          />

          {/* Pagination en bas */}
          {sortedItems.length > 0 && (
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
          )}

          <BackToTopButton />
          <BackToBottomButton />
        </div>
      </div>

      {/* Modals d'ajout */}
      {showAddModal && (
        <>
          {config.contentType === 'all' ? (
            // Pour la page "Tout", afficher la modale de sélection du type
            <AddLectureTypeModal
              onClose={() => setShowAddModal(false)}
              onComplete={() => {
                setShowAddModal(false);
                loadContent();
              }}
            />
          ) : config.contentType === 'books' || config.contentType === 'comics' || config.contentType === 'bd' ? (
            // Pour books, comics, bd : utiliser AddBookComicBdModal
            <AddBookComicBdModal
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setShowAddModal(false);
                loadContent();
              }}
              onComplete={() => {
                setShowAddModal(false);
                loadContent();
              }}
              initialType={
                config.contentType === 'books' ? 'book' :
                  config.contentType === 'comics' ? 'comic' :
                    'bd'
              }
            />
          ) : (
            // Pour manga, manhwa, manhua, lightNovel, webtoon : utiliser AddMangaModal
            <AddMangaModal
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setShowAddModal(false);
                loadContent();
              }}
              onComplete={() => {
                setShowAddModal(false);
                loadContent();
              }}
            />
          )}
        </>
      )}
    </>
  );
}
