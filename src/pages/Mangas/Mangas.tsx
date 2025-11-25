import { ChevronDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoMihon from '../../../assets/logo-128px.png';
import { MangaCard } from '../../components/cards';
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
import MalCandidateSelectionModal from '../../components/modals/common/MalCandidateSelectionModal';
import AddSerieModal from '../../components/modals/manga/AddSerieModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { Serie, SerieFilters, SerieTag } from '../../types';
import { computeMangaProgress } from '../../utils/manga-progress';
import { getSerieStatusLabel } from '../../utils/manga-status';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';

// Composant wrapper pour ListItem qui gère isHidden dynamiquement (comme MangaCard)
function ListItemWrapper({
  serie,
  title,
  subtitle,
  progression,
  currentStatus,
  badges,
  onOpenDetail,
  onToggleFavorite,
  onChangeStatus,
  onToggleHidden
}: {
  serie: Serie;
  title: string;
  subtitle?: string | React.ReactNode;
  progression?: number | null;
  currentStatus: string;
  badges?: React.ReactNode;
  onOpenDetail: () => void;
  onToggleFavorite: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  onToggleHidden: () => Promise<void>;
}) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const checkIfMasquee = async () => {
      const masquee = await window.electronAPI.isSerieMasquee(serie.id);
      setIsHidden(masquee);
    };
    checkIfMasquee();
  }, [serie.id]);

  const handleToggleHidden = async () => {
    await onToggleHidden();
    // Re-vérifier le statut après le toggle
    const masquee = await window.electronAPI.isSerieMasquee(serie.id);
    setIsHidden(masquee);
  };

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      progression={progression}
      currentStatus={currentStatus}
      availableStatuses={[...COMMON_STATUSES.MANGA]}
      isFavorite={serie.is_favorite || false}
      isHidden={isHidden}
      badges={badges}
      onClick={onOpenDetail}
      onToggleFavorite={onToggleFavorite}
      onChangeStatus={onChangeStatus}
      onToggleHidden={handleToggleHidden}
    />
  );
}

const MANGA_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'date-asc', 'cost-desc', 'cost-asc'] as const;
type MangaSortOption = (typeof MANGA_SORT_OPTIONS)[number];
const MANGA_SORT_SET = new Set<string>(MANGA_SORT_OPTIONS);
const isMangaSortOption = (value: unknown): value is MangaSortOption =>
  typeof value === 'string' && MANGA_SORT_SET.has(value);

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

const MANGA_STATUS_TO_TAG: Record<(typeof COMMON_STATUSES.MANGA)[number], SerieTag> = {
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
const isSerieFiltersValue = (value: unknown): value is string | boolean =>
  typeof value === 'string' || typeof value === 'boolean';
const isSerieFilters = (value: unknown): value is SerieFilters => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const allowedKeys = new Set(['statut', 'type_volume', 'proprietaire', 'search', 'afficherMasquees', 'tag', 'source_url', 'source_id']);
  return Object.entries(value as Record<string, unknown>).every(([key, val]) => allowedKeys.has(key) && isSerieFiltersValue(val));
};

