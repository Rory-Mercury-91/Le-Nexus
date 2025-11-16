import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TvShowCard from '../../components/cards/TvShowCard';
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
import Modal from '../../components/modals/common/Modal';
import ModalHeader from '../../components/modals/common/ModalHeader';
import TmdbSearchResultsList, { TmdbSearchResultItem } from '../../components/modals/common/TmdbSearchResultsList';
import { useModalEscape } from '../../components/modals/common/useModalEscape';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { TmdbSeriesSearchResult, TvShowListItem } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate, getTmdbImageUrl } from '../../utils/tmdb';

const SERIES_STATUS_OPTIONS = COMMON_STATUSES.SERIES;
const SERIES_SORT_OPTIONS = ['date-desc', 'title-asc', 'title-desc', 'score-desc', 'popularite-desc'] as const;
type SeriesSortOption = typeof SERIES_SORT_OPTIONS[number];
const SERIES_SORT_SET = new Set<string>(SERIES_SORT_OPTIONS);

const isSeriesSortOption = (value: unknown): value is SeriesSortOption =>
  typeof value === 'string' && SERIES_SORT_SET.has(value);
const SERIES_STATUS_SET = new Set<string>(SERIES_STATUS_OPTIONS);
const isSeriesStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || SERIES_STATUS_SET.has(value));

