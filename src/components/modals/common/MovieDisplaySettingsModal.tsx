import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

type MovieFieldKey =
  | 'banner'
  | 'synopsis'
  | 'metadata'
  | 'keywords'
  | 'videos'
  | 'images'
  | 'providers'
  | 'recommendations'
  | 'externalLinks';

interface FieldCategory {
  title: string;
  icon: string;
  fields: { key: MovieFieldKey; label: string }[];
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    title: 'Présentation',
    icon: '🎬',
    fields: [
      { key: 'banner', label: 'Bannière & affiches' },
      { key: 'synopsis', label: 'Synopsis' }
    ]
  },
  {
    title: 'Métadonnées',
    icon: '📊',
    fields: [
      { key: 'metadata', label: 'Informations principales' },
      { key: 'keywords', label: 'Mots-clés' }
    ]
  },
  {
    title: 'Médias',
    icon: '🎞️',
    fields: [
      { key: 'videos', label: 'Bandes-annonces' },
      { key: 'images', label: 'Galerie d’images' }
    ]
  },
  {
    title: 'Disponibilité',
    icon: '📡',
    fields: [
      { key: 'providers', label: 'Plateformes de streaming' }
    ]
  },
  {
    title: 'Découverte',
    icon: '✨',
    fields: [
      { key: 'recommendations', label: 'Recommandations & similaires' },
      { key: 'externalLinks', label: 'Liens externes (IMDb, site officiel...)' }
    ]
  }
];

const DEFAULTS: Record<MovieFieldKey, boolean> = {
  banner: true,
  synopsis: true,
  metadata: true,
  keywords: true,
  videos: true,
  images: true,
  providers: true,
  recommendations: true,
  externalLinks: true
};

interface MovieDisplaySettingsModalProps {
  onClose: () => void;
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

export default function MovieDisplaySettingsModal({ onClose, showToast }: MovieDisplaySettingsModalProps) {
  useModalEscape(onClose, false);

  const [prefs, setPrefs] = useState<Record<MovieFieldKey, boolean>>(DEFAULTS);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.getMovieDisplaySettings?.();
        if (stored) {
          setPrefs({ ...DEFAULTS, ...stored });
        }
      } catch {}
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
    })();
  }, []);

  useEffect(() => {
    if (isInitialLoad || !hasUserInteracted) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await window.electronAPI.saveMovieDisplaySettings?.(prefs);
        showToast({
          title: 'Paramètres sauvegardés',
          message: 'Les préférences d’affichage des films ont été enregistrées',
          type: 'success',
          duration: 2000
        });
      } catch (error) {
        showToast({
          title: 'Erreur de sauvegarde',
          message: 'Impossible de sauvegarder les paramètres',
          type: 'error',
          duration: 3000
        });
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [prefs, isInitialLoad, hasUserInteracted, showToast]);

  const handleToggle = (key: MovieFieldKey) => {
    setHasUserInteracted(true);
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setHasUserInteracted(true);
    setPrefs({ ...DEFAULTS });
  };

  const handleDeselectAll = () => {
    setHasUserInteracted(true);
    const cleared = { ...DEFAULTS };
    (Object.keys(cleared) as MovieFieldKey[]).forEach((key) => {
      cleared[key] = false;
    });
    setPrefs(cleared);
  };

  return createPortal(
    <Modal
      onClickOverlay={onClose}
      maxWidth="880px"
      maxHeight="85vh"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 28px',
          borderBottom: '2px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}
          >
            🎬
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text)' }}>
              Affichage des films
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Activez ou désactivez les sections visibles sur les fiches films.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s',
            width: '36px',
            height: '36px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--error)';
            e.currentTarget.style.borderColor = 'var(--error)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          padding: '28px',
          flex: 1,
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
            Sections disponibles
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSelectAll} className="btn btn-outline" style={{ fontSize: '13px' }}>
              ✓ Tout sélectionner
            </button>
            <button onClick={handleDeselectAll} className="btn btn-outline" style={{ fontSize: '13px' }}>
              ✗ Tout désélectionner
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {FIELD_CATEGORIES.map((category) => (
            <div
              key={category.title}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {category.icon}
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  {category.title}
                </h4>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px'
                }}
              >
                {category.fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '9px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleToggle(field.key)}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'var(--text)',
                        fontWeight: 500,
                        flex: 1
                      }}
                    >
                      {field.label}
                    </span>
                    <Toggle checked={!!prefs[field.key]} onChange={() => handleToggle(field.key)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '20px 28px',
          borderTop: '2px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}
      >
        <button
          onClick={onClose}
          className="btn btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '8px'
          }}
        >
          Fermer
        </button>
      </div>
    </Modal>,
    document.body
  );
}
