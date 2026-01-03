import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimeCard, MovieCard, TvShowCard } from '../../components/cards';
import {
  BackToBottomButton,
  BackToTopButton,
  CollectionHeader,
  Pagination,
  ProgressionHeader,
  ProgressionStats,
  VideoCollectionFilters
} from '../../components/collections';
import CollectionView from '../../components/common/CollectionView';
import ListItem from '../../components/common/ListItem';
import SearchHelpModal from '../../components/modals/help/SearchHelpModal';
import { VIDEOS_ALL_SEARCH_HELP_CONFIG } from '../../components/modals/help/search-help-configs';
import AddVideoTypeModal from '../../components/modals/videos/AddVideoTypeModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { AnimeSerie, MovieListItem, TvShowListItem } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate } from '../../utils/tmdb';
import { translateStatus } from '../../utils/translations';
import VideoNavigationTabs from './common/components/VideoNavigationTabs';
import { isVideoSortOption, isVideoStatusFilter, VIDEO_SORT_OPTIONS, VIDEO_STATUS_OPTIONS, VideoSortOption } from './common/utils/constants';
import { normalizeAnimeType, normalizeWorkStatus, resolveAnimeStatus } from './common/utils/video-helpers';
import { VideoItem } from './common/utils/video-types';

export default function All() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [series, setSeries] = useState<TvShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // États de recherche et tri
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    'videos.all.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<VideoSortOption>(
    'videos.all.sortBy',
    'title-asc',
    { validator: isVideoSortOption, storage: 'session' }
  );
  // Filtre par completion de l'utilisateur (statut de visionnage)
  const [completionFilter, setCompletionFilter] = usePersistentState<string>(
    'videos.all.completionFilter',
    '',
    { validator: isVideoStatusFilter, storage: 'session' }
  );

  // Filtre par statut de l'œuvre (statut de diffusion/publication)
  const [workStatusFilter, setWorkStatusFilter] = usePersistentState<string>(
    'videos.all.workStatusFilter',
    '',
    { storage: 'session' }
  );

  // États de filtres booléens
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'videos.all.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'videos.all.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'videos.all.filters.showMajOnly',
    false,
    { storage: 'session' }
  );

  // Filtres par genres (animes + films + séries)
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    'videos.all.filters.selectedGenres',
    [],
    { storage: 'session' }
  );
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);

  // Filtres par thèmes (animes uniquement)
  const [selectedThemes, setSelectedThemes] = usePersistentState<string[]>(
    'videos.all.filters.selectedThemes',
    [],
    { storage: 'session' }
  );
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [showThemesFilter, setShowThemesFilter] = useState(false);

  // Filtres par labels (animes uniquement)
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    'videos.all.filters.selectedLabels',
    [],
    { storage: 'session' }
  );
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; count?: number; color?: string }>>([]);
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);

  // Statuts de l'œuvre disponibles (statut_diffusion pour animes, statut pour movies/series)
  const [availableWorkStatuses, setAvailableWorkStatuses] = useState<string[]>([]);
  const [animeTypeCounts, setAnimeTypeCounts] = useState<{
    TV: number;
    OVA: number;
    ONA: number;
    Movie: number;
    Special: number;
    Unclassified: number;
  }>({ TV: 0, OVA: 0, ONA: 0, Movie: 0, Special: 0, Unclassified: 0 });
  const [videoCounts, setVideoCounts] = useState<{
    movies: number;
    series: number;
    total: number;
  }>({ movies: 0, series: 0, total: 0 });

  const [viewMode, handleViewModeChange] = useCollectionViewMode('videos');
  const [stats, setStats] = useState<ProgressionStats>({});

  useScrollRestoration('videos.all.scroll', !loading);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const [animesData, moviesData, seriesData] = await Promise.all([
        window.electronAPI.getAnimeSeries?.({}) || Promise.resolve({ success: false, animes: [] }),
        window.electronAPI.getMovies?.({}) || Promise.resolve([]),
        window.electronAPI.getTvShows?.({}) || Promise.resolve([])
      ]);

      const loadedAnimes = animesData.success ? animesData.animes || [] : [];
      const loadedMovies = Array.isArray(moviesData) ? moviesData : [];
      const loadedSeries = Array.isArray(seriesData) ? seriesData : [];

      setAnimes(loadedAnimes);
      setMovies(loadedMovies);
      setSeries(loadedSeries);

      // Extraire tous les genres disponibles (animes, films, séries)
      const allGenres = new Set<string>();
      loadedAnimes.forEach(a => {
        if (a.genres) {
          const genres = Array.isArray(a.genres) ? a.genres : a.genres.split(',').map((g: string) => g.trim());
          genres.forEach((g: string | { name?: string }) => {
            const genre = typeof g === 'string' ? g : (g as { name?: string }).name || '';
            if (genre) allGenres.add(genre);
          });
        }
      });
      loadedMovies.forEach(m => {
        if (m.genres && Array.isArray(m.genres)) {
          m.genres.forEach((g: { name?: string } | string) => {
            const genre = typeof g === 'string' ? g : (g as { name?: string }).name || '';
            if (genre) allGenres.add(genre);
          });
        }
      });
      loadedSeries.forEach(s => {
        if (s.genres && Array.isArray(s.genres)) {
          s.genres.forEach((g: { name?: string } | string) => {
            const genre = typeof g === 'string' ? g : (g as { name?: string }).name || '';
            if (genre) allGenres.add(genre);
          });
        }
      });
      setAvailableGenres(Array.from(allGenres).sort());

      // Extraire tous les thèmes disponibles (animes uniquement)
      const allThemes = new Set<string>();
      loadedAnimes.forEach(a => {
        if (a.themes) {
          const themes = Array.isArray(a.themes) ? a.themes : a.themes.split(',').map((t: string) => t.trim());
          themes.forEach((t: string) => {
            const theme = typeof t === 'string' ? t : '';
            if (theme) allThemes.add(theme);
          });
        }
      });
      setAvailableThemes(Array.from(allThemes).sort());

      // Extraire tous les labels disponibles (animes uniquement)
      const labelsMap = new Map<string, number>();
      loadedAnimes.forEach(a => {
        if (a.labels) {
          const labels = Array.isArray(a.labels) ? a.labels : a.labels.split(',').map((l: string) => l.trim());
          labels.forEach((l: string) => {
            const label = typeof l === 'string' ? l : '';
            if (label) {
              labelsMap.set(label, (labelsMap.get(label) || 0) + 1);
            }
          });
        }
      });
      setAvailableLabels(Array.from(labelsMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label)));

      // Extraire tous les statuts de l'œuvre disponibles (publication/diffusion uniquement)
      // Normaliser TOUS les statuts (animes, films, séries) vers les statuts anime standardisés pour éviter les doublons
      const allWorkStatuses = new Set<string>();

      // Normaliser TOUS les statuts avant de les ajouter pour éviter les doublons
      loadedAnimes.forEach(a => {
        if (a.statut_diffusion) {
          const normalized = normalizeWorkStatus(a.statut_diffusion);
          if (normalized) allWorkStatuses.add(normalized);
        }
      });
      loadedMovies.forEach(m => {
        if (m.statut) {
          const normalized = normalizeWorkStatus(m.statut);
          if (normalized) allWorkStatuses.add(normalized);
        }
      });
      loadedSeries.forEach(s => {
        if (s.statut) {
          const normalized = normalizeWorkStatus(s.statut);
          if (normalized) allWorkStatuses.add(normalized);
        }
      });

      setAvailableWorkStatuses(Array.from(allWorkStatuses).sort());

      // Calculer les compteurs d'anime types
      const typeCounts = {
        TV: 0,
        OVA: 0,
        ONA: 0,
        Movie: 0,
        Special: 0,
        Unclassified: 0
      };
      const visibleAnimes = loadedAnimes.filter(a => !a.is_masquee);
      visibleAnimes.forEach(anime => {
        const normalizedType = normalizeAnimeType(anime.type);
        if (normalizedType === 'TV') typeCounts.TV++;
        else if (normalizedType === 'OVA') typeCounts.OVA++;
        else if (normalizedType === 'ONA') typeCounts.ONA++;
        else if (normalizedType === 'Movie') typeCounts.Movie++;
        else if (normalizedType === 'Special') typeCounts.Special++;
        else typeCounts.Unclassified++;
      });
      setAnimeTypeCounts(typeCounts);

      // Calculer les compteurs de videos
      const visibleMovies = loadedMovies.filter(m => !m.is_hidden);
      const visibleSeries = loadedSeries.filter(s => !s.is_hidden);
      setVideoCounts({
        movies: visibleMovies.length,
        series: visibleSeries.length,
        total: visibleAnimes.length + visibleMovies.length + visibleSeries.length
      });

      // Calculer les stats combinées
      const animesEnCours = loadedAnimes.filter(a => {
        const episodesVus = a.episodes_vus || 0;
        const episodesTotal = a.nb_episodes || 0;
        return episodesVus > 0 && episodesVus < episodesTotal;
      }).length;

      const animesTermines = loadedAnimes.filter(a => {
        const episodesVus = a.episodes_vus || 0;
        const episodesTotal = a.nb_episodes || 0;
        return episodesTotal > 0 && episodesVus === episodesTotal;
      }).length;

      const episodesVus = loadedAnimes.reduce((acc, a) => acc + (a.episodes_vus || 0), 0);
      const episodesTotal = loadedAnimes.reduce((acc, a) => acc + (a.nb_episodes || 0), 0);

      const filmsEnCours = loadedMovies.filter(m => m.statut_visionnage === 'En cours').length;
      const filmsTermines = loadedMovies.filter(m => m.statut_visionnage === 'Terminé').length;
      const filmsVus = loadedMovies.filter(m =>
        m.statut_visionnage === 'Terminé' ||
        m.statut_visionnage === 'En cours' ||
        m.date_visionnage
      ).length;

      const seriesEnCours = loadedSeries.filter(s => s.statut_visionnage === 'En cours').length;
      const seriesTerminees = loadedSeries.filter(s => s.statut_visionnage === 'Terminé').length;

      setStats({
        animesEnCours,
        animesTermines,
        episodesVus,
        episodesTotal,
        filmsEnCours,
        filmsTermines,
        filmsVus,
        filmsTotal: loadedMovies.length,
        seriesEnCours,
        seriesTerminees,
        episodesTotalSeries: loadedSeries.reduce((acc, s) => acc + (s.nb_episodes || 0), 0)
      });
    } catch (error) {
      console.error('Erreur lors du chargement des vidéos:', error);
      setAnimes([]);
      setMovies([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const allVideos: VideoItem[] = useMemo(() => {
    const videos: VideoItem[] = [];

    const visibleAnimes = animes.filter(a => !a.is_masquee || showHidden);
    visibleAnimes.forEach(anime => videos.push({ ...anime, videoType: 'anime' }));

    const visibleMovies = movies.filter(m => !m.is_hidden || showHidden);
    visibleMovies.forEach(movie => videos.push({ ...movie, videoType: 'movie' }));

    const visibleSeries = series.filter(s => !s.is_hidden || showHidden);
    visibleSeries.forEach(show => videos.push({ ...show, videoType: 'series' }));

    return videos;
  }, [animes, movies, series, showHidden]);

  const resolveVideoStatus = useCallback((item: VideoItem): string => {
    if (item.videoType === 'anime') {
      return resolveAnimeStatus(item);
    } else if (item.videoType === 'movie' || item.videoType === 'series') {
      return item.statut_visionnage || 'À regarder';
    }
    return 'À regarder';
  }, []);

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

  const handleLabelToggle = useCallback((label: string) => {
    setSelectedLabels(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  }, [setSelectedLabels]);

  // Fonction pour obtenir le statut de l'œuvre normalisé
  const getWorkStatus = useCallback((item: VideoItem): string => {
    if (item.videoType === 'anime') {
      const rawStatus = item.statut_diffusion || '';
      return normalizeWorkStatus(rawStatus);
    } else if (item.videoType === 'movie' || item.videoType === 'series') {
      const rawStatus = item.statut || '';
      return normalizeWorkStatus(rawStatus);
    }
    return '';
  }, []);

  const {
    sortedItems: sortedVideos,
    hasActiveFilters: hasActiveFiltersBase
  } = useCollectionFilters({
    items: allVideos,
    search: searchTerm,
    statusFilter: completionFilter, // Utiliser completionFilter pour le statut de visionnage
    showFavoriteOnly,
    showHidden,
    showWatchlistOnly: false, // Non utilisé
    showMajOnly,
    sortBy,
    searchConfig: {
      getTitle: (item) => item.titre,
      getOriginalTitle: (item) => {
        if (item.videoType === 'movie' || item.videoType === 'series') {
          return item.titre_original;
        }
        return undefined;
      },
      getExternalId: (item) => {
        if (item.videoType === 'anime') return item.mal_id;
        if (item.videoType === 'movie' || item.videoType === 'series') return item.tmdb_id;
        return undefined;
      }
    },
    filterConfig: {
      getIsHidden: (item) => item.videoType === 'anime' ? !!item.is_masquee : !!item.is_hidden,
      getIsFavorite: (item) => !!item.is_favorite,
      getStatus: (item) => resolveVideoStatus(item),
      getHasUpdates: (item) => item.videoType === 'series' ? !!item.maj_disponible : false,
      customFilter: (item) => {
        // Filtre par statut de l'œuvre
        if (workStatusFilter !== '') {
          const workStatus = getWorkStatus(item);
          if (workStatus !== workStatusFilter) return false;
        }

        // Filtre par genres
        if (selectedGenres.length > 0) {
          let itemGenres: string[] = [];
          if (item.videoType === 'anime' && item.genres) {
            const genres = Array.isArray(item.genres) ? item.genres : item.genres.split(',').map(g => g.trim());
            itemGenres = genres.map(g => typeof g === 'string' ? g : (g as any).name || '').filter(Boolean);
          } else if ((item.videoType === 'movie' || item.videoType === 'series') && item.genres) {
            if (Array.isArray(item.genres)) {
              itemGenres = item.genres.map((g: any) => g.name || g).filter(Boolean);
            }
          }
          const hasAllGenres = selectedGenres.every(genre => itemGenres.includes(genre));
          if (!hasAllGenres) return false;
        }

        // Filtre par thèmes (animes uniquement)
        if (selectedThemes.length > 0 && item.videoType === 'anime') {
          if (!item.themes) return false;
          const themes = Array.isArray(item.themes) ? item.themes : item.themes.split(',').map(t => t.trim());
          const itemThemes = themes.map(t => typeof t === 'string' ? t : '').filter(Boolean);
          const hasAllThemes = selectedThemes.every(theme => itemThemes.includes(theme));
          if (!hasAllThemes) return false;
        }

        // Filtre par labels (animes uniquement)
        if (selectedLabels.length > 0 && item.videoType === 'anime') {
          if (!item.labels) return false;
          const labels = Array.isArray(item.labels) ? item.labels : String(item.labels).split(',').map((l: string) => l.trim());
          const itemLabels = labels.map((l: string | { name?: string }) => typeof l === 'string' ? l : '').filter(Boolean);
          const hasAllLabels = selectedLabels.every(label => itemLabels.includes(label));
          if (!hasAllLabels) return false;
        }

        return true;
      }
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
            const scoreA = (a.videoType === 'anime' ? (a as AnimeSerie).score :
              (a.videoType === 'movie' ? (a as MovieListItem).note_moyenne :
                (a as TvShowListItem).note_moyenne)) || 0;
            const scoreB = (b.videoType === 'anime' ? (b as AnimeSerie).score :
              (b.videoType === 'movie' ? (b as MovieListItem).note_moyenne :
                (b as TvShowListItem).note_moyenne)) || 0;
            return scoreB - scoreA;
          }
        },
        'popularite-desc': {
          label: 'Popularité ↓',
          compare: (a, b) => {
            const popA = (a.videoType === 'series' ? (a as TvShowListItem).popularite : 0) || 0;
            const popB = (b.videoType === 'series' ? (b as TvShowListItem).popularite : 0) || 0;
            return popB - popA;
          }
        }
      },
      defaultSort: 'title-asc'
    }
  });

  const hasActiveFilters = hasActiveFiltersBase ||
    selectedGenres.length > 0 ||
    selectedThemes.length > 0 ||
    selectedLabels.length > 0 ||
    completionFilter !== '' ||
    workStatusFilter !== '';

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
    items: sortedVideos,
    defaultItemsPerPage: 50,
    storageKey: 'videos-all-items-per-page',
    scrollStorageKey: 'videos.all.scroll'
  });

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCompletionFilter('');
    setWorkStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowMajOnly(false);
    setSelectedGenres([]);
    setSelectedThemes([]);
    setSelectedLabels([]);
  }, [
    setSearchTerm, setCompletionFilter, setWorkStatusFilter, setShowFavoriteOnly, setShowHidden,
    setShowMajOnly, setSelectedGenres, setSelectedThemes, setSelectedLabels
  ]);

  // Construire les options pour les filtres
  const completionOptions = [
    { value: '', label: '📂 Tous les statuts de visionnage' },
    ...VIDEO_STATUS_OPTIONS.map(status => ({
      value: status,
      label: formatStatusLabel(status, { category: 'anime' })
    }))
  ];

  const workStatusOptions = [
    { value: '', label: '📺 Tous les statuts de l\'œuvre' },
    ...availableWorkStatuses.map(status => ({
      value: status,
      label: translateStatus(status)
    }))
  ];

  const handleOpenDetail = useCallback((item: VideoItem) => {
    // Sauvegarder la position de scroll et le chemin actuel
    rememberScrollTarget('videos.all.scroll', item.id);
    const currentPath = location.pathname + location.search;

    if (item.videoType === 'anime') {
      navigate(`/animes/${item.id}`, { state: { from: currentPath } });
    } else if (item.videoType === 'movie') {
      navigate(`/movies/${item.tmdb_id}`, { state: { from: currentPath } });
    } else if (item.videoType === 'series') {
      navigate(`/series/${item.tmdb_id}`, { state: { from: currentPath } });
    }
  }, [navigate, location]);

  const handleToggleFavorite = useCallback(async (item: VideoItem) => {
    try {
      if (item.videoType === 'anime') {
        const currentUser = await window.electronAPI.getCurrentUser?.();
        const users = await window.electronAPI.getAllUsers?.() || [];
        const user = users.find((u: { id: number; name: string }) => u.name === currentUser);
        if (user) {
          const currentAnime = animes.find(a => a.id === item.id);
          const newFavoriteState = !currentAnime?.is_favorite;
          const result = await window.electronAPI.toggleAnimeFavorite?.(item.id, user.id);
          if (result) {
            setAnimes(prev => prev.map(a => a.id === item.id ? { ...a, is_favorite: newFavoriteState } : a));
            showToast({
              title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
              type: 'success'
            });
          }
        }
      } else if (item.videoType === 'movie') {
        const result = await window.electronAPI.toggleMovieFavorite?.(item.id);
        if (result) {
          setMovies(prev => prev.map(m => m.id === item.id ? { ...m, is_favorite: result.isFavorite } : m));
          showToast({
            title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
            type: 'success'
          });
        }
      } else if (item.videoType === 'series') {
        const result = await window.electronAPI.toggleTvFavorite?.(item.id);
        if (result) {
          setSeries(prev => prev.map(s => s.id === item.id ? { ...s, is_favorite: result.isFavorite } : s));
          showToast({
            title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
      showToast({ title: 'Erreur', message: 'Impossible de modifier le favori', type: 'error' });
    }
  }, [showToast, animes]);

  const handleToggleHidden = useCallback(async (item: VideoItem) => {
    try {
      if (item.videoType === 'anime') {
        const isMasque = await window.electronAPI.isAnimeMasquee?.(item.id);
        if (isMasque) {
          const result = await window.electronAPI.demasquerAnime?.(item.id);
          if (result?.success) {
            setAnimes(prev => prev.map(a => a.id === item.id ? { ...a, is_masquee: 0 } : a));
            showToast({
              title: 'Élément réaffiché',
              type: 'success'
            });
          }
        } else {
          const result = await window.electronAPI.masquerAnime?.(item.id);
          if (result?.success) {
            setAnimes(prev => prev.map(a => a.id === item.id ? { ...a, is_masquee: 1 } : a));
            showToast({
              title: 'Élément masqué',
              type: 'success'
            });
          }
        }
      } else if (item.videoType === 'movie') {
        const result = await window.electronAPI.toggleMovieHidden?.(item.id);
        if (result) {
          setMovies(prev => prev.map(m => m.id === item.id ? { ...m, is_hidden: result.isHidden } : m));
          showToast({
            title: result.isHidden ? 'Élément masqué' : 'Élément réaffiché',
            type: 'success'
          });
        }
      } else if (item.videoType === 'series') {
        const result = await window.electronAPI.toggleTvHidden?.(item.id);
        if (result) {
          setSeries(prev => prev.map(s => s.id === item.id ? { ...s, is_hidden: result.isHidden } : s));
          showToast({
            title: result.isHidden ? 'Élément masqué' : 'Élément réaffiché',
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
      showToast({ title: 'Erreur', message: 'Impossible de modifier le masquage', type: 'error' });
    }
  }, [showToast]);

  const handleChangeStatus = useCallback(async (item: VideoItem, status: string) => {
    try {
      if (item.videoType === 'anime') {
        const validStatus = status as AnimeSerie['statut_visionnage'];
        await window.electronAPI.setAnimeStatutVisionnage?.(item.id, validStatus as any);
        setAnimes(prev => prev.map(a => a.id === item.id ? { ...a, statut_visionnage: validStatus } : a));
        loadVideos(); // Recharger pour mettre à jour les stats
        showToast({ title: 'Statut modifié', type: 'success' });
      } else if (item.videoType === 'movie') {
        const result = await window.electronAPI.setMovieStatus?.({ movieId: item.id, statut: status });
        if (result) {
          setMovies(prev => prev.map(m => m.id === item.id ? { ...m, statut_visionnage: result.statut } : m));
          loadVideos(); // Recharger pour mettre à jour les stats
          showToast({ title: 'Statut modifié', type: 'success' });
        }
      } else if (item.videoType === 'series') {
        const result = await window.electronAPI.setTvShowStatus?.({ showId: item.id, statut: status });
        if (result) {
          setSeries(prev => prev.map(s => s.id === item.id ? { ...s, statut_visionnage: result.statut } : s));
          loadVideos(); // Recharger pour mettre à jour les stats
          showToast({ title: 'Statut modifié', type: 'success' });
        }
      }
    } catch (error) {
      console.error('Erreur changement statut:', error);
      showToast({ title: 'Erreur', message: 'Impossible de modifier le statut', type: 'error' });
    }
  }, [showToast, loadVideos]);

  const handleAddComplete = useCallback(() => {
    loadVideos();
  }, [loadVideos]);

  return (
    <>
      {ToastContainer}
      {showAddModal && (
        <AddVideoTypeModal
          onClose={() => setShowAddModal(false)}
          onComplete={handleAddComplete}
        />
      )}
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Collection Vidéos"
            icon="🎬"
            count={sortedVideos.length}
            countLabel={sortedVideos.length > 1 ? 'vidéos' : 'vidéo'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter une Vidéo"
            extraButtons={(
              <button
                onClick={loadVideos}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Recharger
              </button>
            )}
          />

          {/* Barre de sous-onglets */}
          <VideoNavigationTabs videoCounts={videoCounts} animeTypeCounts={animeTypeCounts} />

          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="anime" stats={stats} />
          </div>

          <VideoCollectionFilters
            contentType="video"
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Rechercher une vidéo (titre, MAL ID, TMDb ID...)"
            onOpenHelp={() => setShowHelpModal(true)}
            sortBy={sortBy as any}
            onSortChange={(value) => setSortBy(value as VideoSortOption)}
            sortOptions={VIDEO_SORT_OPTIONS as any}
            completionFilter={completionFilter}
            onCompletionFilterChange={setCompletionFilter}
            completionOptions={completionOptions}
            workStatusFilter={workStatusFilter}
            onWorkStatusFilterChange={setWorkStatusFilter}
            workStatusOptions={workStatusOptions}
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

          {!loading && sortedVideos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedVideos.length}
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
                  if (item.videoType === 'anime') {
                    return (
                      <AnimeCard
                        key={`${item.id}-${item.statut_visionnage}-${item.is_favorite}`}
                        anime={item}
                        onClick={() => handleOpenDetail(item)}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                        onChangeStatus={(status) => handleChangeStatus(item, status)}
                        onToggleHidden={() => handleToggleHidden(item)}
                      />
                    );
                  } else if (item.videoType === 'movie') {
                    return (
                      <MovieCard
                        key={`${item.id}-${item.statut_visionnage}-${item.is_favorite}`}
                        movie={item}
                        onClick={() => handleOpenDetail(item)}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                        onChangeStatus={(status) => handleChangeStatus(item, status)}
                        onToggleHidden={() => handleToggleHidden(item)}
                      />
                    );
                  } else if (item.videoType === 'series') {
                    return (
                      <TvShowCard
                        key={`${item.id}-${item.statut_visionnage}-${item.is_favorite}`}
                        show={item}
                        onClick={() => handleOpenDetail(item)}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                        onChangeStatus={(status) => handleChangeStatus(item, status)}
                        onToggleHidden={() => handleToggleHidden(item)}
                      />
                    );
                  }
                  return null;
                }}
                renderListItem={(item) => {
                  const getSubtitle = () => {
                    if (item.videoType === 'anime') return item.genres || '';
                    if (item.videoType === 'movie') return formatAirDate(item.date_sortie) || '';
                    if (item.videoType === 'series') return formatAirDate(item.date_premiere) || '';
                    return '';
                  };

                  const getProgression = () => {
                    if (item.videoType === 'anime') {
                      const episodesVus = item.episodes_vus || 0;
                      const episodesTotal = item.nb_episodes || 0;
                      return episodesTotal > 0 ? Math.round((episodesVus / episodesTotal) * 100) : null;
                    } else if (item.videoType === 'series') {
                      const episodesVus = item.episodes_vus || 0;
                      const episodesTotal = item.nb_episodes || 0;
                      return episodesTotal > 0 ? Math.round((episodesVus / episodesTotal) * 100) : null;
                    }
                    return null;
                  };

                  const getAvailableStatuses = (): string[] => {
                    if (item.videoType === 'anime') return [...COMMON_STATUSES.ANIME];
                    if (item.videoType === 'movie') return [...COMMON_STATUSES.MOVIE];
                    if (item.videoType === 'series') return [...COMMON_STATUSES.SERIES];
                    return [];
                  };

                  return (
                    <ListItem
                      key={`${item.id}-${item.videoType}-${item.statut_visionnage}-${item.is_favorite}`}
                      title={item.titre}
                      subtitle={getSubtitle()}
                      progression={getProgression()}
                      currentStatus={resolveVideoStatus(item)}
                      availableStatuses={getAvailableStatuses()}
                      isFavorite={!!item.is_favorite}
                      isHidden={item.videoType === 'anime' ? !!item.is_masquee : !!item.is_hidden}
                      onClick={() => handleOpenDetail(item)}
                      onToggleFavorite={() => handleToggleFavorite(item)}
                      onChangeStatus={(status) => handleChangeStatus(item, status)}
                      onToggleHidden={() => handleToggleHidden(item)}
                    />
                  );
                }}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={sortedVideos.length}
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

          <BackToTopButton />
          <BackToBottomButton />
        </div>
      </div>

      <SearchHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        config={VIDEOS_ALL_SEARCH_HELP_CONFIG}
      />
    </>
  );
}
