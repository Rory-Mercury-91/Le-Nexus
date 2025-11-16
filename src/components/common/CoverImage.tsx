import LazyImage from './LazyImage';

interface CoverImageProps {
  src: string | null;
  alt: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * Composant CoverImage avec lazy loading
 * Utilise LazyImage pour charger les images seulement quand elles sont visibles
 */
export default function CoverImage({ src, alt, style, onError }: CoverImageProps) {
  const placeholder = (
    <div style={{
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-light)'
    }}>
      <div className="loading" />
    </div>
  );

  return (
    <LazyImage
      src={src}
      alt={alt}
      style={style}
      onError={onError}
      placeholder={placeholder}
    />
  );
}
