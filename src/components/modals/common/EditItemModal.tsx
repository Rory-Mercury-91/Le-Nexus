import { Check, Languages, Loader2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { FormField, useFormValidation } from '../../../hooks/common/useFormValidation';
import { useToast } from '../../../hooks/common/useToast';
import { useTranslation } from '../../../hooks/common/useTranslation';
import { getTmdbImageUrl } from '../../../utils/tmdb';
import CoverImageUpload from './CoverImageUpload';
import Modal from './Modal';
import ModalHeader from './ModalHeader';
import { useModalEscape } from './useModalEscape';

/**
 * Configuration pour EditItemModal
 */
export interface EditItemModalConfig<TItem> {
  /** Titre de la modale */
  title: string;
  /** Type de média (movie, series, etc.) */
  mediaType: string;
  /** Item à éditer */
  item: TItem;
  /** Champs du formulaire */
  formFields: FormField[];
  /** Fonction pour extraire les valeurs initiales de l'item */
  extractInitialValues: (item: TItem) => Record<string, any>;
  /** Fonction pour normaliser les chemins d'image (TMDb vs local) */
  normalizeImagePath?: (path: string | null | undefined) => string;
  /** Fonction pour formater la popularité */
  formatPopularite?: (value: number | null | undefined) => string;
  /** Fonction pour mettre à jour l'item */
  updateApi: (itemId: number | string, data: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  /** Message de succès */
  successMessage?: string;
}

interface EditItemModalProps<TItem> {
  config: EditItemModalConfig<TItem>;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Composant générique pour éditer un item
 * Utilisé par EditMovieModal, EditSeriesModal, etc.
 */
export default function EditItemModal<TItem extends { id: number | string; titre?: string }>({
  config,
  onClose,
  onSuccess
}: EditItemModalProps<TItem>) {
  const {
    title,
    mediaType,
    item,
    formFields,
    extractInitialValues,
    normalizeImagePath = (path) => {
      if (!path) return '';
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      if (path.startsWith('/')) {
        return getTmdbImageUrl(path, 'original') || path;
      }
      return path;
    },
    formatPopularite = (value) => {
      if (value == null) return '';
      return value.toString().replace(',', '.');
    },
    updateApi,
    successMessage = 'Élément modifié avec succès'
  } = config;

  const { showToast, ToastContainer } = useToast();
  const { validateAndNormalize } = useFormValidation();
  const { translate, translating } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Extraire les valeurs initiales
  const initialValues = extractInitialValues(item);

  // Tracker les champs modifiés (pour afficher l'icône ✅)
  const [, setChangedFields] = useState<Set<string>>(new Set());
  // Tracker les champs validés par l'utilisateur (icône ✅ cliquée)
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());

  // Fonction pour vérifier si un champ a changé
  const isFieldChanged = (fieldKey: string): boolean => {
    const currentValue = formData[fieldKey];
    const initialValue = normalizedInitialValues[fieldKey];

    // Normaliser pour la comparaison
    const normalize = (val: any): string | null => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed || null;
      }
      return String(val);
    };

    return normalize(currentValue) !== normalize(initialValue);
  };

  // Fonction pour valider/invalider un champ
  const toggleFieldValidation = (fieldKey: string) => {
    setValidatedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  };

  // Appliquer les normalisations
  const normalizedInitialValues: Record<string, any> = { ...initialValues };
  if (normalizedInitialValues.poster_path !== undefined) {
    normalizedInitialValues.poster_path = normalizeImagePath(normalizedInitialValues.poster_path);
  }
  if (normalizedInitialValues.backdrop_path !== undefined) {
    normalizedInitialValues.backdrop_path = normalizeImagePath(normalizedInitialValues.backdrop_path);
  }
  if (normalizedInitialValues.popularite !== undefined) {
    normalizedInitialValues.popularite = formatPopularite(normalizedInitialValues.popularite);
  }

  const [formData, setFormData] = useState<Record<string, any>>(normalizedInitialValues);

  useModalEscape(onClose, saving);

  // Normaliser le chemin pour la sauvegarde (convertir URL TMDb en chemin relatif)
  const normalizePathForSave = (path: string | null | undefined): string | null => {
    if (!path) return null;
    // Si c'est une URL TMDB complète, extraire le chemin relatif
    if (path.startsWith('https://image.tmdb.org/t/p/')) {
      const match = path.match(/\/t\/p\/[^/]+\/(.+)$/);
      if (match && match[1]) {
        return `/${match[1]}`;
      }
    }
    // Si c'est déjà un chemin relatif ou une URL complète autre, retourner tel quel
    return path || null;
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si des champs sont validés, n'envoyer que ceux-là (comme EditMalItemModal)
    // Sinon, envoyer tous les champs (comportement par défaut pour compatibilité)
    let submitData: Record<string, any>;

    if (validatedFields.size > 0) {
      // Normaliser UNIQUEMENT les champs validés par l'utilisateur
      submitData = {};

      for (const fieldKey of validatedFields) {
        const field = formFields.find(f => f.key === fieldKey);
        if (!field) continue;

        const value = formData[fieldKey];
        let normalizedValue: any;

        if (field.type === 'number') {
          if (value === '' || value === null || value === undefined) {
            continue;
          }
          normalizedValue = field.step === '0.001' || field.step === '0.01'
            ? parseFloat(String(value))
            : parseInt(String(value), 10);
          if (isNaN(normalizedValue)) {
            continue;
          }
        } else if (field.type === 'text' || field.type === 'textarea') {
          const trimmed = String(value || '').trim();
          if (field.key === 'titre' && !trimmed) {
            continue;
          }
          if (!trimmed) {
            normalizedValue = null;
          } else {
            normalizedValue = trimmed;
          }
        } else if (field.type === 'date') {
          if (!value) {
            continue;
          }
          normalizedValue = value;
        } else if (field.type === 'select') {
          if (value === '' || value === null || value === undefined) {
            normalizedValue = null;
          } else {
            normalizedValue = value;
          }
        } else {
          if (value === null || value === undefined || value === '') {
            continue;
          }
          normalizedValue = value;
        }

        // Normaliser les chemins d'image
        if (field.key === 'poster_path' || field.key === 'backdrop_path') {
          normalizedValue = normalizePathForSave(normalizedValue);
        }

        submitData[fieldKey] = normalizedValue;
      }

      // Préserver les genres si présents dans l'item original
      if ('genres' in item && (item as any).genres) {
        submitData.genres = (item as any).genres;
      }
    } else {
      // Comportement par défaut : envoyer tous les champs
      submitData = validateAndNormalize(formData, formFields, {
        normalizeValue: (field, value) => {
          // Normaliser les chemins d'image
          if (field.key === 'poster_path' || field.key === 'backdrop_path') {
            return normalizePathForSave(value);
          }
          return undefined; // Utiliser la normalisation par défaut
        },
        preserveValues: () => {
          // Préserver les genres si présents dans l'item original
          if ('genres' in item && (item as any).genres) {
            return { genres: (item as any).genres };
          }
          return {};
        }
      }) || {};
    }

    if (!submitData || Object.keys(submitData).length === 0) {
      return; // Aucune donnée à envoyer
    }

    setSaving(true);

    try {

      const result = await updateApi(item.id, submitData);

      if (result.success) {
        showToast({ title: successMessage, type: 'success' });
        // Réinitialiser les champs validés après une sauvegarde réussie
        setValidatedFields(new Set());
        setChangedFields(new Set());
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        showToast({ title: result.error || 'Erreur lors de la modification', type: 'error' });
      }
    } catch (error: any) {
      console.error('Erreur modification:', error);
      showToast({ title: error?.message || `Erreur lors de la modification de ${title.toLowerCase()}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.key] || '';
    const hasChanged = isFieldChanged(field.key);
    const isValidated = validatedFields.has(field.key);

    // Composant pour l'icône de validation
    const ValidationIcon = () => {
      // Si le champ est validé, TOUJOURS afficher l'icône verte (même si modifié à nouveau)
      // Sinon, afficher l'icône jaune seulement si le champ a changé
      if (!isValidated && !hasChanged) return null;

      // Si validé, l'icône est toujours verte, peu importe si le champ a changé à nouveau
      const iconColor = isValidated ? '#22c55e' : '#eab308';
      const iconBackground = isValidated ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)';
      const iconBorder = isValidated ? 'rgba(34, 197, 94, 0.5)' : 'rgba(234, 179, 8, 0.5)';

      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFieldValidation(field.key);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            background: iconBackground,
            border: `1px solid ${iconBorder}`,
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '8px',
            transition: 'all 0.2s ease'
          }}
          title={isValidated ? 'Champ validé (sera sauvegardé) - Cliquer pour invalider' : 'Cliquer pour valider ce champ'}
        >
          <Check
            size={16}
            style={{
              color: iconColor,
              opacity: isValidated ? 1 : 0.7
            }}
          />
        </button>
      );
    };

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
              <span>
                {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
              </span>
              <ValidationIcon />
            </label>
            <textarea
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, [field.key]: e.target.value });
                setTimeout(() => {
                  if (isFieldChanged(field.key)) {
                    setChangedFields(prev => new Set(prev).add(field.key));
                  } else {
                    setChangedFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(field.key);
                      return newSet;
                    });
                  }
                }, 0);
              }}
              className="input"
              rows={4}
              placeholder={field.placeholder}
              style={{ resize: 'vertical' }}
              required={field.required}
            />
            {/* Bouton de traduction pour synopsis/description */}
            {(field.key === 'synopsis' || field.key === 'description') && (
              <button
                type="button"
                onClick={() => {
                  translate({
                    text: value || '',
                    onTranslated: (translatedText) => {
                      setFormData({ ...formData, [field.key]: translatedText });
                      setTimeout(() => {
                        setChangedFields(prev => new Set(prev).add(field.key));
                        setValidatedFields(prev => new Set(prev).add(field.key));
                      }, 0);
                    },
                    minLength: 10,
                    errorMessage: 'Le texte est trop court pour être traduit'
                  });
                }}
                disabled={!value || value.length < 10 || translating || saving}
                className="btn"
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  padding: '8px 12px',
                  background: translating ? 'var(--surface)' : 'rgba(99, 102, 241, 0.1)',
                  color: translating ? 'var(--text-secondary)' : 'var(--primary)',
                  border: '1px solid',
                  borderColor: translating ? 'var(--border)' : 'var(--primary)'
                }}
              >
                {translating ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Traduction en cours...
                  </>
                ) : (
                  <>
                    <Languages size={16} />
                    Traduire en français
                  </>
                )}
              </button>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
              <span>
                {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
              </span>
              <ValidationIcon />
            </label>
            <select
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, [field.key]: e.target.value });
                setTimeout(() => {
                  if (isFieldChanged(field.key)) {
                    setChangedFields(prev => new Set(prev).add(field.key));
                  } else {
                    setChangedFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(field.key);
                      return newSet;
                    });
                  }
                }, 0);
              }}
              className="select"
              required={field.required}
            >
              <option value="">-- Non défini --</option>
              {field.options?.map((opt: { value: string; label: string }) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div key={field.key}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
              <span>
                {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
              </span>
              <ValidationIcon />
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, [field.key]: e.target.value });
                setTimeout(() => {
                  if (isFieldChanged(field.key)) {
                    setChangedFields(prev => new Set(prev).add(field.key));
                  } else {
                    setChangedFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(field.key);
                      return newSet;
                    });
                  }
                }, 0);
              }}
              className="input"
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              required={field.required}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.key}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
              <span>
                {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
              </span>
              <ValidationIcon />
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, [field.key]: e.target.value });
                setTimeout(() => {
                  if (isFieldChanged(field.key)) {
                    setChangedFields(prev => new Set(prev).add(field.key));
                  } else {
                    setChangedFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(field.key);
                      return newSet;
                    });
                  }
                }, 0);
              }}
              className="input"
              required={field.required}
            />
          </div>
        );

      default: // text
        return (
          <div key={field.key}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
              <span>
                {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
              </span>
              <ValidationIcon />
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, [field.key]: e.target.value });
                setTimeout(() => {
                  if (isFieldChanged(field.key)) {
                    setChangedFields(prev => new Set(prev).add(field.key));
                  } else {
                    setChangedFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(field.key);
                      return newSet;
                    });
                  }
                }, 0);
              }}
              className="input"
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );
    }
  };

  // Filtrer les champs techniques qui sont gérés par CoverImageUpload
  const visibleFields = formFields.filter(f =>
    f.key !== 'poster_path' && f.key !== 'backdrop_path'
  );

  return (
    <Fragment>
      <Modal maxWidth="900px">
        <ModalHeader title={title} onClose={onClose} />

        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {/* Colonne image */}
              <CoverImageUpload
                imageUrl={formData.poster_path || ''}
                onImageChange={(url) => {
                  setFormData({ ...formData, poster_path: url });
                  setTimeout(() => {
                    if (isFieldChanged('poster_path')) {
                      setChangedFields(prev => new Set(prev).add('poster_path'));
                    } else {
                      setChangedFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('poster_path');
                        return newSet;
                      });
                    }
                  }, 0);
                }}
                mediaType={mediaType}
                itemTitle={formData.titre || item.titre || 'Item'}
              />

              {/* Colonne formulaire */}
              <div style={{ flex: 1 }}>
                {visibleFields.length > 6 ? (
                  // Si beaucoup de champs, utiliser 2 colonnes
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {visibleFields.map(field => renderField(field))}
                  </div>
                ) : (
                  // Sinon, une seule colonne
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {visibleFields.map(field => renderField(field))}
                  </div>
                )}
              </div>
            </div>

            {/* Boutons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || (formFields.find(f => f.required) && !formData[formFields.find(f => f.required)!.key]?.trim())}
              >
                {saving ? 'Modification en cours...' : 'Modifier'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
      {ToastContainer}
    </Fragment>
  );
}
