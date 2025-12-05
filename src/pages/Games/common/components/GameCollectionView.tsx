import { Grid3x3 } from 'lucide-react';
import { useMemo } from 'react';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';

interface ItemWithStatus {
  statut_perso?: string;
  is_favorite?: boolean | number;
}

interface GameCollectionViewProps<T extends { id: number | string }> {
  items: T[];
  viewMode: 'grid' | 'list';
  renderCard: (item: T) => React.ReactNode;
  renderListItem?: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  /** Largeur fixe de chaque tuile en pixels */
  cardWidth?: number;
  /** Hauteur fixe de chaque tuile en pixels */
  cardHeight?: number;
}

// Fonction helper pour générer une clé unique pour un item
function generateItemKey<T extends { id: number | string }>(item: T & Partial<ItemWithStatus>): string {
  const status = item.statut_perso;
  const favorite = item.is_favorite ? 'fav' : 'no-fav';
  return status ? `${item.id}-${status}-${favorite}` : `${item.id}`;
}

export default function GameCollectionView<T extends { id: number | string }>({
  items,
  viewMode,
  renderCard,
  renderListItem,
  loading = false,
  emptyMessage = 'Aucun jeu dans votre collection',
  emptyIcon,
  cardWidth = 320,
  cardHeight = 480
}: GameCollectionViewProps<T>) {
  // Grille avec 3 colonnes fixes qui remplissent toute la largeur
  const gridStyle = useMemo(() => {
    // Utiliser minmax pour garantir une largeur minimale tout en permettant l'expansion
    // Cela garantit exactement 3 colonnes qui se répartissent uniformément
    return {
      display: 'grid' as const,
      gridTemplateColumns: `repeat(3, minmax(${cardWidth}px, 1fr))`,
      gap: '16px',
      overflow: 'visible' as const,
      position: 'relative' as const,
      width: '100%'
    };
  }, [cardWidth]);

  const listStyle = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '12px'
  }), []);

  const emptyStateStyle = useMemo(() => ({
    textAlign: 'center' as const,
    padding: '60px 20px',
    background: 'var(--surface)',
    borderRadius: '16px'
  }), []);

  const cardContainerStyle = useMemo(() => ({
    width: '100%',
    height: `${cardHeight}px`,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    position: 'relative' as const
  }), [cardHeight]);

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
            return (
              <div
                key={itemKey}
                data-scroll-id={String(item.id)}
                style={cardContainerStyle}
              >
                {renderCard(item)}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div style={listStyle}>
          {items.map((item) => {
            const itemKey = generateItemKey(item as T & Partial<ItemWithStatus>);
            return (
              <div key={itemKey} data-scroll-id={String(item.id)}>
                {renderListItem ? renderListItem(item) : renderCard(item)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
