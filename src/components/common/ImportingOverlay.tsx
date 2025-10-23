import { Loader2 } from 'lucide-react';

interface ImportingOverlayProps {
  message?: string;
}

export default function ImportingOverlay({ message = 'Réception de données en cours...' }: ImportingOverlayProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--surface), var(--surface-light))',
        padding: '40px 60px',
        borderRadius: '24px',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)',
        textAlign: 'center',
        animation: 'scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <Loader2 
          size={64} 
          style={{ 
            color: 'var(--primary)', 
            marginBottom: '24px',
            animation: 'spin 1s linear infinite'
          }} 
        />
        
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {message}
        </h2>
        
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: 0
        }}>
          Veuillez patienter...
        </p>

        {/* Avertissement */}
        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <p style={{
            fontSize: '13px',
            color: '#fbbf24',
            margin: 0,
            textAlign: 'left',
            lineHeight: '1.5'
          }}>
            <strong>Important :</strong> Ne touchez pas au site pendant l'extraction des données (changement de page, fermeture d'onglet, etc.)
          </p>
        </div>

        <div style={{
          marginTop: '24px',
          display: 'flex',
          gap: '8px',
          justifyContent: 'center'
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--primary)',
                animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          40% {
            transform: translateY(-12px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
