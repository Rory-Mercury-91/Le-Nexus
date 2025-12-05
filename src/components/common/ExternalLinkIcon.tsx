import { useMemo } from 'react';

type IconType =
  | 'tmdb'
  | 'imdb'
  | 'mal'
  | 'anilist'
  | 'nautiljon'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'x'
  | 'wikipedia'
  | 'tvdb'
  | 'adn'
  | 'crunchyroll'
  | 'netflix'
  | 'prime'
  | 'disney'
  | 'apple-tv'
  | 'hbo'
  | 'paramount'
  | 'peacock'
  | 'ocs'
  | 'canal'
  | 'salto'
  | 'default';

interface ExternalLinkIconProps {
  href: string;
  type?: IconType;
  size?: number;
  title?: string;
  className?: string;
  base64Image?: string; // Support pour les images base64
  showLabel?: boolean; // Afficher le label dans le bouton
  label?: string; // Label personnalisé à afficher
}

// Mapping des URLs vers les types d'icônes
function detectIconType(url: string): IconType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('themoviedb.org')) return 'tmdb';
  if (lowerUrl.includes('imdb.com')) return 'imdb';
  if (lowerUrl.includes('myanimelist.net')) return 'mal';
  if (lowerUrl.includes('anilist.co')) return 'anilist';
  if (lowerUrl.includes('nautiljon.com')) return 'nautiljon';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('facebook.com')) return 'facebook';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'x';
  if (lowerUrl.includes('wikipedia.org') || lowerUrl.includes('wikidata.org')) return 'wikipedia';
  if (lowerUrl.includes('thetvdb.com')) return 'tvdb';
  if (lowerUrl.includes('animedigitalnetwork.fr') || lowerUrl.includes('adn')) return 'adn';
  if (lowerUrl.includes('crunchyroll.com')) return 'crunchyroll';
  if (lowerUrl.includes('netflix.com')) return 'netflix';
  if (lowerUrl.includes('primevideo.com') || lowerUrl.includes('amazon.com/prime')) return 'prime';
  if (lowerUrl.includes('disney.com') || lowerUrl.includes('disneyplus.com')) return 'disney';
  if (lowerUrl.includes('tv.apple.com') || lowerUrl.includes('apple.com/tv')) return 'apple-tv';
  if (lowerUrl.includes('hbomax.com') || lowerUrl.includes('hbo.com')) return 'hbo';
  if (lowerUrl.includes('paramountplus.com') || lowerUrl.includes('paramount.com')) return 'paramount';
  if (lowerUrl.includes('peacocktv.com') || lowerUrl.includes('peacock.com')) return 'peacock';
  if (lowerUrl.includes('ocs.fr') || lowerUrl.includes('orangecinema.fr')) return 'ocs';
  if (lowerUrl.includes('canalplus.com') || lowerUrl.includes('canal.fr')) return 'canal';
  if (lowerUrl.includes('salto.tv') || lowerUrl.includes('salto.fr')) return 'salto';
  return 'default';
}

