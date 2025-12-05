import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimeCard } from '../../../../components/cards';
import {
  BackToBottomButton,
  BackToTopButton,
  CollectionHeader,
  Pagination,
  ProgressionHeader,
  ProgressionStats,
  VideoCollectionFilters
} from '../../../../components/collections';
import CollectionView from '../../../../components/common/CollectionView';
import ListItem from '../../../../components/common/ListItem';
import MalCandidateSelectionModal from '../../../../components/modals/common/MalCandidateSelectionModal';
import SearchHelpModal from '../../../../components/modals/help/SearchHelpModal';
import { ANIMES_SEARCH_HELP_CONFIG } from '../../../../components/modals/help/search-help-configs';
import AddAnimeModal from '../../../../components/modals/videos/AddAnimeModal';
import { useCollectionViewMode } from '../../../../hooks/collections/useCollectionViewMode';
import { useMultiDelete } from '../../../../hooks/collections/useMultiDelete';
import { usePagination } from '../../../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../../../hooks/common/useScrollRestoration';
import { useToast } from '../../../../hooks/common/useToast';
import { AnimeSerie } from '../../../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../../../utils/status';
import { translateStatus } from '../../../../utils/translations';
import { AnimeCollectionPageConfig } from '../utils/anime-page-config';
import { isVideoSortOption, isVideoStatusFilter, RECOGNIZED_ANIME_TYPES, VIDEO_SORT_OPTIONS, VIDEO_STATUS_OPTIONS, VideoSortOption } from '../utils/constants';
import { detectMalUrlOrId, normalizeAnimeType, normalizeWorkStatus, resolveAnimeStatus } from '../utils/video-helpers';

interface AnimeCollectionPageProps {
  config: AnimeCollectionPageConfig;
}

