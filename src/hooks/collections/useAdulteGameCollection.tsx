import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ProgressionStats, SortOption } from '../../components/collections';
import type {
  AdulteGame,
  AdulteGameFilters,
  AdulteGameMoteur,
  AdulteGameStatutJeu,
  AdulteGameStatutPerso
} from '../../types';
import { useCollectionFilters } from '../common/useCollectionFilters';
import { usePersistentState } from '../common/usePersistentState';
import { useToast } from '../common/useToast';
import { useCollectionViewMode, type ViewMode } from './useCollectionViewMode';
import { usePagination, type ItemsPerPage } from './usePagination';

const ADULTE_GAME_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'date-asc', 'platform-asc', 'platform-desc'] as const;
type AdulteGameSortOption = (typeof ADULTE_GAME_SORT_OPTIONS)[number];
const ADULTE_GAME_SORT_SET = new Set<string>(ADULTE_GAME_SORT_OPTIONS);
const isAdulteGameSortOption = (value: unknown): value is AdulteGameSortOption =>
  typeof value === 'string' && ADULTE_GAME_SORT_SET.has(value);
type TranslationFilter = 'all' | 'translated' | 'not-translated' | 'integrated';
const ADULTE_GAME_STATUT_JEU_SET = new Set<AdulteGameStatutJeu>(['TERMINÉ', 'ABANDONNÉ', 'EN COURS']);
const ADULTE_GAME_STATUT_PERSO_SET = new Set<AdulteGameStatutPerso>(['Terminé', 'En cours', 'En pause', 'À lire', 'Abandonné']);
const PLATEFORME_FILTER_SET = new Set(['all', 'F95Zone', 'LewdCorner']);
const TRANSLATION_FILTER_SET = new Set<TranslationFilter>(['all', 'translated', 'not-translated', 'integrated']);
const ADULTE_GAME_MOTEUR_SET = new Set<AdulteGameMoteur>(['RenPy', 'Unity', 'RPGM', 'Unreal', 'HTML', 'Flash', 'QSP', 'Autre']);
const UNKNOWN_MOTOR_VALUE = '__unknown__';

const isValidStatutJeuFilter = (value: unknown): value is AdulteGameStatutJeu | 'all' =>
  typeof value === 'string' && (value === 'all' || ADULTE_GAME_STATUT_JEU_SET.has(value as AdulteGameStatutJeu));

const isValidStatutPersoFilter = (value: unknown): value is AdulteGameStatutPerso | 'all' =>
  typeof value === 'string' && (value === 'all' || ADULTE_GAME_STATUT_PERSO_SET.has(value as AdulteGameStatutPerso));

const isValidPlateformeFilter = (value: unknown): value is 'all' | 'F95Zone' | 'LewdCorner' =>
  typeof value === 'string' && PLATEFORME_FILTER_SET.has(value);

const isValidTranslationFilter = (value: unknown): value is TranslationFilter =>
  typeof value === 'string' && TRANSLATION_FILTER_SET.has(value as TranslationFilter);

const isValidMoteurFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === 'all' || value === UNKNOWN_MOTOR_VALUE || ADULTE_GAME_MOTEUR_SET.has(value as AdulteGameMoteur));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

interface UseAdulteGameCollectionOptions {
  initialFilters?: AdulteGameFilters;
}

type GameLabel = { label: string; color: string };

interface UseAdulteGameCollectionReturn {
  // État des données
  games: AdulteGame[];
  loading: boolean;

  // Filtres et recherche
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStatutJeu: AdulteGameStatutJeu | 'all';
  setSelectedStatutJeu: (statut: AdulteGameStatutJeu | 'all') => void;
  selectedStatutPerso: AdulteGameStatutPerso | 'all';
  setSelectedStatutPerso: (statut: AdulteGameStatutPerso | 'all') => void;
  selectedPlateforme: 'all' | 'F95Zone' | 'LewdCorner';
  setSelectedPlateforme: (plateforme: 'all' | 'F95Zone' | 'LewdCorner') => void;
  selectedMoteur: string;
  setSelectedMoteur: (moteur: string) => void;
  availableMoteurs: string[];
  unknownMoteurValue: string;
  translationFilter: TranslationFilter;
  setTranslationFilter: (filter: TranslationFilter) => void;
  showMajOnly: boolean;
  setShowMajOnly: (show: boolean) => void;
  showFavoriteOnly: boolean;
  setShowFavoriteOnly: (show: boolean) => void;
  showHidden: boolean;
  setShowHidden: (show: boolean) => void;
  showOutdatedTranslation: boolean;
  setShowOutdatedTranslation: (show: boolean) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  selectedLabels: string[];
  setSelectedLabels: (labels: string[]) => void;

