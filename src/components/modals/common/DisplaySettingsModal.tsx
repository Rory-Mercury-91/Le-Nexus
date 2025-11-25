import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Toggle from '../../common/Toggle';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

export interface DisplayField {
  key: string;
  label: string;
  category?: string; // Optionnel : pour grouper les champs
}

export interface DisplayFieldCategory {
  title: string;
  icon: string;
  fields: DisplayField[];
}

export type DisplayPreferencesMode = 'global' | 'global-local';

export interface DisplaySettingsModalProps {
  /**
   * Titre de la modale
   */
  title: string;

  /**
   * Description optionnelle
   */
  description?: string;

  /**
   * Liste des champs à afficher (peut être une liste simple ou des catégories)
   */
  fields: DisplayField[] | DisplayFieldCategory[];

  /**
   * Mode de fonctionnement : 'global' (simple) ou 'global-local' (avec overrides)
   */
  mode: DisplayPreferencesMode;

  /**
   * ID de l'item pour le mode 'global-local' (null pour mode 'global')
   */
  itemId?: number | null;

  /**
   * Callback pour charger les préférences globales
   */
  loadGlobalPrefs: () => Promise<Record<string, boolean>>;

  /**
   * Callback pour sauvegarder les préférences globales (mode 'global')
   */
  saveGlobalPrefs?: (prefs: Record<string, boolean>) => Promise<void>;

  /**
   * Callback pour charger les overrides locaux (mode 'global-local')
   */
  loadLocalOverrides?: (itemId: number) => Promise<Record<string, boolean>>;

  /**
   * Callback pour sauvegarder les overrides locaux (mode 'global-local')
   */
  saveLocalOverrides?: (itemId: number, overrides: Record<string, boolean>) => Promise<void>;

  /**
   * Callback pour supprimer des overrides locaux (mode 'global-local')
   */
  deleteLocalOverrides?: (itemId: number, keys: string[]) => Promise<void>;

  /**
   * Callback appelé après sauvegarde réussie
   */
  onSave?: () => void;

  /**
   * Callback appelé à la fermeture
   */
  onClose: () => void;

