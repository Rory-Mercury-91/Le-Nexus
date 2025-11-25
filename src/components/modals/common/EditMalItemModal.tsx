import { Check, Languages, Loader2, Upload, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { FormField } from '../../../hooks/common/useFormValidation';
import { useToast } from '../../../hooks/common/useToast';
import { useTranslation } from '../../../hooks/common/useTranslation';
import CoverImage from '../../common/CoverImage';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

/**
 * Configuration pour EditMalItemModal
 */
export interface EditMalItemModalConfig<TItem> {
  /** Titre de la modale */
  title: string;
  /** Type de média (anime, manga) */
  mediaType: 'anime' | 'manga';
  /** Item à éditer */
  item: TItem;
  /** Champs du formulaire (en plus des champs communs MAL) */
  formFields: FormField[];
  /** Fonction pour extraire les valeurs initiales de l'item */
  extractInitialValues: (item: TItem) => Record<string, any>;
  /** Fonction pour mettre à jour l'item */
  updateApi: (itemId: number | string, data: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  /** Message de succès */
  successMessage?: string;
  /** Support traduction background (pour Manga) */
  supportBackgroundTranslation?: boolean;
  /** Fonction pour traduire la description (optionnel, utilise translateText par défaut) */
  translateDescriptionApi?: (itemId: number | string) => Promise<{ success: boolean; translatedDescription?: string; error?: string }>;
  /** Fonction pour traduire le background (optionnel, pour Manga) */
  translateBackgroundApi?: (itemId: number | string) => Promise<{ success: boolean; translatedBackground?: string; error?: string }>;
  /** Fonction pour uploader l'image de couverture */
  uploadCoverApi: (itemTitle: string, itemType: string, options?: any) => Promise<{ success: boolean; localPath?: string; error?: string }>;
  /** Fonction pour supprimer l'ancienne image */
  deleteCoverApi?: (coverUrl: string) => Promise<void>;
}

interface EditMalItemModalProps<TItem> {
  config: EditMalItemModalConfig<TItem>;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Composant générique pour éditer un item Anime/Manga
 * Utilisé par AnimeEditModal, EditSerieModal
 */
export default function EditMalItemModal<TItem extends { id: number | string; titre?: string }>({
  config,
  onClose,
  onSuccess
}: EditMalItemModalProps<TItem>) {
  const {
    title,
    mediaType,
    item,
    formFields,
    extractInitialValues,
    updateApi,
    successMessage = 'Élément modifié avec succès',
    supportBackgroundTranslation = false,
    translateDescriptionApi,
    translateBackgroundApi,
    uploadCoverApi,
    deleteCoverApi
  } = config;

  const { showToast } = useToast();
  const { translate: translateText, translating: translatingText } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [translatingDescription, setTranslatingDescription] = useState(false);
  const [translatingBackground, setTranslatingBackground] = useState(false);

  // Extraire les valeurs initiales
  const initialValues = extractInitialValues(item);
  const [formData, setFormData] = useState<Record<string, any>>(initialValues);
  // Tracker les champs modifiés (pour afficher l'icône ✅)
  const [, setChangedFields] = useState<Set<string>>(new Set());
  // Tracker les champs validés par l'utilisateur (icône ✅ cliquée)
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());

  // Fonction pour vérifier si un champ a changé
  const isFieldChanged = (fieldKey: string): boolean => {
    const currentValue = formData[fieldKey];
    const initialValue = initialValues[fieldKey];

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

  useModalEscape(onClose, saving);

  // Upload d'image
  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (formData.couverture_url && formData.couverture_url.startsWith('covers/')) {
      if (deleteCoverApi) {
        await deleteCoverApi(formData.couverture_url);
      } else {
        await window.electronAPI.deleteCoverImage(formData.couverture_url);
      }
    }

    const result = await uploadCoverApi(
      formData.titre || item.titre || 'Item',
      mediaType,
      { mediaType: mediaType === 'anime' ? 'Anime' : 'Manga' }
    );

    if (result.success && result.localPath) {
      setFormData({ ...formData, couverture_url: result.localPath });
      setChangedFields(prev => new Set(prev).add('couverture_url'));
      setValidatedFields(prev => new Set(prev).add('couverture_url')); // Auto-valider l'upload
      showToast({ title: 'Image téléchargée avec succès', type: 'success' });
    } else if (result.error) {
      showToast({ title: result.error, type: 'error' });
    }
  };

  // Traduction description
  const handleTranslateDescription = async () => {
    if (translateDescriptionApi) {
      // Utiliser l'API spécifique (pour Manga)
      setTranslatingDescription(true);
      try {
        const result = await translateDescriptionApi(item.id);
        if (result.success && result.translatedDescription) {
          setFormData({ ...formData, description: result.translatedDescription });
          setChangedFields(prev => new Set(prev).add('description'));
          setValidatedFields(prev => new Set(prev).add('description')); // Auto-valider la traduction
          showToast({ title: 'Description traduite avec succès', type: 'success' });
        } else {
          showToast({ title: result.error || 'Erreur lors de la traduction', type: 'error' });
        }
      } catch (error: any) {
        console.error('Erreur traduction description:', error);
        showToast({ title: error?.message || 'Erreur lors de la traduction', type: 'error' });
      } finally {
        setTranslatingDescription(false);
      }
    } else {
      // Utiliser translateText générique (pour Anime)
      setTranslatingDescription(true);
      try {
        await translateText({
          text: formData.description || '',
          onTranslated: (translated) => {
            setFormData({ ...formData, description: translated });
            setChangedFields(prev => new Set(prev).add('description'));
            setValidatedFields(prev => new Set(prev).add('description')); // Auto-valider la traduction
          },
          minLength: 10,
          errorMessage: 'Description trop courte pour être traduite'
        });
      } finally {
        setTranslatingDescription(false);
      }
    }
  };

  // Traduction background (pour Manga)
  const handleTranslateBackground = async () => {
    if (!translateBackgroundApi) return;

    setTranslatingBackground(true);
    try {
      const result = await translateBackgroundApi(item.id);
      if (result.success && result.translatedBackground) {
        setFormData({ ...formData, background: result.translatedBackground });
        setChangedFields(prev => new Set(prev).add('background'));
        setValidatedFields(prev => new Set(prev).add('background')); // Auto-valider la traduction
        showToast({ title: 'Background traduit avec succès', type: 'success' });
      } else {
        showToast({ title: result.error || 'Erreur lors de la traduction', type: 'error' });
      }
    } catch (error: any) {
      console.error('Erreur traduction background:', error);
      showToast({ title: error?.message || 'Erreur lors de la traduction', type: 'error' });
    } finally {
      setTranslatingBackground(false);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier que le titre est présent si c'est un champ requis
    const titreField = formFields.find(f => f.key === 'titre' && f.required);
    if (titreField) {
      const titreValue = formData.titre;
      if (!titreValue || (typeof titreValue === 'string' && !titreValue.trim())) {
        showToast({
          title: `Le champ "${titreField.label}" est obligatoire`,
          type: 'error'
        });
        return;
      }
    }

    // Normaliser UNIQUEMENT les champs validés par l'utilisateur
    const filteredData: Record<string, any> = {};

    for (const fieldKey of validatedFields) {
      const field = formFields.find(f => f.key === fieldKey);
      if (!field) continue;

      const value = formData[fieldKey];

      // Normaliser selon le type (uniquement pour la conversion de type)
      let normalizedValue: any;

      if (field.type === 'number') {
        // Pour les nombres, convertir string -> number
        if (value === '' || value === null || value === undefined) {
          // Champ vide : ne pas l'envoyer (pour ne pas écraser avec null)
          continue;
        }
        normalizedValue = field.step === '0.001' || field.step === '0.01'
          ? parseFloat(String(value))
          : parseInt(String(value), 10);
        if (isNaN(normalizedValue)) {
          // Valeur invalide : ne pas l'envoyer
          continue;
        }
      } else if (field.type === 'text' || field.type === 'textarea') {
        const trimmed = String(value || '').trim();
        // Pour le titre (obligatoire) : exclure s'il est vide
        if (field.key === 'titre' && !trimmed) {
          console.warn(`⚠️ Le titre est vide, exclusion de la mise à jour`);
          continue;
        }
        // Pour les autres champs : si validé et vide, envoyer null pour permettre de vider le champ
        if (!trimmed) {
          // Le champ est validé (on est dans la boucle validatedFields), donc on envoie null pour le vider
          normalizedValue = null;
        } else {
          normalizedValue = trimmed;
        }
      } else if (field.type === 'date') {
        // Pour les dates : si vide, ne pas l'envoyer
        if (!value) {
          continue;
        }
        normalizedValue = value;
      } else if (field.type === 'checkbox') {
        // Pour les checkboxes : toujours envoyer (true/false)
        normalizedValue = value || false;
      } else if (field.type === 'select') {
        // Pour les selects : si validé, envoyer même si vide (permet de supprimer)
        // Si vide, envoyer null pour supprimer le champ
        if (value === '' || value === null || value === undefined) {
          normalizedValue = null;
        } else {
          normalizedValue = value;
        }
      } else {
        // Autres types : si vide, ne pas l'envoyer
        if (value === null || value === undefined || value === '') {
          continue;
        }
        normalizedValue = value;
      }

      // Ajouter la valeur normalisée (même si null pour les champs validés)
      filteredData[fieldKey] = normalizedValue;
    }

    setSaving(true);
    try {
      const result = await updateApi(item.id, filteredData);

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

      // Améliorer le message d'erreur pour les contraintes UNIQUE
      let errorMessage = error?.message || `Erreur lors de la modification de ${title.toLowerCase()}`;
      if (errorMessage.includes('UNIQUE constraint failed') && errorMessage.includes('mal_id')) {
        errorMessage = 'Entrée déjà présente dans la collection';
      }

      showToast({ title: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Rendre un champ
  const renderField = (field: FormField, labelHeight?: number) => {
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
          <div key={field.key} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', fontWeight: '600', minHeight: labelHeight ? `${labelHeight}px` : '44px', height: labelHeight ? `${labelHeight}px` : 'auto' }}>
              <span style={{ flex: 1, lineHeight: '1.5', wordBreak: 'break-word' }}>
                {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
              </span>
              <ValidationIcon />
            </label>
            <textarea
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                setFormData({ ...formData, [field.key]: newValue });
                // Mettre à jour changedFields après le changement
                // IMPORTANT: Ne JAMAIS retirer de validatedFields - une fois validé, ça reste validé jusqu'à l'enregistrement
                // Même si on modifie à nouveau le champ, il reste validé et l'icône reste verte
                setTimeout(() => {
                  if (isFieldChanged(field.key)) {
                    setChangedFields(prev => new Set(prev).add(field.key));
                    // Si le champ est déjà validé et qu'on le modifie, il reste validé (on garde la nouvelle valeur)
                    // validatedFields n'est PAS modifié ici - il reste tel quel
                  } else {
                    setChangedFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(field.key);
                      return newSet;
                    });
                    // Ne PAS retirer de validatedFields - une fois validé, ça reste validé jusqu'à l'enregistrement
                  }
                }, 0);
              }}
              className="input"
              rows={4}
              placeholder={field.placeholder}
              style={{ resize: 'vertical', minHeight: '100px', height: '100px' }}
              required={field.required}
            />
            {/* Bouton traduction pour description */}
            {field.key === 'description' && (
              <button
                type="button"
                onClick={handleTranslateDescription}
                disabled={!formData.description || formData.description.length < 10 || translatingDescription || translatingText || saving}
                className="btn"
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  padding: '8px 12px',
                  background: (translatingDescription || translatingText) ? 'var(--surface)' : 'rgba(99, 102, 241, 0.1)',
                  color: (translatingDescription || translatingText) ? 'var(--text-secondary)' : 'var(--primary)',
                  border: '1px solid',
                  borderColor: (translatingDescription || translatingText) ? 'var(--border)' : 'var(--primary)'
                }}
              >
                {(translatingDescription || translatingText) ? (
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
            {/* Bouton traduction pour background */}
            {field.key === 'background' && (
              supportBackgroundTranslation ? (
                <button
                  type="button"
                  onClick={handleTranslateBackground}
                  disabled={!formData.background || formData.background.length < 10 || translatingBackground || saving}
                  className="btn"
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    padding: '8px 12px',
                    background: translatingBackground ? 'var(--surface)' : 'rgba(99, 102, 241, 0.1)',
                    color: translatingBackground ? 'var(--text-secondary)' : 'var(--primary)',
                    border: '1px solid',
                    borderColor: translatingBackground ? 'var(--border)' : 'var(--primary)'
                  }}
                >
                  {translatingBackground ? (
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
              ) : (
                <button
                  type="button"
                  onClick={handleTranslateDescription}
                  disabled={!formData.background || formData.background.length < 10 || translatingDescription || translatingText || saving}
                  className="btn"
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    padding: '8px 12px',
                    background: (translatingDescription || translatingText) ? 'var(--surface)' : 'rgba(99, 102, 241, 0.1)',
                    color: (translatingDescription || translatingText) ? 'var(--text-secondary)' : 'var(--primary)',
                    border: '1px solid',
                    borderColor: (translatingDescription || translatingText) ? 'var(--border)' : 'var(--primary)'
                  }}
                >
                  {(translatingDescription || translatingText) ? (
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
              )
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', fontWeight: '600', minHeight: labelHeight ? `${labelHeight}px` : '44px', height: labelHeight ? `${labelHeight}px` : 'auto' }}>
              <span style={{ flex: 1, lineHeight: '1.5', wordBreak: 'break-word' }}>
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
                    // Ne PAS retirer de validatedFields - une fois validé, ça reste validé
                  }
                }, 0);
              }}
              className="select"
              required={field.required}
              style={{
                height: '40px',
                width: '100%',
                minWidth: '200px',
                padding: '8px 12px',
                fontSize: '14px'
              }}
            >
              {field.options ? (
                field.options.map((opt: { value: string; label: string }) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))
              ) : (
                <option value="">-- Non défini --</option>
              )}
            </select>
          </div>
        );

      case 'number':
        return (
          <div key={field.key} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', fontWeight: '600', minHeight: labelHeight ? `${labelHeight}px` : '44px', height: labelHeight ? `${labelHeight}px` : 'auto' }}>
              <span style={{ flex: 1, lineHeight: '1.5', wordBreak: 'break-word' }}>
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
                    // Ne PAS retirer de validatedFields - une fois validé, ça reste validé
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
          <div key={field.key} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', fontWeight: '600', minHeight: labelHeight ? `${labelHeight}px` : '44px', height: labelHeight ? `${labelHeight}px` : 'auto' }}>
              <span style={{ flex: 1, lineHeight: '1.5', wordBreak: 'break-word' }}>
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
                    // Ne PAS retirer de validatedFields - une fois validé, ça reste validé
                  }
                }, 0);
              }}
              className="input"
              required={field.required}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontWeight: '600', marginBottom: '8px', minHeight: labelHeight ? `${labelHeight}px` : '44px', height: labelHeight ? `${labelHeight}px` : 'auto' }}>
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => {
                  setFormData({ ...formData, [field.key]: e.target.checked });
                  setTimeout(() => {
                    if (isFieldChanged(field.key)) {
                      setChangedFields(prev => new Set(prev).add(field.key));
                    } else {
                      setChangedFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(field.key);
                        return newSet;
                      });
                      // Ne PAS retirer de validatedFields - une fois validé, ça reste validé jusqu'à l'enregistrement
                    }
                  }, 0);
                }}
                style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0 }}
              />
              <span style={{ flex: 1, lineHeight: '1.5', wordBreak: 'break-word' }}>{field.label}</span>
              <ValidationIcon />
            </label>
            {/* Espaceur pour aligner avec les autres champs */}
            <div style={{ height: '40px', flexShrink: 0 }}></div>
          </div>
        );

      default: // text
        return (
          <div key={field.key} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', fontWeight: '600', minHeight: labelHeight ? `${labelHeight}px` : '44px', height: labelHeight ? `${labelHeight}px` : 'auto' }}>
              <span style={{ flex: 1, lineHeight: '1.5', wordBreak: 'break-word' }}>
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
                    // Ne PAS retirer de validatedFields - une fois validé, ça reste validé
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

  // Champs communs MAL (titre, titres alternatifs, couverture)
  const commonMalFields: FormField[] = [
    { key: 'titre', type: 'text', label: 'Titre *', placeholder: `Titre du ${mediaType}`, required: true },
    { key: 'titre_romaji', type: 'text', label: 'Titre romaji (optionnel)', placeholder: 'Romaji Title', required: false },
    { key: 'titre_natif', type: 'text', label: 'Titre natif (optionnel)', placeholder: '日本語タイトル', required: false },
    { key: 'titre_anglais', type: 'text', label: 'Titre anglais (optionnel)', placeholder: 'English Title', required: false },
    { key: 'titres_alternatifs', type: 'text', label: 'Titres alternatifs (optionnel)', placeholder: 'Titre alt 1, Titre alt 2', required: false },
    { key: 'couverture_url', type: 'text', label: 'URL couverture (géré par upload)', required: false }
  ];

  // Tous les champs (communs + spécifiques)
  const allFields = [...commonMalFields, ...formFields];

  // Filtrer les champs techniques
  const visibleFields = allFields.filter(f => f.key !== 'couverture_url');

  // Organiser les champs selon la structure spécifique demandée
  const organizeFieldsByStructure = (fields: FormField[]) => {
    const findField = (key: string) => fields.find(f => f.key === key);

    return {
      // Titres
      titre: findField('titre'),
      titre_romaji: findField('titre_romaji'),
      titre_natif: findField('titre_natif'),
      titre_anglais: findField('titre_anglais'),
      titres_alternatifs: findField('titres_alternatifs'),

      // Dates
      date_debut: findField('date_debut'),
      date_fin: findField('date_fin'),
      date_sortie_vf: findField('date_sortie_vf'),
      date_debut_streaming: findField('date_debut_streaming'),

      // Informations (textes) - Animes
      source: findField('source'),
      duree: findField('duree'),
      statut_diffusion: findField('statut_diffusion'),
      saison_diffusion: findField('saison_diffusion'),
      annee: findField('annee'),
      nb_episodes: findField('nb_episodes'),
      franchise_order: findField('franchise_order'),
      genres: findField('genres'),
      themes: findField('themes'),
      demographics: findField('demographics'),
      franchise_name: findField('franchise_name'),
      rating: findField('rating'),
      age_conseille: findField('age_conseille'),
      studios: findField('studios'),
      producteurs: findField('producteurs'),
      diffuseurs: findField('diffuseurs'),
      editeur: findField('editeur'),
      site_web: findField('site_web'),
      mal_url: findField('mal_url'),

      // Informations (textes) - Mangas
      statut_publication: findField('statut_publication'),
      statut_publication_vf: findField('statut_publication_vf'),
      langue_originale: findField('langue_originale'),
      editeur_vo: findField('editeur_vo'),
      serialization: findField('serialization'),
      auteurs: findField('auteurs'),
      media_type: findField('media_type'),
      demographie: findField('demographie'),

      // Sélections et Options
      type: findField('type'),
      type_volume: findField('type_volume'),
      en_cours_diffusion: findField('en_cours_diffusion'),

      // Données MyAnimeList (nombres) - Animes
      score: findField('score'),
      rank_mal: findField('rank_mal'),
      popularity_mal: findField('popularity_mal'),
      scored_by: findField('scored_by'),
      favorites: findField('favorites'),
      prequel_mal_id: findField('prequel_mal_id'),
      sequel_mal_id: findField('sequel_mal_id'),

      // Données MyAnimeList (nombres) - Mangas
      annee_publication: findField('annee_publication'),
      annee_vf: findField('annee_vf'),
      nb_chapitres: findField('nb_chapitres'),
      nb_chapitres_vf: findField('nb_chapitres_vf'),
      nb_volumes: findField('nb_volumes'),
      nb_volumes_vf: findField('nb_volumes_vf'),
      mal_id: findField('mal_id'),
      score_mal: findField('score_mal'),

      // Descriptions (textareas)
      description: findField('description'),
      background: findField('background'),

      // Liens JSON
      liens_externes: findField('liens_externes'),
      liens_streaming: findField('liens_streaming')
    };
  };

  const organizedFields = organizeFieldsByStructure(visibleFields);

  // Fonction helper pour rendre un champ avec validation
  const renderFieldWithValidation = (field: FormField | undefined, labelHeight?: number) => {
    if (!field) return null;
    return renderField(field, labelHeight);
  };

  // Fonction helper pour rendre une grille de champs avec alignement
  const renderFieldGrid = (fields: (FormField | undefined)[], columns: number = 2) => {
    const validFields = fields.filter(f => f !== undefined) as FormField[];
    if (validFields.length === 0) return null;

    // Trouver le label le plus long pour déterminer la hauteur minimale
    const maxLabelLength = Math.max(...validFields.map(f => (f.label || '').length));
    // Si un label fait plus de 50 caractères, il prendra probablement 2 lignes
    const labelHeight = maxLabelLength > 50 ? 66 : 44;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px', alignItems: 'start' }}>
        {validFields.map(field => (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column' }}>
            {renderField(field, labelHeight)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Fragment>
      <Modal maxWidth="1000px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px 16px',
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <form id="mal-edit-form" onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Colonne image */}
            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{
                width: '100%',
                height: '280px',
                borderRadius: '8px',
                border: formData.couverture_url ? '2px solid var(--border)' : '2px dashed var(--border)',
                overflow: 'hidden'
              }}>
                {formData.couverture_url ? (
                  <CoverImage
                    src={formData.couverture_url}
                    alt="Couverture"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    Aucune couverture
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleUploadImage}
                className="btn btn-outline"
                style={{ width: '100%', fontSize: '14px', marginTop: '12px' }}
              >
                <Upload size={16} />
                Choisir une image
              </button>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  URL couverture (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.couverture_url || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, couverture_url: e.target.value });
                    setTimeout(() => {
                      if (isFieldChanged('couverture_url')) {
                        setChangedFields(prev => new Set(prev).add('couverture_url'));
                      } else {
                        setChangedFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete('couverture_url');
                          return newSet;
                        });
                        // Ne PAS retirer de validatedFields - une fois validé, ça reste validé jusqu'à l'enregistrement
                      }
                    }, 0);
                  }}
                  className="input"
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>
            </div>

            {/* Colonne formulaire */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Section Titres */}
                {(organizedFields.titre || organizedFields.titre_romaji || organizedFields.titre_natif || organizedFields.titre_anglais || organizedFields.titres_alternatifs) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📝 TITRES
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {renderFieldWithValidation(organizedFields.titre)}
                      {renderFieldGrid([organizedFields.titre_romaji, organizedFields.titre_natif], 2)}
                      {renderFieldGrid([organizedFields.titre_anglais, organizedFields.titres_alternatifs], 2)}
                    </div>
                  </div>
                )}

                {/* Section Dates */}
                {(organizedFields.date_debut || organizedFields.date_fin || organizedFields.date_sortie_vf || organizedFields.date_debut_streaming) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📅 DATES
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {renderFieldGrid([organizedFields.date_debut, organizedFields.date_fin], 2)}
                      {renderFieldGrid([organizedFields.date_sortie_vf, organizedFields.date_debut_streaming], 2)}
                    </div>
                  </div>
                )}

                {/* Section Informations - Animes */}
                {mediaType === 'anime' && (organizedFields.source || organizedFields.duree || organizedFields.statut_diffusion || organizedFields.saison_diffusion ||
                  organizedFields.annee || organizedFields.nb_episodes || organizedFields.franchise_order || organizedFields.genres ||
                  organizedFields.themes || organizedFields.demographics || organizedFields.franchise_name || organizedFields.rating ||
                  organizedFields.age_conseille || organizedFields.studios || organizedFields.producteurs || organizedFields.diffuseurs ||
                  organizedFields.editeur || organizedFields.site_web || organizedFields.mal_url) && (
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📄 INFORMATIONS
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {renderFieldGrid([organizedFields.source, organizedFields.duree], 2)}
                        {renderFieldGrid([organizedFields.statut_diffusion, organizedFields.saison_diffusion], 2)}
                        {renderFieldGrid([organizedFields.annee, organizedFields.nb_episodes, organizedFields.franchise_order], 3)}
                        {renderFieldGrid([organizedFields.genres, organizedFields.themes], 2)}
                        {renderFieldGrid([organizedFields.demographics, organizedFields.franchise_name], 2)}
                        {renderFieldGrid([organizedFields.rating, organizedFields.age_conseille], 2)}
                        {renderFieldGrid([organizedFields.studios, organizedFields.producteurs], 2)}
                        {renderFieldGrid([organizedFields.diffuseurs, organizedFields.editeur], 2)}
                        {renderFieldGrid([organizedFields.site_web, organizedFields.mal_url], 2)}
                      </div>
                    </div>
                  )}

                {/* Section Informations - Mangas */}
                {mediaType === 'manga' && (organizedFields.statut_publication || organizedFields.statut_publication_vf || organizedFields.genres ||
                  organizedFields.themes || organizedFields.demographie || organizedFields.langue_originale || organizedFields.editeur ||
                  organizedFields.editeur_vo || organizedFields.serialization || organizedFields.auteurs || organizedFields.media_type) && (
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📄 INFORMATIONS
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {renderFieldGrid([organizedFields.statut_publication, organizedFields.statut_publication_vf], 2)}
                        {renderFieldGrid([organizedFields.genres, organizedFields.themes], 2)}
                        {renderFieldGrid([organizedFields.demographie, organizedFields.langue_originale], 2)}
                        {renderFieldGrid([organizedFields.editeur, organizedFields.editeur_vo], 2)}
                        {renderFieldGrid([organizedFields.serialization, organizedFields.auteurs], 2)}
                        {renderFieldGrid([organizedFields.media_type], 1)}
                      </div>
                    </div>
                  )}

                {/* Section Sélections et Options - Animes */}
                {mediaType === 'anime' && (organizedFields.type || organizedFields.en_cours_diffusion) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔽 SÉLECTIONS | ☑️ OPTIONS
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {organizedFields.type && (() => {
                          const maxLabelLength = Math.max(
                            (organizedFields.type?.label || '').length,
                            (organizedFields.en_cours_diffusion?.label || '').length
                          );
                          const labelHeight = maxLabelLength > 50 ? 66 : 44;
                          return renderField(organizedFields.type, labelHeight);
                        })()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {organizedFields.en_cours_diffusion && (() => {
                          const maxLabelLength = Math.max(
                            (organizedFields.type?.label || '').length,
                            (organizedFields.en_cours_diffusion.label || '').length
                          );
                          const labelHeight = maxLabelLength > 50 ? 66 : 44;
                          return renderField(organizedFields.en_cours_diffusion, labelHeight);
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Sélections - Mangas */}
                {mediaType === 'manga' && organizedFields.type_volume && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔽 SÉLECTIONS
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {renderField(organizedFields.type_volume)}
                    </div>
                  </div>
                )}

                {/* Section Données MyAnimeList - Animes */}
                {mediaType === 'anime' && (organizedFields.score || organizedFields.rank_mal || organizedFields.popularity_mal || organizedFields.scored_by ||
                  organizedFields.favorites || organizedFields.prequel_mal_id || organizedFields.sequel_mal_id) && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Données MyAnimeList :
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {renderFieldGrid([organizedFields.score, organizedFields.rank_mal], 2)}
                        {renderFieldGrid([organizedFields.popularity_mal, organizedFields.scored_by, organizedFields.favorites], 3)}
                        {renderFieldGrid([organizedFields.prequel_mal_id, organizedFields.sequel_mal_id], 2)}
                      </div>
                    </div>
                  )}

                {/* Section Données MyAnimeList - Mangas */}
                {mediaType === 'manga' && (organizedFields.annee_publication || organizedFields.annee_vf || organizedFields.nb_chapitres || organizedFields.nb_chapitres_vf ||
                  organizedFields.nb_volumes || organizedFields.nb_volumes_vf || organizedFields.score_mal || organizedFields.rank_mal ||
                  organizedFields.popularity_mal || organizedFields.mal_id || organizedFields.prequel_mal_id || organizedFields.sequel_mal_id) && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Données MyAnimeList :
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {renderFieldGrid([organizedFields.annee_publication, organizedFields.annee_vf], 2)}
                        {renderFieldGrid([organizedFields.nb_chapitres, organizedFields.nb_chapitres_vf], 2)}
                        {renderFieldGrid([organizedFields.nb_volumes, organizedFields.nb_volumes_vf], 2)}
                        {renderFieldGrid([organizedFields.score_mal, organizedFields.rank_mal], 2)}
                        {renderFieldGrid([organizedFields.popularity_mal, organizedFields.mal_id], 2)}
                        {renderFieldGrid([organizedFields.prequel_mal_id, organizedFields.sequel_mal_id], 2)}
                      </div>
                    </div>
                  )}

                {/* Section Descriptions */}
                {(organizedFields.description || organizedFields.background) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📝 DESCRIPTIONS
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {organizedFields.description && (() => {
                          const maxLabelLength = Math.max(
                            (organizedFields.description?.label || '').length,
                            (organizedFields.background?.label || '').length
                          );
                          const labelHeight = maxLabelLength > 50 ? 66 : 44;
                          return renderField(organizedFields.description, labelHeight);
                        })()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {organizedFields.background && (() => {
                          const maxLabelLength = Math.max(
                            (organizedFields.description?.label || '').length,
                            (organizedFields.background?.label || '').length
                          );
                          const labelHeight = maxLabelLength > 50 ? 66 : 44;
                          return renderField(organizedFields.background, labelHeight);
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Liens JSON */}
                {(organizedFields.liens_externes || organizedFields.liens_streaming) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔗 LIENS (JSON)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {renderFieldWithValidation(organizedFields.liens_externes)}
                      {renderFieldWithValidation(organizedFields.liens_streaming)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          padding: '16px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--card-bg)',
          flexShrink: 0
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
            form="mal-edit-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="loading" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </Modal>
    </Fragment>
  );
}
