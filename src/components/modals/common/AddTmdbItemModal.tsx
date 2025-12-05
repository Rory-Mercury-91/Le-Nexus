import type { CSSProperties } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { FormField, useFormValidation } from '../../../hooks/common/useFormValidation';
import { TmdbSearchConfig, useTmdbSearch } from '../../../hooks/common/useTmdbSearch';
import { useToast } from '../../../hooks/common/useToast';
import AddTmdbSearchSection, { TmdbSearchResultItem } from './AddTmdbSearchSection';
import CoverImageUpload from './CoverImageUpload';
import Modal from './Modal';
import ModalHeader from './ModalHeader';
import { useModalEscape } from './useModalEscape';

// Réexporter FormField pour compatibilité
export type { FormField };

/**
 * Configuration pour le mapping des résultats TMDb vers le formulaire
 */
export interface TmdbResultMapper<TResult extends TmdbSearchResultItem> {
  /** Fonction pour mapper un résultat TMDb vers les données du formulaire */
  mapResultToFormData: (result: TResult) => Record<string, any>;
}

/**
 * Configuration complète pour AddTmdbItemModal
 */
export interface AddTmdbItemModalConfig<TResult extends TmdbSearchResultItem> {
  /** Titre de la modale */
  title: string;
  /** Type de média (movie, series) */
  mediaType: string;
  /** Champs du formulaire */
  formFields: FormField[];
  /** Configuration de recherche TMDb */
  searchConfig: TmdbSearchConfig<TResult>;
  /** Mapper pour convertir les résultats TMDb en données de formulaire */
  resultMapper: TmdbResultMapper<TResult>;
  /** Fonction pour créer l'item */
  createApi: (data: Record<string, any>) => Promise<{ success: boolean; id?: number; error?: string }>;
  /** Fonction pour enrichir l'item après création */
  enrichApi?: (tmdbId: number, options?: any) => Promise<any>;
  /** Options pour l'enrichissement */
  enrichOptions?: any;
  /** Message de succès pour la création */
  createSuccessMessage?: string;
  /** Message de succès pour l'enrichissement */
  enrichSuccessMessage?: string;
  /** ID TMDb initial (pour pré-remplir la recherche) */
  initialTmdbId?: number;
  /** Placeholder pour la recherche */
  searchPlaceholder?: string;
  /** Exemple d'ID TMDb */
  exampleId?: string;
  /** Définit des lignes personnalisées pour le formulaire (liste de clés de champs par ligne) */
  formLayout?: string[][];
}

