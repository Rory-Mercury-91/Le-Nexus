import { AlertCircle, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BlacklistEntry {
  id: number;
  f95_thread_id: number | null;
  titre: string;
  plateforme: string;
  traducteur: string | null;
  date_blacklist: string;
  raison: string | null;
}

interface BlacklistModalProps {
  onClose: () => void;
  onRemove: (id: number) => void;
}

export default function BlacklistModal({ onClose, onRemove }: BlacklistModalProps) {
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAdulteGameBlacklist();
      setBlacklist(data);
    } catch (error) {
      console.error('Erreur chargement liste noire:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await window.electronAPI.removeFromBlacklist(id);
      setBlacklist(prev => prev.filter(entry => entry.id !== id));
      onRemove(id);
    } catch (error) {
      console.error('Erreur suppression de la liste noire:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            🚫 Liste noire jeux adultes
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-light)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Description */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--surface-light)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              margin: 0
            }}
          >
            Les jeux en liste noire ne seront jamais recréés lors des synchronisations automatiques.
            Retirez une entrée de la liste pour autoriser sa re-création.
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: 'var(--text-secondary)'
              }}
            >
              Chargement...
            </div>
          ) : blacklist.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}
            >
              <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                Aucun jeu en liste noire
              </p>
              <p style={{ fontSize: '14px' }}>
                Les jeux supprimés provenant de la synchronisation apparaîtront ici
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {blacklist.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '16px',
                    padding: '16px',
                    background: 'var(--surface-light)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: 'var(--text)',
                          margin: 0
                        }}
                      >
                        {entry.titre}
                      </h3>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: entry.plateforme === 'F95Zone' ? '#f97316' : '#8b5cf6',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        {entry.plateforme}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        flexWrap: 'wrap'
                      }}
                    >
                      {entry.f95_thread_id && (
                        <span>
                          <strong>ID:</strong> {entry.f95_thread_id}
                        </span>
                      )}
                      {entry.traducteur && (
                        <span>
                          <strong>Traducteur:</strong> {entry.traducteur}
                        </span>
                      )}
                      <span>
                        <strong>Ajouté le:</strong> {formatDate(entry.date_blacklist)}
                      </span>
                      {entry.raison && (
                        <span>
                          <strong>Raison:</strong> {entry.raison}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="btn"
                    style={{
                      background: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--danger)';
                    }}
                  >
                    <Trash2 size={16} />
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}
        >
          <span>
            {loading
              ? 'Chargement de la liste noire...'
              : blacklist.length === 0
                ? 'Aucun jeu actuellement en liste noire'
                : `${blacklist.length} ${blacklist.length === 1 ? 'jeu' : 'jeux'} en liste noire`}
          </span>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
