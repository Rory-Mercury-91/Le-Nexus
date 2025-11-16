import { X, RefreshCw } from 'lucide-react';

interface UpdateProgressModalProps {
  isOpen: boolean;
  phase: 'start' | 'sheet' | 'scraping' | 'complete' | 'error';
  total: number;
  current: number;
  message: string;
  gameTitle?: string;
  updated?: number;
  sheetSynced?: number;
  onClose: () => void;
}

export default function UpdateProgressModal({
  isOpen,
  phase,
  total,
  current,
  message,
  gameTitle,
  updated,
  sheetSynced,
  onClose
}: UpdateProgressModalProps) {
  if (!isOpen) return null;

  const progress = total > 0 ? (current / total) * 100 : 0;
  const isComplete = phase === 'complete';
  const isError = phase === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          position: 'relative',
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
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
        `}</style>

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={20} />
        </button>

        {/* En-tête */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <RefreshCw
              size={24}
              style={{
                color: isError ? 'var(--error)' : 'var(--primary)',
                animation: !isComplete && !isError ? 'spin 1s linear infinite' : 'none'
              }}
            />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Vérification des mises à jour
            </h2>
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>
            {message}
          </p>
          {gameTitle && phase === 'scraping' && (
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
              {gameTitle}
            </p>
          )}
        </div>

        {/* Barre de progression */}
        {total > 0 && phase === 'scraping' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Progression
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {current} / {total}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: isError ? 'var(--error)' : 'var(--primary)',
                  transition: 'width 0.3s ease-out',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        )}

        {/* Résultats */}
        {isComplete && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              marginTop: '16px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {updated !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                    Mises à jour détectées:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                    {updated}
                  </span>
                </div>
              )}
              {sheetSynced !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                    Jeux synchronisés (Google Sheet):
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {sheetSynced}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {isError && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              borderRadius: '8px',
              marginTop: '16px'
            }}
          >
            <p style={{ margin: 0, color: 'var(--error)', fontSize: '14px' }}>
              {message}
            </p>
          </div>
        )}

        {/* Bouton fermer (si terminé ou erreur) */}
        {(isComplete || isError) && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ minWidth: '100px' }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
