interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  style?: React.CSSProperties;
}

export default function LoadingSpinner({ 
  size = 40, 
  message = 'Chargement...',
  style 
}: LoadingSpinnerProps) {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '60px',
      ...style 
    }}>
      <div 
        className="loading" 
        style={{ 
          width: `${size}px`, 
          height: `${size}px`, 
          margin: '0 auto' 
        }} 
      />
      {message && (
        <p style={{ 
          marginTop: '16px', 
          color: 'var(--text-secondary)' 
        }}>
          {message}
        </p>
      )}
    </div>
  );
}
