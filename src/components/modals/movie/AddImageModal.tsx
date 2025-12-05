import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';

interface AddImageModalProps {
  onClose: () => void;
  onAddUrl: (url: string) => Promise<void>;
  onAddFile: (title?: string) => Promise<void>;
  adding?: boolean;
}

export default function AddImageModal({ onClose, onAddUrl, onAddFile, adding = false }: AddImageModalProps) {
  useDisableBodyScroll(true);
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !adding) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, adding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'url') {
      if (!url.trim()) {
        return;
      }
      await onAddUrl(url.trim());
    } else {
      await onAddFile(title.trim() || undefined);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        cursor: 'pointer'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '18px',
          border: '1px solid var(--border)',
          padding: '24px',
          width: '100%',
          maxWidth: '500px',
          cursor: 'default',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Ajouter une image</h2>
          <button
            onClick={onClose}
            disabled={adding}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: adding ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background 0.2s',
              opacity: adding ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!adding) {
                e.currentTarget.style.background = 'var(--hover)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setMode('url')}
            disabled={adding}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: mode === 'url' ? 'var(--primary)' : 'var(--surface)',
              color: mode === 'url' ? 'white' : 'var(--text)',
              cursor: adding ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s',
              opacity: adding ? 0.6 : 1
            }}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            disabled={adding}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: mode === 'file' ? 'var(--primary)' : 'var(--surface)',
              color: mode === 'file' ? 'white' : 'var(--text)',
              cursor: adding ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s',
              opacity: adding ? 0.6 : 1
            }}
          >
            Fichier local
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'url' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="image-url"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text)'
                  }}
                >
                  URL de l'image
                </label>
                <input
                  id="image-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={adding}
                  placeholder="https://example.com/image.jpg"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    opacity: adding ? 0.6 : 1
                  }}
                  required
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0, marginBottom: '16px' }}>
                  Cliquez sur "Ajouter" pour sélectionner un fichier image sur votre ordinateur.
                </p>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Formats supportés : JPG, JPEG, PNG, GIF, WebP, BMP
                </p>
              </div>
              <div>
                <label
                  htmlFor="image-title"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text)'
                  }}
                >
                  Nom
                </label>
                <input
                  id="image-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={adding}
                  placeholder="Ex: Photo de tournage, Affiche alternative..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    opacity: adding ? 0.6 : 1
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={adding}
              className="btn btn-outline"
              style={{
                flex: 1,
                opacity: adding ? 0.6 : 1,
                cursor: adding ? 'not-allowed' : 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={adding || (mode === 'url' && !url.trim())}
              className="btn btn-primary"
              style={{
                flex: 1,
                opacity: (adding || (mode === 'url' && !url.trim())) ? 0.6 : 1,
                cursor: (adding || (mode === 'url' && !url.trim())) ? 'not-allowed' : 'pointer'
              }}
            >
              {adding ? 'Ajout en cours...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
