import { Grid3x3 } from 'lucide-react';
import { cloneElement, isValidElement, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';

type ViewMode = 'grid' | 'list' | 'images';

// Interface pour les propriétés optionnelles des items
interface ItemWithStatus {
  statut_visionnage?: string;
  statut_lecture?: string;
  statut_perso?: string;
  is_favorite?: boolean | number;
}

interface CollectionViewProps<T> {
  items: T[];
  viewMode: ViewMode;
  renderCard: (item: T, onUpdate?: () => void) => React.ReactNode;
  renderListItem?: (item: T, onUpdate?: () => void) => React.ReactNode;
  onUpdate?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  gridMinWidth?: number;
  imageMinWidth?: number;
  // Mode sélection multiple
  isSelectionMode?: boolean;
  isItemSelected?: (id: number | string) => boolean;
  onToggleItemSelection?: (id: number | string) => void;
}

// Fonction helper pour générer une clé unique pour un item
function generateItemKey<T extends { id: number | string }>(item: T & Partial<ItemWithStatus>): string {
  const status = item.statut_visionnage || item.statut_lecture || item.statut_perso;
  const favorite = item.is_favorite ? 'fav' : 'no-fav';
  // Inclure videoType si présent (pour la page Videos qui combine animes, films et séries)
  const videoType = (item as any).videoType ? `-${(item as any).videoType}` : '';
  return status ? `${item.id}-${status}-${favorite}${videoType}` : `${item.id}${videoType}`;
}

export default function CollectionView<T extends { id: number | string }>({
  items,
  viewMode,
  renderCard,
  renderListItem,
  onUpdate,
  loading = false,
  emptyMessage = 'Aucun élément dans votre collection',
  emptyIcon,
  gridMinWidth = 360,
  imageMinWidth = 200,
  isSelectionMode = false,
  isItemSelected,
  onToggleItemSelection
}: CollectionViewProps<T>) {
  // Mémoriser les styles pour éviter les recalculs
  const gridStyle = useMemo(() => ({
    display: 'grid' as const,
    gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))`,
    gap: '12px',
    overflow: 'visible' as const,
    position: 'relative' as const,
    alignItems: 'stretch' as const // Force toutes les cartes dans une ligne à avoir la même hauteur
  }), [gridMinWidth]);

  const listStyle = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '12px'
  }), []);

  const imagesStyle = useMemo(() => ({
    display: 'grid' as const,
    gridTemplateColumns: `repeat(auto-fill, minmax(${imageMinWidth}px, 1fr))`,
    gap: '16px',
    padding: '20px',
    overflow: 'visible' as const,
    position: 'relative' as const
  }), [imageMinWidth]);

  const emptyStateStyle = useMemo(() => ({
    textAlign: 'center' as const,
    padding: '60px 20px',
    background: 'var(--surface)',
    borderRadius: '16px'
  }), []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (items.length === 0) {
    return (
      <div style={emptyStateStyle}>
        {emptyIcon || <Grid3x3 size={64} style={{ color: 'var(--text-secondary)', margin: '0 auto 24px' }} />}
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Contenu selon le mode de vue */}
      {viewMode === 'grid' && (
        <div style={gridStyle}>
          {items.map((item) => {
            const itemKey = generateItemKey(item as T & Partial<ItemWithStatus>);
            const selected = isSelectionMode && isItemSelected ? isItemSelected(item.id) : false;
            return (
              <div
                key={itemKey}
                data-scroll-id={String(item.id)}
                style={{
                  display: 'flex',
                  height: '100%',
                  position: 'relative'
                }}
              >
                {isSelectionMode && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '48px',
                      zIndex: 10,
                      background: 'var(--surface)',
                      borderRadius: '4px',
                      padding: '4px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleItemSelection?.(item.id)}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary)'
                      }}
                    />
                  </div>
                )}
                {renderCard(item, onUpdate)}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div style={listStyle}>
          {items.map((item) => {
            const itemKey = generateItemKey(item as T & Partial<ItemWithStatus>);
            const selected = isSelectionMode && isItemSelected ? isItemSelected(item.id) : false;
            return (
              <div
                key={itemKey}
                data-scroll-id={String(item.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                {isSelectionMode && (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleItemSelection?.(item.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary)',
                      flexShrink: 0
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  {renderListItem ? renderListItem(item, onUpdate) : renderCard(item, onUpdate)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode Images uniquement */}
      {viewMode === 'images' && (
        <div style={imagesStyle}>
          {items.map((item) => {
            const itemKey = generateItemKey(item as T & Partial<ItemWithStatus>);
            const selected = isSelectionMode && isItemSelected ? isItemSelected(item.id) : false;
            const card = renderCard(item, onUpdate);
            // Cloner l'élément et ajouter imageOnly pour mode images
            const enhancedCard = isValidElement(card)
              ? cloneElement(card as React.ReactElement<{ imageOnly?: boolean }>, {
                imageOnly: true
              })
              : card;

            return (
              <div
                key={itemKey}
                data-scroll-id={String(item.id)}
                style={{
                  position: 'relative'
                }}
              >
                {isSelectionMode && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '48px',
                      zIndex: 10,
                      background: 'var(--surface)',
                      borderRadius: '4px',
                      padding: '4px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleItemSelection?.(item.id)}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary)'
                      }}
                    />
                  </div>
                )}
                {enhancedCard}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