interface AddTmdbItemModalProps<TResult extends TmdbSearchResultItem> {
  config: AddTmdbItemModalConfig<TResult>;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Composant générique pour ajouter un item depuis TMDb
 * Utilisé par AddMovieModal et AddSeriesModal
 */
export default function AddTmdbItemModal<TResult extends TmdbSearchResultItem>({
  config,
  onClose,
  onSuccess
}: AddTmdbItemModalProps<TResult>) {
  const {
    title,
    mediaType,
    formFields,
    searchConfig,
    resultMapper,
    createApi,
    enrichApi,
    enrichOptions,
    createSuccessMessage = 'Élément ajouté avec succès',
    enrichSuccessMessage = 'Enrichissement terminé',
    initialTmdbId,
    searchPlaceholder,
    exampleId,
    formLayout
  } = config;

  const { showToast, ToastContainer } = useToast();
  const { validateAndNormalize } = useFormValidation();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    formFields.forEach(field => {
      initial[field.key] = '';
    });
    return initial;
  });

  // Hook de recherche TMDb
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    importingDirectly,
    handleSearch,
    handleSelectResult: handleSelectResultBase,
    handleImportDirectly
  } = useTmdbSearch<TResult>({
    ...searchConfig,
    importSuccessMessage: searchConfig.importSuccessMessage || `${title} importé avec succès`
  });

  // Initialiser le terme de recherche si initialTmdbId est fourni
  useEffect(() => {
    if (initialTmdbId && !searchTerm) {
      setSearchTerm(initialTmdbId.toString());
    }
  }, [initialTmdbId]);

  useModalEscape(onClose, saving);

  // Gérer la sélection d'un résultat TMDb
  const handleSelectResult = (result: TResult) => {
    const mapped = resultMapper.mapResultToFormData(result);
    setFormData(prev => ({ ...prev, ...mapped }));
    handleSelectResultBase(result);
  };

  // Gérer l'import direct avec callback
  const handleImportDirectlyWithCallback = async (tmdbId: number) => {
    try {
      await handleImportDirectly(tmdbId);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (error) {
      // L'erreur est déjà gérée dans handleImportDirectly
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valider et normaliser les données
    const submitData = validateAndNormalize(formData, formFields);

    if (!submitData) {
      return; // Validation échouée
    }

    setSaving(true);

    try {

      const result = await createApi(submitData);

      if (result.success) {
        // Si un tmdb_id a été fourni, lancer l'enrichissement en arrière-plan
        if (submitData.tmdb_id && submitData.tmdb_id > 0 && enrichApi) {
          showToast({
            title: createSuccessMessage,
            message: 'Enrichissement des données en cours...',
            type: 'success'
          });
          // Enrichissement en arrière-plan
          enrichApi(submitData.tmdb_id, enrichOptions)
            .then(() => {
              showToast({
                title: enrichSuccessMessage,
                message: 'Toutes les données ont été mises à jour',
                type: 'success',
                duration: 3000
              });
            })
            .catch((err) => {
              console.error('Erreur enrichissement:', err);
              showToast({
                title: 'Erreur enrichissement',
                message: err?.message || 'Impossible d\'enrichir l\'élément',
                type: 'error',
                duration: 5000
              });
            });
        } else {
          showToast({ title: createSuccessMessage, type: 'success' });
        }
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        showToast({ title: result.error || 'Erreur lors de l\'ajout', type: 'error' });
      }
    } catch (error: any) {
      console.error('Erreur ajout:', error);
      showToast({ title: error?.message || `Erreur lors de l'ajout de ${title.toLowerCase()}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Filtrer les champs techniques qui sont gérés par CoverImageUpload
  const visibleFields = formFields.filter(f =>
    f.key !== 'poster_path' && f.key !== 'backdrop_path' && f.key !== 'tmdb_id'
  );

  const baseLabelStyle: CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    minHeight: '36px',
    lineHeight: 1.2
  };

  const renderField = (field: FormField, options: { style?: CSSProperties } = {}) => {
    const value = formData[field.key] || '';
    const wrapperStyle = options.style;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} style={wrapperStyle}>
            <label style={baseLabelStyle}>
              {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="input"
              rows={4}
              placeholder={field.placeholder}
              style={{ resize: 'vertical', width: '100%' }}
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.key} style={wrapperStyle}>
            <label style={baseLabelStyle}>
              {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="select"
              style={{ width: '100%' }}
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
          <div key={field.key} style={wrapperStyle}>
            <label style={baseLabelStyle}>
              {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="input"
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              style={{ width: '100%' }}
              required={field.required}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.key} style={wrapperStyle}>
            <label style={baseLabelStyle}>
              {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="input"
              style={{ width: '100%', textAlign: 'left' }}
              required={field.required}
            />
          </div>
        );

      default: // text
        return (
          <div key={field.key} style={wrapperStyle}>
            <label style={baseLabelStyle}>
              {field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="input"
              placeholder={field.placeholder}
              style={{ width: '100%' }}
              required={field.required}
            />
          </div>
        );
    }
  };

  return (
    <Fragment>
      <Modal maxWidth="900px">
        <ModalHeader title={title} onClose={onClose} />

        <div style={{ padding: '24px' }}>
          {/* Section de recherche TMDb */}
          <AddTmdbSearchSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchResults={searchResults}
            searching={searching}
            onSearch={handleSearch}
            onSelectResult={handleSelectResult}
            onImportDirectly={handleImportDirectlyWithCallback}
            importingDirectly={importingDirectly}
            searchPlaceholder={searchPlaceholder}
            exampleId={exampleId}
          />

          {/* Séparateur */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'rgba(139, 92, 246, 0.2)'
            }} />
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-secondary)'
            }}>
              OU
            </span>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'rgba(139, 92, 246, 0.2)'
            }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {/* Colonne image */}
              <CoverImageUpload
                imageUrl={formData.poster_path || ''}
                onImageChange={(url) => setFormData({ ...formData, poster_path: url })}
                mediaType={mediaType}
                itemTitle={formData.titre || title}
              />

              {/* Colonne formulaire */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    if (!formLayout || formLayout.length === 0) {
                      return visibleFields.map(field => renderField(field));
                    }

                    const fieldMap = new Map(visibleFields.map(field => [field.key, field]));
                    const renderedKeys = new Set<string>();
                    const layoutRows = formLayout
                      .map(row => row
                        .map(key => fieldMap.get(key))
                        .filter((field): field is FormField => Boolean(field)))
                      .filter(row => row.length > 0);

                    const rows = layoutRows.map((row, index) => {
                      row.forEach(field => renderedKeys.add(field.key));
                      const isMultiFieldRow = row.length > 1;
                      return (
                        <div
                          key={`row-${index}`}
                          style={{
                            display: 'flex',
                            gap: '16px',
                            flexWrap: 'wrap'
                          }}
                        >
                          {row.map(field =>
                            renderField(field, {
                              style: {
                                flex: isMultiFieldRow ? 1 : undefined,
                                minWidth: isMultiFieldRow ? '0' : undefined,
                                width: isMultiFieldRow ? undefined : '100%'
                              }
                            })
                          )}
                        </div>
                      );
                    });

                    const remainingFields = visibleFields.filter(field => !renderedKeys.has(field.key));
                    const leftover = remainingFields.map(field => renderField(field));

                    return [...rows, ...leftover];
                  })()}
                </div>
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
                {saving ? 'Ajout en cours...' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
      {ToastContainer}
    </Fragment>
  );
}