export default function Mangas() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialMalId, setInitialMalId] = useState<string | null>(null);
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
  const [filters, setFilters] = usePersistentState<SerieFilters>(
    'collection.mangas.filters',
    {},
    { validator: isSerieFilters, storage: 'session' }
  );
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    'collection.mangas.search',
    '',
    { storage: 'session' }
  );
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const [stats, setStats] = useState<ProgressionStats>({});
  const [viewMode, handleViewModeChange] = useCollectionViewMode('mangas');
  const [sortBy, setSortBy] = usePersistentState<MangaSortOption>(
    'collection.mangas.sortBy',
    'title-asc',
    { validator: isMangaSortOption, storage: 'session' }
  );
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  const [updateKey, setUpdateKey] = useState(0); // Clé pour forcer le re-render

  // Toggles de filtres
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.mangas.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.mangas.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'collection.mangas.filters.showMajOnly',
    false,
    { storage: 'session' }
  );
  const [mihonFilter, setMihonFilter] = usePersistentState<string>(
    'collection.mangas.filters.mihonFilter',
    'all',
    { storage: 'session' }
  );
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    'collection.mangas.filters.selectedLabels',
    [],
    { storage: 'session' }
  );
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [serieLabels, setSerieLabels] = useState<Record<number, Array<{ label: string; color: string }>>>({});
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);

  // Récupération des sites disponibles depuis l'index des sources
  // Cette liste est basée sur TOUTES les séries de la base, pas seulement celles filtrées
  const [availableSites, setAvailableSites] = useState<Array<{ id: string; name: string; baseUrl: string }>>([]);

  useEffect(() => {
    const loadAvailableSites = async () => {
      try {
        // Charger tous les sites utilisés dans la base de données (pas seulement ceux filtrés)
        if (!window.electronAPI.getAvailableSources) return;
        const result = await window.electronAPI.getAvailableSources();
        if (result.success && result.sources) {
          setAvailableSites(result.sources.map(source => ({
            ...source,
            baseUrl: '' // baseUrl n'est pas fourni par l'API, on utilise une valeur par défaut
          })));
        } else {
          console.warn('⚠️ Impossible de charger les sites depuis l\'index, utilisation du fallback');
          // Fallback : charger depuis toutes les séries de la base (via get-series sans filtres)
          try {
            const allSeries = await window.electronAPI.getSeries({});
            const domains = new Set<string>();
            allSeries.forEach((serie: Serie) => {
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
            // Convertir en format compatible
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

    // Charger une seule fois au montage du composant, pas à chaque changement de filtres
    loadAvailableSites();
  }, []); // Dépendance vide = chargement unique au montage

  const filtersNormalizedRef = useRef(false);

  useEffect(() => {
    if (filtersNormalizedRef.current) {
      return;
    }

    const nextFilters: SerieFilters = { ...filters };
    let updated = false;

    const tagValue = filters.tag as string | undefined;
    if (tagValue === 'favori' || tagValue === 'aucun') {
      delete nextFilters.tag;
      if (tagValue === 'favori') {
        setShowFavoriteOnly(true);
      }
      updated = true;
    }

    if (updated) {
      filtersNormalizedRef.current = true;
      setFilters(nextFilters);
    } else {
      filtersNormalizedRef.current = true;
    }
  }, [filters, setFilters, setShowFavoriteOnly]);

  useScrollRestoration('collection.mangas.scroll', !loading);

  const handleOpenSerieDetail = useCallback((serie: Serie) => {
    rememberScrollTarget('collection.mangas.scroll', serie.id);
    navigate(`/serie/${serie.id}`);
  }, [navigate]);

  useEffect(() => {
    loadStats();
    loadCurrentUser();
  }, [filters]);

  // Fonction pour mettre à jour une série dans l'état (utilisée par les deux méthodes)
  const updateSerieInState = useCallback((serieId: number, updates: Partial<Serie>) => {
    setSeries(prevSeries => {
      const updated = prevSeries.map(serie => {
        if (serie.id === serieId) {
          return { ...serie, ...updates };
        }
        return serie;
      });

      // Forcer un re-render
      setUpdateKey(prev => prev + 1);

      return updated;
    });
  }, []);

  // Écouter les changements de statut et favoris depuis la page de détails
  useEffect(() => {
    const handleStatusChangeFromDetail = (event: CustomEvent) => {
      const { serieId, tag, statut, statutLecture, volumes_lus, chapitres_lus } = event.detail;
      const updates: Partial<Serie> = {};
      if (tag !== undefined) {
        updates.tag = tag as SerieTag | null;
      }
      if (statut !== undefined) {
        updates.statut = statut as 'En cours' | 'Terminée' | 'Abandonnée';
      }
      if (statutLecture !== undefined) {
        updates.statut_lecture = statutLecture;
      }
      if (volumes_lus !== undefined) {
        updates.volumes_lus = volumes_lus;
      }
      if (chapitres_lus !== undefined) {
        updates.chapitres_lus = chapitres_lus;
      }
      updateSerieInState(serieId, updates);
    };

    const handleFavoriteChangeFromDetail = (event: CustomEvent) => {
      const { serieId, isFavorite } = event.detail;
      updateSerieInState(serieId, { is_favorite: isFavorite });
    };

    const handleLabelsUpdateFromDetail = (event: CustomEvent) => {
      const { serieId } = event.detail;
      // Recharger les labels pour cette série
      if (serieId) {
        window.electronAPI.getMangaLabels(serieId).then(labels => {
          setSerieLabels(prev => ({
            ...prev,
            [serieId]: labels
          }));
        }).catch(console.error);
      }
    };

    window.addEventListener('manga-status-changed', handleStatusChangeFromDetail as EventListener);
    window.addEventListener('manga-favorite-changed', handleFavoriteChangeFromDetail as EventListener);
    window.addEventListener('manga-labels-updated', handleLabelsUpdateFromDetail as EventListener);

    return () => {
      window.removeEventListener('manga-status-changed', handleStatusChangeFromDetail as EventListener);
      window.removeEventListener('manga-favorite-changed', handleFavoriteChangeFromDetail as EventListener);
      window.removeEventListener('manga-labels-updated', handleLabelsUpdateFromDetail as EventListener);
    };
  }, [updateSerieInState]);

  const loadCurrentUser = async () => {
    const users = await window.electronAPI.getAllUsers();
    const userName = await window.electronAPI.getCurrentUser();
    const user = users.find((u: { id: number; name: string }) => u.name === userName);
    setCurrentUser(user || null);
  };

  useEffect(() => {
    if (scrollPosition !== null && !loading) {
      window.scrollTo(0, scrollPosition);
      setScrollPosition(null);
    }
  }, [loading, scrollPosition]);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    try {
      const trimmed = searchTerm.trim();
      const filtersWithHidden: SerieFilters = {
        ...filters,
        ...(trimmed ? { search: trimmed } : {}),
        ...(showHidden ? { afficherMasquees: true } : {})
      };

      const data = await window.electronAPI.getSeries(filtersWithHidden);

      setSeries(data);

      // Extraire les labels depuis les données
      const labelsMap: Record<number, Array<{ label: string; color: string }>> = {};
      for (const serie of data) {
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
    } catch (error) {
      console.error('Erreur chargement séries:', error);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, showHidden]);

  useEffect(() => {
    // Recharger la liste lors d'un changement de filtre ou du toggle masqués
    loadSeries();
  }, [loadSeries]);

  const loadStats = async () => {
    const lectureStats = await window.electronAPI.getLectureStatistics();
    setStats({
      seriesEnCours: lectureStats.seriesTotal - lectureStats.seriesCompletes,
      seriesTerminees: lectureStats.seriesCompletes,
      tomesLus: lectureStats.tomesLus,
      tomesTotal: lectureStats.tomesTotal,
      chapitresLus: lectureStats.chapitresLus,
      chapitresTotal: lectureStats.chapitresTotal,
      progressionTomes: lectureStats.progressionTomes ?? null,
      progressionChapitres: lectureStats.progressionChapitres ?? null
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      const trimmed = searchTerm.trim();
      setFilters(prev => {
        if (trimmed.length === 0) {
          if (prev.search === undefined) {
            return prev;
          }
          const { search: _removed, ...rest } = prev;
          return rest as SerieFilters;
        }
        if (prev.search === trimmed) {
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
    const trimmed = searchTerm.trim();
    if (searchFromFilters && searchFromFilters !== trimmed) {
      setSearchTerm(searchFromFilters);
    }

  }, [filters.search]);

  const handleFilterChange = (key: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key as keyof SerieFilters];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowMajOnly(false);
    setMihonFilter('all');
    setSelectedLabels([]);
  }, [setFilters, setSearchTerm, setShowFavoriteOnly, setShowHidden, setShowMajOnly, setMihonFilter, setSelectedLabels]);

  const handleLabelToggle = useCallback((label: string) => {
    setSelectedLabels(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  }, [setSelectedLabels]);


  // Fonction pour détecter et extraire l'ID depuis une URL MAL
  const detectMalUrlOrId = (input: string): { id: string | null } => {
    const trimmed = input.trim();

    // Si c'est juste un nombre, c'est un ID
    if (/^\d+$/.test(trimmed)) {
      return { id: trimmed };
    }

    // Détecter URL MAL (anime ou manga)
    if (trimmed.includes('myanimelist.net/anime/') || trimmed.includes('myanimelist.net/manga/')) {
      const match = trimmed.match(/myanimelist\.net\/(?:anime|manga)\/(\d+)/);
      if (match) {
        return { id: match[1] };
      }
    }

    return { id: null };
  };

  const {
    sortedItems: sortedSeries,
    hasActiveFilters: hasActiveFiltersBase
  } = useCollectionFilters({
    items: series,
    search: searchTerm,
    statusFilter: filters.statut || '',
    showFavoriteOnly,
    showHidden,
    sortBy,
    searchConfig: {
      getTitle: (s) => s.titre,
      getExternalId: (s) => s.mal_id ? parseInt(s.mal_id.toString(), 10) : null,
      detectIdFromSearch: (term) => {
        const result = detectMalUrlOrId(term);
        return result.id ? { id: parseInt(result.id, 10) } : { id: null };
      }
    },
    filterConfig: {
      getIsHidden: (s) => !!s.is_masquee,
      getIsFavorite: (s) => !!s.is_favorite,
      getStatus: (s) => getSerieStatusLabel(s),
      customFilter: (serie) => {
        // Filtre Mihon/Source
        if (mihonFilter !== 'all') {
          const hasTomesMihon = serie.tomes?.some(tome => tome.mihon === 1);
          const hasChapitresMihon = serie.chapitres_mihon === 1;
          const isMihon = hasTomesMihon || hasChapitresMihon;
          const sourceDonnees = serie.source_donnees;
          const isMal = sourceDonnees === 'mal' || sourceDonnees === 'mal+nautiljon';
          const isNautiljon = sourceDonnees === 'nautiljon' || sourceDonnees === 'mal+nautiljon';
          
          switch (mihonFilter) {
            case 'mihon':
              if (!isMihon) return false;
              break;
            case 'not_mihon':
              if (isMihon) return false;
              // Affiche uniquement MyAnimeList et Nautiljon
              if (!isMal && !isNautiljon) return false;
              break;
            case 'mal':
              if (!isMal) return false;
              break;
            case 'not_mal':
              if (isMal) return false;
              // Affiche uniquement Mihon et Nautiljon
              if (!isMihon && !isNautiljon) return false;
              break;
            case 'nautiljon':
              if (!isNautiljon) return false;
              break;
            case 'not_nautiljon':
              if (isNautiljon) return false;
              // Affiche uniquement Mihon et MyAnimeList
              if (!isMihon && !isMal) return false;
              break;
          }
        }

        // Filtre par labels
        if (selectedLabels.length > 0) {
          const labels = serieLabels[serie.id] || [];
          const hasAnyLabel = selectedLabels.some(label => labels.some(l => l.label === label));
          if (!hasAnyLabel) return false;
        }

        // Filtres additionnels depuis filters
        if (filters.type_volume && serie.type_volume !== filters.type_volume) {
          return false;
        }
        if (filters.statut && serie.statut_publication !== filters.statut) {
          return false;
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
        'cost-desc': {
          label: 'Coût ↓',
          compare: (a, b) => {
            const costA = a.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
            const costB = b.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
            return costB - costA;
          }
        },
        'cost-asc': {
          label: 'Coût ↑',
          compare: (a, b) => {
            const costA = a.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
            const costB = b.tomes?.reduce((sum, tome) => sum + (tome.prix || 0), 0) || 0;
            return costA - costB;
          }
        }
      },
      defaultSort: 'title-asc'
    }
  });

  // Calculer hasActiveFilters en incluant le filtre Mihon et autres filtres
  const hasActiveFilters = hasActiveFiltersBase || mihonFilter !== 'all' || 
    !!filters.type_volume || !!filters.tag || !!filters.source_id || selectedLabels.length > 0;

  // Détecter si une URL/ID MAL est présente dans la recherche et si aucun résultat
  const detectedMalId = searchTerm ? detectMalUrlOrId(searchTerm) : { id: null };
  const hasNoResults = !loading && sortedSeries.length === 0 && searchTerm.length > 0;
  const showAddFromMal = hasNoResults && detectedMalId.id !== null && !importingMal;

  const handleImportFromMalDirectly = async (malId: string) => {
    if (importingMal) return;
    await runMalImport(parseInt(malId, 10), {}, false);
  };

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
      const result = await window.electronAPI.addMangaByMalId(malIdValue, options);
      if (result.success) {
        const manga = result.manga;
        setMalCandidateSelection(null);
        if (manga) {
          showToast({
            title: `✅ ${manga.titre} importé avec succès !`,
            type: 'success'
          });
        }
        setSearchTerm('');
        await loadSeries();
        await loadStats();
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
    items: sortedSeries,
    defaultItemsPerPage: 50,
    storageKey: 'mangas-items-per-page'
  });

  const handleToggleFavorite = async (serieId: number) => {
    if (!currentUser) return;
    try {
      // Obtenir l'état actuel avant de basculer
      const currentSerie = series.find(s => s.id === serieId);
      const newFavoriteState = !currentSerie?.is_favorite;

      await window.electronAPI.toggleSerieFavorite(serieId, currentUser.id);

      // Utiliser la fonction commune pour mettre à jour
      updateSerieInState(serieId, { is_favorite: newFavoriteState });
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  const handleChangeStatus = async (serieId: number, newStatus: string) => {
    if (!currentUser) return;
    try {
      // Mapper le statut vers le tag
      const statusToTagMap: Record<string, SerieTag> = {
        'À lire': 'a_lire',
        'En cours': 'en_cours',
        'Terminé': 'lu',
        'Abandonné': 'abandonne',
        'En pause': 'en_pause'
      };

      const tag = statusToTagMap[newStatus];
      let newStatut: string | null = null;
      if (tag) {
        await window.electronAPI.setSerieTag(serieId, currentUser.id, tag);

        // Mettre à jour aussi le statut de lecture si nécessaire
        const lectureStatus = newStatus === 'Terminé' ? 'Terminé' : newStatus;

        if (newStatus === 'Abandonné') {
          await window.electronAPI.updateSerie(serieId, { statut: 'Abandonnée', statut_lecture: lectureStatus });
          newStatut = 'Abandonnée';
        } else if (newStatus === 'En cours') {
          await window.electronAPI.updateSerie(serieId, { statut: 'En cours', statut_lecture: lectureStatus });
          newStatut = 'En cours';
        } else if (newStatus === 'Terminé') {
          await window.electronAPI.updateSerie(serieId, { statut: 'Terminée', statut_lecture: lectureStatus });
          newStatut = 'Terminée';
        } else if (newStatus === 'En pause' || newStatus === 'À lire') {
          await window.electronAPI.updateSerie(serieId, { statut_lecture: lectureStatus });
        }

        // Utiliser la fonction commune pour mettre à jour
        const updates: Partial<Serie> = { tag: tag as SerieTag, statut_lecture: lectureStatus };
        if (newStatut) {
          updates.statut = newStatut as Serie['statut'];
        }
        updateSerieInState(serieId, updates);

        window.dispatchEvent(new CustomEvent('manga-status-changed', {
          detail: {
            serieId,
            status: newStatus,
            tag,
            statut: newStatut,
            statutLecture: lectureStatus
          }
        }));
      }
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  };

  const handleToggleHidden = async (serieId: number) => {
    try {
      const scrollY = window.scrollY;
      const isMasquee = await window.electronAPI.isSerieMasquee(serieId);

      if (isMasquee) {
        await window.electronAPI.demasquerSerie(serieId);
      } else {
        await window.electronAPI.masquerSerie(serieId);
      }

      // Recharger SANS scroller
      const data = await window.electronAPI.getSeries(filters);
      setSeries(data);
      await loadStats();

      // Restaurer la position de scroll
      setTimeout(() => window.scrollTo(0, scrollY), 0);
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
    }
  };

  return (
    <>
      {ToastContainer}
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* En-tête avec composant réutilisable */}
          <CollectionHeader
            title="Collection Lectures"
            icon="📚"
            count={series.length}
            countLabel={series.length > 1 ? 'lectures' : 'lecture'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter une série"
            extraButtons={
              <button
                onClick={async () => {
                  try {
                    const result = await window.electronAPI.malSyncNow();
                    await loadSeries();
                    await loadStats();
                    alert(`Synchronisation terminée !\nCréés: ${result.mangas?.created ?? 0}\nMis à jour: ${result.mangas?.updated ?? 0}`);
                  } catch (error) {
                    console.error('Erreur sync MAL:', error);
                    alert('Erreur lors de la synchronisation MAL');
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
            <ProgressionHeader type="manga" stats={stats} />
          </div>

          {/* Recherche et filtres avec composants réutilisables */}
          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <CollectionSearchBar
              searchTerm={searchTerm}
              onSearchChange={(value) => setSearchTerm(value)}
              placeholder="Rechercher une série (titre ou MAL ID)..."
              onSubmit={handleSearch}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as MangaSortOption)}
                className="select"
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

          {/* Pagination avec contrôles de vue et items par page */}
          {sortedSeries.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedSeries.length}
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
                ID MAL détecté : <strong>{detectedMalId.id}</strong>. Souhaitez-vous ajouter cette série depuis MyAnimeList ?
              </p>
              <button
                onClick={() => detectedMalId.id && handleImportFromMalDirectly(detectedMalId.id)}
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

          {/* Liste des séries */}
          <CollectionView
            key={updateKey}
            items={paginatedItems}
            loading={loading}
            viewMode={viewMode}
            renderCard={(serie) => (
              <MangaCard
                key={`${serie.id}-${serie.tag}-${serie.statut}-${serie.statut_lecture}-${serie.is_favorite}-${updateKey}`}
                serie={serie}
                onClick={() => handleOpenSerieDetail(serie)}
                onToggleFavorite={() => handleToggleFavorite(serie.id)}
                onChangeStatus={(status) => handleChangeStatus(serie.id, status)}
                onToggleHidden={() => handleToggleHidden(serie.id)}
              />
            )}
            renderListItem={(serie) => {
              const progress = computeMangaProgress(serie);
              const progression = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
              const currentStatus = getSerieStatusLabel(serie);

              // Badge favori
              const badgeFavori = !!serie.is_favorite ? (
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

              // Badge Mihon (version inline pour liste)
              const hasMihon = serie.tomes?.some(tome => tome.mihon === 1) || serie.chapitres_mihon === 1;
              const badgeMihon = hasMihon ? (
                <img
                  src={logoMihon}
                  alt="Mihon"
                  style={{
                    width: '20px',
                    height: '20px',
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                />
              ) : null;

              // Badge de statut (version inline pour liste) - pour tous les statuts
              const getStatusBadgeInline = (status: string) => {
                if (!status) return null;
                const getStatusConfig = () => {
                  switch (status) {
                    case 'À lire':
                      return {
                        color: '#ffffff',
                        bg: '#3b82f6',
                        icon: '👁️',
                        label: 'À lire'
                      };
                    case 'En cours':
                      return {
                        color: '#ffffff',
                        bg: '#8b5cf6',
                        icon: '📖',
                        label: 'En cours'
                      };
                    case 'Terminé':
                      return {
                        color: '#ffffff',
                        bg: '#10b981',
                        icon: '✅',
                        label: 'Terminé'
                      };
                    case 'Abandonné':
                      return {
                        color: '#ffffff',
                        bg: '#ef4444',
                        icon: '🚫',
                        label: 'Abandonné'
                      };
                    case 'En pause':
                      return {
                        color: '#000000',
                        bg: '#fbbf24',
                        icon: '⏸️',
                        label: 'En pause'
                      };
                    default:
                      return null;
                  }
                };
                const config = getStatusConfig();
                if (!config) return null;
                return (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: config.bg,
                    color: config.color,
                    flexShrink: 0,
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <span style={{ fontSize: '12px' }}>{config.icon}</span>
                    <span>{config.label}</span>
                  </span>
                );
              };
              const statusBadgeInline = getStatusBadgeInline(currentStatus);

              // Badges combinés pour le titre (favori + Mihon)
              const allBadges = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {badgeFavori}
                  {badgeMihon}
                </div>
              );

              // Subtitle avec badge de statut devant la progression "X/Y"
              const subtitleWithBadge = progress.source !== 'none' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {statusBadgeInline}
                  <span>{progress.label}</span>
                </div>
              ) : statusBadgeInline ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {statusBadgeInline}
                </div>
              ) : undefined;

              // Wrapper pour ListItem qui gère isHidden dynamiquement
              return (
                <ListItemWrapper
                  key={`${serie.id}-${serie.tag}-${serie.statut}-${serie.statut_lecture}-${serie.is_favorite}-${updateKey}`}
                  serie={serie}
                  title={serie.titre}
                  subtitle={subtitleWithBadge}
                  progression={progression}
                  currentStatus={currentStatus}
                  badges={allBadges}
                  onOpenDetail={() => handleOpenSerieDetail(serie)}
                  onToggleFavorite={() => handleToggleFavorite(serie.id)}
                  onChangeStatus={(status) => handleChangeStatus(serie.id, status)}
                  onToggleHidden={() => handleToggleHidden(serie.id)}
                />
              );
            }}
            onUpdate={() => { loadSeries(); loadStats(); }}
            emptyMessage={
              showAddFromMal
                ? ''
                : (hasActiveFilters
                  ? 'Aucune lecture ne correspond à vos filtres'
                  : 'Aucune lecture dans votre collection')
            }
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>📚</span>}
            gridMinWidth={200}
            imageMinWidth={200}
          />

          {showAddModal && (
            <AddSerieModal
              initialMalId={initialMalId || undefined}
              onClose={() => {
                setShowAddModal(false);
                setInitialMalId(null);
              }}
              onSuccess={() => {
                setShowAddModal(false);
                setInitialMalId(null);
                loadSeries();
                loadStats();
              }}
            />
          )}

          {malCandidateSelection && (
            <MalCandidateSelectionModal
              malId={malCandidateSelection.malId}
              candidates={malCandidateSelection.candidates}
              loading={resolvingCandidate}
              onSelect={(candidateId: number) => {
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
        {sortedSeries.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedSeries.length}
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