export default function AnimeCollectionPage({ config }: AnimeCollectionPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialMalId, setInitialMalId] = useState<number | null>(null);
  const [importingMal, setImportingMal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [malCandidateSelection, setMalCandidateSelection] = useState<{
    malId: number;
    candidates: Array<{
      id: number;
      titre: string;
      media_type?: string | null;
      type_volume?: string | null;
      source_donnees?: string | null;
      statut?: string | null;
      mal_id?: number | null;
    }>;
  } | null>(null);
  const [resolvingCandidate, setResolvingCandidate] = useState(false);
  const [viewMode, handleViewModeChange] = useCollectionViewMode('videos');
  const [sortBy, setSortBy] = usePersistentState<VideoSortOption>(
    `${config.storageKey}.sortBy`,
    'title-asc',
    { validator: isVideoSortOption, storage: 'session' }
  );
  const [stats, setStats] = useState<ProgressionStats>({});
  const [updateKey, setUpdateKey] = useState(0);
  const [availableWorkStatuses, setAvailableWorkStatuses] = useState<string[]>([]);

  // Recherche
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    `${config.storageKey}.search`,
    '',
    { storage: 'session' }
  );

  // Filtres de statut
  const [completionFilter, setCompletionFilter] = usePersistentState<string>(
    `${config.storageKey}.completionFilter`,
    '',
    { validator: isVideoStatusFilter, storage: 'session' }
  );
  const [workStatusFilter, setWorkStatusFilter] = usePersistentState<string>(
    `${config.storageKey}.workStatusFilter`,
    '',
    { storage: 'session' }
  );

  // Toggles
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    `${config.storageKey}.filters.showHidden`,
    false,
    { storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    `${config.storageKey}.filters.showFavoriteOnly`,
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    `${config.storageKey}.filters.showMajOnly`,
    false,
    { storage: 'session' }
  );

  // Filtres additionnels
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    `${config.storageKey}.filters.selectedLabels`,
    [],
    { storage: 'session' }
  );
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [animeLabels, setAnimeLabels] = useState<Record<number, Array<{ label: string; color: string }>>>({});
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);
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
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);
  const [showThemesFilter, setShowThemesFilter] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useScrollRestoration(`${config.storageKey}.scroll`, !loading);

  const handleOpenAnimeDetail = useCallback((anime: AnimeSerie) => {
    rememberScrollTarget(`${config.storageKey}.scroll`, anime.id);
    const currentPath = location.pathname + location.search;
    navigate(`/animes/${anime.id}`, { state: { from: currentPath } });
  }, [navigate, location, config.storageKey]);

  // Fonction pour calculer les stats
  const calculateStats = useCallback((animesData: AnimeSerie[]) => {
    const animesEnCours = animesData.filter(a => {
      const episodesVus = a.episodes_vus || 0;
      const episodesTotal = a.nb_episodes || 0;
      return episodesVus > 0 && episodesVus < episodesTotal;
    }).length;

    const animesTermines = animesData.filter(a => {
      const episodesVus = a.episodes_vus || 0;
      const episodesTotal = a.nb_episodes || 0;
      return episodesTotal > 0 && episodesVus === episodesTotal;
    }).length;

    const episodesVus = animesData.reduce((acc, a) => acc + (a.episodes_vus || 0), 0);
    const episodesTotal = animesData.reduce((acc, a) => acc + (a.nb_episodes || 0), 0);

    setStats({
      animesEnCours,
      animesTermines,
      episodesVus,
      episodesTotal
    });
  }, []);

  // Fonction pour charger les animes selon le type
  const loadAnimes = useCallback(async () => {
    setLoading(true);
    try {
      let animesData: AnimeSerie[] = [];

      if (config.animeType === 'Unclassified') {
        // Pour Unclassified : charger TOUS les animes sans filtre de type
        const result = await window.electronAPI.getAnimeSeries({} as Record<string, unknown>);
        animesData = result.animes || [];

        // Filtrer les animes qui n'ont PAS un type reconnu
        const filteredAnimes = animesData.filter((anime: AnimeSerie) => {
          const normalizedType = normalizeAnimeType(anime.type);
          return !normalizedType || !RECOGNIZED_ANIME_TYPES.includes(normalizedType as any);
        });
        animesData = filteredAnimes;
      } else {
        // Pour les autres types : filtrer par type spécifique
        const result = await window.electronAPI.getAnimeSeries({ type: config.animeType } as Record<string, unknown>);
        const allAnimes = result.animes || [];

        // Normaliser les types et filtrer côté client pour gérer les variantes
        const filteredAnimes = allAnimes.filter((anime: AnimeSerie) => {
          const normalizedType = normalizeAnimeType(anime.type);
          return normalizedType === config.animeType;
        });
        animesData = filteredAnimes;
      }

      setAnimes(animesData);
      calculateStats(animesData);

      // Extraire les labels depuis les données
      const labelsMap: Record<number, Array<{ label: string; color: string }>> = {};
      for (const anime of animesData) {
        if (anime.labels && Array.isArray(anime.labels)) {
          labelsMap[anime.id] = anime.labels;
        }
      }
      setAnimeLabels(labelsMap);

      // Charger tous les labels disponibles
      try {
        const allLabels = await (window.electronAPI as any).getAllAnimeLabels?.();
        if (allLabels && Array.isArray(allLabels)) {
          setAvailableLabels(allLabels);
        }
      } catch (error) {
        console.error('Erreur chargement labels:', error);
      }

      // Extraire les genres et thèmes depuis les animes filtrés uniquement
      const genresSet = new Set<string>();
      const themesSet = new Set<string>();

      animesData.forEach((anime: AnimeSerie) => {
        // Extraire les genres (toujours une string séparée par virgules)
        if (anime.genres && typeof anime.genres === 'string') {
          const genres = anime.genres.split(',').map((g: string) => g.trim()).filter(Boolean);
          genres.forEach((genre: string) => genresSet.add(genre));
        }

        // Extraire les thèmes (toujours une string séparée par virgules)
        if (anime.themes && typeof anime.themes === 'string') {
          const themes = anime.themes.split(',').map((t: string) => t.trim()).filter(Boolean);
          themes.forEach((theme: string) => themesSet.add(theme));
        }
      });

      setAvailableGenres(Array.from(genresSet).sort());
      setAvailableThemes(Array.from(themesSet).sort());

      // Extraire tous les statuts de l'œuvre disponibles
      const allWorkStatuses = new Set<string>();
      animesData.forEach((anime: AnimeSerie) => {
        if (anime.statut_diffusion) {
          const normalized = normalizeWorkStatus(anime.statut_diffusion);
          if (normalized) allWorkStatuses.add(normalized);
        }
      });
      setAvailableWorkStatuses(Array.from(allWorkStatuses).sort());
    } catch (error) {
      console.error(`Erreur lors du chargement des animes ${config.animeType}:`, error);
      setAnimes([]);
    } finally {
      setLoading(false);
    }
  }, [calculateStats, config.animeType]);

  // Référence stable pour loadAnimes
  const loadAnimesRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    loadAnimesRef.current = loadAnimes;
  }, [loadAnimes]);

  useEffect(() => {
    loadAnimes();
  }, [loadAnimes]);

  // Écouter les événements d'import depuis Tampermonkey
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleRefresh = () => {
      timeoutId = setTimeout(() => {
        if (loadAnimesRef.current) {
          loadAnimesRef.current();
        }
      }, 500);
    };

    const unsubscribe = window.electronAPI.onAnimeImportComplete?.(handleRefresh);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Écouter les événements de suppression d'anime
  useEffect(() => {
    const handleAnimeDeleted = () => {
      if (loadAnimesRef.current) {
        loadAnimesRef.current();
      }
    };

    window.addEventListener('anime-deleted', handleAnimeDeleted as EventListener);
    return () => {
      window.removeEventListener('anime-deleted', handleAnimeDeleted as EventListener);
    };
  }, []);

  // Fonction pour mettre à jour un anime dans l'état
  const updateAnimeInState = useCallback((animeId: number, updates: Partial<AnimeSerie>) => {
    setAnimes(prevAnimes => {
      const updated = prevAnimes.map(anime => {
        if (anime.id === animeId) {
          return { ...anime, ...updates };
        }
        return anime;
      });

      setUpdateKey(prev => prev + 1);
      calculateStats(updated);

      return updated;
    });
  }, [calculateStats]);

  // Écouter les changements depuis la page de détails
  useEffect(() => {
    const handleStatusChangeFromDetail = (event: CustomEvent) => {
      const { animeId, statut, episodes_vus } = event.detail;
      const updates: Partial<AnimeSerie> = { statut_visionnage: statut };
      if (episodes_vus !== undefined) {
        updates.episodes_vus = episodes_vus;
      }
      updateAnimeInState(animeId, updates);
    };

    const handleFavoriteChangeFromDetail = (event: CustomEvent) => {
      const { animeId, isFavorite } = event.detail;
      updateAnimeInState(animeId, { is_favorite: isFavorite });
    };

    const handleLabelsUpdateFromDetail = (event: CustomEvent) => {
      const { animeId } = event.detail;
      if (animeId) {
        (window.electronAPI as any).getAnimeLabels?.(animeId).then((labels: Array<{ label: string; color: string }>) => {
          setAnimeLabels(prev => ({
            ...prev,
            [animeId]: labels
          }));
        }).catch(console.error);
      }
    };

    window.addEventListener('anime-status-changed', handleStatusChangeFromDetail as EventListener);
    window.addEventListener('anime-favorite-changed', handleFavoriteChangeFromDetail as EventListener);
    window.addEventListener('anime-labels-updated', handleLabelsUpdateFromDetail as EventListener);

    return () => {
      window.removeEventListener('anime-status-changed', handleStatusChangeFromDetail as EventListener);
      window.removeEventListener('anime-favorite-changed', handleFavoriteChangeFromDetail as EventListener);
      window.removeEventListener('anime-labels-updated', handleLabelsUpdateFromDetail as EventListener);
    };
  }, [updateAnimeInState]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setCompletionFilter('');
    setWorkStatusFilter('');
    setShowHidden(false);
    setShowFavoriteOnly(false);
    setShowMajOnly(false);
    setSelectedLabels([]);
    setSelectedGenres([]);
    setSelectedThemes([]);
  }, [setSearchTerm, setCompletionFilter, setWorkStatusFilter, setShowFavoriteOnly, setShowHidden, setShowMajOnly, setSelectedLabels, setSelectedGenres, setSelectedThemes]);

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

  // Debounce de recherche
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleStatusChange = async (animeId: number, newStatus: string) => {
    try {
      const validStatus: AnimeSerie['statut_visionnage'] = newStatus as AnimeSerie['statut_visionnage'];
      await window.electronAPI.setAnimeStatutVisionnage(animeId, validStatus as any);
      updateAnimeInState(animeId, { statut_visionnage: validStatus });
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur changement statut:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du changement de statut',
        type: 'error'
      });
    }
  };

  const handleToggleFavorite = async (animeId: number) => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      const users = await window.electronAPI.getAllUsers();
      const user = users.find((u: any) => u.name === currentUser);

      if (user) {
        const currentAnime = animes.find(a => a.id === animeId);
        const newFavoriteState = !currentAnime?.is_favorite;

        await window.electronAPI.toggleAnimeFavorite(animeId, user.id);
        updateAnimeInState(animeId, { is_favorite: newFavoriteState });

        showToast({
          title: 'Favoris modifiés',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la modification des favoris',
        type: 'error'
      });
    }
  };

  const handleToggleHidden = async (animeId: number) => {
    try {
      const isMasque = await window.electronAPI.isAnimeMasquee(animeId);

      if (isMasque) {
        const result = await window.electronAPI.demasquerAnime(animeId);
        if (result.success) {
          showToast({
            title: 'Anime démasqué',
            type: 'success'
          });
        }
      } else {
        const result = await window.electronAPI.masquerAnime(animeId);
        if (result.success) {
          showToast({
            title: 'Anime masqué',
            message: 'Vos données de progression ont été supprimées',
            type: 'success'
          });
        }
      }

      await loadAnimes();
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du masquage/démasquage',
        type: 'error'
      });
    }
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const hasSearchTerm = normalizedSearchTerm.length > 0;
  const malSearchInfo = hasSearchTerm ? detectMalUrlOrId(searchTerm) : { id: null };

  // Fonction customFilter pour les filtres additionnels
  const customFilterFn = useCallback((anime: AnimeSerie) => {
    // Filtre par genres
    if (selectedGenres.length > 0) {
      if (!anime.genres) return false;
      const animeGenres = anime.genres.split(',').map(g => g.trim()).filter(Boolean);
      const hasAllGenres = selectedGenres.every(genre => animeGenres.includes(genre));
      if (!hasAllGenres) return false;
    }

    // Filtre par thèmes
    if (selectedThemes.length > 0) {
      if (!anime.themes) return false;
      const animeThemes = anime.themes.split(',').map(t => t.trim()).filter(Boolean);
      const hasAllThemes = selectedThemes.every(theme => animeThemes.includes(theme));
      if (!hasAllThemes) return false;
    }

    // Filtre par labels
    if (selectedLabels.length > 0) {
      const labels = animeLabels[anime.id] || [];
      const hasAnyLabel = selectedLabels.some(label => labels.some(l => l.label === label));
      if (!hasAnyLabel) return false;
    }

    // Si un toggle exclusif est activé
    if (showFavoriteOnly) {
      return Boolean(anime.is_favorite);
    }
    if (showHidden) {
      return Boolean(anime.is_masquee);
    }
    if (showMajOnly) {
      return false; // Les animes n'ont pas de système de mises à jour
    }

    // Filtre par statut de l'œuvre
    if (workStatusFilter && workStatusFilter !== '') {
      const workStatus = normalizeWorkStatus(anime.statut_diffusion);
      if (!workStatus || workStatus === '' || workStatus !== workStatusFilter) return false;
    }

    return true;
  }, [selectedGenres, selectedThemes, selectedLabels, animeLabels, showFavoriteOnly, showHidden, showMajOnly, workStatusFilter]);

  const {
    sortedItems: sortedAnimes,
    hasActiveFilters: hasActiveFiltersBase
  } = useCollectionFilters({
    items: animes,
    search: searchTerm,
    statusFilter: completionFilter,
    showFavoriteOnly,
    showHidden,
    showMajOnly,
    sortBy,
    searchConfig: {
      getTitle: (a) => a.titre,
      getExternalId: (a) => {
        // Prioriser mal_id, sinon anilist_id (comme dans Lectures)
        if (a.mal_id) return a.mal_id;
        if (a.anilist_id) return a.anilist_id;
        return null;
      },
      detectIdFromSearch: (term) => {
        const detected = detectMalUrlOrId(term);
        return { id: detected.id };
      }
    },
    filterConfig: {
      getIsHidden: (a) => !!a.is_masquee,
      getIsFavorite: (a) => !!a.is_favorite,
      getStatus: (a) => resolveAnimeStatus(a),
      getHasUpdates: () => false,
      customFilter: customFilterFn
    },
    sortConfig: {
      sortOptions: {
        'title-asc': {
          label: 'Titre A-Z',
          compare: (a, b) => a.titre.localeCompare(b.titre)
        },
        'title-desc': {
          label: 'Titre Z-A',
          compare: (a, b) => b.titre.localeCompare(a.titre)
        },
        'date-desc': {
          label: 'Date ↓',
          compare: (a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          }
        },
        'date-asc': {
          label: 'Date ↑',
          compare: (a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateA - dateB;
          }
        },
        'score-desc': {
          label: 'Score ↓',
          compare: (a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            return scoreB - scoreA;
          }
        },
        'popularite-desc': {
          label: 'Popularité ↓',
          compare: (a, b) => {
            const popA = a.popularity_mal || 0;
            const popB = b.popularity_mal || 0;
            return popB - popA;
          }
        }
      },
      defaultSort: 'title-asc'
    }
  });

  // Détecter si une URL/ID MAL est présente dans la recherche et si aucun résultat
  const detectedMalId = hasSearchTerm ? malSearchInfo : { id: null };
  const hasNoResults = sortedAnimes.length === 0 && hasSearchTerm;
  const showAddFromMal = hasNoResults && detectedMalId.id !== null && !importingMal;

  const runMalImport = async (
    malIdValue: number,
    options: { targetSerieId?: number; forceCreate?: boolean } = {},
    fromSelection = false
  ) => {
    if (fromSelection) {
      setResolvingCandidate(true);
    } else {
      setImportingMal(true);
    }

    try {
      const result = await window.electronAPI.addAnimeByMalId(malIdValue, options);

      if (result.success) {
        setMalCandidateSelection(null);
        if (result.anime) {
          showToast({
            title: `✅ ${result.anime.titre} importé avec succès !`,
            type: 'success'
          });
        }
        setSearchTerm('');
        await loadAnimes();
      } else if (result.requiresSelection && Array.isArray(result.candidates)) {
        setMalCandidateSelection({ malId: malIdValue, candidates: result.candidates });
      } else {
        showToast({
          title: result.error || 'Erreur lors de l\'import',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur import MAL direct:', error);
      showToast({
        title: error?.message || 'Erreur lors de l\'import depuis MyAnimeList',
        type: 'error'
      });
    } finally {
      if (fromSelection) {
        setResolvingCandidate(false);
      } else {
        setImportingMal(false);
      }
    }
  };

  const handleImportFromMalDirectly = async (malId: number) => {
    if (importingMal) return;
    await runMalImport(malId, {}, false);
  };

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
    items: sortedAnimes,
    defaultItemsPerPage: 50,
    storageKey: `${config.storageKey}-items-per-page`,
    scrollStorageKey: `${config.storageKey}.scroll`
  });

  const animeStatusOptions = VIDEO_STATUS_OPTIONS.map(status => ({
    value: status,
    label: formatStatusLabel(status, { category: 'anime' })
  }));

  const workStatusOptions = availableWorkStatuses.map(status => ({
    value: status,
    label: translateStatus(status)
  }));

  const statusOptions = [
    {
      value: '', label: '📺 Tous les statuts de l\'œuvre'
    },
    ...workStatusOptions
  ];

  const completionOptions = [
    { value: '', label: '📂 Tous les statuts de visionnage' },
    ...animeStatusOptions
  ];

  const hasActiveFilters = hasActiveFiltersBase ||
    selectedGenres.length > 0 ||
    selectedThemes.length > 0 ||
    selectedLabels.length > 0 ||
    completionFilter !== '' ||
    workStatusFilter !== '';

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
  } = useMultiDelete<AnimeSerie>({
    deleteApi: (id) => window.electronAPI.deleteAnime(id as number),
    itemName: 'anime',
    getItemTitle: (anime) => anime.titre,
    onDeleteComplete: () => {
      loadAnimes();
      window.dispatchEvent(new CustomEvent('anime-deleted'));
    }
  });

  const handleDeleteSelectedAnimes = useCallback(async () => {
    await handleDeleteSelected(sortedAnimes);
  }, [handleDeleteSelected, sortedAnimes]);

  const handleSelectAllAnimes = useCallback(() => {
    selectAll(sortedAnimes);
  }, [selectAll, sortedAnimes]);

  return (
    <>
      {ToastContainer}
      <MultiDeleteConfirmDialog />
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title={config.title}
            icon={config.icon}
            count={sortedAnimes.length}
            countLabel={sortedAnimes.length > 1 ? 'animes' : 'anime'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un anime"
            isSelectionMode={isSelectionMode}
            selectedCount={selectedCount}
            onToggleSelectionMode={toggleSelectionMode}
            onSelectAll={handleSelectAllAnimes}
            onDeselectAll={deselectAll}
            onDeleteSelected={handleDeleteSelectedAnimes}
            isDeleting={isDeleting}
            extraButtons={
              <button
                onClick={async () => {
                  try {
                    showToast({ title: 'Synchronisation MAL...', type: 'info' });
                    await window.electronAPI.malSyncNow();
                    await loadAnimes();
                    showToast({ title: 'Synchronisation terminée !', type: 'success' });
                  } catch (error) {
                    console.error('Erreur sync MAL:', error);
                    showToast({
                      title: 'Erreur de synchronisation',
                      message: error instanceof Error ? error.message : 'Une erreur est survenue',
                      type: 'error'
                    });
                  }
                }}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Sync MAL
              </button>
            }
          />

          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="anime" stats={stats} />
          </div>

          <VideoCollectionFilters
            contentType="anime"
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={config.searchPlaceholder}
            onOpenHelp={() => setShowHelpModal(true)}
            sortBy={sortBy as any}
            onSortChange={(value) => setSortBy(value as VideoSortOption)}
            sortOptions={VIDEO_SORT_OPTIONS as any}
            completionFilter={completionFilter}
            onCompletionFilterChange={setCompletionFilter}
            completionOptions={completionOptions}
            workStatusFilter={workStatusFilter}
            onWorkStatusFilterChange={setWorkStatusFilter}
            workStatusOptions={statusOptions}
            showFavoriteOnly={showFavoriteOnly}
            onShowFavoriteOnlyChange={setShowFavoriteOnly}
            showHidden={showHidden}
            onShowHiddenChange={setShowHidden}
            showMajOnly={showMajOnly}
            onShowMajOnlyChange={setShowMajOnly}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
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

          {sortedAnimes.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedAnimes.length}
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

          {showAddFromMal && (
            <div style={{
              padding: '20px',
              marginBottom: '24px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '2px solid #8b5cf6',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#8b5cf6',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                <span style={{ fontSize: '20px' }}>💡</span>
                <span>Aucun résultat trouvé</span>
              </div>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '14px',
                margin: 0,
                lineHeight: '1.6'
              }}>
                ID détecté : <strong>{detectedMalId.id}</strong>. Souhaitez-vous ajouter cet anime depuis MyAnimeList ?
              </p>
              <button
                onClick={() => detectedMalId.id !== null && handleImportFromMalDirectly(detectedMalId.id)}
                className="btn btn-primary"
                disabled={importingMal}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '8px'
                }}
              >
                {importingMal ? 'Import en cours...' : 'Ajouter depuis MyAnimeList'}
              </button>
            </div>
          )}

          <CollectionView
            key={updateKey}
            items={paginatedItems}
            viewMode={viewMode}
            gridMinWidth={200}
            imageMinWidth={200}
            isSelectionMode={isSelectionMode}
            isItemSelected={isItemSelected}
            onToggleItemSelection={toggleItemSelection}
            renderCard={(anime) => (
              <AnimeCard
                key={`${anime.id}-${anime.statut_visionnage}-${anime.is_favorite}-${updateKey}`}
                anime={anime}
                onClick={() => handleOpenAnimeDetail(anime)}
                onToggleFavorite={() => handleToggleFavorite(anime.id)}
                onChangeStatus={(status) => handleStatusChange(anime.id, status)}
                onToggleHidden={() => handleToggleHidden(anime.id)}
              />
            )}
            renderListItem={(anime) => {
              const episodesVus = anime.episodes_vus || 0;
              const episodesTotal = anime.nb_episodes || 0;
              const progression = episodesTotal > 0 ? Math.round((episodesVus / episodesTotal) * 100) : 0;

              const badgeFavori = !!anime.is_favorite ? (
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: 'rgba(239, 68, 68, 0.95)',
                  color: 'white',
                  flexShrink: 0,
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <span style={{ fontSize: '10px' }}>❤️</span>
                  <span>Favori</span>
                </span>
              ) : null;

              return (
                <ListItem
                  key={`${anime.id}-${anime.statut_visionnage}-${anime.is_favorite}`}
                  title={anime.titre}
                  subtitle={episodesTotal > 0 ? `${episodesVus}/${episodesTotal} épisodes` : undefined}
                  progression={progression}
                  currentStatus={resolveAnimeStatus(anime)}
                  availableStatuses={[...COMMON_STATUSES.ANIME]}
                  isFavorite={anime.is_favorite || false}
                  badges={badgeFavori}
                  onClick={() => handleOpenAnimeDetail(anime)}
                  onToggleFavorite={() => handleToggleFavorite(anime.id)}
                  onChangeStatus={(status) => handleStatusChange(anime.id, status)}
                  onToggleHidden={() => handleToggleHidden(anime.id)}
                />
              );
            }}
            loading={loading}
            emptyMessage={
              showAddFromMal
                ? ''
                : (hasActiveFilters
                  ? 'Aucun animé ne correspond à vos filtres'
                  : config.emptyMessage)
            }
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>{config.emptyIconEmoji}</span>}
          />

          {showAddModal && (
            <AddAnimeModal
              initialMalId={initialMalId || undefined}
              onClose={() => {
                setShowAddModal(false);
                setInitialMalId(null);
              }}
              onSuccess={() => {
                setShowAddModal(false);
                setInitialMalId(null);
                loadAnimes();
              }}
            />
          )}

          {malCandidateSelection && (
            <MalCandidateSelectionModal
              malId={malCandidateSelection.malId}
              candidates={malCandidateSelection.candidates}
              loading={resolvingCandidate}
              onSelect={(candidateId) => {
                void runMalImport(malCandidateSelection.malId, { targetSerieId: candidateId }, true);
              }}
              onCreateNew={() => {
                void runMalImport(malCandidateSelection.malId, { forceCreate: true }, true);
              }}
              onClose={() => {
                if (!resolvingCandidate) {
                  setMalCandidateSelection(null);
                }
              }}
            />
          )}
        </div>

        {sortedAnimes.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedAnimes.length}
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
          </div>
        )}

        <BackToTopButton />
        <BackToBottomButton />
      </div>

      <SearchHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        config={ANIMES_SEARCH_HELP_CONFIG}
      />
    </>
  );
}
