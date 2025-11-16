import { RefreshCw } from 'lucide-react';

interface UpdateProgressInlineProps {
  phase: 'start' | 'sheet' | 'scraping' | 'complete' | 'error';
  total: number;
  current: number;
  message: string;
  gameTitle?: string;
  updated?: number;
  sheetSynced?: number;
}

export default function UpdateProgressInline({
  phase,
  total,
  current,
  message,
  gameTitle,
  updated,
  sheetSynced
}: UpdateProgressInlineProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  const isComplete = phase === 'complete';
  const isError = phase === 'error';
  const isActive = phase === 'start' || phase === 'sheet' || phase === 'scraping';

  return (
    <div
      style={{
        padding: '24px',
        marginBottom: '24px',
        background: 'var(--surface)',
        borderRadius: '16px',
        border: `2px solid ${isError ? 'var(--error)' : isComplete ? 'var(--primary)' : 'var(--primary)'}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}
    >
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <RefreshCw
          size={20}
          style={{
            color: isError ? 'var(--error)' : 'var(--primary)',
            animation: isActive ? 'spin 1s linear infinite' : 'none'
          }}
        />
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
          Vérification des mises à jour
        </h3>
      </div>

      {/* Message */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', lineHeight: '1.6' }}>
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
        <div style={{ marginBottom: '16px' }}>
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
            marginTop: '8px'
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
            marginTop: '8px'
          }}
        >
          <p style={{ margin: 0, color: 'var(--error)', fontSize: '14px' }}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