export default function ExternalLinkIcon({
  href,
  type,
  size = 32,
  title,
  className,
  base64Image,
  showLabel = false,
  label
}: ExternalLinkIconProps) {
  const iconType = useMemo(() => type || detectIconType(href), [href, type]);

  const handleClick = () => {
    window.electronAPI.openExternal?.(href);
  };

  // Si une image base64 est fournie, l'utiliser en priorité
  const iconPath = useMemo(() => {
    if (base64Image) {
      return base64Image;
    }
    
    // Helper pour obtenir le chemin correct selon l'environnement
    const getAssetPath = (path: string) => {
      // En production Electron (file://), utiliser un chemin relatif
      if (window.location.protocol === 'file:') {
        return `./assets/${path.split('/assets/')[1]}`;
      }
      return path;
    };
    
    switch (iconType) {
      case 'tmdb':
        return getAssetPath('/assets/Tmdb.new.logo.svg');
      case 'imdb':
        return getAssetPath('/assets/imdb.svg');
      case 'mal':
        return getAssetPath('/assets/MyAnimeList_favicon.svg');
      case 'anilist':
        return null; // Utiliser le style texte comme MAL et Nautiljon
      case 'nautiljon':
        return getAssetPath('/assets/logo_nautiljon.webp');
      case 'youtube':
        return getAssetPath('/assets/youtube.svg');
      case 'facebook':
        return getAssetPath('/assets/facebook.svg');
      case 'instagram':
        return getAssetPath('/assets/instagram.svg');
      case 'x':
      case 'twitter':
        return getAssetPath('/assets/x.svg');
      case 'wikipedia':
        return getAssetPath('/assets/wikipedia.svg');
      case 'tvdb':
        return getAssetPath('/assets/tvdb.svg');
      case 'adn':
        return getAssetPath('/assets/ADN.svg');
      case 'crunchyroll':
        return getAssetPath('/assets/crunchyroll.svg');
      case 'netflix':
        return getAssetPath('/assets/netflix.svg');
      case 'prime':
        return getAssetPath('/assets/amazon-prime-vidéo.svg');
      case 'disney':
        return getAssetPath('/assets/disneyplus.svg');
      case 'apple-tv':
        return getAssetPath('/assets/appletv.svg');
      case 'hbo':
        return getAssetPath('/assets/hbo-max.svg');
      case 'paramount':
        return getAssetPath('/assets/paramount-plus.svg');
      case 'peacock':
        return null; // Fichier manquant dans public/assets/
      case 'ocs':
        return null; // Fichier manquant dans public/assets/
      case 'canal':
        return null; // Fichier manquant dans public/assets/
      case 'salto':
        return null; // Fichier manquant dans public/assets/
      default:
        return null;
    }
  }, [iconType, base64Image]);

  // Cas spéciaux pour MyAnimeList, AniList et Nautiljon : afficher le texte en grand au lieu de l'icône
  if (iconType === 'mal') {
    return (
      <button
        onClick={handleClick}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          background: '#2E51A2',
          border: '2px solid #2E51A2',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          width: 'auto',
          height: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1a3a7a';
          e.currentTarget.style.borderColor = '#1a3a7a';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 81, 162, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2E51A2';
          e.currentTarget.style.borderColor = '#2E51A2';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={title || href}
      >
        <span style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}>
          MyAnimeList
        </span>
      </button>
    );
  }

  if (iconType === 'anilist') {
    return (
      <button
        onClick={handleClick}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          background: '#02a9ff',
          border: '2px solid #02a9ff',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          width: 'auto',
          height: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#0284c7';
          e.currentTarget.style.borderColor = '#0284c7';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 169, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#02a9ff';
          e.currentTarget.style.borderColor = '#02a9ff';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={title || href}
      >
        <span style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}>
          AniList
        </span>
      </button>
    );
  }

  if (iconType === 'nautiljon') {
    return (
      <button
        onClick={handleClick}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          background: '#8B5CF6',
          border: '2px solid #8B5CF6',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          width: 'auto',
          height: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#6d28d9';
          e.currentTarget.style.borderColor = '#6d28d9';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#8B5CF6';
          e.currentTarget.style.borderColor = '#8B5CF6';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={title || href}
      >
        <span style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}>
          Nautiljon
        </span>
      </button>
    );
  }

  if (!iconPath) {
    // Fallback vers un bouton texte si pas d'icône disponible
    return (
      <button
        onClick={handleClick}
        className={className || 'btn btn-outline'}
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          borderRadius: '8px'
        }}
        title={title || href}
      >
        🔗 {label || 'Lien externe'}
      </button>
    );
  }

  // Si showLabel est activé, afficher le label dans le bouton
  if (showLabel && label) {
    return (
      <button
        onClick={handleClick}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          height: 'auto',
          width: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-secondary)';
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        title={title || href}
      >
        <img
          src={iconPath}
          alt={iconType}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
            flexShrink: 0
          }}
        />
        <span style={{
          fontSize: '14px',
          color: 'var(--text)',
          fontWeight: '500'
        }}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        padding: '6px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={title || href}
    >
      <img
        src={iconPath}
        alt={iconType}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </button>
  );
}
