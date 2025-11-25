interface StatusBadgeProps {
  status: string;
  type: 'manga' | 'anime' | 'adulte-game' | 'movie' | 'series';
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  if (!status) return null;

  // Configuration des couleurs par statut (fonds opaques, bien visibles)
  const getStatusConfig = () => {
    switch (status) {
      case 'À regarder':
      case 'À lire':
        return { 
          color: '#ffffff', 
          bg: '#3b82f6', // Bleu vif
          icon: '👁️',
          label: status
        };
      case 'En cours':
        // Utiliser 📺 pour les animes, séries et films, 📖 pour les mangas, 🎮 pour les jeux
        const enCoursIcon = type === 'anime' || type === 'series' || type === 'movie' 
          ? '📺' 
          : type === 'adulte-game' 
          ? '🎮' 
          : '📖';
        return { 
          color: '#ffffff', 
          bg: '#8b5cf6', // Violet vif
          icon: enCoursIcon,
          label: 'En cours'
        };
      case 'Terminé':
        return { 
          color: '#ffffff', 
          bg: 'var(--success)', // Vert vif
          icon: '✅',
          label: 'Terminé'
        };
      case 'Abandonné':
        return { 
          color: '#ffffff', 
          bg: 'var(--error)', // Rouge vif
          icon: '🚫',
          label: 'Abandonné'
        };
      case 'En attente':
      case 'En pause':
        return { 
          color: '#000000', 
          bg: 'var(--warning-light)', // Jaune vif
          icon: '⏸️',
          label: status
        };
      case 'Refusé':
        return { 
          color: '#ffffff', 
          bg: '#7c2d12', // Rouge sombre
          icon: '❌',
          label: 'Refusé'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <span style={{
      position: 'absolute',
      bottom: '8px',
      right: '8px',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '800',
      background: config.bg,
      color: config.color,
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.5)',
      zIndex: 2,
      letterSpacing: '0.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      textTransform: 'uppercase',
      border: '2px solid rgba(255, 255, 255, 0.2)'
    }}>
      <span style={{ fontSize: '14px' }}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
