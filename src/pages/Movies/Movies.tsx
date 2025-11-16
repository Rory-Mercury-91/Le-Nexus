import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCard from '../../components/cards/MovieCard';
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
import { MovieListItem, TmdbMovieSearchResult } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate, formatRuntime, getTmdbImageUrl } from '../../utils/tmdb';

const MOVIE_STATUS_OPTIONS = COMMON_STATUSES.MOVIE;
const MOVIE_SORT_OPTIONS = ['date-desc', 'title-asc', 'title-desc', 'score-desc'] as const;
type MovieSortOption = typeof MOVIE_SORT_OPTIONS[number];
const MOVIE_SORT_SET = new Set<string>(MOVIE_SORT_OPTIONS);

const isMovieSortOption = (value: unknown): value is MovieSortOption =>
  typeof value === 'string' && MOVIE_SORT_SET.has(value);
const MOVIE_STATUS_SET = new Set<string>(MOVIE_STATUS_OPTIONS);
const isMovieStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || MOVIE_STATUS_SET.has(value));

export default function Movies() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>(
    'collection.movies.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<MovieSortOption>(
    'collection.movies.sortBy',
    'date-desc',
    { validator: isMovieSortOption, storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    'collection.movies.statusFilter',
    '',
    { validator: isMovieStatusFilter, storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.movies.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.movies.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showWatchlistOnly, setShowWatchlistOnly] = usePersistentState<boolean>(
    'collection.movies.filters.showWatchlistOnly',
    false,
    { storage: 'session' }
  );
  const [tmdbInput, setTmdbInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbMovieSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [viewMode] = useCollectionViewMode('movies');

  useScrollRestoration('collection.movies.scroll', !loading);

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
    setTmdbInput('');
    setSearchResults([]);
    setSearchError(null);
    setSearchPage(1);
    setSearchTotalPages(1);
    setSearchTotalResults(0);
    setSearching(false);
    setHasSearched(false);
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
      setSearching(false);
      setHasSearched(false);
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
        return;
      }

      setHasSearched(true);
      setSearching(true);
      setSearchError(null);
      try {
        const response = await window.electronAPI.searchTmdbMovies(trimmed, page);
        setSearchResults(response?.results ?? []);
        setSearchTotalResults(response?.totalResults ?? response?.results?.length ?? 0);
        setSearchTotalPages(Math.max(response?.totalPages ?? 1, 1));
        setSearchPage(response?.page ?? page);
      } catch (error: any) {
        console.error('Erreur recherche TMDb films:', error);
        const message = error?.message || 'Impossible de rechercher sur TMDb.';
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

  const loadMovies = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getMovies();
      const parsed = (result || []).map((movie: MovieListItem) => ({
        ...movie,
        genres: movie.genres || []
      }));
      setMovies(parsed);
    } catch (error: any) {
      console.error('Erreur lors du chargement des films:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de charger les films',
        type: 'error'
      });
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const movieStats = useMemo<ProgressionStats>(() => {
    const total = movies.length;
    const enCours = movies.filter((movie) => movie.statut_visionnage === 'En cours').length;
    const termines = movies.filter((movie) => movie.statut_visionnage === 'Terminé').length;
    const vus = movies.filter(
      (movie) =>
        movie.statut_visionnage === 'Terminé' ||
        movie.statut_visionnage === 'En cours' ||
        movie.statut_visionnage === 'En pause' ||
        movie.date_visionnage
    ).length;

    return {
      filmsEnCours: enCours,
      filmsTermines: termines,
      filmsVus: vus,
      filmsTotal: total
    };
  }, [movies]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleSyncMovie = async (explicitTmdbId?: number) => {
    let tmdbId = explicitTmdbId;

    if (!tmdbId || !Number.isFinite(tmdbId)) {
      const rawInput = tmdbInput.trim();
      if (!rawInput) {
        showToast({
          title: 'TMDb ID requis',
          message: 'Veuillez saisir un identifiant TMDb ou coller l’URL de la fiche (ex: 550 pour Fight Club).',
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
      const result = await window.electronAPI.syncMovieFromTmdb(tmdbId, { autoTranslate: true });
      if (result?.id) {
        showToast({
          title: 'Film importé',
          message: 'Le film a été synchronisé avec succès.',
          type: 'success'
        });
        await loadMovies();
        closeImportModal();
      } else {
        showToast({
          title: 'Import en attente',
          message: 'La synchronisation TMDb n’a pas retourné de résultat exploitable.',
          type: 'info'
        });
      }
    } catch (error: any) {
      console.error('Erreur import TMDb:', error);
      showToast({
        title: 'Erreur import TMDb',
        message: error?.message || 'Impossible de synchroniser ce film.',
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  const updateMovieInState = (movieId: number, updates: Partial<MovieListItem>) => {
    setMovies(prev =>
      prev.map(movie => (movie.id === movieId ? { ...movie, ...updates } : movie))
    );
  };

  const handleNavigateToDetail = useCallback((movie: MovieListItem) => {
    rememberScrollTarget('collection.movies.scroll', movie.id);
    navigate(`/movies/${movie.tmdb_id}`);
  }, [navigate]);

  const handleToggleFavorite = async (movieId: number) => {
    try {
      const result = await window.electronAPI.toggleMovieFavorite(movieId);
      updateMovieInState(movieId, { is_favorite: result.isFavorite });
      showToast({
        title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur favorite film:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le favori',
        type: 'error'
      });
    }
  };

  const handleToggleHidden = async (movieId: number) => {
    try {
      const result = await window.electronAPI.toggleMovieHidden(movieId);
      updateMovieInState(movieId, { is_hidden: result.isHidden });
      showToast({
        title: result.isHidden ? 'Film masqué' : 'Film réaffiché',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur masquage film:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le masquage',
        type: 'error'
      });
    }
  };

  const handleChangeStatus = async (movieId: number, status: string) => {
    try {
      const result = await window.electronAPI.setMovieStatus({ movieId, statut: status });
      updateMovieInState(movieId, { statut_visionnage: result.statut });
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur statut film:', error);
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

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      if (!showHidden && movie.is_hidden) {
        return false;
      }
      if (showFavoriteOnly && !movie.is_favorite) {
        return false;
      }
      if (showWatchlistOnly && (movie.statut_visionnage || 'À regarder') === 'Terminé') {
        return false;
      }
      if (statusFilter && (movie.statut_visionnage || 'À regarder') !== statusFilter) {
        return false;
      }

      if (internalSearch) {
        const isNumeric = /^\d+$/.test(internalSearch);
        if (isNumeric) {
          return movie.tmdb_id === Number(internalSearch);
        }
        return movie.titre.toLowerCase().includes(internalSearch) ||
          (movie.titre_original || '').toLowerCase().includes(internalSearch);
      }
      return true;
    });
  }, [movies, internalSearch, showHidden, showFavoriteOnly, showWatchlistOnly, statusFilter]);

  const sortedMovies = useMemo(() => {
    const list = [...filteredMovies];
    switch (sortBy) {
      case 'title-asc':
        return list.sort((a, b) => a.titre.localeCompare(b.titre));
      case 'title-desc':
        return list.sort((a, b) => b.titre.localeCompare(a.titre));
      case 'score-desc':
        return list.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
      case 'date-desc':
      default:
        return list.sort((a, b) => {
          const dateA = a.date_sortie ? new Date(a.date_sortie).getTime() : 0;
          const dateB = b.date_sortie ? new Date(b.date_sortie).getTime() : 0;
          return dateB - dateA;
        });
    }
  }, [filteredMovies, sortBy]);

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
    items: sortedMovies,
    defaultItemsPerPage: 50,
    storageKey: 'movies-items-per-page'
  });

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== '' ||
    showFavoriteOnly ||
    showHidden ||
    showWatchlistOnly;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowWatchlistOnly(false);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="text"][placeholder^="Rechercher"]');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);
  }, [setSearch, setStatusFilter, setShowFavoriteOnly, setShowHidden, setShowWatchlistOnly]);

  const trimmedTmdbInput = tmdbInput.trim();
  const tmdbSearchItems = useMemo<TmdbSearchResultItem[]>(() => {
    return searchResults.map((result) => {
      const year = result.releaseDate ? new Date(result.releaseDate).getFullYear() : null;
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
        tmdbUrl: `https://www.themoviedb.org/movie/${result.tmdbId}`
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
              title="Importer un film depuis TMDb"
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
                          handleSyncMovie(Number(value));
                        } else {
                          setTmdbInput(e.currentTarget.value);
                          setSearchPage(1);
                          performSearch(value, 1);
                        }
                      }
                    }}
                    placeholder="Titre, identifiant ou URL TMDb (ex. “Stargate” ou 603)"
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
                  Tu peux saisir un titre pour afficher des suggestions, ou coller directement une URL TMDb / un identifiant numérique pour importer la fiche.
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
                accentColor="#22c55e"
                importLabel="Importer"
                emptyNotice="Saisis un titre ou un identifiant TMDb pour afficher des suggestions."
                onPageChange={handleSearchPageChange}
                onImport={handleSyncMovie}
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
                  onClick={() => handleSyncMovie()}
                  disabled={importing || !trimmedTmdbInput}
                  style={{ minWidth: '160px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
        title="Collection Films"
        icon="🎬"
        count={movies.length}
        countLabel={movies.length > 1 ? 'films' : 'film'}
        onAdd={() => setShowImportModal(true)}
        addButtonLabel="Importer depuis TMDb"
        extraButtons={(
          <button
            onClick={() => loadMovies()}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Recharger
          </button>
        )}
      />

      <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Gérez votre collection de films synchronisés depuis TMDb : importez une nouvelle fiche via son identifiant, suivez vos favoris et ajustez vos statuts de visionnage.
      </p>

      <ProgressionHeader type="movie" stats={movieStats} />

      <CollectionFiltersBar
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      >
        <CollectionSearchBar
          placeholder="Rechercher un film (titre ou TMDb ID)..."
          searchTerm={search}
          onSearchChange={setSearch}
          onSubmit={() => undefined}
          showSubmitButton={false}
        />

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MovieSortOption)}
            style={{ minWidth: '200px' }}
          >
            <option value="date-desc">🗓️ Date de sortie (desc)</option>
            <option value="title-asc">📖 Titre (A → Z)</option>
            <option value="title-desc">📖 Titre (Z → A)</option>
            <option value="score-desc">⭐ Note TMDb</option>
          </select>

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="">📂 Tous les statuts</option>
            {MOVIE_STATUS_OPTIONS.map((status) => {
              const label = formatStatusLabel(status, { category: 'movie' });
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
            checked={showWatchlistOnly}
            onChange={setShowWatchlistOnly}
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
            label="👁️ Films masqués"
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
        renderCard={(movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onClick={() => handleNavigateToDetail(movie)}
            onToggleFavorite={() => handleToggleFavorite(movie.id)}
            onToggleHidden={() => handleToggleHidden(movie.id)}
            onChangeStatus={(status) => handleChangeStatus(movie.id, status)}
          />
        )}
        renderListItem={(movie) => (
          <ListItem
            key={`${movie.id}-${movie.statut_visionnage}-${movie.is_favorite}-${movie.is_hidden}`}
            title={movie.titre}
            subtitle={[
              movie.date_sortie ? formatAirDate(movie.date_sortie) : undefined,
              movie.duree ? formatRuntime(movie.duree) : undefined
            ].filter(Boolean).join(' • ')}
            currentStatus={movie.statut_visionnage || 'À regarder'}
            availableStatuses={MOVIE_STATUS_OPTIONS as unknown as string[]}
            isFavorite={!!movie.is_favorite}
            isHidden={!!movie.is_hidden}
            onClick={() => handleNavigateToDetail(movie)}
            onToggleFavorite={() => handleToggleFavorite(movie.id)}
            onChangeStatus={(status) => handleChangeStatus(movie.id, status)}
            onToggleHidden={() => handleToggleHidden(movie.id)}
            rightContent={
              movie.note_moyenne
                ? <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{Math.round((movie.note_moyenne || 0) * 10) / 10}/10 TMDb</span>
                : undefined
            }
          />
        )}
        loading={loading}
        emptyMessage={movies.length === 0 ? 'Aucun film dans votre collection' : 'Aucun film ne correspond à vos filtres'}
      />

      {sortedMovies.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedMovies.length}
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
