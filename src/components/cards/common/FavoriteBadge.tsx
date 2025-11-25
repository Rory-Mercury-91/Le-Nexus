interface FavoriteBadgeProps {
  isFavorite: boolean;
  onToggle: () => void;
  position?: 'cover' | 'title';
}

export default function FavoriteBadge({ isFavorite, onToggle, position = 'cover' }: FavoriteBadgeProps) {
  if (!isFavorite && position === 'cover') return null;

  if (position === 'cover') {
    return (
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        padding: '6px 8px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '700',
        background: 'var(--error)',
        color: 'white',
        boxShadow: '0 3px 10px rgba(239, 68, 68, 0.4)',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        border: '1.5px solid rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(4px)'
      }}>
        ❤️
      </div>
    );
  }

  // Position 'title' - affiche un bouton à côté du titre
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      title="Favori"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        color: 'var(--error)',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '2px solid var(--error)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.15)';
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="var(--error)"
        stroke="var(--error)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