  /**
   * Optionnel : afficher un toast de succès
   */
  showToast?: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

/**
 * Composant générique pour les modales de préférences d'affichage.
 * Supporte deux modes :
 * - 'global' : Préférences globales simples (comme Movie/Series)
 * - 'global-local' : Préférences globales avec overrides locaux (comme Anime/Manga)
 */
export default function DisplaySettingsModal({
  title,
  description,
  fields,
  mode,
  itemId = null,
  loadGlobalPrefs,
  saveGlobalPrefs,
  loadLocalOverrides,
  saveLocalOverrides,
  deleteLocalOverrides,
  onSave,
  onClose,
  showToast
}: DisplaySettingsModalProps) {
  // Extraire tous les champs (plat) depuis fields ou categories
  const allFields: DisplayField[] = Array.isArray(fields) && fields.length > 0 && 'title' in fields[0]
    ? (fields as DisplayFieldCategory[]).flatMap(cat => cat.fields)
    : (fields as DisplayField[]);

  // Créer les valeurs par défaut (tous à true)
  const getDefaultPrefs = (): Record<string, boolean> => {
    const defaults: Record<string, boolean> = {};
    allFields.forEach(({ key }) => {
      defaults[key] = true;
    });
    return defaults;
  };

  const [prefs, setPrefs] = useState<Record<string, boolean>>(getDefaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Charger les préférences au montage
  useEffect(() => {
    (async () => {
      try {
        const defaults = getDefaultPrefs();
        const globalPrefs = await loadGlobalPrefs();

        if (mode === 'global-local' && itemId && loadLocalOverrides) {
          // Mode global-local : fusionner defaults -> global -> local
          const localOverrides = await loadLocalOverrides(itemId);
          const merged = { ...defaults, ...globalPrefs, ...localOverrides };
          setPrefs(merged);
          // Vérifier si on a des overrides locaux
          setIsLocalMode(Object.keys(localOverrides).length > 0);
        } else {
          // Mode global : fusionner defaults -> global
          setPrefs({ ...defaults, ...globalPrefs });
          setIsLocalMode(false);
        }
      } catch (error) {
        console.error('Erreur chargement préférences:', error);
        setPrefs(getDefaultPrefs());
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, itemId, loadGlobalPrefs, loadLocalOverrides]);

  useModalEscape(onClose, saving);

  const toggle = (key: string) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    // En mode global-local, activer le mode local si on modifie
    if (mode === 'global-local') {
      setIsLocalMode(true);
    }
  };

  const handleSelectAll = () => {
    setPrefs(getDefaultPrefs());
    if (mode === 'global-local') {
      setIsLocalMode(true);
    }
  };

  const handleDeselectAll = () => {
    const cleared = getDefaultPrefs();
    Object.keys(cleared).forEach(key => {
      cleared[key] = false;
    });
    setPrefs(cleared);
    if (mode === 'global-local') {
      setIsLocalMode(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'global') {
        // Mode global : sauvegarder directement
        if (saveGlobalPrefs) {
          await saveGlobalPrefs(prefs);
          showToast?.({
            title: 'Paramètres sauvegardés',
            message: 'Les préférences d\'affichage ont été enregistrées',
            type: 'success',
            duration: 2000
          });
        }
        onSave?.();
        onClose();
      } else if (mode === 'global-local' && itemId) {
        // Mode global-local : calculer les overrides
        const globalPrefs = await loadGlobalPrefs();
        const existingOverrides = loadLocalOverrides ? await loadLocalOverrides(itemId) : {};

        const overridesToSave: Record<string, boolean> = {};
        const overridesToDelete: string[] = [];

        // Utiliser les mêmes valeurs par défaut que lors du chargement
        const defaults = getDefaultPrefs();
        
        for (const key of allFields.map(f => f.key)) {
          // Valeur globale (ou défaut si non définie)
          const globalValue = globalPrefs[key] ?? defaults[key] ?? true;
          // Valeur actuelle dans la modale
          const currentValue = prefs[key] ?? defaults[key] ?? true;

          if (currentValue !== globalValue) {
            // Différent de la valeur globale → override à sauvegarder
            overridesToSave[key] = currentValue;
          } else if (key in existingOverrides) {
            // Identique à la valeur globale mais override existant → supprimer l'override
            overridesToDelete.push(key);
          }
        }

        if (saveLocalOverrides && Object.keys(overridesToSave).length > 0) {
          await saveLocalOverrides(itemId, overridesToSave);
        }

        if (deleteLocalOverrides && overridesToDelete.length > 0) {
          await deleteLocalOverrides(itemId, overridesToDelete);
        }

        showToast?.({
          title: 'Paramètres sauvegardés',
          message: 'Les préférences d\'affichage ont été enregistrées',
          type: 'success',
          duration: 2000
        });
        onSave?.();
        onClose();
      }
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
      showToast?.({
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les paramètres',
        type: 'error',
        duration: 3000
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  // Vérifier si on a des catégories
  const hasCategories = Array.isArray(fields) && fields.length > 0 && 'title' in fields[0];
  const categories = hasCategories ? (fields as DisplayFieldCategory[]) : null;

  return (
    <Modal 
      onClickOverlay={onClose}
      maxWidth={hasCategories ? "900px" : "700px"}
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
              {title}
            </h2>
            {description && (
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0'
              }}>
                {description}
              </p>
            )}
            {mode === 'global-local' && isLocalMode && !description && (
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0'
              }}>
                Les modifications locales surchargent les paramètres globaux pour cet item.
              </p>
            )}
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

        {/* Affichage avec catégories */}
        {hasCategories && categories ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px'
          }}>
            {categories.map((category) => (
              <div
                key={category.title}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
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
                      <Toggle checked={!!prefs[key]} onChange={() => toggle(key)} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Affichage simple (liste plate) */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {allFields.map((field) => (
              <div
                key={field.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  fontSize: '14px',
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => toggle(field.key)}
              >
                <span style={{ color: 'var(--text)' }}>{field.label}</span>
                <Toggle checked={!!prefs[field.key]} onChange={() => toggle(field.key)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '20px 28px',
          borderTop: '2px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}
      >
        <button
          onClick={onClose}
          className="btn btn-outline"
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '8px'
          }}
          disabled={saving}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '8px'
          }}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </div>
    </Modal>
  );
}
