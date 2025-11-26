import { ChevronDown, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimeCard } from '../../components/cards';
import {
  BackToBottomButton,
  BackToTopButton,
  CollectionFiltersBar,
  CollectionHeader,
  CollectionSearchBar,
  FilterToggle,
  Pagination,
  ProgressionHeader,
  ProgressionStats
} from '../../components/collections';
import CollectionView from '../../components/common/CollectionView';
import ListItem from '../../components/common/ListItem';
import AddAnimeModal from '../../components/modals/anime/AddAnimeModal';
import MalCandidateSelectionModal from '../../components/modals/common/MalCandidateSelectionModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { AnimeFilters, AnimeSerie } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';

const ANIME_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'date-asc'] as const;
type AnimeSortOption = (typeof ANIME_SORT_OPTIONS)[number];
const ANIME_SORT_SET = new Set<string>(ANIME_SORT_OPTIONS);
const isAnimeSortOption = (value: unknown): value is AnimeSortOption =>
  typeof value === 'string' && ANIME_SORT_SET.has(value);
const isAnimeFilters = (value: unknown): value is AnimeFilters => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const allowedKeys = new Set(['mesAnimes', 'statut', 'type', 'visionnage']);
  return Object.entries(value as Record<string, unknown>).every(([key, val]) => {
    if (!allowedKeys.has(key)) {
      return false;
    }
    return typeof val === 'string' || typeof val === 'boolean';
  });
};

