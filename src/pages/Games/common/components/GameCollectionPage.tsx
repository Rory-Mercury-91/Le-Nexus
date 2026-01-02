import { ChevronDown, RefreshCw, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdulteGameCard } from '../../../../components/cards';
import { COMMON_STATUSES } from '../../../../components/cards/common';
import {
  BackToBottomButton,
  BackToTopButton,
  CollectionFiltersBar,
  CollectionHeader,
  CollectionSearchBar,
  FilterToggle,
  Pagination,
  ProgressionHeader,
  SortOption
} from '../../../../components/collections';
import CollectionView from '../../../../components/common/CollectionView';
import ListItem from '../../../../components/common/ListItem';
import AddAdulteGameModal from '../../../../components/modals/adulte-game/AddAdulteGameModal';
import AdulteGameUnlockModal from '../../../../components/modals/adulte-game/AdulteGameUnlockModal';
import ScanExecutablesModal from '../../../../components/modals/adulte-game/ScanExecutablesModal';
import SearchHelpModal from '../../../../components/modals/help/SearchHelpModal';
import { ADULTE_GAME_SEARCH_HELP_CONFIG, RAWG_GAME_SEARCH_HELP_CONFIG } from '../../../../components/modals/help/search-help-configs';
import { useGlobalProgress } from '../../../../contexts/GlobalProgressContext';
import { useAdulteGameCollection } from '../../../../hooks/collections/useAdulteGameCollection';
import { useMultiDelete } from '../../../../hooks/collections/useMultiDelete';
import { useConfirm } from '../../../../hooks/common/useConfirm';
import { rememberScrollTarget, useScrollRestoration } from '../../../../hooks/common/useScrollRestoration';
import { useToast } from '../../../../hooks/common/useToast';
import { useAdulteGameLock } from '../../../../hooks/useAdulteGameLock';
import type { AdulteGame, AdulteGameStatutJeu, AdulteGameStatutPerso } from '../../../../types';
import { translateAdulteGameTag } from '../../../../utils/translations';
import { matchesEngineType, matchesGameFilter } from '../utils/game-helpers';
import { GameCollectionPageConfig } from '../utils/game-page-config';
import GameCollectionView from './GameCollectionView';

interface GameCollectionPageProps {
  config: GameCollectionPageConfig;
}

