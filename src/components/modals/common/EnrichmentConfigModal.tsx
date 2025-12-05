import { Check, Info, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

export interface EnrichmentField {
  key: string;
  label: string;
  section: string;
  sectionIcon?: string;
}

export interface EnrichmentConfigModalConfig {
  /** Type de média (anime, manga) */
  mediaType: 'anime' | 'manga';
  /** Titre de la modale */
  title: string;
  /** Description de la modale */
  description: string;
  /** Champs configurables */
  fields: EnrichmentField[];
  /** Options supplémentaires (ex: imageSource pour anime) */
  additionalOptions?: {
    key: string;
    label: string;
    type: 'select' | 'toggle';
    value: any;
    options?: Array<{ value: any; label: string }>;
    onChange: (value: any) => void;
  }[];
  /** Valeurs par défaut */
  defaultConfig: {
    enabled: boolean;
    autoTranslate: boolean;
    [key: string]: any;
  };
  /** API pour charger la config */
  getConfigApi: () => Promise<any>;
  /** API pour sauvegarder la config */
  saveConfigApi: (config: any) => Promise<void>;
  /** API pour démarrer l'enrichissement */
  startEnrichmentApi: () => Promise<{ success: boolean; error?: string }>;
  /** API pour arrêter l'enrichissement */
  stopEnrichmentApi?: () => Promise<{ success: boolean; error?: string }>;
  /** Callback pour écouter la progression */
  onProgress?: (progress: { current: number; total: number; item: string }) => void;
  /** Callback pour écouter la fin */
  onComplete?: (stats: { cancelled?: boolean }) => void;
  /** Message d'avertissement */
  warningMessage?: string;
  /** Couleur du thème (pour les gradients) */
  themeColor?: {
    primary: string;
    secondary: string;
    info: string;
  };
}

interface EnrichmentConfigModalProps {
  config: EnrichmentConfigModalConfig;
  onClose: () => void;
  onSave: (config: any) => void;
}

export default function EnrichmentConfigModal({ config, onClose, onSave }: EnrichmentConfigModalProps) {
  const {
    mediaType,
    title,
    description,
    fields,
    additionalOptions = [],
    defaultConfig,
    getConfigApi,
    saveConfigApi,
    startEnrichmentApi,
    stopEnrichmentApi,
    onProgress,
    onComplete,
    warningMessage,
    themeColor = {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      info: '#3b82f6'
    }
  } = config;

  // Construire la structure des champs par section
  const fieldsBySection = fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, EnrichmentField[]>);

  const [enrichmentConfig, setEnrichmentConfig] = useState<any>({
    enabled: defaultConfig.enabled,
    autoTranslate: defaultConfig.autoTranslate,
    ...fields.reduce((acc, field) => {
      acc[field.key] = true;
      return acc;
    }, {} as Record<string, boolean>),
    ...additionalOptions.reduce((acc, opt) => {
      acc[opt.key] = opt.value;
      return acc;
    }, {} as Record<string, any>)
  });

  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ current: number; total: number; item: string } | null>(null);

  // Charger la config depuis localStorage (fusion avec valeurs par défaut)
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await getConfigApi();
      if (savedConfig) {
        // Fusionner avec les valeurs par défaut
        const mergedConfig: any = {
          enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : defaultConfig.enabled,
          autoTranslate: savedConfig.autoTranslate !== undefined ? savedConfig.autoTranslate : defaultConfig.autoTranslate,
          fields: {}
        };

        // Fusionner les champs
        fields.forEach(field => {
          mergedConfig[field.key] = savedConfig.fields?.[field.key] !== false;
        });

        // Fusionner les options supplémentaires
        additionalOptions.forEach(opt => {
          mergedConfig[opt.key] = savedConfig[opt.key] !== undefined ? savedConfig[opt.key] : opt.value;
        });

        setEnrichmentConfig(mergedConfig);
      }
    };
    loadConfig();
  }, [getConfigApi, defaultConfig, fields, additionalOptions]);

  // Écouter la progression de l'enrichissement
  useEffect(() => {
    const progressHandler = (_: unknown, progress: { current: number; total: number; item: string }) => {
      setEnriching(true);
      setEnrichmentProgress(progress);
      if (onProgress) {
        onProgress(progress);
      }
    };

    const completeHandler = (_: unknown, stats: { cancelled?: boolean }) => {
      setEnriching(false);
      setStopping(false);
      setEnrichmentProgress(null);
      if (stats?.cancelled) {
        console.log(`ℹ️ Enrichissement ${mediaType} interrompu par l'utilisateur.`);
      }
      if (onComplete) {
        onComplete(stats);
      }
    };

    // Utiliser les event listeners IPC selon le type de média
    const unsubProgress = mediaType === 'anime'
      ? window.electronAPI.onAnimeEnrichmentProgress?.(progressHandler)
      : window.electronAPI.onMangaEnrichmentProgress?.(progressHandler);

    const unsubComplete = mediaType === 'anime'
      ? window.electronAPI.onAnimeEnrichmentComplete?.(completeHandler)
      : window.electronAPI.onMangaEnrichmentComplete?.(completeHandler);

    return () => {
      unsubProgress?.();
      unsubComplete?.();
    };
  }, [onProgress, onComplete, mediaType]);

  // Fermer avec Échap
  useModalEscape(onClose, saving);

  const handleToggleField = (fieldKey: string) => {
    setEnrichmentConfig((prev: any) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const handleSelectAll = () => {
    setEnrichmentConfig((prev: any) => {
      const updated = { ...prev };
      fields.forEach(field => {
        updated[field.key] = true;
      });
      return updated;
    });
  };

  const handleDeselectAll = () => {
    setEnrichmentConfig((prev: any) => {
      const updated = { ...prev };
      fields.forEach(field => {
        updated[field.key] = false;
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfigApi(enrichmentConfig);
      onSave(enrichmentConfig);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEnrichment = async () => {
    if (enriching || stopping) return;
    setEnriching(true);
    setStopping(false);
    try {
      const result = await startEnrichmentApi();
      if (!result?.success) {
        setEnriching(false);
        console.error('Erreur lors du démarrage de l\'enrichissement:', result?.error);
      }
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enrichissement:', error);
      setEnriching(false);
    }
  };

  const handleStopEnrichment = async () => {
    if (!enriching || stopping) return;
    setStopping(true);
    try {
      if (stopEnrichmentApi) {
        const result = await stopEnrichmentApi();
        if (!result?.success) {
          console.warn(`Stop enrichissement ${mediaType} non pris en compte:`, result?.error);
          setStopping(false);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enrichissement:', error);
      setStopping(false);
    }
  };

  const selectedCount = fields.filter(field => enrichmentConfig[field.key]).length;
  const totalCount = fields.length;

  return createPortal(
    <Modal maxWidth="900px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClickOverlay={onClose}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
            {description}
          </p>
        </div>
        <button
          onClick={onClose}
          className="btn"
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Message d'avertissement */}
        {warningMessage && (
          <div style={{
            padding: '12px',
            background: `rgba(${themeColor.info === '#3b82f6' ? '59, 130, 246' : '245, 158, 11'}, 0.1)`,
            borderRadius: '8px',
            display: 'flex',
            gap: '8px',
            alignItems: 'start'
          }}>
            <Info size={16} style={{ color: themeColor.info, marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              {warningMessage}
            </p>
          </div>
        )}

        {/* Options supplémentaires */}
        {additionalOptions.length > 0 && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              ⚙️ Options générales
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {additionalOptions.map(opt => (
                <div key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px' }}>{opt.label}</label>
                  {opt.type === 'toggle' ? (
                    <Toggle
                      checked={enrichmentConfig[opt.key]}
                      onChange={(checked) => {
                        setEnrichmentConfig((prev: any) => ({ ...prev, [opt.key]: checked }));
                        opt.onChange(checked);
                      }}
                    />
                  ) : opt.type === 'select' && opt.options ? (
                    <select
                      value={enrichmentConfig[opt.key]}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEnrichmentConfig((prev: any) => ({ ...prev, [opt.key]: value }));
                        opt.onChange(value);
                      }}
                      className="select"
                      style={{ minWidth: '150px' }}
                    >
                      {opt.options.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sélection des champs */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                📋 Champs à enrichir ({selectedCount}/{totalCount})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                Sélectionnez les données supplémentaires à récupérer depuis Jikan
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSelectAll}
                className="btn btn-outline"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Tout sélectionner
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn btn-outline"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {Object.entries(fieldsBySection).map(([sectionName, sectionFields]) => (
              <div key={sectionName}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                  {sectionFields[0]?.sectionIcon || '📝'} {sectionName}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sectionFields.map(field => (
                    <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Toggle
                        checked={enrichmentConfig[field.key]}
                        onChange={() => handleToggleField(field.key)}
                      />
                      <span style={{ fontSize: '13px' }}>{field.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progression de l'enrichissement */}
      {enrichmentProgress && (
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border)',
          background: `rgba(${themeColor.primary === '#6366f1' ? '99, 102, 241' : '245, 158, 11'}, 0.05)`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {stopping ? 'Arrêt en cours...' : 'Enrichissement en cours...'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {enrichmentProgress.current} / {enrichmentProgress.total}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'var(--bg-secondary)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${themeColor.primary}, ${themeColor.secondary})`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {enrichmentProgress.item}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '20px 24px',
        borderTop: enrichmentProgress ? 'none' : '1px solid var(--border)',
        display: 'flex',
        gap: '12px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleStartEnrichment}
            className="btn"
            disabled={saving || enriching || stopping || !enrichmentConfig.enabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: `linear-gradient(135deg, ${themeColor.primary}, ${themeColor.secondary})`,
              color: 'white',
              border: 'none'
            }}
          >
            {enriching && !stopping ? (
              <>
                <div className="loading" />
                Enrichissement...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Enrichir maintenant
              </>
            )}
          </button>

          {stopEnrichmentApi && (
            <button
              onClick={handleStopEnrichment}
              className="btn btn-outline"
              disabled={!enriching || stopping}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                color: stopping ? 'var(--text-secondary)' : 'var(--error)'
              }}
            >
              {stopping ? 'Arrêt...' : 'Stop'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            className="btn btn-outline"
            disabled={saving || enriching || stopping}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving || enriching || stopping}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? (
              <>
                <div className="loading" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check size={18} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>,
    document.body
  );
}
