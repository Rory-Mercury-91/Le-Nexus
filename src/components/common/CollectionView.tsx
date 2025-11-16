import { Grid3x3 } from 'lucide-react';
import { cloneElement, isValidElement } from 'react';
import LoadingSpinner from './LoadingSpinner';

type ViewMode = 'grid' | 'list' | 'images';

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
  imageMinWidth = 200
}: CollectionViewProps<T>) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (items.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'var(--surface)',
        borderRadius: '16px'
      }}>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))`,
          gap: '12px',
          overflow: 'visible',
          position: 'relative'
        }}>
          {items.map((item) => {
            // Créer une clé unique basée sur l'id et les propriétés qui peuvent changer
            const itemKey = (item as any).statut_visionnage || (item as any).statut_lecture || (item as any).statut_perso
              ? `${item.id}-${(item as any).statut_visionnage || (item as any).statut_lecture || (item as any).statut_perso}-${(item as any).is_favorite || false}`
              : item.id;
            return (
              <div key={itemKey} data-scroll-id={String(item.id)}>
                {renderCard(item, onUpdate)}
              </div>
            );
          })}
        </div>
      )}


      {viewMode === 'list' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {items.map((item) => {
            // Créer une clé unique basée sur l'id et les propriétés qui peuvent changer
            const itemKey = (item as any).statut_visionnage || (item as any).statut_lecture || (item as any).statut_perso
              ? `${item.id}-${(item as any).statut_visionnage || (item as any).statut_lecture || (item as any).statut_perso}-${(item as any).is_favorite || false}`
              : item.id;
            return (
              <div key={itemKey} data-scroll-id={String(item.id)}>
                {renderListItem ? renderListItem(item, onUpdate) : renderCard(item, onUpdate)}
              </div>
            );
          })}
        </div>
      )}


      {/* Mode Images uniquement */}
      {viewMode === 'images' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${imageMinWidth}px, 1fr))`,
          gap: '16px',
          padding: '20px',
          overflow: 'visible',
          position: 'relative'
        }}>
          {items.map((item) => {
            // Créer une clé unique basée sur l'id et les propriétés qui peuvent changer
            const itemKey = (item as any).statut_visionnage || (item as any).statut_lecture || (item as any).statut_perso
              ? `${item.id}-${(item as any).statut_visionnage || (item as any).statut_lecture || (item as any).statut_perso}-${(item as any).is_favorite || false}`
              : item.id;
            const card = renderCard(item, onUpdate);
            // Cloner l'élément et ajouter imageOnly pour mode images
            const enhancedCard = isValidElement(card)
              ? cloneElement(card as React.ReactElement<any>, { 
                  imageOnly: true
                })
              : card;
            
            return (
              <div key={itemKey} data-scroll-id={String(item.id)}>
                {enhancedCard}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
