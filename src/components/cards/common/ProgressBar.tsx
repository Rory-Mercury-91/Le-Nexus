interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  // Dégradé de couleur progressif : du violet au vert
  const getProgressGradient = () => {
    if (percentage === 0) return '#6366f1';
    if (percentage === 100) return 'linear-gradient(90deg, #10b981, #059669)';
    
    // Gradient progressif du violet (#6366f1) vers le vert (#10b981)
    const startColor = '#6366f1'; // Indigo
    const midColor = '#8b5cf6';   // Violet
    const endColor = '#10b981';   // Vert
    
    if (percentage < 50) {
      // De indigo à violet
      return `linear-gradient(90deg, ${startColor}, ${midColor})`;
    } else if (percentage < 100) {
      // De violet à vert avec transition progressive
      const ratio = (percentage - 50) / 50; // 0 to 1
      return `linear-gradient(90deg, ${midColor} 0%, ${endColor} ${ratio * 100}%)`;
    }
    
    return `linear-gradient(90deg, ${endColor}, #059669)`;
  };

  return (
    <div style={{
      width: '100%',
      marginTop: '12px'
    }}>
      {/* Barre de progression */}
      <div style={{
        width: '100%',
        height: '6px',
        background: 'var(--surface-light)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '6px'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: getProgressGradient(),
          borderRadius: '3px',
          transition: 'width 0.3s ease, background 0.3s ease'
        }} />
      </div>

      {/* Texte */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        <span>{label || `${current}/${total > 0 ? total : '?'}`}</span>
        <span style={{ 
          fontWeight: '600',
          color: percentage === 100 ? '#10b981' : 'var(--primary)'
        }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}
