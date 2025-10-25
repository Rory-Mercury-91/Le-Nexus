import { useEffect, useState } from 'react';

interface CoverImageProps {
  src: string | null;
  alt: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function CoverImage({ src, alt, style, onError }: CoverImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, [src]);

  const loadImage = async () => {
    if (!src) {
      setImageSrc(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Si c'est un chemin relatif (covers/..., series/..., animes/..., ou avn/...)
    if (src.startsWith('covers/') || src.startsWith('series/') || src.startsWith('animes/') || src.startsWith('avn/')) {
      const fullPath = await window.electronAPI.getCoverFullPath(src);
      if (fullPath) {
        // getCoverFullPath retourne déjà manga:// ou https://
        setImageSrc(fullPath);
      } else {
        // Fichier local n'existe pas
        setImageSrc(null);
      }
    } else {
      // C'est une URL en ligne
      // Si c'est LewdCorner, utiliser le proxy local
      if (src.includes('lewdcorner.com')) {
        const proxyUrl = `http://localhost:51234/api/proxy-image?url=${encodeURIComponent(src)}`;
        setImageSrc(proxyUrl);
      } else {
        setImageSrc(src);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
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
  }

  if (!imageSrc) {
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-light)',
        color: 'var(--text-secondary)'
      }}>
        Aucune image
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      style={style}
      onError={onError}
    />
  );
}
