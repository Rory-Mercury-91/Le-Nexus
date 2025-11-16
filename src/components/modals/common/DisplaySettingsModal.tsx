import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

type FieldKey =
  | 'couverture' | 'titre' | 'description'
  | 'annee_publication' | 'annee_vf'
  | 'nb_volumes' | 'nb_volumes_vf'
  | 'nb_chapitres' | 'nb_chapitres_vf'
  | 'demographie' | 'langue_originale'
  | 'rating' | 'editeur' | 'editeur_vo' | 'serialization'
  | 'genres' | 'themes' | 'auteurs' | 'media_type' | 'date_debut' | 'date_fin'
  | 'mal_id' | 'titres_alternatifs' | 'type_volume'
  | 'statut_publication' | 'statut_publication_vf' | 'mal_block';

interface FieldCategory {
  title: string;
  icon: string;
  fields: { key: FieldKey; label: string }[];
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    title: 'Informations principales',
    icon: '📚',
    fields: [
      { key: 'couverture', label: 'Couverture' },
      { key: 'titre', label: 'Titre' },
      { key: 'description', label: 'Description / Synopsis' },
      { key: 'titres_alternatifs', label: 'Titres alternatifs' }
    ]
  },
  {
    title: 'Publication',
    icon: '📅',
    fields: [
      { key: 'annee_publication', label: 'Année de publication (VO)' },
      { key: 'annee_vf', label: 'Année de publication (VF)' },
      { key: 'date_debut', label: 'Date de début' },
      { key: 'date_fin', label: 'Date de fin' },
      { key: 'statut_publication', label: 'Statut de publication (VO)' },
      { key: 'statut_publication_vf', label: 'Statut de publication (VF)' }
    ]
  },
  {
    title: 'Volumes et chapitres',
    icon: '📖',
    fields: [
      { key: 'nb_volumes', label: 'Nombre de volumes (VO)' },
      { key: 'nb_volumes_vf', label: 'Nombre de volumes (VF)' },
      { key: 'nb_chapitres', label: 'Nombre de chapitres (VO)' },
      { key: 'nb_chapitres_vf', label: 'Nombre de chapitres (VF)' },
      { key: 'type_volume', label: 'Type de volume' }
    ]
  },
  {
    title: 'Classification',
    icon: '🏷️',
    fields: [
      { key: 'genres', label: 'Genres' },
      { key: 'themes', label: 'Thèmes' },
      { key: 'demographie', label: 'Démographie' },
      { key: 'rating', label: 'Classification / Rating' },
      { key: 'media_type', label: 'Type de média' }
    ]
  },
  {
    title: 'Édition',
    icon: '🏢',
    fields: [
      { key: 'editeur', label: 'Éditeur (VF)' },
      { key: 'editeur_vo', label: 'Éditeur (VO)' },
      { key: 'serialization', label: 'Sérialisation' },
      { key: 'langue_originale', label: 'Langue originale' }
    ]
  },
  {
    title: 'Créateurs',
    icon: '✍️',
    fields: [
      { key: 'auteurs', label: 'Auteurs' }
    ]
  },
  {
    title: 'MyAnimeList',
    icon: '🔗',
    fields: [
      { key: 'mal_id', label: 'ID MyAnimeList' },
      { key: 'mal_block', label: 'Bloc MyAnimeList' }
    ]
  }
];

const DEFAULTS: Record<FieldKey, boolean> = {
  couverture: true,
  titre: true,
  description: true,
  annee_publication: true,
  annee_vf: true,
  nb_volumes: true,
  nb_volumes_vf: true,
  nb_chapitres: true,
  nb_chapitres_vf: true,
  demographie: true,
  langue_originale: true,
  rating: true,
  editeur: true,
  editeur_vo: true,
  serialization: true,
  genres: true,
  themes: true,
  auteurs: true,
  media_type: true,
  date_debut: true,
  date_fin: true,
  mal_id: true,
  titres_alternatifs: true,
  type_volume: true,
  statut_publication: true,
  statut_publication_vf: true,
  mal_block: true
};

interface DisplaySettingsModalProps {
  onClose: () => void;
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

export default function DisplaySettingsModal({ onClose, showToast }: DisplaySettingsModalProps) {
  useModalEscape(onClose, false);
  
  const [prefs, setPrefs] = useState<Record<FieldKey, boolean>>(DEFAULTS);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.getMangaDisplaySettings?.();
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
        await window.electronAPI.saveMangaDisplaySettings?.(prefs);
        showToast({
          title: 'Paramètres sauvegardés',
          message: 'Les préférences d\'affichage ont été enregistrées',
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
      {/* Header fixe */}
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
            📋
          </div>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text)',
              margin: 0,
              lineHeight: '1.2'
            }}>
              Paramètres d'affichage des mangas
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '4px 0 0 0'
            }}>
              Choisissez les informations à afficher
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

      {/* Content scrollable */}
      <div style={{
        padding: '28px',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <div style={{ 
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(var(--primary-rgb), 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(var(--primary-rgb), 0.2)'
        }}>
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)', 
            lineHeight: '1.6',
            margin: 0
          }}>
            💡 Ces paramètres contrôlent uniquement l'affichage dans les cartes et pages de détails. 
            Tous les champs sont toujours enrichis automatiquement en arrière-plan.
          </p>
        </div>

        {/* Boutons de sélection globale */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '2px solid var(--border)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text)',
            margin: 0
          }}>
            Catégories de champs
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleSelectAll} 
              className="btn btn-outline" 
              style={{ 
                fontSize: '13px', 
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              ✓ Tout sélectionner
            </button>
            <button 
              onClick={handleDeselectAll} 
              className="btn btn-outline" 
              style={{ 
                fontSize: '13px', 
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              ✗ Tout désélectionner
            </button>
          </div>
        </div>

        {/* Catégories organisées */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr',
          gap: '20px'
        }}>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* En-tête de catégorie */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(var(--primary-rgb), 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  {category.icon}
                </div>
                <h4 style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--text)',
                  margin: 0
                }}>
                  {category.title}
                </h4>
              </div>

              {/* Champs de la catégorie */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '10px'
              }}>
                {category.fields.map((field) => (
                  <div 
                    key={field.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggle(field.key)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.08)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{
                      fontSize: '13px',
                      color: 'var(--text)',
                      fontWeight: '500',
                      flex: 1
                    }}>
                      {field.label}
                    </span>
                    <Toggle 
                      checked={!!prefs[field.key]} 
                      onChange={() => handleToggle(field.key)} 
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer avec bouton Fermer */}
      <div style={{
        padding: '20px 28px',
        borderTop: '2px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
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
