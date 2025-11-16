import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

type FieldKey =
  | 'banner' | 'couverture' | 'description' | 'titres_alternatifs'
  | 'statut_diffusion' | 'type' | 'demographie' | 'rating'
  | 'genres' | 'themes' | 'source'
  | 'studios' | 'producteurs' | 'diffuseurs'
  | 'date_debut' | 'date_fin' | 'date_sortie_vf' | 'saison_diffusion'
  | 'mal_block' | 'relations' | 'liens_externes' | 'liens_streaming' | 'episodes' | 'badges';

interface FieldCategory {
  title: string;
  icon: string;
  fields: { key: FieldKey; label: string }[];
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    title: 'Présentation',
    icon: '🎬',
    fields: [
      { key: 'banner', label: 'Bannière Crunchyroll' },
      { key: 'couverture', label: 'Couverture & statut' },
      { key: 'titres_alternatifs', label: 'Titres alternatifs' },
      { key: 'description', label: 'Synopsis' }
    ]
  },
  {
    title: 'Diffusion',
    icon: '⏱️',
    fields: [
      { key: 'statut_diffusion', label: 'Statut de diffusion' },
      { key: 'date_debut', label: 'Date de début VO' },
      { key: 'date_fin', label: 'Date de fin VO' },
      { key: 'date_sortie_vf', label: 'Date de sortie VF' },
      { key: 'saison_diffusion', label: 'Saison de diffusion' }
    ]
  },
  {
    title: 'Classification',
    icon: '🏷️',
    fields: [
      { key: 'type', label: 'Type (TV, OVA, Movie...)' },
      { key: 'demographie', label: 'Démographie' },
      { key: 'rating', label: 'Classification / Rating' },
      { key: 'genres', label: 'Genres' },
      { key: 'themes', label: 'Thèmes' },
      { key: 'source', label: 'Source (light novel, manga...)' }
    ]
  },
  {
    title: 'Production',
    icon: '🏢',
    fields: [
      { key: 'studios', label: 'Studios' },
      { key: 'producteurs', label: 'Producteurs' },
      { key: 'diffuseurs', label: 'Diffuseurs' }
    ]
  },
  {
    title: 'MyAnimeList',
    icon: '📊',
    fields: [
      { key: 'mal_block', label: 'Bloc statistiques MAL' }
    ]
  },
  {
    title: 'Relations & liens',
    icon: '🔗',
    fields: [
      { key: 'relations', label: 'Relations (prequel, sequel...)' },
      { key: 'liens_externes', label: 'Liens externes' },
      { key: 'liens_streaming', label: 'Liens de streaming' }
    ]
  },
  {
    title: 'Progression',
    icon: '📺',
    fields: [
      { key: 'episodes', label: 'Liste des épisodes' },
      { key: 'badges', label: 'Badges (en cours, source import)' }
    ]
  }
];

const DEFAULTS: Record<FieldKey, boolean> = {
  banner: true,
  couverture: true,
  description: true,
  titres_alternatifs: true,
  statut_diffusion: true,
  type: true,
  demographie: true,
  rating: true,
  genres: true,
  themes: true,
  source: true,
  studios: true,
  producteurs: true,
  diffuseurs: true,
  date_debut: true,
  date_fin: true,
  date_sortie_vf: true,
  saison_diffusion: true,
  mal_block: true,
  relations: true,
  liens_externes: true,
  liens_streaming: true,
  episodes: true,
  badges: true
};

interface AnimeDisplaySettingsModalProps {
  onClose: () => void;
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

export default function AnimeDisplaySettingsModal({ onClose, showToast }: AnimeDisplaySettingsModalProps) {
  useModalEscape(onClose, false);

  const [prefs, setPrefs] = useState<Record<FieldKey, boolean>>(DEFAULTS);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.getAnimeDisplaySettings?.();
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
        await window.electronAPI.saveAnimeDisplaySettings?.(prefs);
        showToast({
          title: 'Paramètres sauvegardés',
          message: 'Les préférences d\'affichage des animés ont été enregistrées',
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
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [prefs, isInitialLoad, hasUserInteracted, showToast]);

  const handleToggle = (key: FieldKey) => {
    setHasUserInteracted(true);
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setHasUserInteracted(true);
    const allSelected = { ...DEFAULTS };
    Object.keys(DEFAULTS).forEach((k) => {
      allSelected[k as FieldKey] = true;
    });
    setPrefs(allSelected);
  };

  const handleDeselectAll = () => {
    setHasUserInteracted(true);
    const noneSelected = { ...DEFAULTS };
    Object.keys(DEFAULTS).forEach((k) => {
      noneSelected[k as FieldKey] = false;
    });
    setPrefs(noneSelected);
  };

  return createPortal(
    <Modal 
      onClickOverlay={onClose}
      maxWidth="900px"
      maxHeight="85vh"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 28px',
        borderBottom: '2px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            📺
          </div>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text)',
              margin: 0,
              lineHeight: '1.2'
            }}>
              Paramètres d'affichage des animés
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '4px 0 0 0'
            }}>
              Choisissez les informations visibles par défaut sur les fiches animés
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{
        padding: '24px 28px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleSelectAll} className="btn btn-outline" style={{ fontSize: '13px' }}>
            Tout sélectionner
          </button>
          <button onClick={handleDeselectAll} className="btn btn-outline" style={{ fontSize: '13px' }}>
            Tout désélectionner
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px'
        }}>
          {FIELD_CATEGORIES.map((category) => (
            <div key={category.title} style={{
              border: '1px solid var(--border)',
              borderRadius: '12px',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>{category.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  {category.title}
                </span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {category.fields.map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      fontSize: '13px',
                      color: 'var(--text)'
                    }}
                  >
                    <span>{label}</span>
                    <Toggle checked={!!prefs[key]} onChange={() => handleToggle(key)} />
                  </label>
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
