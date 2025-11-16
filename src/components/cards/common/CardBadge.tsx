interface CardBadgeProps {
  show: boolean;
  offsetForFavorite?: boolean;
}

export default function CardBadge({ show, offsetForFavorite = false }: CardBadgeProps) {
  if (!show) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      left: offsetForFavorite ? '48px' : '8px',
      padding: '6px 8px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #f97316, #fb923c)',
      color: 'white',
      boxShadow: '0 3px 10px rgba(249, 115, 22, 0.4)',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      border: '1.5px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(4px)'
    }}>
      🆕
    </div>
  );
}
