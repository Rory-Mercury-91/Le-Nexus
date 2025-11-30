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
import AddBdModal from '../../components/modals/lectures/AddBdModal';
import { useCollectionViewMode } from '../../hooks/collections/useCollectionViewMode';
import { usePagination } from '../../hooks/collections/usePagination';
import { useCollectionFilters } from '../../hooks/common/useCollectionFilters';
import { usePersistentState } from '../../hooks/common/usePersistentState';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import { Serie } from '../../types';
import { getSerieStatusLabel } from '../../utils/manga-status';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';

const BD_STATUS_OPTIONS = COMMON_STATUSES.MANGA;
const BD_SORT_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'author-asc'] as const;
type BdSortOption = typeof BD_SORT_OPTIONS[number];
const BD_SORT_SET = new Set<string>(BD_SORT_OPTIONS);
const isBdSortOption = (value: unknown): value is BdSortOption =>
  typeof value === 'string' && BD_SORT_SET.has(value);
const BD_STATUS_SET = new Set<string>(BD_STATUS_OPTIONS);
const isBdStatusFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || BD_STATUS_SET.has(value));

export default function Bd() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [bds, setBds] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>(
    'collection.bd.search',
    '',
    { storage: 'session' }
  );
  const [sortBy, setSortBy] = usePersistentState<BdSortOption>(
    'collection.bd.sortBy',
    'title-asc',
    { validator: isBdSortOption, storage: 'session' }
  );
  const [statusFilter, setStatusFilter] = usePersistentState<string>(
    'collection.bd.statusFilter',
    '',
    { validator: isBdStatusFilter, storage: 'session' }
  );
  const [showFavoriteOnly, setShowFavoriteOnly] = usePersistentState<boolean>(
    'collection.bd.filters.showFavoriteOnly',
    false,
    { storage: 'session' }
  );
  const [showHidden, setShowHidden] = usePersistentState<boolean>(
    'collection.bd.filters.showHidden',
    false,
    { storage: 'session' }
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, handleViewModeChange] = useCollectionViewMode('mangas');
  const [bdStats, setBdStats] = useState<ProgressionStats>({});

  useScrollRestoration('collection.bd.scroll', !loading);

  const loadBds = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {
        search,
        statut: statusFilter || undefined,
        media_type: 'BD'
      };
      const result = await window.electronAPI.getSeries?.(filters);
      // Filtrer côté client pour garantir que seules les BD sont affichées
      const parsed = (result || []).filter((serie: Serie) =>
        serie.media_type && serie.media_type.toLowerCase().trim() === 'bd'
      );
      setBds(parsed);

      // Calculer les stats
      const stats: ProgressionStats = {
        seriesEnCours: parsed.filter(s => getSerieStatusLabel(s) === 'En cours').length,
        seriesTerminees: parsed.filter(s => getSerieStatusLabel(s) === 'Terminé').length
      };
      setBdStats(stats);
    } catch (error) {
      console.error('Erreur chargement BD:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de charger les BD',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    loadBds();
  }, [loadBds]);

  const handleToggleFavorite = useCallback(async (serieId: number) => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      if (currentUser) {
        const users = await window.electronAPI.getAllUsers();
        const user = users.find((u) => u.name === currentUser);
        if (user) {
          await window.electronAPI.toggleSerieFavorite(serieId, user.id);
          setBds(prev => prev.map(s => s.id === serieId ? { ...s, is_favorite: !s.is_favorite } : s));
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
      const isHidden = bds.find(s => s.id === serieId)?.is_masquee;
      if (isHidden) {
        await window.electronAPI.demasquerSerie(serieId);
      } else {
        await window.electronAPI.masquerSerie(serieId);
      }
      setBds(prev => prev.map(s => s.id === serieId ? { ...s, is_masquee: !s.is_masquee } : s));
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
  }, [bds, showToast]);

  const {
    sortedItems: sortedBds,
    hasActiveFilters
  } = useCollectionFilters({
    items: bds,
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
    items: sortedBds,
    defaultItemsPerPage: 50,
    storageKey: 'bd-items-per-page',
    scrollStorageKey: 'collection.bd.scroll'
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
        <AddBdModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadBds();
            setShowAddModal(false);
          }}
        />
      )}

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <CollectionHeader
            title="Collection BD"
            icon="📗"
            count={bds.length}
            countLabel={bds.length > 1 ? 'BD' : 'BD'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter une BD"
            extraButtons={(
              <button
                onClick={() => loadBds()}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Recharger
              </button>
            )}
          />

          <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <ProgressionHeader type="manga" stats={bdStats} />
          </div>

          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          >
            <CollectionSearchBar
              placeholder="Rechercher une BD (titre, auteur...)"
              searchTerm={search}
              onSearchChange={setSearch}
              onSubmit={() => undefined}
              showSubmitButton={false}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BdSortOption)}
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
                {BD_STATUS_OPTIONS.map((status) => {
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
                label="👁️ BD masquées"
                icon="👁️"
                activeColor="#fb923c"
              />
            </div>
          </CollectionFiltersBar>

          {sortedBds.length > 0 && (
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
              totalItems={sortedBds.length}
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
              {hasActiveFilters ? 'Aucune BD ne correspond aux filtres' : 'Aucune BD dans la collection'}
            </div>
          ) : (
            <>
              <CollectionView
                items={paginatedItems}
                viewMode={viewMode}
                loading={loading}
                emptyMessage="Aucune BD trouvée."
                gridMinWidth={200}
                imageMinWidth={200}
                renderCard={(bd) => (
                  <MangaCard
                    key={bd.id}
                    serie={bd}
                    onClick={() => {
                      rememberScrollTarget('collection.bd.scroll', bd.id);
                      const currentPath = location.pathname + location.search;
                      navigate(`/serie/${bd.id}`, { state: { from: currentPath } });
                    }}
                    onToggleFavorite={() => handleToggleFavorite(bd.id)}
                    onChangeStatus={async (status: string) => {
                      // TODO: Implémenter le changement de statut pour les BD
                      console.log('Changement de statut:', status);
                    }}
                    onToggleHidden={() => handleToggleHidden(bd.id)}
                    imageOnly={viewMode === 'images'}
                  />
                )}
                renderListItem={(bd) => {
                  const volumesLus = bd.volumes_lus || 0;
                  const nbTomes = bd.tomes?.length || 0;
                  const progression = nbTomes > 0 ? Math.round((volumesLus / nbTomes) * 100) : null;

                  return (
                    <ListItem
                      key={bd.id}
                      title={bd.titre}
                      subtitle={bd.auteurs || ''}
                      progression={progression}
                      currentStatus={getSerieStatusLabel(bd)}
                      availableStatuses={[...COMMON_STATUSES.MANGA]}
                      isFavorite={!!bd.is_favorite}
                      isHidden={!!bd.is_masquee}
                      onClick={() => {
                        rememberScrollTarget('collection.bd.scroll', bd.id);
                        const currentPath = location.pathname + location.search;
                        navigate(`/serie/${bd.id}`, { state: { from: currentPath } });
                      }}
                      onToggleFavorite={() => handleToggleFavorite(bd.id)}
                      onChangeStatus={async (status: string) => {
                        // TODO: Implémenter le changement de statut pour les BD
                        console.log('Changement de statut:', status);
                      }}
                      onToggleHidden={() => handleToggleHidden(bd.id)}
                    />
                  );
                }}
              />

              {sortedBds.length > 0 && (
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
                  totalItems={sortedBds.length}
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