export default function Animes() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [filters, setFilters] = usePersistentState<AnimeFilters>(
    'collection.animes.filters',
    {},
    { validator: isAnimeFilters, storage: 'session' }
  );
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    'collection.animes.search',
    '',
    { storage: 'session' }
  );
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialMalId, setInitialMalId] = useState<number | null>(null);
  const [importingMal, setImportingMal] = useState(false);
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
  const [viewMode, handleViewModeChange] = useCollectionViewMode('animes');
  const [sortBy, setSortBy] = usePersistentState<AnimeSortOption>(
    'collection.animes.sortBy',
    'title-asc',
    { validator: isAnimeSortOption, storage: 'session' }
  );
  const [stats, setStats] = useState<ProgressionStats>({});
  const [updateKey, setUpdateKey] = useState(0); // Clé pour forcer le re-render

  useScrollRestoration('collection.animes.scroll', !loading);

  const handleOpenAnimeDetail = useCallback((anime: AnimeSerie) => {
    rememberScrollTarget('collection.animes.scroll', anime.id);
    navigate(`/animes/${anime.id}`);
  }, [navigate]);

  // Toggles de filtres
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.animes.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.animes.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'collection.animes.filters.showMajOnly',
    false,
    { storage: 'session' }
  );
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    'collection.animes.filters.selectedLabels',
    [],
    { storage: 'session' }
  );
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [animeLabels, setAnimeLabels] = useState<Record<number, Array<{ label: string; color: string }>>>({});
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    'collection.animes.filters.selectedGenres',
    [],
    { storage: 'session' }
  );
  const [selectedThemes, setSelectedThemes] = usePersistentState<string[]>(
    'collection.animes.filters.selectedThemes',
    [],
    { storage: 'session' }
  );
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);
  const [showThemesFilter, setShowThemesFilter] = useState(false);

  const filtersNormalizedRef = useRef(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (filtersNormalizedRef.current) {
      return;
    }

    const legacyStatusMap: Record<string, string> = {
      watching: 'En cours',
      completed: 'Terminé',
      on_hold: 'En pause',
      dropped: 'Abandonné',
      plan_to_watch: 'À regarder'
    };

    const legacyCompletionMap: Record<string, 'completed' | 'watching' | 'not_started' | ''> = {
      completed: 'completed',
      watching: 'watching',
      not_started: 'not_started'
    };

    const nextFilters: AnimeFilters = { ...filters };
    let updated = false;

    if (filters.statut && legacyStatusMap[filters.statut]) {
      nextFilters.statut = legacyStatusMap[filters.statut] as AnimeFilters['statut'];
      updated = true;
    }

    if (filters.visionnage && legacyCompletionMap[filters.visionnage]) {
      nextFilters.visionnage = legacyCompletionMap[filters.visionnage];
      updated = true;
    }

    if (updated) {
      filtersNormalizedRef.current = true;
      setFilters(nextFilters);
    } else {
      filtersNormalizedRef.current = true;
    }

  }, [filters, setFilters]);


  // Fonction pour calculer les stats (définie avant loadAnimes)
  const calculateStats = (animesData: AnimeSerie[]) => {
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
  };

  // Fonction pour charger les animes (définie avant les useEffect qui l'utilisent)
  const loadAnimes = useCallback(async () => {
    setLoading(true);
    try {
      // Charger depuis l'API
      const result = await window.electronAPI.getAnimeSeries(filters as Record<string, unknown>);
      const animesData = result.animes || [];

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
        const allLabels = await window.electronAPI.getAllAnimeLabels();
        setAvailableLabels(allLabels);
      } catch (error) {
        console.error('Erreur chargement labels:', error);
      }

      // Charger tous les genres et thèmes disponibles
      try {
        const allGenres = await window.electronAPI.getAllAnimeGenres();
        setAvailableGenres(allGenres);
        const allThemes = await window.electronAPI.getAllAnimeThemes();
        setAvailableThemes(allThemes);
      } catch (error) {
        console.error('Erreur chargement genres/thèmes:', error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des animes:', error);
      setAnimes([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Référence stable pour loadAnimes (pour éviter les boucles infinies dans les useEffect)
  const loadAnimesRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    loadAnimesRef.current = loadAnimes;
  }, [loadAnimes]);

  useEffect(() => {
    loadAnimes();
  }, [loadAnimes]);

  // Écouter les événements d'import depuis Tampermonkey (une seule fois au montage)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleRefresh = () => {
      // Attendre un peu pour s'assurer que la base de données est bien mise à jour
      timeoutId = setTimeout(() => {
        if (loadAnimesRef.current) {
          loadAnimesRef.current();
        }
      }, 500);
    };

    // Écouter l'événement IPC refresh-anime-list
    const unsubscribe = window.electronAPI.onAnimeImportComplete?.(handleRefresh);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Tableau de dépendances vide = exécuté une seule fois au montage

  // Écouter les événements de suppression d'anime depuis la page de détail (une seule fois au montage)
  useEffect(() => {
    const handleAnimeDeleted = () => {
      // Recharger la collection
      if (loadAnimesRef.current) {
        loadAnimesRef.current();
      }
    };

    window.addEventListener('anime-deleted', handleAnimeDeleted as EventListener);
    return () => {
      window.removeEventListener('anime-deleted', handleAnimeDeleted as EventListener);
    };
  }, []); // Tableau de dépendances vide = exécuté une seule fois au montage

  // Fonction pour mettre à jour un anime dans l'état (utilisée par les deux méthodes)
  const updateAnimeInState = useCallback((animeId: number, updates: Partial<AnimeSerie>) => {
    setAnimes(prevAnimes => {
      const updated = prevAnimes.map(anime => {
        if (anime.id === animeId) {
          return { ...anime, ...updates };
        }
        return anime;
      });

      // Forcer un re-render
      setUpdateKey(prev => prev + 1);

      // Recalculer les stats
      calculateStats(updated);

      return updated;
    });
  }, []);

  // Écouter les changements de statut et favoris depuis la page de détails
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
      // Recharger les labels pour cet anime
      if (animeId) {
        window.electronAPI.getAnimeLabels(animeId).then(labels => {
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


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleFilterChange = (key: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key as keyof AnimeFilters];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setShowHidden(false);
    setShowFavoriteOnly(false);
    setShowMajOnly(false);
    setSelectedLabels([]);
    setSelectedGenres([]);
    setSelectedThemes([]);
  }, [setFilters, setSearchTerm, setShowFavoriteOnly, setShowHidden, setShowMajOnly, setSelectedLabels, setSelectedGenres, setSelectedThemes]);

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

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      const trimmed = searchTerm.trim();
      setFilters(prev => {
        const hasSearch = trimmed.length > 0;
        const prevSearch = (prev as AnimeFilters).search;

        if (!hasSearch && prevSearch === undefined) {
          return prev;
        }

        if (!hasSearch) {
          if (prevSearch === undefined) {
            return prev;
          }
          const { search, ...rest } = prev;
          return rest as AnimeFilters;
        }

        if (prevSearch === trimmed) {
          return prev;
        }

        return { ...prev, search: trimmed };
      });
    }, 200);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm, setFilters]);

  useEffect(() => {
    const searchFromFilters = filters.search;
    if (searchFromFilters && searchFromFilters !== searchTerm) {
      setSearchTerm(searchFromFilters);
    }
    if (!searchFromFilters && hasSearchTerm) {
      // si filtres ne contiennent plus search mais état oui, garder état (aucune action)
    }

  }, [filters.search]);


  const handleStatusChange = async (animeId: number, newStatus: string) => {
    try {
      const validStatus: AnimeSerie['statut_visionnage'] = newStatus as AnimeSerie['statut_visionnage'];
      await window.electronAPI.setAnimeStatutVisionnage(animeId, validStatus as any);

      // Utiliser la fonction commune pour mettre à jour
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
        // Obtenir l'état actuel avant de basculer
        const currentAnime = animes.find(a => a.id === animeId);
        const newFavoriteState = !currentAnime?.is_favorite;

        await window.electronAPI.toggleAnimeFavorite(animeId, user.id);

        // Utiliser la fonction commune pour mettre à jour
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
      // Vérifier si l'anime est déjà masqué
      const isMasque = await window.electronAPI.isAnimeMasquee(animeId);

      if (isMasque) {
        // Démasquer
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

      // Recharger les données
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

  // Fonction pour détecter et extraire l'ID depuis une URL MAL
  const detectMalUrlOrId = (input: string): { id: number | null } => {
    const trimmed = input.trim();

    // Si c'est juste un nombre, c'est un ID
    if (/^\d+$/.test(trimmed)) {
      return { id: parseInt(trimmed) };
    }

    // Détecter URL MAL (anime ou manga)
    if (trimmed.includes('myanimelist.net/anime/') || trimmed.includes('myanimelist.net/manga/')) {
      const match = trimmed.match(/myanimelist\.net\/(?:anime|manga)\/(\d+)/);
      if (match) {
        return { id: parseInt(match[1]) };
      }
    }

    return { id: null };
  };

  function resolveAnimeStatus(anime: AnimeSerie): string {
    if (anime.statut_visionnage) {
      return anime.statut_visionnage;
    }

    const episodesVus = anime.episodes_vus || 0;
    const episodesTotal = anime.nb_episodes || 0;

    if (episodesTotal > 0 && episodesVus >= episodesTotal) {
      return 'Terminé';
    }
    if (episodesVus > 0) {
      return 'En cours';
    }
    return 'À regarder';
  }

  const malSearchInfo = hasSearchTerm ? detectMalUrlOrId(searchTerm) : { id: null };

  const {
    sortedItems: sortedAnimes,
    hasActiveFilters: hasActiveFiltersBase
  } = useCollectionFilters({
    items: animes,
    search: searchTerm,
    statusFilter: filters.visionnage || '',
    showFavoriteOnly,
    showHidden,
    showMajOnly,
    sortBy,
    searchConfig: {
      getTitle: (a) => a.titre,
      getExternalId: (a) => a.mal_id,
      detectIdFromSearch: (term) => detectMalUrlOrId(term)
    },
    filterConfig: {
      getIsHidden: (a) => !!a.is_masquee,
      getIsFavorite: (a) => !!a.is_favorite,
      getStatus: (a) => resolveAnimeStatus(a),
      getHasUpdates: (a) => {
        const episodesVus = a.episodes_vus || 0;
        const episodesTotal = a.nb_episodes || 0;
        return (
          a.statut_diffusion === 'En cours' &&
          episodesTotal > 0 &&
          episodesVus < episodesTotal
        );
      },
      customFilter: (anime) => {
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

        // Si un toggle exclusif est activé, ignorer tous les autres filtres
        if (showFavoriteOnly) {
          return Boolean(anime.is_favorite);
        }
        if (showHidden) {
          return Boolean(anime.is_masquee);
        }
        if (showMajOnly) {
          const episodesVus = anime.episodes_vus || 0;
          const episodesTotal = anime.nb_episodes || 0;
          return (
            anime.statut_diffusion === 'En cours' &&
            episodesTotal > 0 &&
            episodesVus < episodesTotal
          );
        }

        // Filtre par labels
        if (selectedLabels.length > 0) {
          const labels = animeLabels[anime.id] || [];
          const hasAnyLabel = selectedLabels.some(label => labels.some(l => l.label === label));
          if (!hasAnyLabel) return false;
        }

        // Filtre visionnage personnalisé
        if (filters.visionnage) {
          const targetStatus = filters.visionnage as (typeof COMMON_STATUSES.ANIME)[number];
          const episodesVus = anime.episodes_vus || 0;
          const episodesTotal = anime.nb_episodes || 0;
          const resolvedStatus = resolveAnimeStatus(anime);

          if (targetStatus === 'Terminé') {
            if (!(resolvedStatus === 'Terminé' || (episodesTotal > 0 && episodesVus >= episodesTotal))) {
              return false;
            }
          } else if (targetStatus === 'En cours') {
            if (resolvedStatus !== 'En cours') {
              return false;
            }
          } else if (targetStatus === 'À regarder') {
            if (!(resolvedStatus === 'À regarder' || episodesVus === 0)) {
              return false;
            }
          } else if (targetStatus === 'En pause' || targetStatus === 'Abandonné') {
            if (resolvedStatus !== targetStatus) {
              return false;
            }
          }
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
    storageKey: 'animes-items-per-page'
  });


  const animeStatusOptions = COMMON_STATUSES.ANIME.map(status => ({
    value: status,
    label: formatStatusLabel(status, { category: 'anime' })
  }));

  const statusOptions = [
    { value: '', label: '🔍 Tous les statuts' },
    ...animeStatusOptions
  ];

  const typeOptions = [
    { value: '', label: '🔍 Tous les types' },
    { value: 'TV', label: '📺 TV' },
    { value: 'Movie', label: '🎬 Film' },
    { value: 'OVA', label: '💿 OVA' },
    { value: 'ONA', label: '🌐 ONA' },
    { value: 'Special', label: '⭐ Spécial' }
  ];

  const completionOptions = [
    { value: '', label: '🔍 Toutes les complétions' },
    ...animeStatusOptions
  ];

  return (
    <>
      {ToastContainer}
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* En-tête avec composant réutilisable */}
          <CollectionHeader
            title="Collection Animés"
            icon="🎬"
            count={sortedAnimes.length}
            countLabel={sortedAnimes.length > 1 ? 'animes' : 'anime'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un anime"
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

          {/* Stats de progression */}
          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="anime" stats={stats} />
          </div>

          {/* Recherche et filtres avec composants réutilisables */}
          <CollectionFiltersBar
            hasActiveFilters={hasActiveFiltersBase || selectedLabels.length > 0 || selectedGenres.length > 0 || selectedThemes.length > 0}
            onClearFilters={clearFilters}
          >
            <CollectionSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Rechercher un anime (titre ou MAL ID)..."
              onSubmit={handleSearch}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AnimeSortOption)}
                className="select"
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="title-asc">📖 Titre (A → Z)</option>
                <option value="title-desc">📖 Titre (Z → A)</option>
                <option value="date-desc">🆕 Ajout récent</option>
                <option value="date-asc">🕐 Ajout ancien</option>
              </select>

              <select
                className="select"
                value={filters.statut || ''}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={filters.visionnage || ''}
                onChange={(e) => handleFilterChange('visionnage', e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                {completionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ligne 2 : Toggles */}
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
                label="👁️ Animés masqués"
                icon="👁️"
                activeColor="#fb923c"
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
                          {genre}
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
                          {theme}
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

          {/* Message d'ajout depuis URL/ID MAL */}
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
                ID MAL détecté : <strong>{detectedMalId.id}</strong>. Souhaitez-vous ajouter cet anime depuis MyAnimeList ?
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

          {/* Collection avec vues multiples */}
          <CollectionView
            key={updateKey}
            items={paginatedItems}
            viewMode={viewMode}
            gridMinWidth={200}
            imageMinWidth={200}
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

              // Badge favori
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
                  currentStatus={anime.statut_visionnage || 'À regarder'}
                  availableStatuses={['À regarder', 'En cours', 'Terminé', 'Abandonné']}
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
                : ((hasActiveFiltersBase || selectedLabels.length > 0 || selectedGenres.length > 0 || selectedThemes.length > 0)
                  ? 'Aucun animé ne correspond à vos filtres'
                  : 'Aucun animé dans votre collection')
            }
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>🎬</span>}
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

        {/* Pagination en bas */}
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
    </>
  );
}