  // Tags et labels
  allTags: string[];
  availableLabels: Array<{ label: string; color: string }>;
  gameLabels: Record<number, GameLabel[]>;
  refreshLabelsForGame: (gameId: number) => Promise<void>;
  tagPreferences: Record<string, 'liked' | 'disliked' | 'neutral'>;
  handleTagToggle: (tag: string) => void;
  handleLabelToggle: (label: string) => void;

  // Tri et pagination
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  paginatedItems: AdulteGame[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: ItemsPerPage;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: ItemsPerPage) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;

  // Stats et progression
  stats: ProgressionStats;

  // View mode
  viewMode: ViewMode;
  handleViewModeChange: (mode: ViewMode) => void;

  // Filtres calculés
  filteredGames: AdulteGame[];
  sortedGames: AdulteGame[];
  hasActiveFilters: boolean;

  // Actions
  loadGames: (forceRefresh?: boolean, overrideFilters?: AdulteGameFilters | null) => Promise<void>;
  handleCheckUpdates: () => Promise<void>;
  handleToggleFavorite: (gameId: number) => Promise<void>;
  handleChangeStatus: (gameId: number, newStatus: string) => Promise<void>;
  handleToggleHidden: (gameId: number) => Promise<void>;
  handleImportFromF95Directly: (f95Id: string) => Promise<void>;

  // Détection URL/ID
  detectUrlOrId: (input: string) => { type: 'f95' | 'lewdcorner' | 'id' | null; id: string | null };
  showAddFromUrl: boolean;
  importingF95: boolean;

  // Messages
  message: { type: 'success' | 'error'; text: string } | null;

  // Modals
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  initialSearchId: string | null;
  setInitialSearchId: (id: string | null) => void;

  // Clear filters
  clearFilters: () => void;

  // Update key for re-render
  updateKey: number;
}

/**
 * Hook personnalisé pour gérer la collection de jeux adultes
 * Extrait toute la logique métier de la page AdulteGame.tsx
 */
