import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Children, useEffect, useRef, useState } from 'react';

interface SimpleCarouselProps {
  children: React.ReactNode | React.ReactNode[];
  cardWidth?: number;
  gap?: number;
}

export default function SimpleCarousel({ children, cardWidth = 160, gap = 12 }: SimpleCarouselProps) {
  const childArray = Children.toArray(children);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      // Vérifier aussi au resize
      window.addEventListener('resize', checkScrollability);
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [childArray]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = cardWidth + gap;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (!childArray || childArray.length === 0) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bouton précédent */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          style={{
            position: 'absolute',
            left: '-16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            transition: 'opacity 0.2s ease, background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
          }}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Conteneur de défilement */}
      <div
        ref={scrollContainerRef}
        className="simple-carousel-container"
        style={{
          display: 'flex',
          gap: `${gap}px`,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          padding: '4px 0',
          WebkitOverflowScrolling: 'touch'
        }}
        onScroll={checkScrollability}
      >
        {childArray.map((child, index) => (
          <div
            key={index}
            style={{
              flexShrink: 0,
              width: `${cardWidth}px`
            }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Bouton suivant */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          style={{
            position: 'absolute',
            right: '-16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            transition: 'opacity 0.2s ease, background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
          }}
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