export default function Series() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [series, setSeries] = useState<TvShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>(
    'collection.series.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<SeriesSortOption>(
    'collection.series.sortBy',
    'date-desc',
    { validator: isSeriesSortOption, storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    'collection.series.statusFilter',
    '',
    { validator: isSeriesStatusFilter, storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.series.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.series.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showMajOnly, setShowMajOnly] = usePersistentState<boolean>(
    'collection.series.filters.showMajOnly',
    false,
    { storage: 'session' }
  );
  const [tmdbInput, setTmdbInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbSeriesSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [viewMode] = useCollectionViewMode('series');

  useScrollRestoration('collection.series.scroll', !loading);

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
    setTmdbInput('');
    setSearchResults([]);
    setSearchError(null);
    setSearchPage(1);
    setSearchTotalPages(1);
    setSearchTotalResults(0);
    setHasSearched(false);
    setSearching(false);
  }, []);

  const handleCancelImport = useCallback(() => {
    if (importing) {
      return;
    }
    closeImportModal();
  }, [closeImportModal, importing]);

  useModalEscape(handleCancelImport, !showImportModal || importing);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showImportModal) {
      setTmdbInput('');
      setSearchResults([]);
      setSearchError(null);
      setSearchPage(1);
      setSearchTotalPages(1);
      setSearchTotalResults(0);
      setHasSearched(false);
      setSearching(false);
    }
  }, [showImportModal]);

  const performSearch = useCallback(
    async (query: string, page = 1) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        setSearchError(null);
        setSearchTotalResults(0);
        setSearchTotalPages(1);
        setSearchPage(1);
        setSearching(false);
        setHasSearched(false);
        return;
      }

      setHasSearched(true);
      setSearching(true);
      setSearchError(null);

      try {
        const response = await window.electronAPI.searchTmdbSeries(trimmed, page);
        setSearchResults(response?.results ?? []);
        setSearchTotalResults(response?.totalResults ?? response?.results?.length ?? 0);
        setSearchTotalPages(Math.max(response?.totalPages ?? 1, 1));
        setSearchPage(response?.page ?? page);
      } catch (error: any) {
        console.error('Erreur recherche TMDb séries:', error);
        const message = error?.message || 'Impossible de rechercher des séries sur TMDb.';
        setSearchError(message);
        setSearchResults([]);
        setSearchTotalResults(0);
        setSearchTotalPages(1);
        setSearchPage(1);
        showToast({
          title: 'Recherche TMDb',
          message,
          type: 'error'
        });
      } finally {
        setSearching(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!showImportModal) {
      return;
    }

    const query = tmdbInput.trim();

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setSearchTotalResults(0);
      setSearchTotalPages(1);
      setSearchPage(1);
      setSearching(false);
      setHasSearched(false);
      return;
    }

    const shouldAutoSearch = /^\d+$/.test(query) || query.length >= 3;
    if (!shouldAutoSearch) {
      setSearching(false);
      setHasSearched(false);
      return;
    }

    setSearchPage(1);
    searchDebounceRef.current = setTimeout(() => {
      performSearch(query, 1);
    }, 400);
  }, [tmdbInput, showImportModal, performSearch]);

  const handleSearchSubmit = useCallback(() => {
    if (!tmdbInput.trim()) {
      return;
    }
    setSearchPage(1);
    performSearch(tmdbInput, 1);
  }, [performSearch, tmdbInput]);

  const handleSearchPageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > searchTotalPages) {
        return;
      }
      if (searching) {
        return;
      }
      performSearch(tmdbInput, nextPage);
    },
    [performSearch, searchTotalPages, searching, tmdbInput]
  );

  const handleOpenSeriesDetail = useCallback((show: TvShowListItem) => {
    rememberScrollTarget('collection.series.scroll', show.id);
    navigate(`/series/${show.tmdb_id}`);
  }, [navigate]);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getTvShows();
      const parsed = (result || []).map((show: TvShowListItem) => ({
        ...show,
        genres: show.genres || [],
        prochain_episode: show.prochain_episode || null,
        dernier_episode: show.dernier_episode || null
      }));
      setSeries(parsed);
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
  }, [showToast]);

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

  const handleSyncSeries = async (explicitTmdbId?: number) => {
    let tmdbId = explicitTmdbId;

    if (!tmdbId || !Number.isFinite(tmdbId)) {
      const rawInput = tmdbInput.trim();
      if (!rawInput) {
        showToast({
          title: 'TMDb ID requis',
          message: 'Veuillez saisir un identifiant TMDb ou coller l’URL de la série (ex: 1399 pour Game of Thrones).',
          type: 'warning'
        });
        return;
      }

      const idMatch = rawInput.match(/(\d+)/);
      const parsedId = idMatch ? Number(idMatch[1]) : Number.NaN;
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        showToast({
          title: 'Identifiant invalide',
          message: 'Impossible d’identifier un numéro TMDb valide dans votre saisie.',
          type: 'error'
        });
        return;
      }
      tmdbId = parsedId;
    }

    try {
      setImporting(true);
      const result = await window.electronAPI.syncTvShowFromTmdb(tmdbId, { autoTranslate: true, includeEpisodes: true });
      if (result?.id) {
        showToast({
          title: 'Série importée',
          message: 'La série et ses épisodes ont été synchronisés.',
          type: 'success'
        });
        await loadSeries();
        closeImportModal();
      } else {
        showToast({
          title: 'Import en attente',
          message: 'Aucune information synchronisée. Vérifiez l’identifiant TMDb.',
          type: 'info'
        });
      }
    } catch (error: any) {
      console.error('Erreur import série TMDb:', error);
      showToast({
        title: 'Erreur import TMDb',
        message: error?.message || 'Impossible de synchroniser cette série.',
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

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

  const normalizedSearch = search.trim().toLowerCase();
  const [internalSearch, setInternalSearch] = useState(normalizedSearch);

  useEffect(() => {
    setInternalSearch(normalizedSearch);
  }, [normalizedSearch]);

  const filteredSeries = useMemo(() => {
    return series.filter(tvShow => {
      if (!showHidden && tvShow.is_hidden) {
        return false;
      }
      if (showFavoriteOnly && !tvShow.is_favorite) {
        return false;
      }
      if (showMajOnly && !tvShow.maj_disponible) {
        return false;
      }
      if (statusFilter && (tvShow.statut_visionnage || 'À regarder') !== statusFilter) {
        return false;
      }

      if (internalSearch) {
        const isNumeric = /^\d+$/.test(internalSearch);
        if (isNumeric) {
          return tvShow.tmdb_id === Number(internalSearch);
        }
        return tvShow.titre.toLowerCase().includes(internalSearch) ||
          (tvShow.titre_original || '').toLowerCase().includes(internalSearch);
      }
      return true;
    });
  }, [series, internalSearch, showHidden, showFavoriteOnly, showMajOnly, statusFilter]);

  const sortedSeries = useMemo(() => {
    const list = [...filteredSeries];
    switch (sortBy) {
      case 'title-asc':
        return list.sort((a, b) => a.titre.localeCompare(b.titre));
      case 'title-desc':
        return list.sort((a, b) => b.titre.localeCompare(a.titre));
      case 'score-desc':
        return list.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
      case 'popularite-desc':
        return list.sort((a, b) => (b.popularite || 0) - (a.popularite || 0));
      case 'date-desc':
      default:
        return list.sort((a, b) => {
          const dateA = a.date_premiere ? new Date(a.date_premiere).getTime() : 0;
          const dateB = b.date_premiere ? new Date(b.date_premiere).getTime() : 0;
          return dateB - dateA;
        });
    }
  }, [filteredSeries, sortBy]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage: _setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  } = usePagination({
    items: sortedSeries,
    defaultItemsPerPage: 50,
    storageKey: 'series-items-per-page'
  });

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== '' ||
    showFavoriteOnly ||
    showHidden ||
    showMajOnly;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowMajOnly(false);
  }, [setSearch, setStatusFilter, setShowFavoriteOnly, setShowHidden, setShowMajOnly]);

  const trimmedTmdbInput = tmdbInput.trim();
  const tmdbSearchItems = useMemo<TmdbSearchResultItem[]>(() => {
    return searchResults.map((result) => {
      const year = result.firstAirDate ? new Date(result.firstAirDate).getFullYear() : null;
      const safeYear = Number.isNaN(year) ? null : year;

      return {
        tmdbId: result.tmdbId,
        title: result.title,
        originalTitle: result.originalTitle,
        year: safeYear,
        overview: result.overview,
        posterUrl: getTmdbImageUrl(result.posterPath, 'w154') || undefined,
        score: result.voteAverage ?? undefined,
        inLibrary: result.inLibrary,
        tmdbUrl: `https://www.themoviedb.org/tv/${result.tmdbId}`
      };
    });
  }, [searchResults]);

  return (
    <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
      {ToastContainer}

      {showImportModal && (
        <Modal onClickOverlay={handleCancelImport} maxWidth="520px">
          <div style={{ padding: '24px' }}>
            <ModalHeader
              title="Importer une série depuis TMDb"
              onClose={handleCancelImport}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  Recherche TMDb
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    value={tmdbInput}
                    onChange={(e) => setTmdbInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (!value) {
                          return;
                        }
                        if (/^\d+$/.test(value)) {
                          setTmdbInput(value);
                          handleSyncSeries(Number(value));
                        } else {
                          setTmdbInput(e.currentTarget.value);
                          setSearchPage(1);
                          performSearch(value, 1);
                        }
                      }
                    }}
                    placeholder="Titre, identifiant ou URL TMDb (ex. “Stargate SG-1” ou 1399)"
                    style={{
                      flex: 1,
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      padding: '12px 14px',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                    autoFocus
                    disabled={importing}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSearchSubmit}
                    disabled={searching || !trimmedTmdbInput}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Rechercher
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Tu peux chercher par titre pour choisir la bonne fiche, ou coller directement un identifiant / une URL TMDb. Nous importerons ensuite les saisons, épisodes et informations TV Maze disponibles.
                </p>
              </div>

              <TmdbSearchResultsList
                query={trimmedTmdbInput}
                hasSearched={hasSearched}
                loading={searching}
                error={searchError}
                results={tmdbSearchItems}
                totalResults={searchTotalResults}
                page={searchPage}
                totalPages={searchTotalPages}
                accentColor="#3b82f6"
                importLabel="Importer la série"
                emptyNotice="Saisis un titre ou un identifiant TMDb pour afficher des suggestions."
                onPageChange={handleSearchPageChange}
                onImport={handleSyncSeries}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancelImport}
                  disabled={importing}
                  style={{ minWidth: '120px' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSyncSeries()}
                  disabled={importing || !trimmedTmdbInput}
                  style={{ minWidth: '180px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {importing ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Import en cours…
                    </>
                  ) : (
                    'Importer via ID'
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <CollectionHeader
        title="Collection Séries"
        icon="📺"
        count={series.length}
        countLabel={series.length > 1 ? 'séries' : 'série'}
        onAdd={() => setShowImportModal(true)}
        addButtonLabel="Importer depuis TMDb"
        extraButtons={(
          <button
            onClick={() => loadSeries()}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Recharger
          </button>
        )}
      />

      <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Synchronisez vos séries depuis TMDb, suivez les prochaines diffusions via TV Maze et ajustez vos favoris ou statuts d’avancement en un clin d’œil.
      </p>

      <ProgressionHeader type="series" stats={seriesStats} />

      <CollectionFiltersBar
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      >
        <CollectionSearchBar
          placeholder="Rechercher une série (titre, TMDb ID...)"
          searchTerm={search}
          onSearchChange={setSearch}
          onSubmit={() => undefined}
          showSubmitButton={false}
        />

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SeriesSortOption)}
            style={{ minWidth: '200px' }}
          >
            <option value="date-desc">🗓️ Date de diffusion</option>
            <option value="title-asc">📖 Titre (A → Z)</option>
            <option value="title-desc">📖 Titre (Z → A)</option>
            <option value="score-desc">⭐ Note TMDb</option>
            <option value="popularite-desc">🔥 Popularité TMDb</option>
          </select>

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="">📂 Tous les statuts</option>
            {SERIES_STATUS_OPTIONS.map((status) => {
              const label = formatStatusLabel(status, { category: 'series' });
              return (
                <option key={status} value={status}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            label="👁️ Séries masquées"
            icon="👁️"
            activeColor="#fb923c"
          />
        </div>

      </CollectionFiltersBar>

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
        emptyMessage={series.length === 0 ? 'Aucune série dans votre collection' : 'Aucune série ne correspond à vos filtres'}
      />

      {sortedSeries.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedSeries.length}
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
  );
}