export function useAdulteGameCollection(_options: UseAdulteGameCollectionOptions = {}): UseAdulteGameCollectionReturn {
  const location = useLocation();
  const { showToast } = useToast();

  // État des données
  const [games, setGames] = useState<AdulteGame[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres et recherche
  const [searchTerm, setSearchTerm] = usePersistentState<string>(
    'collection.adulteGames.search',
    '',
    { storage: 'session' }
  );
  const [selectedStatutJeu, setSelectedStatutJeu] = usePersistentState<AdulteGameStatutJeu | 'all'>(
    'collection.adulteGames.filters.statutJeu',
    'all',
    { validator: isValidStatutJeuFilter, storage: 'session' }
  );
  const [selectedStatutPerso, setSelectedStatutPerso] = usePersistentState<AdulteGameStatutPerso | 'all'>(
    'collection.adulteGames.filters.statutPerso',
    'all',
    { validator: isValidStatutPersoFilter, storage: 'session' }
  );
  const [selectedPlateforme, setSelectedPlateforme] = usePersistentState<'all' | 'F95Zone' | 'LewdCorner'>(
    'collection.adulteGames.filters.plateforme',
    'all',
    { validator: isValidPlateformeFilter, storage: 'session' }
  );
  const [selectedMoteur, setSelectedMoteur] = usePersistentState<string>(
    'collection.adulteGames.filters.moteur',
    'all',
    { validator: isValidMoteurFilter, storage: 'session' }
  );
  const [translationFilter, setTranslationFilter] = usePersistentState<TranslationFilter>(
    'collection.adulteGames.filters.translation',
    'all',
    { validator: isValidTranslationFilter, storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'collection.adulteGames.filters.showMajOnly',
    false,
    { storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.adulteGames.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.adulteGames.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showOutdatedTranslation, setShowOutdatedTranslation] = usePersistentState<boolean>(
    'collection.adulteGames.filters.showOutdatedTranslation',
    false,
    { storage: 'session' }
  );
  const [selectedTags, setSelectedTags] = usePersistentState<string[]>(
    'collection.adulteGames.filters.tags',
    [],
    { validator: isStringArray, storage: 'session' }
  );
  const [selectedLabels, setSelectedLabels] = usePersistentState<string[]>(
    'collection.adulteGames.filters.labels',
    [],
    { validator: isStringArray, storage: 'session' }
  );

  // Tags et labels
  const [availableLabels, setAvailableLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [gameLabels, setGameLabels] = useState<Record<number, GameLabel[]>>({});
  const [tagPreferences, setTagPreferences] = useState<Record<string, 'liked' | 'disliked' | 'neutral'>>({});
  const [tagsSorted, setTagsSorted] = useState(false);

  // Stats et progression
  const [stats, setStats] = useState<ProgressionStats>({});

  // View mode
  const [viewMode, handleViewModeChange] = useCollectionViewMode('adulte-game');

  // Tri
  const [sortBy, setSortByState] = usePersistentState<AdulteGameSortOption>(
    'collection.adulteGames.sortBy',
    'title-asc',
    { validator: isAdulteGameSortOption, storage: 'session' }
  );
  const setSortBy = useCallback((sort: SortOption) => {
    if (isAdulteGameSortOption(sort)) {
      setSortByState(sort);
    } else {
      setSortByState('title-asc');
    }
  }, [setSortByState]);

  // Messages et modals
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialSearchId, setInitialSearchId] = useState<string | null>(null);
  const [importingF95, setImportingF95] = useState(false);
  const [updateKey, setUpdateKey] = useState(0); // Clé pour forcer le re-render

  // Utilisateur
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Charger l'utilisateur actuel
  const loadCurrentUser = useCallback(async () => {
    try {
      const userName = localStorage.getItem('currentUser');
      if (userName) {
        const users = await window.electronAPI.getAllUsers();
        const user = users.find((u: { id: number; name: string }) => u.name === userName);
        if (user) {
          setCurrentUserId(user.id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  }, []);

  // Charger les préférences de tags
  const loadTagPreferences = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const preferences = await window.electronAPI.getAdulteGameTagPreferences(currentUserId);
      setTagPreferences(preferences);
    } catch (error) {
      console.error('Erreur chargement préférences tags:', error);
    }
  }, [currentUserId]);

  // Charger les labels
  const loadLabels = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllAdulteGameLabels();
      setAvailableLabels(data);
    } catch (error) {
      console.error('Erreur chargement labels:', error);
    }
  }, []);

  // Calculer les stats
  const calculateStats = useCallback((gamesData: AdulteGame[]) => {
    const jeuxEnCours = gamesData.filter(g => g.statut_perso === 'En cours').length;
    const jeuxEnCoursTraduits = gamesData.filter(g => g.statut_perso === 'En cours' && g.traduction_fr_disponible).length;
    const jeuxTermines = gamesData.filter(g => g.statut_perso === 'Terminé').length;
    const jeuxTerminesTraduits = gamesData.filter(g => g.statut_perso === 'Terminé' && g.traduction_fr_disponible).length;
    const jeuxJoues = gamesData.filter(g => ['En cours', 'Terminé', 'Abandonné'].includes(g.statut_perso || '')).length;
    const jeuxTotal = gamesData.length;

    setStats({
      jeuxEnCours,
      jeuxEnCoursTraduits,
      jeuxTermines,
      jeuxTerminesTraduits,
      jeuxJoues,
      jeuxTotal
    });
  }, []);

  // Fonction pour mettre à jour un jeu dans l'état (utilisée par les deux méthodes)
  const updateGameInState = useCallback((gameId: number, updates: Partial<AdulteGame>) => {
    setGames(prevGames => {
      const updated = prevGames.map(game => {
        if (game.id === gameId) {
          return { ...game, ...updates };
        }
        return game;
      });

      // Recalculer les stats
      calculateStats(updated);
      // Forcer un re-render
      setUpdateKey(prev => prev + 1);

      return updated;
    });
  }, [calculateStats]);

  // Écouter les changements de statut depuis la page de détails
  useEffect(() => {
    const handleStatusChangeFromDetail = (event: CustomEvent) => {
      const { gameId, statutPerso } = event.detail;
      updateGameInState(gameId, { statut_perso: statutPerso as AdulteGameStatutPerso });
    };

    window.addEventListener('adulte-game-status-changed', handleStatusChangeFromDetail as EventListener);

    return () => {
      window.removeEventListener('adulte-game-status-changed', handleStatusChangeFromDetail as EventListener);
    };
  }, [updateGameInState]);

  const currentFiltersRef = useRef<string>('');

  const computeFilters = useCallback((): AdulteGameFilters => {
    const filters: AdulteGameFilters = {};

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) filters.search = trimmedSearch;
    if (selectedStatutJeu !== 'all') filters.statut_jeu = selectedStatutJeu;
    if (selectedStatutPerso !== 'all') filters.statut_perso = selectedStatutPerso;
    // Le filtre moteur est géré uniquement côté client (comme les tags et labels)
    // pour éviter les problèmes de changement de filtre
    // if (selectedMoteur !== 'all' && selectedMoteur !== UNKNOWN_MOTOR_VALUE) {
    //   filters.moteur = selectedMoteur as AdulteGameMoteur;
    // }
    if (translationFilter === 'translated') filters.traduction_fr_disponible = true;
    if (translationFilter === 'not-translated') filters.traduction_fr_disponible = false;
    if (translationFilter === 'integrated') filters.statut_traduction = 'Traduction intégré';

    return filters;
  }, [searchTerm, selectedStatutJeu, selectedStatutPerso, translationFilter]);

  // Charger les jeux
  const loadGames = useCallback(async (_forceRefresh = false, overrideFilters: AdulteGameFilters | null = null) => {
    try {
      setLoading(true);
      const filters = overrideFilters || computeFilters();

      // Charger depuis l'API
      const data = await window.electronAPI.getAdulteGameGames(filters as Record<string, unknown>);

      setGames(data);
      calculateStats(data);

      // Extraire les labels directement depuis les données (maintenant dans game.labels)
      const labelsMap: Record<number, GameLabel[]> = {};
      for (const game of data) {
        if (game.labels && Array.isArray(game.labels)) {
          labelsMap[game.id] = game.labels;
        } else {
          // Fallback : charger depuis l'API si pas présent (pour compatibilité)
          try {
            const labels = await window.electronAPI.getAdulteGameLabels(game.id);
            labelsMap[game.id] = labels.map(l => ({ label: l.label, color: l.color }));
          } catch (e) {
            labelsMap[game.id] = [];
          }
        }
      }
      setGameLabels(labelsMap);
    } catch (error) {
      console.error('Erreur chargement jeux adultes:', error);
    } finally {
      setLoading(false);
    }
  }, [computeFilters, calculateStats]);

  const refreshLabelsForGame = useCallback(async (gameId: number) => {
    try {
      const labels = await window.electronAPI.getAdulteGameLabels(gameId);
      setGameLabels(prev => ({
        ...prev,
        [gameId]: labels.map(l => ({ label: l.label, color: l.color }))
      }));
    } catch (error) {
      console.error('Erreur mise à jour labels jeu adulte:', error);
    }
  }, []);

  useEffect(() => {
    const handleLabelsUpdateFromDetail = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: number }>;
      const gameId = customEvent.detail?.gameId;
      if (!gameId) {
        return;
      }

      void refreshLabelsForGame(gameId);
    };

    window.addEventListener('adulte-game-labels-updated', handleLabelsUpdateFromDetail);

    return () => {
      window.removeEventListener('adulte-game-labels-updated', handleLabelsUpdateFromDetail);
    };
  }, [refreshLabelsForGame]);

  // Écouter les mises à jour marquées comme "vues" depuis la page de détail
  useEffect(() => {
    const handleUpdateSeenFromDetail = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId: number }>;
      const { gameId } = customEvent.detail;
      
      // Mettre à jour l'état local pour retirer le badge de mise à jour
      updateGameInState(gameId, { maj_disponible: false });
    };

    window.addEventListener('adulte-game-update-seen', handleUpdateSeenFromDetail);

    return () => {
      window.removeEventListener('adulte-game-update-seen', handleUpdateSeenFromDetail);
    };
  }, [updateGameInState]);

  // Vérifier les mises à jour
  const handleCheckUpdates = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Écouter les événements de progression
      const unsubscribe = window.electronAPI.onAdulteGameUpdatesProgress?.((progress) => {
        // La progression sera gérée par le composant parent via un état partagé
        // On peut émettre un événement personnalisé ou utiliser un callback
        if (progress.phase === 'complete' || progress.phase === 'error') {
          // Le résultat final sera retourné par la promesse
        }
      });

      // Vérifier les mises à jour pour tous les jeux (passer 0 pour tous)
      const result = await window.electronAPI.checkAdulteGameUpdates(0);

      // Nettoyer l'écouteur
      if (unsubscribe) {
        unsubscribe();
      }

      await loadGames(true);

      if (result.updated > 0) {
        setMessage({
          type: 'success',
          text: `${result.updated} mise(s) à jour détectée(s) ! (${result.sheetSynced} jeu(x) avec traduction(s) synchronisé(s))`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Aucune mise à jour disponible (${result.sheetSynced} jeu(x) avec traduction(s) synchronisé(s))`
        });
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Erreur vérification MAJ:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la vérification des mises à jour' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [loadGames]);

  // Détecter URL ou ID
  const detectUrlOrId = useCallback((input: string): { type: 'f95' | 'lewdcorner' | 'id' | null; id: string | null } => {
    const trimmed = input.trim();

    if (/^\d+$/.test(trimmed)) {
      return { type: 'id', id: trimmed };
    }

    if (trimmed.includes('lewdcorner.com/threads/')) {
      const match = trimmed.match(/lewdcorner\.com\/threads\/(\d+)/);
      if (match) {
        return { type: 'lewdcorner', id: match[1] };
      }
    }

    if (trimmed.includes('f95zone.to/threads/')) {
      // Pattern 1: URL avec nom du thread suivi d'un point et de l'ID (ex: chrono-ecstasy-v0-3-3-pigeon2play.213262)
      const match = trimmed.match(/f95zone\.to\/threads\/[^/]*\.(\d+)/);
      if (match) {
        return { type: 'f95', id: match[1] };
      }
      // Pattern 2: URL avec directement l'ID après /threads/ (ex: /threads/213262)
      const altMatch = trimmed.match(/f95zone\.to\/threads\/(\d+)/);
      if (altMatch) {
        return { type: 'f95', id: altMatch[1] };
      }
    }

    return { type: null, id: null };
  }, []);

  // Utiliser useCollectionFilters pour la recherche et tri de base
  const {
    sortedItems: sortedGames,
    hasActiveFilters: hasActiveFiltersBase
  } = useCollectionFilters({
    items: games,
    search: searchTerm,
    statusFilter: selectedStatutPerso !== 'all' ? selectedStatutPerso : undefined,
    showFavoriteOnly,
    showHidden,
    showMajOnly,
    sortBy,
    searchConfig: {
      getTitle: (game) => game.titre,
      getExternalId: (game) => game.f95_thread_id || null,
      detectIdFromSearch: (searchTerm: string) => {
        const detected = detectUrlOrId(searchTerm);
        if (detected.id) {
          return { id: parseInt(detected.id, 10) };
        }
        // Recherche numérique directe
        if (/^\d+$/.test(searchTerm.trim())) {
          return { id: parseInt(searchTerm.trim(), 10) };
        }
        return null;
      }
    },
    filterConfig: {
      getIsHidden: (game) => !!game.is_hidden,
      getIsFavorite: (game) => !!game.is_favorite,
      getStatus: (game) => game.statut_perso || null,
      getHasUpdates: (game) => !!game.maj_disponible,
      customFilter: (game) => {
        // Filtres spécifiques AdulteGame
        if (selectedStatutJeu !== 'all' && game.statut_jeu !== selectedStatutJeu) return false;

        if (selectedMoteur !== 'all') {
          if (selectedMoteur === UNKNOWN_MOTOR_VALUE) {
            if (game.moteur) return false;
          } else if ((game.moteur || '') !== selectedMoteur) {
            return false;
          }
        }

        if (selectedPlateforme !== 'all' && game.plateforme !== selectedPlateforme) return false;

        const hasTranslation = Boolean(game.traduction_fr_disponible);
        if (translationFilter === 'translated' && !hasTranslation) return false;
        if (translationFilter === 'not-translated' && hasTranslation) return false;

        if (selectedTags.length > 0) {
          if (!game.tags || game.tags.length === 0) return false;
          const hasAllTags = selectedTags.every(tag => game.tags?.includes(tag));
          if (!hasAllTags) return false;
        }

        if (selectedLabels.length > 0) {
          const labels = gameLabels[game.id] || [];
          const hasAnyLabel = selectedLabels.some(label => labels.some(l => l.label === label));
          if (!hasAnyLabel) return false;
        }

        // Filtre : version traduite non à jour
        if (showOutdatedTranslation) {
          // Vérifier si la version traduite existe et est différente de la version actuelle
          // Ignorer si c'est "intégré" car ce n'est pas une vraie version
          if (game.version && game.version_traduite) {
            const isIntegrated = game.version_traduite.toLowerCase().includes('intégré');
            if (isIntegrated || game.version_traduite === game.version) {
              return false; // Exclure si intégré ou si à jour
            }
          } else {
            return false; // Exclure si pas de version ou version traduite
          }
        }

        // Recherche spéciale pour URLs F95Zone/LewdCorner (si la recherche textuelle n'a pas déjà matché)
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (normalizedSearch) {
          const urlOrIdForSearch = detectUrlOrId(searchTerm);
          if (urlOrIdForSearch.id) {
            const searchId = parseInt(urlOrIdForSearch.id, 10);
            const isLewdCorner = game.lien_f95?.includes('lewdcorner.com');
            const matchesId = game.f95_thread_id === searchId ||
              (isLewdCorner && game.lien_f95?.includes(`/threads/${searchId}/`));
            if (!matchesId) return false;
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
        },
        'platform-asc': {
          label: 'Plateforme A-Z',
          compare: (a, b) => (a.plateforme || '').localeCompare(b.plateforme || '')
        },
        'platform-desc': {
          label: 'Plateforme Z-A',
          compare: (a, b) => (b.plateforme || '').localeCompare(a.plateforme || '')
        }
      },
      defaultSort: 'title-asc'
    }
  });

  // Les jeux filtrés sont les mêmes que triés (le filtrage est fait dans useCollectionFilters)
  const filteredGames = sortedGames;

  // Tags triés selon les préférences
  const sortedTags = (() => {
    const allTagsList = Array.from(
      new Set(
        games
          .filter(game => game.tags && game.tags.length > 0)
          .flatMap(game => game.tags || [])
      )
    );

    if (tagsSorted && Object.keys(tagPreferences).length > 0) {
      const liked = allTagsList.filter(tag => tagPreferences[tag] === 'liked').sort();
      const neutral = allTagsList.filter(tag => !tagPreferences[tag] || tagPreferences[tag] === 'neutral').sort();
      const disliked = allTagsList.filter(tag => tagPreferences[tag] === 'disliked').sort();
      return [...liked, ...neutral, ...disliked];
    }

    return allTagsList.sort();
  })();

  const allTags = sortedTags;

  // Détecter si on doit afficher le bouton d'ajout depuis URL
  const hasSearchTerm = !!searchTerm.trim();
  const urlOrIdForSearch = detectUrlOrId(searchTerm);
  const detectedUrlOrId = hasSearchTerm ? urlOrIdForSearch : { type: null, id: null };
  const hasNoResults = !loading && sortedGames.length === 0 && hasSearchTerm;
  const showAddFromUrl = hasNoResults && detectedUrlOrId.id !== null && !importingF95 && detectedUrlOrId.type !== 'lewdcorner';

  // Importer depuis F95Zone directement
  const handleImportFromF95Directly = useCallback(async (f95Id: string) => {
    if (importingF95) return;

    setImportingF95(true);
    try {
      const searchResult = await window.electronAPI.searchAdulteGameByF95Id(f95Id);

      if (!searchResult.success || !searchResult.data) {
        throw new Error(searchResult.error || 'Jeu introuvable');
      }

      const gameData = searchResult.data;

      let statutJeu = null;
      if (gameData.status) {
        switch (gameData.status.toLowerCase()) {
          case 'completed':
            statutJeu = 'TERMINÉ';
            break;
          case 'abandoned':
            statutJeu = 'ABANDONNÉ';
            break;
          case 'ongoing':
          default:
            statutJeu = 'EN COURS';
            break;
        }
      }

      const result = await window.electronAPI.createAdulteGameGame({
        titre: gameData.name,
        version: gameData.version || null,
        statut_jeu: statutJeu,
        moteur: gameData.engine || null,
        developpeur: gameData.developer || gameData.developpeur || null,
        couverture_url: gameData.image || null,
        tags: gameData.tags || [],
        f95_thread_id: parseInt(f95Id),
        plateforme: 'F95Zone',
        lien_f95: gameData.thread_url || `https://f95zone.to/threads/${f95Id}/`
      });

      if (result.success) {
        showToast({
          title: `✅ ${gameData.name} ajouté avec succès !`,
          type: 'success'
        });
        setSearchTerm('');
        setSelectedStatutJeu('all');
        setSelectedStatutPerso('all');
        setSelectedPlateforme('all');
        setTranslationFilter('all');
        setShowMajOnly(false);
        setShowFavoriteOnly(false);
        setShowHidden(false);
        setSelectedTags([]);
        setSelectedLabels([]);
        await loadGames(true, {});
      } else {
        if (result.error?.includes('existe déjà')) {
          setSearchTerm('');
          setSelectedStatutJeu('all');
          setSelectedStatutPerso('all');
          setSelectedPlateforme('all');
          setTranslationFilter('all');
          setShowMajOnly(false);
          setShowFavoriteOnly(false);
          setShowHidden(false);
          setSelectedTags([]);
          setSelectedLabels([]);
          await loadGames(true, {});
        } else {
          showToast({
            title: result.error || 'Erreur lors de l\'ajout',
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Erreur import F95Zone direct:', error);
      showToast({
        title: error instanceof Error ? error.message : 'Erreur lors de l\'import depuis F95Zone',
        type: 'error'
      });
    } finally {
      setImportingF95(false);
    }
  }, [importingF95, loadGames, showToast]);

  // Toggle favori
  const handleToggleFavorite = useCallback(async (gameId: number) => {
    try {
      const result = await window.electronAPI.toggleAdulteGameFavorite(gameId);
      if (result.success) {
        setGames(prevGames =>
          prevGames.map(game =>
            game.id === gameId
              ? { ...game, is_favorite: result.isFavorite }
              : game
          )
        );

        showToast({
          title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
          type: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le favori',
        type: 'error'
      });
    }
  }, [showToast]);

  // Changer le statut
  const handleChangeStatus = useCallback(async (gameId: number, newStatus: string) => {
    try {
      await window.electronAPI.updateAdulteGameGame(gameId, {
        statut_perso: newStatus as AdulteGameStatutPerso
      });

      // Utiliser la fonction commune pour mettre à jour
      updateGameInState(gameId, { statut_perso: newStatus as AdulteGameStatutPerso });

      // Notifier la page de détail pour synchronisation bidirectionnelle
      window.dispatchEvent(new CustomEvent('adulte-game-status-changed', {
        detail: { gameId, statutPerso: newStatus }
      }));

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
  }, [updateGameInState, showToast]);

  // Toggle hidden
  const handleToggleHidden = useCallback(async (gameId: number) => {
    try {
      const scrollY = window.scrollY;

      const isMasque = await window.electronAPI.isAdulteGameMasquee(gameId);

      if (isMasque) {
        const result = await window.electronAPI.demasquerAdulteGame(gameId);
        if (result.success) {
          showToast({
            title: 'Jeu démasqué',
            type: 'success'
          });
        }
      } else {
        const result = await window.electronAPI.masquerAdulteGame(gameId);
        if (result.success) {
          showToast({
            title: 'Jeu masqué',
            type: 'success'
          });
        }
      }

      const filters = computeFilters();
      const result = await window.electronAPI.getAdulteGameGames(filters as Record<string, unknown>);
      setGames(result);
      calculateStats(result);

      setTimeout(() => window.scrollTo(0, scrollY), 0);
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du masquage/démasquage',
        type: 'error'
      });
    }
  }, [computeFilters, calculateStats, showToast]);

  // Toggle tag
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, [setSelectedTags]);

  // Toggle label
  const handleLabelToggle = useCallback((label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  }, [setSelectedLabels]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatutJeu('all');
    setSelectedStatutPerso('all');
    setSelectedPlateforme('all');
    setSelectedMoteur('all');
    setTranslationFilter('all');
    setShowMajOnly(false);
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setSelectedTags([]);
    setSelectedLabels([]);
  }, [
    setSearchTerm,
    setSelectedStatutJeu,
    setSelectedStatutPerso,
    setSelectedPlateforme,
    setSelectedMoteur,
    setTranslationFilter,
    setShowMajOnly,
    setShowFavoriteOnly,
    setShowHidden,
    setSelectedTags,
    setSelectedLabels
  ]);

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
    items: sortedGames,
    defaultItemsPerPage: 50,
    storageKey: 'adulte-game-items-per-page',
    scrollStorageKey: 'collection.adulteGames.scroll'
  });

  // Calculer si des filtres sont actifs (incluant les filtres spécifiques)
  const hasActiveFilters = hasActiveFiltersBase ||
    selectedStatutJeu !== 'all' ||
    selectedPlateforme !== 'all' ||
    selectedMoteur !== 'all' ||
    translationFilter !== 'all' ||
    selectedTags.length > 0 ||
    selectedLabels.length > 0;

  const availableMoteurs = useMemo(() => {
    const set = new Set<string>();
    let hasUnknown = false;
    games.forEach(game => {
      if (game.moteur && game.moteur.trim().length > 0) {
        set.add(game.moteur);
      } else {
        hasUnknown = true;
      }
    });
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    if (hasUnknown) {
      sorted.push(UNKNOWN_MOTOR_VALUE);
    }
    return sorted;
  }, [games]);

  // Effects
  useEffect(() => {
    loadGames();
    loadLabels();
    loadCurrentUser();

  }, []);

  useEffect(() => {
    const filtersSnapshot = JSON.stringify(computeFilters());
    if (currentFiltersRef.current !== filtersSnapshot) {
      currentFiltersRef.current = filtersSnapshot;
      void loadGames();
    }
  }, [computeFilters, loadGames]);

  useEffect(() => {
    if (currentUserId) {
      loadTagPreferences();
    }
  }, [currentUserId, loadTagPreferences]);

  useEffect(() => {
    if (currentUserId) {
      loadTagPreferences().then(() => {
        setTagsSorted(true);
      });
    }
  }, [location.pathname, currentUserId, loadTagPreferences]);

  return {
    games,
    loading,
    searchTerm,
    setSearchTerm,
    selectedStatutJeu,
    setSelectedStatutJeu,
    selectedStatutPerso,
    setSelectedStatutPerso,
    selectedPlateforme,
    setSelectedPlateforme,
    selectedMoteur,
    setSelectedMoteur,
    availableMoteurs,
    unknownMoteurValue: UNKNOWN_MOTOR_VALUE,
    translationFilter,
    setTranslationFilter,
    showMajOnly,
    setShowMajOnly,
    showFavoriteOnly,
    setShowFavoriteOnly,
    showHidden,
    setShowHidden,
    showOutdatedTranslation,
    setShowOutdatedTranslation,
    selectedTags,
    setSelectedTags,
    selectedLabels,
    setSelectedLabels,
    allTags,
    availableLabels,
    gameLabels,
    refreshLabelsForGame,
    tagPreferences,
    handleTagToggle,
    handleLabelToggle,
    sortBy,
    setSortBy,
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
    canGoPrevious,
    stats,
    viewMode,
    handleViewModeChange,
    filteredGames,
    sortedGames,
    hasActiveFilters,
    loadGames,
    handleCheckUpdates,
    handleToggleFavorite,
    handleChangeStatus,
    handleToggleHidden,
    updateKey,
    handleImportFromF95Directly,
    detectUrlOrId,
    showAddFromUrl,
    importingF95,
    message,
    showAddModal,
    setShowAddModal,
    initialSearchId,
    setInitialSearchId,
    clearFilters
  };
}
