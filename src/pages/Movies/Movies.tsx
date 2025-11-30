import { ChevronDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCard from '../../components/cards/MovieCard';
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
import SearchHelpModal from '../../components/modals/help/SearchHelpModal';
import { MOVIES_SEARCH_HELP_CONFIG } from '../../components/modals/help/search-help-configs';
import AddMovieModal from '../../components/modals/movie/AddMovieModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { MovieListItem } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate, formatRuntime } from '../../utils/tmdb';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [viewMode, handleViewModeChange] = useCollectionViewMode('movies');
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    'collection.movies.filters.selectedGenres',
    [],
    { storage: 'session' }
  );
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);

  useScrollRestoration('collection.movies.scroll', !loading);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedGenres.length > 0) {
        filters.genres = selectedGenres;
      }
      const result = await window.electronAPI.getMovies(filters);
      const parsed = (result || []).map((movie: MovieListItem) => ({
        ...movie,
        genres: movie.genres || []
      }));
      setMovies(parsed);

      // Charger tous les genres disponibles
      try {
        const allGenres = await (window.electronAPI as any).getAllMovieGenres?.();
        if (allGenres && Array.isArray(allGenres)) {
          setAvailableGenres(allGenres);
        }
      } catch (error) {
        console.error('Erreur chargement genres:', error);
      }
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
  }, [showToast, selectedGenres]);

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

  const updateMovieInState = useCallback((movieId: number, updates: Partial<MovieListItem>) => {
    setMovies(prev =>
      prev.map(movie => (movie.id === movieId ? { ...movie, ...updates } : movie))
    );
  }, []);

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
      // Trouver le film pour récupérer son tmdbId
      const movie = movies.find(m => m.id === movieId);
      const result = await window.electronAPI.setMovieStatus({ movieId, statut: status });
      updateMovieInState(movieId, { statut_visionnage: result.statut });

      // Notifier la page de détails si elle est ouverte
      window.dispatchEvent(new CustomEvent('movie-status-changed', {
        detail: {
          movieId,
          tmdbId: movie?.tmdb_id,
          statut: result.statut
        }
      }));

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

  // Écouter les changements de statut depuis la page de détails
  useEffect(() => {
    const handleStatusChangeFromDetail = (event: CustomEvent) => {
      const { movieId, tmdbId, statut } = event.detail;

      // Mettre à jour directement sans chercher dans la liste
      // car l'événement peut arriver avant que movies soit mis à jour
      if (movieId) {
        updateMovieInState(movieId, { statut_visionnage: statut });
      } else if (tmdbId) {
        // Si on a seulement le tmdbId, chercher dans la liste actuelle
        const movie = movies.find(m => m.tmdb_id === tmdbId);
        if (movie) {
          updateMovieInState(movie.id, { statut_visionnage: statut });
        }
      }
    };

    window.addEventListener('movie-status-changed', handleStatusChangeFromDetail as EventListener);
    return () => {
      window.removeEventListener('movie-status-changed', handleStatusChangeFromDetail as EventListener);
    };
  }, [movies, updateMovieInState]);

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
    sortedItems: sortedMovies,
    hasActiveFilters
  } = useCollectionFilters({
    items: movies,
    search,
    statusFilter,
    showFavoriteOnly,
    showHidden,
    showWatchlistOnly,
    sortBy,
    searchConfig: {
      getTitle: (m) => m.titre,
      getOriginalTitle: (m) => m.titre_original,
      getExternalId: (m) => m.tmdb_id
    },
    filterConfig: {
      getIsHidden: (m) => !!m.is_hidden,
      getIsFavorite: (m) => !!m.is_favorite,
      getStatus: (m) => m.statut_visionnage || 'À regarder',
      getIsInWatchlist: (m) => {
        const status = m.statut_visionnage || 'À regarder';
        return status !== 'Terminé';
      },
      customFilter: (movie: MovieListItem) => {
        // Filtre par genres (les genres sont stockés en JSON, tableau d'objets avec `name`)
        if (selectedGenres.length > 0) {
          if (!movie.genres || !Array.isArray(movie.genres)) return false;
          const movieGenreNames = movie.genres.map((g: any) => g.name || g).filter(Boolean);
          const hasAllGenres = selectedGenres.every(genre => movieGenreNames.includes(genre));
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
        'date-desc': {
          label: 'Date ↓',
          compare: (a, b) => {
            const dateA = a.date_sortie ? new Date(a.date_sortie).getTime() : 0;
            const dateB = b.date_sortie ? new Date(b.date_sortie).getTime() : 0;
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
    items: sortedMovies,
    defaultItemsPerPage: 50,
    storageKey: 'movies-items-per-page',
    scrollStorageKey: 'collection.movies.scroll'
  });


  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setShowWatchlistOnly(false);
    setSelectedGenres([]);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="text"][placeholder^="Rechercher"]');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);
  }, [setSearch, setStatusFilter, setShowFavoriteOnly, setShowHidden, setShowWatchlistOnly, setSelectedGenres]);


  return (
    <>
      {ToastContainer}
      {showAddModal && (
        <AddMovieModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadMovies();
            setShowAddModal(false);
          }}
        />
      )}

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Collection Films"
            icon="🎬"
            count={movies.length}
            countLabel={movies.length > 1 ? 'films' : 'film'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un film"
            extraButtons={(
              <button
                onClick={() => loadMovies()}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Recharger
              </button>
            )}
          />

          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="movie" stats={movieStats} />
          </div>

          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onOpenHelp={() => setShowHelpModal(true)}
          >
            <CollectionSearchBar
              placeholder="Rechercher un film (titre ou TMDb ID)..."
              searchTerm={search}
              onSearchChange={setSearch}
              onSubmit={() => undefined}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as MovieSortOption)}
                style={{ width: 'auto', flex: '0 0 auto' }}
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
                style={{ width: 'auto', flex: '0 0 auto' }}
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

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', marginTop: '12px' }}>
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

            {availableGenres.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowGenresFilter(!showGenresFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎬 Filtrer par genres
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
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

          </CollectionFiltersBar>

          {/* Pagination avec contrôles de vue et items par page */}
          {sortedMovies.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedMovies.length}
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
            emptyMessage={hasActiveFilters ? 'Aucun film ne correspond à vos filtres' : 'Aucun film dans votre collection'}
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3, margin: '0 auto 24px', display: 'block' }}>🎞️</span>}
          />

          {/* Pagination en bas */}
          {sortedMovies.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={sortedMovies.length}
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
        config={MOVIES_SEARCH_HELP_CONFIG}
      />
    </>
  );
}
