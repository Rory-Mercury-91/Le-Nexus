import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import AddComicModal from '../../components/modals/lectures/AddComicModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { Serie } from '../../types';
import { getSerieStatusLabel } from '../../utils/manga-status';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';

const COMIC_STATUS_OPTIONS = COMMON_STATUSES.MANGA;
const COMIC_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'author-asc'] as const;
type ComicSortOption = typeof COMIC_SORT_OPTIONS[number];
const COMIC_SORT_SET = new Set<string>(COMIC_SORT_OPTIONS);
const isComicSortOption = (value: unknown): value is ComicSortOption =>
  typeof value === 'string' && COMIC_SORT_SET.has(value);
const COMIC_STATUS_SET = new Set<string>(COMIC_STATUS_OPTIONS);
const isComicStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || COMIC_STATUS_SET.has(value));

export default function Comics() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [comics, setComics] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>(
    'collection.comics.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<ComicSortOption>(
    'collection.comics.sortBy',
    'title-asc',
    { validator: isComicSortOption, storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    'collection.comics.statusFilter',
    '',
    { validator: isComicStatusFilter, storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.comics.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.comics.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, handleViewModeChange] = useCollectionViewMode('mangas');
  const [comicStats, setComicStats] = useState<ProgressionStats>({});

  useScrollRestoration('collection.comics.scroll', !loading);

  const loadComics = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {
        search,
        statut: statusFilter || undefined,
        media_type: 'Comic'
      };
      const result = await window.electronAPI.getSeries?.(filters);
      // Filtrer côté client pour garantir que seuls les Comics sont affichés
      const parsed = (result || []).filter((serie: Serie) =>
        serie.media_type && serie.media_type.toLowerCase().trim() === 'comic'
      );
      setComics(parsed);

      // Calculer les stats
      const stats: ProgressionStats = {
        seriesEnCours: parsed.filter(s => getSerieStatusLabel(s) === 'En cours').length,
        seriesTerminees: parsed.filter(s => getSerieStatusLabel(s) === 'Terminé').length
      };
      setComicStats(stats);
    } catch (error) {
      console.error('Erreur chargement Comics:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de charger les Comics',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    loadComics();
  }, [loadComics]);

  const handleToggleFavorite = useCallback(async (serieId: number) => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      if (currentUser) {
        const users = await window.electronAPI.getAllUsers();
        const user = users.find((u) => u.name === currentUser);
        if (user) {
          await window.electronAPI.toggleSerieFavorite(serieId, user.id);
          setComics(prev => prev.map(s => s.id === serieId ? { ...s, is_favorite: !s.is_favorite } : s));
          showToast({
            title: 'Favori modifié',
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Erreur toggle favorite:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le favori',
        type: 'error'
      });
    }
  }, [showToast]);

  const handleToggleHidden = useCallback(async (serieId: number) => {
    try {
      const isHidden = comics.find(s => s.id === serieId)?.is_masquee;
      if (isHidden) {
        await window.electronAPI.demasquerSerie(serieId);
      } else {
        await window.electronAPI.masquerSerie(serieId);
      }
      setComics(prev => prev.map(s => s.id === serieId ? { ...s, is_masquee: !s.is_masquee } : s));
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
  }, [comics, showToast]);

  const {
    sortedItems: sortedComics,
    hasActiveFilters
  } = useCollectionFilters({
    items: comics,
    search,
    statusFilter,
    showFavoriteOnly,
    showHidden,
    showWatchlistOnly: false,
    sortBy,
    searchConfig: {
      getTitle: (s) => s.titre,
      getOriginalTitle: (s) => s.titre_romaji || s.titre_anglais || '',
      getExternalId: (s) => s.mal_id ? parseInt(s.mal_id.toString(), 10) : null
    },
    filterConfig: {
      getIsHidden: (s) => !!s.is_masquee,
      getIsFavorite: (s) => !!s.is_favorite,
      getStatus: (s) => getSerieStatusLabel(s),
      getIsInWatchlist: () => false
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
            const authorA = a.auteurs || '';
            const authorB = b.auteurs || '';
            return authorA.localeCompare(authorB);
          }
        },
        'date-desc': {
          label: 'Date ↓',
          compare: (a, b) => {
            const dateA = a.date_debut ? new Date(a.date_debut).getTime() : 0;
            const dateB = b.date_debut ? new Date(b.date_debut).getTime() : 0;
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
    items: sortedComics,
    defaultItemsPerPage: 50,
    storageKey: 'comics-items-per-page',
    scrollStorageKey: 'collection.comics.scroll'
  });

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setShowFavoriteOnly(false);
    setShowHidden(false);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="text"][placeholder^="Rechercher"]');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);
  }, [setSearch, setStatusFilter, setShowFavoriteOnly, setShowHidden]);

  return (
    <>
      {ToastContainer}
      {showAddModal && (
        <AddComicModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadComics();
            setShowAddModal(false);
          }}
        />
      )}

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Collection Comics"
            icon="🦸"
            count={comics.length}
            countLabel={comics.length > 1 ? 'comics' : 'comic'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un comic"
            extraButtons={(
              <button
                onClick={() => loadComics()}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Recharger
              </button>
            )}
          />

          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="manga" stats={comicStats} />
          </div>

          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          >
            <CollectionSearchBar
              placeholder="Rechercher un comic (titre, auteur...)"
              searchTerm={search}
              onSearchChange={setSearch}
              onSubmit={() => undefined}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ComicSortOption)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="title-asc">📖 Titre (A → Z)</option>
                <option value="title-desc">📖 Titre (Z → A)</option>
                <option value="date-desc">🗓️ Date ↓</option>
                <option value="author-asc">👤 Auteur (A → Z)</option>
              </select>

              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', flex: '0 0 auto' }}
              >
                <option value="">📂 Tous les statuts</option>
                {COMIC_STATUS_OPTIONS.map((status) => {
                  const label = formatStatusLabel(status, { category: 'manga' });
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
                checked={showFavoriteOnly}
                onChange={setShowFavoriteOnly}
                label="❤️ Favoris"
                icon="❤️"
                activeColor="var(--error)"
              />
              <FilterToggle
                checked={showHidden}
                onChange={setShowHidden}
                label="👁️ Comics masqués"
                icon="👁️"
                activeColor="#fb923c"
              />
            </div>
          </CollectionFiltersBar>

          {sortedComics.length > 0 && (
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
              totalItems={sortedComics.length}
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
              {hasActiveFilters ? 'Aucun comic ne correspond aux filtres' : 'Aucun comic dans la collection'}
            </div>
          ) : (
            <>
              <CollectionView
                items={paginatedItems}
                viewMode={viewMode}
                loading={loading}
                emptyMessage="Aucun comic trouvé."
                gridMinWidth={200}
                imageMinWidth={200}
                renderCard={(comic) => (
                  <MangaCard
                    key={comic.id}
                    serie={comic}
                    onClick={() => {
                      rememberScrollTarget('collection.comics.scroll', comic.id);
                      const currentPath = location.pathname + location.search;
                      navigate(`/serie/${comic.id}`, { state: { from: currentPath } });
                    }}
                    onToggleFavorite={() => handleToggleFavorite(comic.id)}
                    onChangeStatus={async (status: string) => {
                      // TODO: Implémenter le changement de statut pour les comics
                      console.log('Changement de statut:', status);
                    }}
                    onToggleHidden={() => handleToggleHidden(comic.id)}
                    imageOnly={viewMode === 'images'}
                  />
                )}
                renderListItem={(comic) => {
                  const volumesLus = comic.volumes_lus || 0;
                  const nbTomes = comic.tomes?.length || 0;
                  const progression = nbTomes > 0 ? Math.round((volumesLus / nbTomes) * 100) : null;

                  return (
                    <ListItem
                      key={comic.id}
                      title={comic.titre}
                      subtitle={comic.auteurs || ''}
                      progression={progression}
                      currentStatus={getSerieStatusLabel(comic)}
                      availableStatuses={[...COMMON_STATUSES.MANGA]}
                      isFavorite={!!comic.is_favorite}
                      isHidden={!!comic.is_masquee}
                      onClick={() => {
                        rememberScrollTarget('collection.comics.scroll', comic.id);
                        const currentPath = location.pathname + location.search;
                        navigate(`/serie/${comic.id}`, { state: { from: currentPath } });
                      }}
                      onToggleFavorite={() => handleToggleFavorite(comic.id)}
                      onChangeStatus={async (status: string) => {
                        // TODO: Implémenter le changement de statut pour les comics
                        console.log('Changement de statut:', status);
                      }}
                      onToggleHidden={() => handleToggleHidden(comic.id)}
                    />
                  );
                }}
              />

              {sortedComics.length > 0 && (
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
                  totalItems={sortedComics.length}
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
