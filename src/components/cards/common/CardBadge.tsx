interface CardBadgeProps {
  show: boolean;
  offsetForFavorite?: boolean;
  offsetForNew?: boolean;
  text?: string;
  background?: string;
  boxShadow?: string;
}

export default function CardBadge({ 
  show, 
  offsetForFavorite = false, 
  offsetForNew = false,
  text = '🆕',
  background = 'linear-gradient(135deg, var(--warning), var(--warning-light))',
  boxShadow = '0 3px 10px rgba(249, 115, 22, 0.4)'
}: CardBadgeProps) {
  if (!show) return null;

  // Calculer la position en fonction des autres badges
  let left = '8px';
  if (offsetForFavorite) {
    left = '48px';
  }
  if (offsetForNew && offsetForFavorite) {
    left = '88px';
  } else if (offsetForNew) {
    left = '48px';
  }

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      left: left,
      padding: '6px 8px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '700',
      background: background,
      color: 'white',
      boxShadow: boxShadow,
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      border: '1.5px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(4px)'
    }}>
      {text}
    </div>
  );
}
