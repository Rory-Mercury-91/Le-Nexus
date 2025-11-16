import { Heart } from 'lucide-react';

interface CardFooterProps {
  title: string;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  actionMenu: React.ReactNode;
}

export default function CardFooter({ title, isFavorite, onToggleFavorite, actionMenu }: CardFooterProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '10px 12px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)'
    }}>
      {/* Titre (gauche, prend l'espace disponible) */}
      <h3 style={{
        fontSize: '13px',
        fontWeight: '600',
        lineHeight: '1.3',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        flex: 1,
        margin: 0,
        color: 'var(--text)'
      }} title={title}>
        {title}
      </h3>

      {/* Actions (droite, en colonne) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: 'center',
        flexShrink: 0
      }}>
        {/* Menu 3 points (rendu par le parent) */}
        <div style={{ position: 'relative' }}>
          {actionMenu}
        </div>

        {/* Coeur favori */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isFavorite ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            border: isFavorite ? '2px solid #ef4444' : '2px solid var(--border)',
            color: isFavorite ? '#ef4444' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = isFavorite ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = isFavorite ? 'rgba(239, 68, 68, 0.1)' : 'transparent';
          }}
        >
          <Heart size={14} fill={isFavorite ? '#ef4444' : 'none'} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
