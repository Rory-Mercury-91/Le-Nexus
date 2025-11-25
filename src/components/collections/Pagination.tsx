import { ChevronLeft, ChevronRight, Grid3x3, Image, List } from 'lucide-react';
import { ItemsPerPage } from '../../hooks/collections/usePagination';

type ViewMode = 'grid' | 'list' | 'images';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number | 'all';
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: ItemsPerPage) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hideImageView?: boolean;
  hideItemsPerPageSelect?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  canGoNext,
  canGoPrevious,
  viewMode,
  onViewModeChange,
  hideImageView = false,
  hideItemsPerPageSelect = false
}: PaginationProps) {
  const pageSize = itemsPerPage === 'all' ? totalItems : itemsPerPage;
  const startItem = itemsPerPage === 'all' ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = itemsPerPage === 'all' 
    ? totalItems 
    : Math.min(currentPage * pageSize, totalItems);
  const showItemsPerPageSelect = !hideItemsPerPageSelect && typeof onItemsPerPageChange === 'function';

  if (totalItems === 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '16px 20px',
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      flexWrap: 'wrap',
      marginBottom: 0
    }}>
      {/* Informations */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: 'var(--text-secondary)'
      }}>
        <span>
          {startItem}-{endItem} sur {totalItems}
        </span>
        {totalPages > 1 && (
          <span>•</span>
        )}
        {totalPages > 1 && (
          <span>
            Page {currentPage} sur {totalPages}
          </span>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Boutons de changement de vue */}
        {viewMode && onViewModeChange && (
          <div style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => onViewModeChange('grid')}
              className={viewMode === 'grid' ? 'btn btn-primary' : 'btn'}
              style={{
                padding: '6px 10px',
                minWidth: 'auto'
              }}
              title="Vue grille"
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={viewMode === 'list' ? 'btn btn-primary' : 'btn'}
              style={{
                padding: '6px 10px',
                minWidth: 'auto'
              }}
              title="Vue liste"
            >
              <List size={16} />
            </button>
            {!hideImageView && (
              <button
                onClick={() => onViewModeChange('images')}
                className={viewMode === 'images' ? 'btn btn-primary' : 'btn'}
                style={{
                  padding: '6px 10px',
                  minWidth: 'auto'
                }}
                title="Images uniquement"
              >
                <Image size={16} />
              </button>
            )}
          </div>
        )}

        {/* Sélecteur d'éléments par page */}
        {showItemsPerPageSelect && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <label style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}>
              Afficher :
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const value = e.target.value;
                if (!onItemsPerPageChange) {
                  return;
                }
                onItemsPerPageChange(value === 'all' ? 'all' : parseInt(value, 10) as ItemsPerPage);
              }}
              className="select"
              style={{
                minWidth: '100px',
                fontSize: '13px',
                padding: '6px 12px'
              }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Tout</option>
            </select>
          </div>
        )}

        {/* Contrôles de pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <button
              onClick={onFirstPage}
              disabled={!canGoPrevious}
              className="btn"
              style={{
                padding: '6px 10px',
                minWidth: 'auto',
                opacity: canGoPrevious ? 1 : 0.5,
                cursor: canGoPrevious ? 'pointer' : 'not-allowed'
              }}
              title="Première page"
            >
              <ChevronLeft size={16} style={{ marginRight: '4px' }} />
              <ChevronLeft size={16} />
            </button>
            
            <button
              onClick={onPreviousPage}
              disabled={!canGoPrevious}
              className="btn"
              style={{
                padding: '6px 10px',
                minWidth: 'auto',
                opacity: canGoPrevious ? 1 : 0.5,
                cursor: canGoPrevious ? 'pointer' : 'not-allowed'
              }}
              title="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Sélecteur de page direct */}
            <select
              value={currentPage}
              onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
              className="select"
              style={{
                minWidth: '70px',
                fontSize: '13px',
                padding: '6px 12px',
                textAlign: 'center'
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>

            <button
              onClick={onNextPage}
              disabled={!canGoNext}
              className="btn"
              style={{
                padding: '6px 10px',
                minWidth: 'auto',
                opacity: canGoNext ? 1 : 0.5,
                cursor: canGoNext ? 'pointer' : 'not-allowed'
              }}
              title="Page suivante"
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={onLastPage}
              disabled={!canGoNext}
              className="btn"
              style={{
                padding: '6px 10px',
                minWidth: 'auto',
                opacity: canGoNext ? 1 : 0.5,
                cursor: canGoNext ? 'pointer' : 'not-allowed'
              }}
              title="Dernière page"
            >
              <ChevronRight size={16} />
              <ChevronRight size={16} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
