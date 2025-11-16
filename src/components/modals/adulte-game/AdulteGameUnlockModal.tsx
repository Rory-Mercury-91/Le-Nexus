import { Lock } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface AdulteGameUnlockModalProps {
  onUnlock: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

/**
 * Modale de déverrouillage pour les contenus adultes (animes, mangas, jeux adultes)
 * Utilisée de manière cohérente dans toute l'application
 */
export default function AdulteGameUnlockModal({
  onUnlock,
  onCancel,
  title = 'Contenu sensible verrouillé',
  description = 'Ce contenu nécessite un mot de passe pour être consulté. Entrez votre mot de passe maître pour continuer.'
}: AdulteGameUnlockModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Veuillez saisir un mot de passe');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.checkAdulteGamePassword(password);
      if (result.success) {
        onUnlock();
      } else {
        setError(result.error || 'Mot de passe incorrect');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Erreur vérification mot de passe maître:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '32px 32px 24px',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <Lock size={32} style={{ color: 'white' }} />
          </div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--text)',
              marginBottom: '8px'
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}
          >
            {description}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '32px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Mot de passe maître"
              className="input"
              autoFocus
              disabled={loading}
              style={{
                width: '100%',
                fontSize: '16px',
                padding: '14px',
                textAlign: 'center'
              }}
            />

            {error && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  textAlign: 'center'
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 32px 32px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'stretch'
            }}
          >
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'var(--surface-light)',
                  border: '1px solid var(--border)'
                }}
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !password.trim()}
              style={{
                flex: 1,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }}
                  />
                  Vérification...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Déverrouiller
                </>
              )}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
