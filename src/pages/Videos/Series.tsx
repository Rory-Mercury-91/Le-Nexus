import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TvShowCard from '../../components/cards/TvShowCard';
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
import { SERIES_SEARCH_HELP_CONFIG } from '../../components/modals/help/search-help-configs';
import AddSeriesModal from '../../components/modals/videos/AddSeriesModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { TvShowListItem } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate } from '../../utils/tmdb';
import { translateStatus } from '../../utils/translations';
import { normalizeWorkStatus } from './common/utils/video-helpers';

const SERIES_STATUS_OPTIONS = COMMON_STATUSES.SERIES;
const SERIES_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'date-asc', 'score-desc', 'popularite-desc'] as const;
type SeriesSortOption = typeof SERIES_SORT_OPTIONS[number];
const SERIES_SORT_SET = new Set<string>(SERIES_SORT_OPTIONS);

const isSeriesSortOption = (value: unknown): value is SeriesSortOption =>
  typeof value === 'string' && SERIES_SORT_SET.has(value);
const SERIES_STATUS_SET = new Set<string>(SERIES_STATUS_OPTIONS);
const isSeriesStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || SERIES_STATUS_SET.has(value));

export default function Series() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const { videoCounts, animeTypeCounts } = useVideoCounts();
  const [series, setSeries] = useState<TvShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>(
    'videos.series.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<SeriesSortOption>(
    'videos.series.sortBy',
    'title-asc',
    { validator: isSeriesSortOption, storage: 'session' }
  );
  const [completionFilter, setCompletionFilter] = usePersistentState<string>(
    'videos.series.completionFilter',
    '',
    { validator: isSeriesStatusFilter, storage: 'session' }
  );
  const [workStatusFilter, setWorkStatusFilter] = usePersistentState<string>(
    'videos.series.workStatusFilter',
    '',
    { storage: 'session' }
  );
  const [availableWorkStatuses, setAvailableWorkStatuses] = useState<string[]>([]);
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'videos.series.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'videos.series.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'videos.series.filters.showMajOnly',
    false,
    { storage: 'session' }
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [viewMode, handleViewModeChange] = useCollectionViewMode('videos');
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    'videos.series.filters.selectedGenres',
    [],
    { storage: 'session' }
  );
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);

  useScrollRestoration('videos.series.scroll', !loading);

  const handleOpenSeriesDetail = useCallback((show: TvShowListItem) => {
    rememberScrollTarget('videos.series.scroll', show.id);
    const currentPath = location.pathname + location.search;
    navigate(`/series/${show.tmdb_id}`, { state: { from: currentPath } });
  }, [navigate, location]);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedGenres.length > 0) {
        filters.genres = selectedGenres;
      }
      const result = await window.electronAPI.getTvShows(filters);
      const parsed = (result || []).map((show: TvShowListItem) => ({
        ...show,
        genres: show.genres || [],
        prochain_episode: show.prochain_episode || null,
        dernier_episode: show.dernier_episode || null
      }));
      setSeries(parsed);

      // Extraire les genres depuis les séries filtrées uniquement
      const genresSet = new Set<string>();
      
      parsed.forEach((show: TvShowListItem) => {
        if (show.genres && Array.isArray(show.genres)) {
          show.genres.forEach((g: { name?: string } | string) => {
            const genre = typeof g === 'string' ? g : (g as { name?: string }).name || '';
            if (genre) genresSet.add(genre);
          });
        }
      });
      
      setAvailableGenres(Array.from(genresSet).sort());

      // Extraire tous les statuts de l'œuvre disponibles
      const allWorkStatuses = new Set<string>();
      parsed.forEach((show: TvShowListItem) => {
        if (show.statut) {
          const normalized = normalizeWorkStatus(show.statut);
          if (normalized) allWorkStatuses.add(normalized);
        }
      });
      setAvailableWorkStatuses(Array.from(allWorkStatuses).sort());
    } catch (error: any) {
      console.error('Erreur chargement séries:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de charger les séries',
        type: 'error'
      });
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedGenres]);

  const seriesStats = useMemo<ProgressionStats>(() => {
    const totalSeries = series.length;
    const episodesVus = series.reduce((acc, show) => acc + (show.episodes_vus || 0), 0);
    const episodesTotal = series.reduce((acc, show) => acc + (show.nb_episodes || 0), 0);
    const enCours = series.filter((show) => show.statut_visionnage === 'En cours').length;
    const terminees = series.filter((show) => show.statut_visionnage === 'Terminé').length;

    return {
      seriesTvEnCours: enCours,
      seriesTvTerminees: terminees,
      seriesTvTotal: totalSeries,
      episodesVusSeries: episodesVus,
      episodesTotalSeries: episodesTotal
    };
  }, [series]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    const handleProgressUpdated = () => {
      loadSeries();
    };

    window.addEventListener('series-progress-updated', handleProgressUpdated);
    return () => window.removeEventListener('series-progress-updated', handleProgressUpdated);
  }, [loadSeries]);

  const updateShowInState = (showId: number, updates: Partial<TvShowListItem>) => {
    setSeries(prev => prev.map(show => (show.id === showId ? { ...show, ...updates } : show)));
  };

  const handleToggleFavorite = async (showId: number) => {
    try {
      const result = await window.electronAPI.toggleTvFavorite(showId);
      updateShowInState(showId, { is_favorite: result.isFavorite });
      showToast({
        title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur favorite série:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le favori',
        type: 'error'
      });
    }
  };

  const handleToggleHidden = async (showId: number) => {
    try {
      const result = await window.electronAPI.toggleTvHidden(showId);
      updateShowInState(showId, { is_hidden: result.isHidden });
      showToast({
        title: result.isHidden ? 'Série masquée' : 'Série réaffichée',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur masquage série:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le masquage',
        type: 'error'
      });
    }
  };

  const handleChangeStatus = async (showId: number, status: string) => {
    try {
      const result = await window.electronAPI.setTvShowStatus({ showId, statut: status });
      updateShowInState(showId, { statut_visionnage: result.statut });
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur statut série:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le statut',
        type: 'error'
      });
    }
  };

  const handleGenreToggle = useCallback((genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  }, [setSelectedGenres]);

  const {
    sortedItems: sortedSeries,
    hasActiveFilters
  } = useCollectionFilters({
    items: series,
    search,
    statusFilter: completionFilter,
    showFavoriteOnly,
    showHidden,
    showMajOnly,
    sortBy,
    searchConfig: {
      getTitle: (s) => s.titre,
      getOriginalTitle: (s) => s.titre_original,
      getExternalId: (s) => s.tmdb_id
    },
    filterConfig: {
      getIsHidden: (s) => !!s.is_hidden,
      getIsFavorite: (s) => !!s.is_favorite,
      getStatus: (s) => s.statut_visionnage || 'À regarder',
      getHasUpdates: (s) => !!s.maj_disponible,
      customFilter: (show: TvShowListItem) => {
        // Filtre par statut de l'œuvre
        if (workStatusFilter !== '') {
          const workStatus = normalizeWorkStatus(show.statut || '');
          if (workStatus !== workStatusFilter) return false;
        }

        // Filtre par genres (les genres sont stockés en JSON, tableau d'objets avec `name`)
        if (selectedGenres.length > 0) {
          if (!show.genres || !Array.isArray(show.genres)) return false;
          const showGenreNames = show.genres.map((g: any) => g.name || g).filter(Boolean);
          const hasAllGenres = selectedGenres.every(genre => showGenreNames.includes(genre));
          if (!hasAllGenres) return false;
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
        'score-desc': {
          label: 'Score ↓',
          compare: (a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0)
        },
        'popularite-desc': {
          label: 'Popularité ↓',
          compare: (a, b) => (b.popularite || 0) - (a.popularite || 0)
        },
        'date-desc': {
          label: 'Date ↓',
          compare: (a, b) => {
            const dateA = a.date_premiere ? new Date(a.date_premiere).getTime() : 0;
            const dateB = b.date_premiere ? new Date(b.date_premiere).getTime() : 0;
            return dateB - dateA;
          }
        }
      },
      defaultSort: 'date-desc'
    }
  });

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
    storageKey: 'videos-series-items-per-page',
    scrollStorageKey: 'videos.series.scroll'
  });


  const handleClearFilters = useCallback(() => {
    setSearch('');
    setCompletionFilter('');
    setWorkStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowMajOnly(false);
    setSelectedGenres([]);
  }, [setSearch, setCompletionFilter, setWorkStatusFilter, setShowFavoriteOnly, setShowHidden, setShowMajOnly, setSelectedGenres]);

  // Construire les options pour les filtres
  const completionOptions = [
    { value: '', label: '📂 Tous les statuts de visionnage' },
    ...SERIES_STATUS_OPTIONS.map(status => ({
      value: status,
      label: formatStatusLabel(status, { category: 'series' })
    }))
  ];

  const workStatusOptions = [
    { value: '', label: '📺 Tous les statuts de l\'œuvre' },
    ...availableWorkStatuses.map(status => ({
      value: status,
      label: translateStatus(status)
    }))
  ];


  return (
    <>
      {ToastContainer}
      {showAddModal && (
        <AddSeriesModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadSeries();
            setShowAddModal(false);
          }}
        />
      )}

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Collection Séries"
            icon="📺"
            count={series.length}
            countLabel={series.length > 1 ? 'séries' : 'série'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter une série"
            extraButtons={(
              <button
                onClick={() => loadSeries()}
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
            <ProgressionHeader type="series" stats={seriesStats} />
          </div>

          <VideoCollectionFilters
            contentType="series"
            searchTerm={search}
            onSearchChange={setSearch}
            searchPlaceholder="Rechercher une série (titre, TMDb ID...)"
            onOpenHelp={() => setShowHelpModal(true)}
            sortBy={sortBy as any}
            onSortChange={(value) => setSortBy(value as SeriesSortOption)}
            sortOptions={SERIES_SORT_OPTIONS as any}
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
            hasActiveFilters={hasActiveFilters || selectedGenres.length > 0}
            onClearFilters={handleClearFilters}
            availableGenres={availableGenres}
            selectedGenres={selectedGenres}
            onGenreToggle={handleGenreToggle}
            showGenresFilter={showGenresFilter}
            onToggleGenresFilter={() => setShowGenresFilter(!showGenresFilter)}
          />

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

          <CollectionView
            items={paginatedItems}
            viewMode={viewMode}
            gridMinWidth={200}
            imageMinWidth={200}
            renderCard={(show) => (
              <TvShowCard
                key={show.id}
                show={show}
                onClick={() => handleOpenSeriesDetail(show)}
                onToggleFavorite={() => handleToggleFavorite(show.id)}
                onToggleHidden={() => handleToggleHidden(show.id)}
                onChangeStatus={(status) => handleChangeStatus(show.id, status)}
              />
            )}
            renderListItem={(show) => (
              <ListItem
                key={`${show.id}-${show.statut_visionnage}-${show.is_favorite}-${show.is_hidden}`}
                title={show.titre}
                subtitle={[
                  show.date_premiere ? formatAirDate(show.date_premiere) : undefined,
                  show.nb_saisons ? `${show.nb_saisons} saison${show.nb_saisons > 1 ? 's' : ''}` : undefined
                ].filter(Boolean).join(' • ')}
                progression={
                  show.nb_episodes
                    ? Math.min(100, Math.round(((show.episodes_vus || 0) / show.nb_episodes) * 100))
                    : 0
                }
                currentStatus={show.statut_visionnage || 'À regarder'}
                availableStatuses={[...SERIES_STATUS_OPTIONS]}
                isFavorite={!!show.is_favorite}
                isHidden={!!show.is_hidden}
                badges={show.prochain_episode ? (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e'
                  }}>
                    Prochain épisode
                  </span>
                ) : undefined}
                onClick={() => handleOpenSeriesDetail(show)}
                onToggleFavorite={() => handleToggleFavorite(show.id)}
                onChangeStatus={(status) => handleChangeStatus(show.id, status)}
                onToggleHidden={() => handleToggleHidden(show.id)}
                rightContent={
                  show.note_moyenne
                    ? <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{Math.round((show.note_moyenne || 0) * 10) / 10}/10 TMDb</span>
                    : undefined
                }
              />
            )}
            loading={loading}
            emptyMessage={hasActiveFilters ? 'Aucune série ne correspond à vos filtres' : 'Aucune série dans votre collection'}
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>📺</span>}
          />

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
      </div>

      <SearchHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        config={SERIES_SEARCH_HELP_CONFIG}
      />
    </>
  );
}
