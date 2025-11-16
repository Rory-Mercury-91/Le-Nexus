import { Check, Info, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';

interface AnimeEnrichmentConfigModalProps {
  onClose: () => void;
  onSave: (config: EnrichmentConfig) => void;
}

export interface EnrichmentConfig {
  enabled: boolean;
  imageSource: 'mal' | 'anilist' | 'tmdb';
  autoTranslate: boolean;
  fields: {
    // Titres alternatifs
    titre_romaji: boolean;
    titre_natif: boolean;
    titre_anglais: boolean;
    titres_alternatifs: boolean;

    // Métadonnées
    source: boolean;
    duree: boolean;
    saison_diffusion: boolean;
    date_debut: boolean;
    date_fin: boolean;
    en_cours_diffusion: boolean;

    // Classification
    themes: boolean;
    demographics: boolean;
    rating: boolean;
    score: boolean;

    // Production
    producteurs: boolean;
    diffuseurs: boolean;

    // Relations
    franchise: boolean;
  };
  [key: string]: unknown;
}

export default function AnimeEnrichmentConfigModal({ onClose, onSave }: AnimeEnrichmentConfigModalProps) {
  const [config, setConfig] = useState<EnrichmentConfig>({
    enabled: true,
    imageSource: 'anilist',
    autoTranslate: false,
    fields: {
      titre_romaji: true,
      titre_natif: true,
      titre_anglais: true,
      titres_alternatifs: true,
      source: true,
      duree: true,
      saison_diffusion: true,
      date_debut: true,
      date_fin: true,
      en_cours_diffusion: true,
      themes: true,
      demographics: true,
      rating: true,
      score: true,
      producteurs: true,
      diffuseurs: true,
      franchise: true,
    }
  });

  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ current: number; total: number; item: string } | null>(null);

  // Charger la config depuis localStorage (fusion avec valeurs par défaut)
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await window.electronAPI.getAnimeEnrichmentConfig();
      if (savedConfig) {
        // Fusionner avec les valeurs par défaut pour s'assurer que tous les nouveaux champs sont à true
        setConfig({
          enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : true,
          imageSource: savedConfig.imageSource || 'anilist',
          autoTranslate: savedConfig.autoTranslate !== undefined ? savedConfig.autoTranslate : false,
          fields: {
            // Utiliser les valeurs sauvegardées ou true par défaut
            titre_romaji: savedConfig.fields?.titre_romaji !== false,
            titre_natif: savedConfig.fields?.titre_natif !== false,
            titre_anglais: savedConfig.fields?.titre_anglais !== false,
            titres_alternatifs: savedConfig.fields?.titres_alternatifs !== false,
            source: savedConfig.fields?.source !== false,
            duree: savedConfig.fields?.duree !== false,
            saison_diffusion: savedConfig.fields?.saison_diffusion !== false,
            date_debut: savedConfig.fields?.date_debut !== false,
            date_fin: savedConfig.fields?.date_fin !== false,
            en_cours_diffusion: savedConfig.fields?.en_cours_diffusion !== false,
            themes: savedConfig.fields?.themes !== false,
            demographics: savedConfig.fields?.demographics !== false,
            rating: savedConfig.fields?.rating !== false,
            score: savedConfig.fields?.score !== false,
            producteurs: savedConfig.fields?.producteurs !== false,
            diffuseurs: savedConfig.fields?.diffuseurs !== false,
            franchise: savedConfig.fields?.franchise !== false,
          }
        });
      }
    };
    loadConfig();
  }, []);

  // Écouter la progression de l'enrichissement
  useEffect(() => {
    const unsubProgress = window.electronAPI.onAnimeEnrichmentProgress?.((_, progress) => {
      setEnriching(true);
      setEnrichmentProgress(progress);
    });

    const unsubComplete = window.electronAPI.onAnimeEnrichmentComplete?.((_, stats) => {
      setEnriching(false);
      setStopping(false);
      setEnrichmentProgress(null);
      if (stats?.cancelled) {
        console.log('ℹ️ Enrichissement anime interrompu par l’utilisateur.');
      }
    });

    return () => {
      unsubProgress?.();
      unsubComplete?.();
    };
  }, []);

  // Fermer avec Échap
  useModalEscape(onClose, saving);

  const handleToggleField = (field: keyof EnrichmentConfig['fields']) => {
    setConfig(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: !prev.fields[field]
      }
    }));
  };

  const handleSelectAll = () => {
    setConfig(prev => ({
      ...prev,
      fields: Object.keys(prev.fields).reduce((acc, key) => {
        acc[key as keyof EnrichmentConfig['fields']] = true;
        return acc;
      }, {} as EnrichmentConfig['fields'])
    }));
  };

  const handleDeselectAll = () => {
    setConfig(prev => ({
      ...prev,
      fields: Object.keys(prev.fields).reduce((acc, key) => {
        acc[key as keyof EnrichmentConfig['fields']] = false;
        return acc;
      }, {} as EnrichmentConfig['fields'])
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.electronAPI.saveAnimeEnrichmentConfig(config);
      onSave(config);
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
      const result = await window.electronAPI.startAnimeEnrichment();
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
      const result = await window.electronAPI.stopAnimeEnrichment?.();
      if (!result?.success) {
        console.warn('Stop enrichissement anime non pris en compte:', result?.error);
        setStopping(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enrichissement:', error);
      setStopping(false);
    }
  };

  const selectedCount = Object.values(config.fields).filter(Boolean).length;
  const totalCount = Object.keys(config.fields).length;

  return createPortal(
    <Modal maxWidth="800px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClickOverlay={onClose}>
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
            ⚙️ Configuration de l'enrichissement
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
            Choisissez les données à récupérer depuis Jikan lors de la synchronisation MAL
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
        {/* Activation globale */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                🚀 Enrichissement automatique
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
                Activer l'enrichissement des données via Jikan lors de la synchronisation MAL
              </p>
            </div>
            <Toggle
              checked={config.enabled}
              onChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {config.enabled && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              gap: '8px',
              alignItems: 'start'
            }}>
              <Info size={16} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                ⚠️ L'enrichissement ralentit la synchronisation (~800ms par anime) pour respecter les limites de l'API Jikan.
                Seuls les <strong>nouveaux animes</strong> seront enrichis, pas ceux déjà présents.
              </p>
            </div>
          )}
        </div>

        {/* Options générales */}
        {config.enabled && (
          <>
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
                {/* Titres alternatifs */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    📝 Titres
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'titre_romaji', label: 'Titre romaji' },
                      { key: 'titre_natif', label: 'Titre natif' },
                      { key: 'titre_anglais', label: 'Titre anglais' },
                      { key: 'titres_alternatifs', label: 'Titres alternatifs' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle
                          checked={config.fields[key as keyof EnrichmentConfig['fields']]}
                          onChange={() => handleToggleField(key as keyof EnrichmentConfig['fields'])}
                        />
                        <span style={{ fontSize: '13px' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Métadonnées */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    📊 Métadonnées
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'source', label: 'Source (Manga, LN, etc.)' },
                      { key: 'duree', label: 'Durée par épisode' },
                      { key: 'saison_diffusion', label: 'Saison de diffusion' },
                      { key: 'date_debut', label: 'Date de début' },
                      { key: 'date_fin', label: 'Date de fin' },
                      { key: 'en_cours_diffusion', label: 'En cours de diffusion' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle
                          checked={config.fields[key as keyof EnrichmentConfig['fields']]}
                          onChange={() => handleToggleField(key as keyof EnrichmentConfig['fields'])}
                        />
                        <span style={{ fontSize: '13px' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Classification */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    🏷️ Classification
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'themes', label: 'Thèmes' },
                      { key: 'demographics', label: 'Démographie (Shounen, etc.)' },
                      { key: 'rating', label: 'Classification (G, PG-13, R)' },
                      { key: 'score', label: 'Note MAL' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle
                          checked={config.fields[key as keyof EnrichmentConfig['fields']]}
                          onChange={() => handleToggleField(key as keyof EnrichmentConfig['fields'])}
                        />
                        <span style={{ fontSize: '13px' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Production */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    🎬 Production
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'producteurs', label: 'Producteurs' },
                      { key: 'diffuseurs', label: 'Diffuseurs' },
                      { key: 'franchise', label: 'Relations de franchise' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle
                          checked={config.fields[key as keyof EnrichmentConfig['fields']]}
                          onChange={() => handleToggleField(key as keyof EnrichmentConfig['fields'])}
                        />
                        <span style={{ fontSize: '13px' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Progression de l'enrichissement */}
      {enrichmentProgress && (
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(99, 102, 241, 0.05)'
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
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
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
            disabled={saving || enriching || stopping || !config.enabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
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
