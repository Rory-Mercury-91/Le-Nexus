import { ChevronDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookCard } from '../../components/cards';
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
import AddBookModal from '../../components/modals/book/AddBookModal';
import SearchHelpModal from '../../components/modals/help/SearchHelpModal';
import { BOOKS_SEARCH_HELP_CONFIG } from '../../components/modals/help/search-help-configs';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { BookListItem, BookType } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';

const BOOK_STATUS_OPTIONS = COMMON_STATUSES.BOOK;
const BOOK_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'author-asc'] as const;
type BookSortOption = typeof BOOK_SORT_OPTIONS[number];
const BOOK_SORT_SET = new Set<string>(BOOK_SORT_OPTIONS);
const isBookSortOption = (value: unknown): value is BookSortOption =>
  typeof value === 'string' && BOOK_SORT_SET.has(value);
const BOOK_STATUS_SET = new Set<string>(BOOK_STATUS_OPTIONS);
const isBookStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || BOOK_STATUS_SET.has(value));

const BOOK_TYPE_OPTIONS: Array<{ value: BookType; label: string }> = [
  { value: 'Roman', label: '📖 Roman' },
  { value: 'Biographie', label: '👤 Biographie' },
  { value: 'Autobiographie', label: '✍️ Autobiographie' },
  { value: 'Essai', label: '📝 Essai' },
  { value: 'Documentaire', label: '📚 Documentaire' },
  { value: 'Polar', label: '🔍 Polar' },
  { value: 'Science-fiction', label: '🚀 Science-fiction' },
  { value: 'Fantasy', label: '✨ Fantasy' },
  { value: 'Horreur', label: '👻 Horreur' },
  { value: 'Romance', label: '💕 Romance' },
  { value: 'Thriller', label: '⚡ Thriller' },
  { value: 'Bande dessinée', label: '📗 Bande dessinée' },
  { value: 'Comics', label: '🦸 Comics' },
  { value: 'Manga', label: '📘 Manga' },
  { value: 'Autre', label: '📕 Autre' }
];

