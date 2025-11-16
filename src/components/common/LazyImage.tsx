import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string | null;
  alt: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  placeholder?: React.ReactNode;
  threshold?: number;
}

/**
 * Composant d'image avec chargement différé (lazy loading)
 * L'image n'est chargée que lorsqu'elle entre dans le viewport
 */
export default function LazyImage({ 
  src, 
  alt, 
  style, 
  onError,
  placeholder,
  threshold = 0.1
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin: '50px' // Commence à charger 50px avant que l'image soit visible
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  useEffect(() => {
    // Si la source change, réinitialiser l'état pour forcer un rechargement
    setHasLoaded(false);
    setImageSrc(null);
  }, [src]);

  useEffect(() => {
    if (isInView && src && !hasLoaded) {
      loadImage();
    }
  }, [isInView, src, hasLoaded]);

  const loadImage = async () => {
    if (!src) {
      setImageSrc(null);
      setHasLoaded(true);
      return;
    }

    // Ignorer les URLs de LewdCorner (403 Forbidden)
    if (src.includes('lewdcorner.com')) {
      setImageSrc(null);
      setHasLoaded(true);
      return;
    }

    const isRelativePath = !src.includes('://') && !src.startsWith('data:') && !src.startsWith('manga://');

    if (isRelativePath) {
      try {
        const fullPath = await window.electronAPI.getCoverFullPath(src);
        if (fullPath) {
          setImageSrc(fullPath);
        } else {
          setImageSrc(null);
        }
      } catch (error) {
        console.error('Erreur chargement image:', error);
        setImageSrc(null);
      }
    } else {
      // C'est une URL en ligne
      setImageSrc(src);
    }

    setHasLoaded(true);
  };

  // Placeholder pendant le chargement
  if (!hasLoaded || !isInView) {
    return (
      <div ref={imgRef} style={style}>
        {placeholder || (
          <div style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-light)'
          }}>
            <div className="loading" />
          </div>
        )}
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div style={style}>
        {placeholder || (
          <div style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
          }}>
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              style={{ margin: '0 auto', color: 'var(--text-secondary)', opacity: 0.6 }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      style={style}
      onError={onError}
      loading="lazy"
    />
  );
}
