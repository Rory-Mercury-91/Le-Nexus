import { RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimeCard } from '../../components/cards';
import {
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
  const [viewMode] = useCollectionViewMode('animes');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const handleRefresh = () => {
      // Attendre un peu pour s'assurer que la base de données est bien mise à jour
      setTimeout(() => {
        if (loadAnimesRef.current) {
          loadAnimesRef.current();
        }
      }, 500);
    };

    // Écouter l'événement IPC refresh-anime-list
    const unsubscribe = window.electronAPI.onAnimeImportComplete?.(handleRefresh);

    return () => {
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

    window.addEventListener('anime-status-changed', handleStatusChangeFromDetail as EventListener);
    window.addEventListener('anime-favorite-changed', handleFavoriteChangeFromDetail as EventListener);

    return () => {
      window.removeEventListener('anime-status-changed', handleStatusChangeFromDetail as EventListener);
      window.removeEventListener('anime-favorite-changed', handleFavoriteChangeFromDetail as EventListener);
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
  }, [setFilters, setSearchTerm, setShowFavoriteOnly, setShowHidden, setShowMajOnly]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const sortAnimes = (animesToSort: AnimeSerie[]) => {
    const sorted = [...animesToSort];

    switch (sortBy) {
      case 'title-asc':
        return sorted.sort((a, b) => a.titre.localeCompare(b.titre));
      case 'title-desc':
        return sorted.sort((a, b) => b.titre.localeCompare(a.titre));
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        });
      default:
        return sorted;
    }
  };

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
  const hasActiveFilters = Object.keys(filters).length > 0 || hasSearchTerm || showHidden || showFavoriteOnly || showMajOnly;

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
  const isNumericSearchTerm = hasSearchTerm && /^\d+$/.test(normalizedSearchTerm);
  const searchMalId = isNumericSearchTerm
    ? parseInt(normalizedSearchTerm, 10)
    : (malSearchInfo.id ?? null);

  const filteredAnimes = animes.filter(anime => {
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

    // Sinon, appliquer les filtres normaux

    if (hasSearchTerm) {
      const matchesSearch =
        (isNumericSearchTerm || malSearchInfo.id !== null)
          ? anime.mal_id === searchMalId
          : anime.titre.toLowerCase().includes(normalizedSearchTerm);

      if (!matchesSearch) {
        return false;
      }
    }

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

    // Filtre masqués (si le toggle n'est pas activé, cacher les masqués)
    const isMasquee = Boolean(anime.is_masquee);
    if (!showHidden && isMasquee) {
      return false;
    }

    return true;
  });

  const sortedAnimes = sortAnimes(filteredAnimes);

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
            count={filteredAnimes.length}
            countLabel={filteredAnimes.length > 1 ? 'animes' : 'anime'}
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
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Sync MAL
              </button>
            }
          />

          {/* Stats de progression */}
          <ProgressionHeader type="anime" stats={stats} />

          {/* Recherche et filtres avec composants réutilisables */}
          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <CollectionSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Rechercher un anime (titre ou MAL ID)..."
              onSubmit={handleSearch}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AnimeSortOption)}
                className="select"
                style={{ minWidth: '200px' }}
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
                style={{ width: 'auto', minWidth: '180px' }}
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
                style={{ width: 'auto', minWidth: '150px' }}
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
                style={{ width: 'auto', minWidth: '200px' }}
              >
                {completionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center' }}>
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
            </div>
          </CollectionFiltersBar>

          {/* Pagination */}
          {sortedAnimes.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedAnimes.length}
              onPageChange={setCurrentPage}
              onFirstPage={goToFirstPage}
              onLastPage={goToLastPage}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              hideItemsPerPageSelect
            />
          )}

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
            emptyMessage={animes.length === 0 ? 'Aucun anime dans votre collection' : (showAddFromMal ? '' : 'Aucun anime trouvé')}
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3 }}>🎬</span>}
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
          <div style={{ marginTop: '32px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedAnimes.length}
              onPageChange={setCurrentPage}
              onFirstPage={goToFirstPage}
              onLastPage={goToLastPage}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              hideItemsPerPageSelect
            />
          </div>
        )}

        <BackToTopButton />
      </div>
    </>
  );
}