export default function GameCollectionPage({ config }: GameCollectionPageProps) {
  const navigate = useNavigate();
  const { ToastContainer } = useToast();
  const { ConfirmDialog: ConfirmModal } = useConfirm();
  const [showScanModal, setShowScanModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<number | null>(null);

  // Utiliser le contexte global pour la progression
  const { setAdulteGameUpdating, setAdulteGameProgress } = useGlobalProgress();

  // Vérifier l'état de verrouillage pour /games/all
  const { isLocked, hasPassword } = useAdulteGameLock();

  // Hook principal qui gère toute la logique métier
  const {
    games: allGames,
    loading,
    searchTerm,
    setSearchTerm,
    selectedStatutJeu,
    setSelectedStatutJeu,
    selectedStatutPerso,
    setSelectedStatutPerso,
    selectedPlateforme,
    setSelectedPlateforme,
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
    selectedMoteur: selectedMoteurFromHook,
    setSelectedMoteur: setSelectedMoteurFromHook,
    availableMoteurs,
    unknownMoteurValue,
    selectedTags,
    selectedLabels,
    allTags,
    availableLabels,
    gameLabels,
    refreshLabelsForGame,
    tagPreferences,
    handleTagToggle,
    handleLabelToggle,
    sortBy,
    setSortBy,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    viewMode,
    handleViewModeChange,
    hasActiveFilters,
    loadGames,
    handleCheckUpdates,
    handleToggleFavorite,
    handleChangeStatus,
    handleToggleHidden,
    handleImportFromF95Directly,
    handleImportFromRawgDirectly,
    detectUrlOrId,
    showAddFromUrl,
    importingF95,
    importingRawg,
    message,
    showAddModal,
    setShowAddModal,
    initialSearchId,
    setInitialSearchId,
    clearFilters
  } = useAdulteGameCollection();

  // Afficher le filtre de moteur uniquement pour les jeux adultes
  const shouldShowMoteurFilter = config.filterType === 'adulte';

  // Filtrer les jeux selon la configuration (par site ou par moteur pour compatibilité)
  const games = useMemo(() => {
    // Priorité au filtre par site si défini
    if (config.filterType) {
      return allGames.filter(game => matchesGameFilter(game, config.filterType!));
    }
    // Sinon, utiliser le filtre par moteur (pour compatibilité)
    if (config.engineType === 'all') {
      return allGames;
    }
    if (config.engineType) {
      return allGames.filter(game => matchesEngineType(game, config.engineType!));
    }
    return allGames;
  }, [allGames, config.filterType, config.engineType]);

  // Recalculer les jeux filtrés en incluant le filtre de moteur
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Appliquer les mêmes filtres que dans le hook, mais sur les jeux filtrés par moteur
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(game => {
        const titleMatch = game.titre?.toLowerCase().includes(normalizedSearch);
        const f95IdMatch = game.f95_thread_id?.toString().includes(normalizedSearch);
        const lcIdMatch = game.Lewdcorner_thread_id?.toString().includes(normalizedSearch);
        const rawgIdMatch = game.rawg_id?.toString().includes(normalizedSearch);
        return titleMatch || f95IdMatch || lcIdMatch || rawgIdMatch;
      });
    }

    if (selectedStatutJeu !== 'all') {
      filtered = filtered.filter(game => game.game_statut === selectedStatutJeu || game.statut_jeu === selectedStatutJeu);
    }

    if (selectedStatutPerso !== 'all') {
      filtered = filtered.filter(game => game.statut_perso === selectedStatutPerso || game.completion_perso === selectedStatutPerso);
    }

    if (selectedPlateforme !== 'all') {
      filtered = filtered.filter(game => {
        const site = game.game_site || game.plateforme;
        return site === selectedPlateforme;
      });
    }

    if (translationFilter !== 'all') {
      if (translationFilter === 'translated') {
        // Jeux traduits = version_traduite existe, non vide, et n'est pas "intégré"
        filtered = filtered.filter(game => {
          if (!game.version_traduite || game.version_traduite.trim() === '') return false;
          return !game.version_traduite.toLowerCase().includes('intégré');
        });
      } else if (translationFilter === 'not-translated') {
        // Jeux non traduits = version_traduite est null, vide ou undefined
        filtered = filtered.filter(game => !game.version_traduite || game.version_traduite.trim() === '');
      } else if (translationFilter === 'integrated') {
        // Traduction intégrée = version_traduite contient "intégré"
        filtered = filtered.filter(game => game.version_traduite && game.version_traduite.toLowerCase().includes('intégré'));
      }
    }

    if (showMajOnly) {
      filtered = filtered.filter(game => game.maj_disponible === true);
    }

    if (showFavoriteOnly) {
      filtered = filtered.filter(game => game.is_favorite === true || game.is_favorite === 1);
    }

    if (!showHidden) {
      filtered = filtered.filter(game => !game.is_hidden || game.is_hidden === 0);
    }

    if (showOutdatedTranslation) {
      filtered = filtered.filter(game => {
        if (!game.traduction_fr_disponible) return false;
        const gameVersion = game.game_version || game.version || '0.0';
        const tradVersion = game.version_traduite || '0.0';
        return gameVersion !== tradVersion;
      });
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(game => {
        const gameTags = game.tags || [];
        return selectedTags.some(tag => gameTags.includes(tag));
      });
    }

    if (selectedLabels.length > 0) {
      filtered = filtered.filter(game => {
        const labels = gameLabels[game.id] || [];
        return selectedLabels.some(label => labels.some(l => l.label === label));
      });
    }

    // Filtrer par moteur si sélectionné (uniquement pour les jeux adultes)
    if (shouldShowMoteurFilter && selectedMoteurFromHook && selectedMoteurFromHook !== 'all') {
      filtered = filtered.filter(game => {
        const gameEngine = game.game_engine || game.moteur || null;
        if (!gameEngine) {
          return selectedMoteurFromHook === unknownMoteurValue;
        }
        return gameEngine === selectedMoteurFromHook;
      });
    }

    return filtered;
  }, [
    games,
    searchTerm,
    selectedStatutJeu,
    selectedStatutPerso,
    selectedPlateforme,
    translationFilter,
    showMajOnly,
    showFavoriteOnly,
    showHidden,
    showOutdatedTranslation,
    selectedTags,
    selectedLabels,
    gameLabels,
    shouldShowMoteurFilter,
    selectedMoteurFromHook,
    unknownMoteurValue
  ]);

  // Trier les jeux filtrés
  const sortedGames = useMemo(() => {
    const sorted = [...filteredGames];

    switch (sortBy) {
      case 'title-asc':
        sorted.sort((a, b) => (a.titre || '').localeCompare(b.titre || '', 'fr', { sensitivity: 'base' }));
        break;
      case 'title-desc':
        sorted.sort((a, b) => (b.titre || '').localeCompare(a.titre || '', 'fr', { sensitivity: 'base' }));
        break;
      case 'date-desc':
        sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'date-asc':
        sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'platform-asc':
        sorted.sort((a, b) => {
          const platformA = (a.game_site || a.plateforme || '').localeCompare(b.game_site || b.plateforme || '', 'fr', { sensitivity: 'base' });
          return platformA;
        });
        break;
      case 'platform-desc':
        sorted.sort((a, b) => {
          const platformB = (b.game_site || b.plateforme || '').localeCompare(a.game_site || a.plateforme || '', 'fr', { sensitivity: 'base' });
          return platformB;
        });
        break;
    }

    return sorted;
  }, [filteredGames, sortBy]);

  // Calculer les stats sur les jeux filtrés par moteur
  const stats = useMemo(() => {
    const jeuxEnCours = games.filter(g => g.statut_perso === 'En cours' || g.completion_perso === 'En cours').length;
    const jeuxEnCoursTraduits = games.filter(g => (g.statut_perso === 'En cours' || g.completion_perso === 'En cours') && g.traduction_fr_disponible).length;
    const jeuxTermines = games.filter(g => g.statut_perso === 'Terminé' || g.completion_perso === 'Terminé').length;
    const jeuxTerminesTraduits = games.filter(g => (g.statut_perso === 'Terminé' || g.completion_perso === 'Terminé') && g.traduction_fr_disponible).length;
    const jeuxJoues = games.filter(g => ['En cours', 'Terminé', 'Abandonné'].includes(g.statut_perso || g.completion_perso || '')).length;
    const jeuxTotal = games.length;

    return {
      jeuxEnCours,
      jeuxEnCoursTraduits,
      jeuxTermines,
      jeuxTerminesTraduits,
      jeuxJoues,
      jeuxTotal
    };
  }, [games]);

  // Pagination sur les jeux triés
  const startIndex = (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : sortedGames.length);
  const endIndex = typeof itemsPerPage === 'number' ? startIndex + itemsPerPage : sortedGames.length;
  const paginatedItems = sortedGames.slice(startIndex, endIndex);
  const totalPages = typeof itemsPerPage === 'number' ? Math.ceil(sortedGames.length / itemsPerPage) : 1;
  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  useScrollRestoration(`${config.storageKey}.scroll`, !loading);

  // Wrapper pour handleCheckUpdates qui gère l'affichage de la progression
  const handleCheckUpdatesWithProgress = useCallback(async () => {
    setAdulteGameUpdating(true);
    setAdulteGameProgress({
      phase: 'start',
      total: 0,
      current: 0,
      message: 'Démarrage de la vérification...'
    });

    try {
      await handleCheckUpdates();
    } catch (error) {
      setAdulteGameProgress({
        phase: 'error',
        total: 0,
        current: 0,
        message: error instanceof Error ? error.message : 'Erreur lors de la vérification'
      });
    }
  }, [handleCheckUpdates, setAdulteGameUpdating, setAdulteGameProgress]);

  // États d'UI spécifiques au composant (affichage des filtres collapsibles)
  const [showTagsFilter, setShowTagsFilter] = useState(false);
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Fonctions de rendu spécifiques au composant
  const handleOpenGame = (gameId: number) => {
    // Si on est sur /games/all et que le jeu est flouté (mot de passe actif et verrouillé),
    // afficher la modale de déverrouillage au lieu d'ouvrir la page de détail
    if (config.engineType === 'all' && hasPassword && isLocked) {
      setPendingGameId(gameId);
      setShowUnlockModal(true);
      return;
    }

    // Trouver le jeu pour déterminer son type
    const game = allGames.find(g => g.id === gameId);
    const isRawgGame = game?.game_site === 'RAWG';

    rememberScrollTarget(`${config.storageKey}.scroll`, gameId);

    // Naviguer vers la bonne page selon le type de jeu
    if (isRawgGame) {
      navigate(`/games/rawg/${gameId}`);
    } else {
      navigate(`/adulte-game/${gameId}`);
    }
  };

  const handleUnlockSuccess = () => {
    setShowUnlockModal(false);
    if (pendingGameId !== null) {
      // Trouver le jeu pour déterminer son type
      const game = allGames.find(g => g.id === pendingGameId);
      const isRawgGame = game?.game_site === 'RAWG';

      rememberScrollTarget(`${config.storageKey}.scroll`, pendingGameId);

      // Naviguer vers la bonne page selon le type de jeu
      if (isRawgGame) {
        navigate(`/games/rawg/${pendingGameId}`);
      } else {
        navigate(`/adulte-game/${pendingGameId}`);
      }
      setPendingGameId(null);
    }
  };

  const renderGameCard = (game: AdulteGame) => (
    <AdulteGameCard
      key={`${game.id}-${game.statut_perso || ''}-${game.is_favorite ? 'fav' : 'no-fav'}-${viewMode}`}
      game={game}
      onClick={() => handleOpenGame(game.id)}
      onToggleFavorite={() => handleToggleFavorite(game.id)}
      onChangeStatus={(status) => handleChangeStatus(game.id, status)}
      onToggleHidden={() => handleToggleHidden(game.id)}
      onCoverUpdated={loadGames}
      isHidden={Boolean(game.is_hidden)}
      labels={gameLabels[game.id] || []}
      onLabelsUpdated={() => refreshLabelsForGame(game.id)}
    />
  );

  const renderGameListItem = (game: AdulteGame) => {
    const getVersionProgress = () => {
      const versionActuelle = game.game_version || game.version || '0.0';
      const versionJouee = game.version_jouee || versionActuelle;

      const parseVersion = (v: string) => {
        const nums = v.match(/\d+/g);
        if (!nums || nums.length === 0) return 0;
        return parseInt(nums.join(''));
      };

      const current = parseVersion(versionJouee);
      const total = parseVersion(versionActuelle);

      return total > 0 ? Math.round((current / total) * 100) : 0;
    };

    const cleanVersion = (v: string) => v.replace(/^v/i, '');

    const progression = getVersionProgress();
    const versionActuelle = game.game_version || game.version || '0.0';
    const versionJouee = game.version_jouee || versionActuelle;

    // Ne pas afficher le subtitle si c'est un jeu RAWG ou si les versions sont à 0
    const isRawgGame = game.game_site === 'RAWG';
    const hasValidVersion = versionActuelle && versionActuelle !== '0.0' && versionActuelle !== '0';
    const subtitle = (isRawgGame || !hasValidVersion) ? undefined : `v${cleanVersion(versionJouee)} / v${cleanVersion(versionActuelle)}`;

    // Badges (FR + Favori)
    const badgeElements = [];
    if (game.traduction_fr_disponible) {
      badgeElements.push(
        <span key="fr" style={{
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #0055A4 0%, #0055A4 33%, #FFFFFF 33%, #FFFFFF 66%, #EF4135 66%, #EF4135 100%)',
          color: '#000000',
          flexShrink: 0,
          letterSpacing: '0.5px'
        }}>
          FR
        </span>
      );
    }
    if (!!game.is_favorite) {
      badgeElements.push(
        <span key="favorite" style={{
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
      );
    }
    const badges = badgeElements.length > 0 ? <>{badgeElements}</> : null;

    // Badge de statut (toujours affiché, y compris "À jouer" par défaut)
    const getStatusBadge = () => {
      const status = game.statut_perso || game.completion_perso || 'À jouer';

      const getStatusConfig = () => {
        switch (status) {
          case 'À jouer':
            return {
              color: '#ffffff',
              bg: '#3b82f6',
              icon: '🎮',
              label: 'À jouer'
            };
          case 'En cours':
            return {
              color: '#ffffff',
              bg: '#8b5cf6',
              icon: '🎮',
              label: 'En cours'
            };
          case 'Terminé':
            return {
              color: '#ffffff',
              bg: 'var(--success)',
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
            // Pour les statuts non reconnus, utiliser "À jouer" par défaut
            return {
              color: '#ffffff',
              bg: '#3b82f6',
              icon: '🎮',
              label: 'À jouer'
            };
        }
      };

      const statusConfig = getStatusConfig();

      return (
        <span style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          background: statusConfig.bg,
          color: statusConfig.color,
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          textTransform: 'uppercase',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          <span style={{ fontSize: '12px' }}>{statusConfig.icon}</span>
          <span>{statusConfig.label}</span>
        </span>
      );
    };

    // Vérifier si le jeu est nouveau (moins de 7 jours)
    const isNew = () => {
      if (!game.created_at) return false;
      const createdDate = new Date(game.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const status = game.statut_perso || game.completion_perso || '';
      // Ne pas afficher "New" si le jeu est terminé
      return diffDays <= 7 && status !== 'Terminé';
    };

    // Ajouter le badge "New" aux badges existants
    if (isNew()) {
      badgeElements.push(
        <span key="new" style={{
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          flexShrink: 0,
          letterSpacing: '0.5px'
        }}>
          NEW
        </span>
      );
    }

    return (
      <ListItem
        key={`${game.id}-${game.statut_perso || ''}-${game.is_favorite ? 'fav' : 'no-fav'}-${viewMode}`}
        title={game.titre}
        subtitle={subtitle}
        progression={progression}
        currentStatus={game.statut_perso || game.completion_perso || 'À lire'}
        availableStatuses={[...COMMON_STATUSES.ADULTE_GAME]}
        isFavorite={!!game.is_favorite}
        badges={badges}
        statusBadge={getStatusBadge()}
        onClick={() => handleOpenGame(game.id)}
        onToggleFavorite={() => handleToggleFavorite(game.id)}
        onChangeStatus={(status) => handleChangeStatus(game.id, status)}
        onToggleHidden={() => handleToggleHidden(game.id)}
      />
    );
  };

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
  } = useMultiDelete<AdulteGame>({
    deleteApi: (id) => window.electronAPI.deleteAdulteGameGame(id as number),
    itemName: 'jeu',
    getItemTitle: (game) => game.titre || 'Sans titre',
    onDeleteComplete: () => {
      loadGames();
    }
  });

  const handleDeleteSelectedGames = useCallback(async () => {
    await handleDeleteSelected(filteredGames);
  }, [handleDeleteSelected, filteredGames]);

  const handleSelectAllGames = useCallback(() => {
    selectAll(filteredGames);
  }, [selectAll, filteredGames]);

  if (loading && games.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <ConfirmModal />
      <MultiDeleteConfirmDialog />
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* En-tête avec composant réutilisable */}
          <CollectionHeader
            title={config.title}
            icon={config.icon}
            count={filteredGames.length}
            countLabel={filteredGames.length > 1 ? 'jeux' : 'jeu'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un jeu"
            isSelectionMode={isSelectionMode}
            selectedCount={selectedCount}
            onToggleSelectionMode={toggleSelectionMode}
            onSelectAll={handleSelectAllGames}
            onDeselectAll={deselectAll}
            onDeleteSelected={handleDeleteSelectedGames}
            isDeleting={isDeleting}
            extraButtons={
              <>
                <button
                  onClick={() => setShowScanModal(true)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={18} />
                  Scanner les disques
                </button>
                <button
                  onClick={handleCheckUpdatesWithProgress}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <RefreshCw size={18} />
                  Vérifier MAJ
                </button>
              </>
            }
          />

          {message && (
            <div style={{
              padding: '16px 20px',
              marginBottom: '24px',
              borderRadius: '12px',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
              color: message.type === 'success' ? '#10b981' : '#ef4444',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>
                {message.type === 'success' ? '✅' : '❌'}
              </span>
              {message.text}
            </div>
          )}

          {/* Stats de progression */}
          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="adulte-game" stats={stats} />
          </div>

          {/* Recherche et filtres avec composants réutilisables */}
          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onOpenHelp={() => setShowHelpModal(true)}
          >
            <CollectionSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder={config.searchPlaceholder}
              onSubmit={(e) => e.preventDefault()}
              showSubmitButton={false}
            />

            {/* Ligne 1 : Tri et Selects */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="select"
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="title-asc">📖 Titre (A → Z)</option>
                <option value="title-desc">📖 Titre (Z → A)</option>
                <option value="date-desc">🆕 Ajout récent</option>
                <option value="date-asc">🕐 Ajout ancien</option>
                <option value="platform-asc">📦 Plateforme (A → Z)</option>
                <option value="platform-desc">📦 Plateforme (Z → A)</option>
              </select>

              <select
                value={selectedStatutJeu}
                onChange={(e) => setSelectedStatutJeu(e.target.value as AdulteGameStatutJeu | 'all')}
                className="select"
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="all">🔍 Tous les statuts jeu</option>
                <option value="EN COURS">🎮 EN COURS</option>
                <option value="TERMINÉ">✅ TERMINÉ</option>
                <option value="ABANDONNÉ">❌ ABANDONNÉ</option>
              </select>

              <select
                value={selectedStatutPerso}
                onChange={(e) => setSelectedStatutPerso(e.target.value as AdulteGameStatutPerso | 'all')}
                className="select"
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="all">🔍 Toutes les complétions</option>
                <option value="À lire">🎮 À jouer</option>
                <option value="En cours">🎮 En cours</option>
                <option value="En pause">⏸️ En pause</option>
                <option value="Terminé">✅ Terminé</option>
                <option value="Abandonné">❌ Abandonné</option>
              </select>

              <select
                value={selectedPlateforme}
                onChange={(e) => setSelectedPlateforme(e.target.value as 'all' | 'F95Zone' | 'LewdCorner')}
                className="select"
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="all">🔍 Toutes les plateformes</option>
                <option value="F95Zone">🌐 F95Zone</option>
                <option value="LewdCorner">🌐 LewdCorner</option>
              </select>

              {shouldShowMoteurFilter && (
                <select
                  value={selectedMoteurFromHook}
                  onChange={(e) => setSelectedMoteurFromHook(e.target.value)}
                  className="select"
                  style={{ width: 'auto', flex: '0 0 auto' }}
                >
                  <option value="all">🛠️ Tous les moteurs</option>
                  {availableMoteurs.map((moteur) => (
                    <option key={moteur} value={moteur}>
                      {moteur === unknownMoteurValue ? '🕳️ Moteur non renseigné' : `🛠️ ${moteur}`}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={translationFilter}
                onChange={(e) => setTranslationFilter(e.target.value as 'all' | 'translated' | 'not-translated' | 'integrated')}
                className="select"
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="all">🌍 Toutes les traductions</option>
                <option value="translated">🇫🇷 Jeux traduits</option>
                <option value="not-translated">🛠️ Jeux non traduits</option>
                <option value="integrated">🔧 Traduction intégré</option>
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
                label="👁️ Jeux masqués"
                icon="👁️"
                activeColor="#f59e0b"
              />

              <FilterToggle
                checked={showOutdatedTranslation}
                onChange={setShowOutdatedTranslation}
                label="⚠️ Version non à jour"
                icon="⚠️"
                activeColor="#ef4444"
              />
            </div>

            {/* Filtre par tags */}
            {allTags.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowTagsFilter(!showTagsFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: showTagsFilter ? '12px' : '0'
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🏷️ Filtrer par tags
                    {selectedTags.length > 0 && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                        {selectedTags.length}
                      </span>
                    )}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: showTagsFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {showTagsFilter && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                    {allTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const preference = tagPreferences[tag] || 'neutral';

                      let tagColor = '#f59e0b';
                      let borderColor = '#f59e0b';
                      if (preference === 'liked') {
                        tagColor = '#ef4444';
                        borderColor = '#ef4444';
                      } else if (preference === 'disliked') {
                        tagColor = '#1f2937';
                        borderColor = '#1f2937';
                      }

                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          title={`État: ${preference === 'liked' ? 'Favori' : preference === 'disliked' ? 'Non apprécié' : 'Neutre'} (Modifier depuis la page de détail)`}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: isSelected ? 'var(--primary)' : tagColor,
                            color: 'white',
                            border: isSelected ? '2px solid var(--primary)' : `2px solid ${borderColor}`,
                            fontWeight: isSelected ? '600' : preference !== 'neutral' ? '600' : '500',
                            opacity: preference === 'disliked' && !isSelected ? 0.8 : 1
                          }}
                        >
                          {translateAdulteGameTag(tag)}
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

          {/* Pagination avec contrôles de vue et items par page */}
          {sortedGames.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage as 25 | 50 | 100 | 'all'}
              totalItems={sortedGames.length}
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
              hideImageView
            />
          )}

          {/* Message d'ajout depuis URL/ID F95Zone ou RAWG */}
          {showAddFromUrl && (() => {
            const detected = detectUrlOrId(searchTerm);
            const isRawg = detected.type === 'rawg';
            const isF95 = detected.type === 'f95' || detected.type === 'id';

            if (!isRawg && !isF95) return null;

            return (
              <div style={{
                padding: '20px',
                marginBottom: '24px',
                borderRadius: '12px',
                background: isRawg ? 'rgba(2, 169, 255, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                border: `2px solid ${isRawg ? '#02a9ff' : '#8b5cf6'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: isRawg ? '#02a9ff' : '#8b5cf6',
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
                  {isRawg ? (
                    <>ID ou URL RAWG détecté : <strong>{detected.id}</strong>. Souhaitez-vous ajouter ce jeu depuis RAWG ?</>
                  ) : (
                    <>ID F95Zone détecté : <strong>{detected.id}</strong>. Souhaitez-vous ajouter ce jeu depuis F95Zone ?</>
                  )}
                </p>
                <button
                  onClick={() => {
                    if (detected.id) {
                      if (isRawg) {
                        // Si c'est un nombre, convertir en number, sinon garder comme string (slug)
                        const rawgId = /^\d+$/.test(detected.id) ? parseInt(detected.id, 10) : detected.id;
                        handleImportFromRawgDirectly(rawgId);
                      } else {
                        handleImportFromF95Directly(detected.id);
                      }
                    }
                  }}
                  className="btn btn-primary"
                  disabled={isRawg ? importingRawg : importingF95}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '8px'
                  }}
                >
                  {isRawg ? (
                    importingRawg ? 'Import en cours...' : 'Ajouter depuis RAWG'
                  ) : (
                    importingF95 ? 'Import en cours...' : 'Ajouter depuis F95Zone'
                  )}
                </button>
              </div>
            );
          })()}

          {/* Liste des jeux */}
          {viewMode === 'grid' ? (
            <GameCollectionView
              items={paginatedItems}
              loading={loading}
              viewMode={viewMode}
              key={`${viewMode}-${currentPage}`}
              isSelectionMode={isSelectionMode}
              isItemSelected={isItemSelected}
              onToggleItemSelection={toggleItemSelection}
              renderCard={renderGameCard}
              renderListItem={renderGameListItem}
              emptyMessage={
                showAddFromUrl
                  ? ''
                  : (hasActiveFilters
                    ? `Aucun jeu ne correspond à vos filtres`
                    : config.emptyMessage)
              }
              emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>{config.emptyIconEmoji}</span>}
              cardWidth={320}
              cardHeight={360}
            />
          ) : (
            <CollectionView
              items={paginatedItems}
              loading={loading}
              viewMode={viewMode}
              key={`${viewMode}-${currentPage}`}
              isSelectionMode={isSelectionMode}
              isItemSelected={isItemSelected}
              onToggleItemSelection={toggleItemSelection}
              renderCard={renderGameCard}
              renderListItem={renderGameListItem}
              emptyMessage={
                showAddFromUrl
                  ? ''
                  : (hasActiveFilters
                    ? `Aucun jeu ne correspond à vos filtres`
                    : config.emptyMessage)
              }
              emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>{config.emptyIconEmoji}</span>}
              gridMinWidth={400}
              imageMinWidth={350}
            />
          )}

          {showAddModal && (
            <AddAdulteGameModal
              initialSearchId={initialSearchId || undefined}
              onClose={() => {
                setShowAddModal(false);
                setInitialSearchId(null);
              }}
              onSuccess={async () => {
                await loadGames(true);
                setShowAddModal(false);
                setInitialSearchId(null);
              }}
            />
          )}

          {showScanModal && (
            <ScanExecutablesModal
              onClose={() => setShowScanModal(false)}
              onSuccess={async () => {
                await loadGames(true);
              }}
            />
          )}

          {/* Pagination en bas */}
          {sortedGames.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage as 25 | 50 | 100 | 'all'}
                totalItems={sortedGames.length}
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
                hideImageView
              />
            </div>
          )}

          <BackToTopButton />
          <BackToBottomButton />
        </div>
      </div>

      <SearchHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        config={config.filterType === 'rawg' ? RAWG_GAME_SEARCH_HELP_CONFIG : ADULTE_GAME_SEARCH_HELP_CONFIG}
      />

      {/* Modale de déverrouillage pour /games/all */}
      {showUnlockModal && (
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <AdulteGameUnlockModal
            onUnlock={handleUnlockSuccess}
            onCancel={() => {
              setShowUnlockModal(false);
              setPendingGameId(null);
            }}
          />
        </div>
      )}
    </>
  );
}
