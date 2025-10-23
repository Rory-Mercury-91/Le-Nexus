import { Grid3x3, LayoutGrid, List, Maximize2 } from 'lucide-react';
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react';

type ViewMode = 'grid' | 'carousel' | 'list' | 'presentation';

interface CollectionViewProps<T> {
  items: T[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  renderCard: (item: T, onUpdate?: () => void) => React.ReactNode;
  renderListItem?: (item: T, onUpdate?: () => void) => React.ReactNode;
  onUpdate?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  gridColumns?: 2 | 3 | 4 | 5 | 6;
}

export default function CollectionView<T extends { id: number | string }>({
  items,
  viewMode: controlledViewMode,
  onViewModeChange,
  renderCard,
  renderListItem,
  onUpdate,
  loading = false,
  emptyMessage = 'Aucun élément dans votre collection',
  emptyIcon,
  gridColumns = 4
}: CollectionViewProps<T>) {
  // État local du mode de vue (utilisé si non contrôlé)
  const [localViewMode, setLocalViewMode] = useState<ViewMode>('grid');
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Utiliser le mode contrôlé si fourni, sinon utiliser l'état local
  const viewMode = controlledViewMode || localViewMode;
  
  const handleViewModeChange = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setLocalViewMode(mode);
    }
  };

  // Charger le mode de vue depuis localStorage au montage
  useEffect(() => {
    if (!controlledViewMode) {
      const savedMode = localStorage.getItem('collectionViewMode') as ViewMode;
      if (savedMode) {
        setLocalViewMode(savedMode);
      }
    }
  }, [controlledViewMode]);

  // Sauvegarder le mode de vue dans localStorage quand il change
  useEffect(() => {
    if (!controlledViewMode) {
      localStorage.setItem('collectionViewMode', viewMode);
    }
  }, [viewMode, controlledViewMode]);

  // Gérer le scroll horizontal avec la molette (mode non-passif)
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || viewMode !== 'carousel') return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Multiplier par 3 pour un scroll plus rapide et réactif
      carousel.scrollBy({ left: e.deltaY * 3, behavior: 'smooth' });
    };

    // Effet 3D sur les cartes lors du scroll
    const handleScroll3D = () => {
      const cards = carousel.querySelectorAll('.carousel-card');
      const containerRect = carousel.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        
        // Distance du centre du conteneur (-1 à gauche, 0 au centre, +1 à droite)
        const distanceFromCenter = (cardCenter - containerCenter) / (containerRect.width / 2);
        
        // Effet 3D plus prononcé et fluide
        const rotateY = distanceFromCenter * 45; // Rotation augmentée à ±45deg
        const scale = 1 - Math.abs(distanceFromCenter) * 0.25; // Scale réduit à 0.75
        const translateZ = -Math.abs(distanceFromCenter) * 150; // Plus de profondeur
        const translateX = distanceFromCenter * 30; // Décalage horizontal
        const opacity = 1 - Math.abs(distanceFromCenter) * 0.5; // Fade plus marqué
        
        (card as HTMLElement).style.transform = `
          rotateY(${rotateY}deg)
          scale(${Math.max(scale, 0.75)})
          translateZ(${translateZ}px)
          translateX(${translateX}px)
        `;
        (card as HTMLElement).style.opacity = `${Math.max(opacity, 0.5)}`;
        (card as HTMLElement).style.filter = `blur(${Math.abs(distanceFromCenter) * 2}px)`;
      });
    };

    carousel.addEventListener('wheel', handleWheel, { passive: false });
    carousel.addEventListener('scroll', handleScroll3D);
    
    // Appliquer l'effet initial
    handleScroll3D();
    
    return () => {
      carousel.removeEventListener('wheel', handleWheel);
      carousel.removeEventListener('scroll', handleScroll3D);
    };
  }, [viewMode]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
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
      {/* Sélecteur de vue */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => handleViewModeChange('grid')}
          className={viewMode === 'grid' ? 'btn btn-primary' : 'btn'}
          style={{ padding: '8px 16px' }}
          title="Vue grille"
        >
          <Grid3x3 size={18} />
        </button>
        <button
          onClick={() => handleViewModeChange('carousel')}
          className={viewMode === 'carousel' ? 'btn btn-primary' : 'btn'}
          style={{ padding: '8px 16px' }}
          title="Vue carrousel"
        >
          <LayoutGrid size={18} />
        </button>
        <button
          onClick={() => handleViewModeChange('list')}
          className={viewMode === 'list' ? 'btn btn-primary' : 'btn'}
          style={{ padding: '8px 16px' }}
          title="Vue liste"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => handleViewModeChange('presentation')}
          className={viewMode === 'presentation' ? 'btn btn-primary' : 'btn'}
          style={{ padding: '8px 16px' }}
          title="Mode présentation"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Contenu selon le mode de vue */}
      {viewMode === 'grid' && (
        <div className={`grid grid-${gridColumns}`}>
          {items.map((item) => (
            <div key={item.id}>
              {renderCard(item, onUpdate)}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'carousel' && (
        <div style={{ position: 'relative' }}>
          {/* Flèche gauche */}
          <button
            onClick={() => {
              const container = document.getElementById('carousel-container');
              if (container) container.scrollBy({ left: -320, behavior: 'smooth' }); // 280px carte + 40px gap
            }}
            style={{
              position: 'absolute',
              left: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '2px solid var(--primary)',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
          >
            ‹
          </button>

          {/* Flèche droite */}
          <button
            onClick={() => {
              const container = document.getElementById('carousel-container');
              if (container) container.scrollBy({ left: 320, behavior: 'smooth' }); // 280px carte + 40px gap
            }}
            style={{
              position: 'absolute',
              right: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '2px solid var(--primary)',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
          >
            ›
          </button>

          <div
            id="carousel-container"
            ref={carouselRef}
            style={{
              display: 'flex',
              gap: '40px',
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: '40px calc(50% - 140px) 60px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--primary) var(--surface)',
              perspective: '1200px',
              perspectiveOrigin: 'center center',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth'
            }}
          >
            {items.map((item) => (
              <div 
                key={item.id} 
                className="carousel-card"
                style={{
                  minWidth: '280px',
                  maxWidth: '280px',
                  flexShrink: 0,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, filter 0.15s ease-out',
                  willChange: 'transform, opacity, filter',
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always'
                }}
              >
                {renderCard(item, onUpdate)}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {items.map((item) => (
            <div key={item.id}>
              {renderListItem ? renderListItem(item, onUpdate) : renderCard(item, onUpdate)}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'presentation' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '40px',
          padding: '20px'
        }}>
          {items.map((item) => {
            const card = renderCard(item, onUpdate);
            // Cloner l'élément et ajouter imageObjectFit='contain' + presentationMode pour mode présentation
            const enhancedCard = isValidElement(card)
              ? cloneElement(card as React.ReactElement<any>, { 
                  imageObjectFit: 'contain',
                  presentationMode: true
                })
              : card;
            
            return (
              <div key={item.id} style={{
                transform: 'scale(1)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {enhancedCard}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