export default function Books() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>(
    'collection.books.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<BookSortOption>(
    'collection.books.sortBy',
    'title-asc',
    { validator: isBookSortOption, storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    'collection.books.statusFilter',
    '',
    { validator: isBookStatusFilter, storage: 'session' }
  );
  const [typeFilter, setTypeFilter] = usePersistentState<BookType | ''>(
    'collection.books.typeFilter',
    '',
    { storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.books.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.books.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [viewMode, handleViewModeChange] = useCollectionViewMode('mangas');
  const [selectedGenres, setSelectedGenres] = usePersistentState<string[]>(
    'collection.books.filters.selectedGenres',
    [],
    { storage: 'session' }
  );
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [showGenresFilter, setShowGenresFilter] = useState(false);
  const [bookStats, setBookStats] = useState<ProgressionStats>({});

  useScrollRestoration('collection.books.scroll', !loading);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {
        search,
        statut_lecture: statusFilter || undefined,
        type_livre: typeFilter || undefined,
        show_favorite_only: showFavoriteOnly,
        show_hidden: showHidden
      };
      if (selectedGenres.length > 0) {
        filters.genres = selectedGenres;
      }
      const result = await window.electronAPI.booksGet?.(filters);
      const parsed: BookListItem[] = (result || []).map((book: BookListItem) => {
        // Convertir genres en tableau si nécessaire
        let genresArray: string[] = [];
        if (book.genres) {
          if (Array.isArray(book.genres)) {
            genresArray = book.genres;
          } else if (typeof book.genres === 'string') {
            try {
              const parsed = JSON.parse(book.genres);
              genresArray = Array.isArray(parsed) ? parsed : book.genres.split(',').map((g: string) => g.trim());
            } catch {
              genresArray = book.genres.split(',').map((g: string) => g.trim());
            }
          }
        }

        // Convertir auteurs en tableau si nécessaire (mais garder le type original pour BookListItem)
        let auteursArray: string[] = [];
        if (book.auteurs) {
          if (typeof book.auteurs === 'string') {
            try {
              const parsed = JSON.parse(book.auteurs);
              auteursArray = Array.isArray(parsed) ? parsed : [book.auteurs];
            } catch {
              auteursArray = [book.auteurs];
            }
          }
        } else if (book.auteur) {
          auteursArray = [book.auteur];
        }

        return {
          ...book,
          genres: genresArray.length > 0 ? genresArray.join(',') : null,
          auteurs: auteursArray.length > 0 ? auteursArray.join(',') : null
        };
      });
      setBooks(parsed);

      // Extraire les genres disponibles
      const allGenres = new Set<string>();
      parsed.forEach(book => {
        if (book.genres) {
          const genres = typeof book.genres === 'string'
            ? book.genres.split(',').map(g => g.trim())
            : Array.isArray(book.genres)
              ? book.genres
              : [];
          genres.forEach(g => allGenres.add(g));
        }
      });
      setAvailableGenres(Array.from(allGenres).sort());

      // Calculer les stats
      const stats: ProgressionStats = {};
      setBookStats(stats);
    } catch (error) {
      console.error('Erreur chargement livres:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de charger les livres',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, showFavoriteOnly, showHidden, selectedGenres, showToast]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleToggleFavorite = useCallback(async (bookId: number) => {
    try {
      await window.electronAPI.booksToggleFavorite?.({ bookId });
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, is_favorite: !b.is_favorite } : b));
      showToast({
        title: 'Favori modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le favori',
        type: 'error'
      });
    }
  }, [showToast]);

  const handleToggleHidden = useCallback(async (bookId: number) => {
    try {
      await window.electronAPI.booksToggleHidden?.({ bookId });
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, is_hidden: !b.is_hidden } : b));
      showToast({
        title: 'Visibilité modifiée',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur toggle hidden:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier la visibilité',
        type: 'error'
      });
    }
  }, [showToast]);

  const handleChangeStatus = useCallback(async (bookId: number, status: string) => {
    try {
      const result = await window.electronAPI.booksSetStatus?.({
        bookId,
        statut: status
      });
      if (result) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, statut_lecture: result.statut as 'À lire' | 'En cours' | 'Terminé' | 'Abandonné' | 'En pause' | null } : b));
      }
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur statut livre:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le statut',
        type: 'error'
      });
    }
  }, [showToast]);

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
    sortedItems: sortedBooks,
    hasActiveFilters
  } = useCollectionFilters({
    items: books,
    search,
    statusFilter,
    showFavoriteOnly,
    showHidden,
    showWatchlistOnly: false,
    sortBy,
    searchConfig: {
      getTitle: (b) => b.titre,
      getOriginalTitle: (b) => b.titre_original || '',
      getExternalId: (b) => b.id
    },
    filterConfig: {
      getIsHidden: (b) => !!b.is_hidden,
      getIsFavorite: (b) => !!b.is_favorite,
      getStatus: (b) => b.statut_lecture || 'À lire',
      getIsInWatchlist: () => false,
      customFilter: (book: BookListItem) => {
        // Filtre par type
        if (typeFilter && book.type_livre !== typeFilter) {
          return false;
        }
        // Filtre par genres
        if (selectedGenres.length > 0) {
          if (!book.genres) return false;
          const bookGenres = typeof book.genres === 'string'
            ? book.genres.split(',').map(g => g.trim())
            : Array.isArray(book.genres)
              ? book.genres
              : [];
          const hasAllGenres = selectedGenres.every(genre => bookGenres.includes(genre));
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
        'author-asc': {
          label: 'Auteur A-Z',
          compare: (a, b) => {
            const authorA = Array.isArray(a.auteurs) ? a.auteurs[0] || '' : (a.auteur || '');
            const authorB = Array.isArray(b.auteurs) ? b.auteurs[0] || '' : (b.auteur || '');
            return authorA.localeCompare(authorB);
          }
        },
        'date-desc': {
          label: 'Date ↓',
          compare: (a, b) => {
            const dateA = a.date_publication ? new Date(a.date_publication).getTime() : 0;
            const dateB = b.date_publication ? new Date(b.date_publication).getTime() : 0;
            return dateB - dateA;
          }
        }
      },
      defaultSort: 'title-asc'
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
    items: sortedBooks,
    defaultItemsPerPage: 50,
    storageKey: 'books-items-per-page',
    scrollStorageKey: 'collection.books.scroll'
  });

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setSelectedGenres([]);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="text"][placeholder^="Rechercher"]');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);
  }, [setSearch, setStatusFilter, setTypeFilter, setShowFavoriteOnly, setShowHidden, setSelectedGenres]);

  return (
    <>
      {ToastContainer}
      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadBooks();
            setShowAddModal(false);
          }}
        />
      )}

      {showHelpModal && (
        <SearchHelpModal
          isOpen={showHelpModal}
          config={BOOKS_SEARCH_HELP_CONFIG}
          onClose={() => setShowHelpModal(false)}
        />
      )}

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Collection Livres"
            icon="📖"
            count={books.length}
            countLabel={books.length > 1 ? 'livres' : 'livre'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un livre"
            extraButtons={(
              <button
                onClick={() => loadBooks()}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Recharger
              </button>
            )}
          />

          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="manga" stats={bookStats} />
          </div>

          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onOpenHelp={() => setShowHelpModal(true)}
          >
            <CollectionSearchBar
              placeholder="Rechercher un livre (titre, auteur, ISBN...)"
              searchTerm={search}
              onSearchChange={setSearch}
              onSubmit={() => undefined}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BookSortOption)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="title-asc">📖 Titre (A → Z)</option>
                <option value="title-desc">📖 Titre (Z → A)</option>
                <option value="date-desc">🗓️ Date de publication ↓</option>
                <option value="author-asc">👤 Auteur (A → Z)</option>
              </select>

              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="">📂 Tous les statuts</option>
                {BOOK_STATUS_OPTIONS.map((status) => {
                  const label = formatStatusLabel(status, { category: 'book' });
                  return (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <select
                className="select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as BookType | '')}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="">📚 Tous les types</option>
                {BOOK_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', marginTop: '12px' }}>
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
                label="👁️ Livres masqués"
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
                    📚 Filtrer par genres
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

          {sortedBooks.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              onFirstPage={goToFirstPage}
              onLastPage={goToLastPage}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              totalItems={sortedBooks.length}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Chargement...
            </div>
          ) : paginatedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              {hasActiveFilters ? 'Aucun livre ne correspond aux filtres' : 'Aucun livre dans la collection'}
            </div>
          ) : (
            <>
              <CollectionView
                items={paginatedItems}
                viewMode={viewMode}
                loading={loading}
                emptyMessage="Aucun livre trouvé."
                gridMinWidth={200}
                imageMinWidth={200}
                renderCard={(book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onClick={() => {
                      rememberScrollTarget('collection.books.scroll', book.id);
                      const currentPath = location.pathname + location.search;
                      navigate(`/books/${book.id}`, { state: { from: currentPath } });
                    }}
                    onToggleFavorite={() => handleToggleFavorite(book.id)}
                    onToggleHidden={() => handleToggleHidden(book.id)}
                    onChangeStatus={(status) => handleChangeStatus(book.id, status)}
                    imageOnly={viewMode === 'images'}
                  />
                )}
                renderListItem={(book) => (
                  <ListItem
                    key={book.id}
                    title={book.titre}
                    subtitle={book.auteurs || book.auteur || ''}
                    progression={null}
                    currentStatus={book.statut_lecture || 'À lire'}
                    availableStatuses={[...COMMON_STATUSES.BOOK]}
                    isFavorite={!!book.is_favorite}
                    isHidden={!!book.is_hidden}
                    badges={book.type_livre ? [book.type_livre] : undefined}
                    onClick={() => {
                      rememberScrollTarget('collection.books.scroll', book.id);
                      const currentPath = location.pathname + location.search;
                      navigate(`/books/${book.id}`, { state: { from: currentPath } });
                    }}
                    onToggleFavorite={() => handleToggleFavorite(book.id)}
                    onChangeStatus={(status) => handleChangeStatus(book.id, status)}
                    onToggleHidden={() => handleToggleHidden(book.id)}
                  />
                )}
              />

              {sortedBooks.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  onFirstPage={goToFirstPage}
                  onLastPage={goToLastPage}
                  onNextPage={goToNextPage}
                  onPreviousPage={goToPreviousPage}
                  canGoNext={canGoNext}
                  canGoPrevious={canGoPrevious}
                  totalItems={sortedBooks.length}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                />
              )}
            </>
          )}

          <BackToTopButton />
          <BackToBottomButton />
        </div>
      </div>
    </>
  );
}
