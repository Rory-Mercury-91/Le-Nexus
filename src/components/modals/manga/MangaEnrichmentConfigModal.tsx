import { Check, Info, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';

interface MangaEnrichmentConfigModalProps {
  onClose: () => void;
  onSave: (config: EnrichmentConfig) => void;
}

export interface EnrichmentConfig {
  enabled: boolean;
  autoTranslate: boolean;
  fields: {
    // Titres alternatifs
    titre_romaji: boolean;
    titre_natif: boolean;
    titre_anglais: boolean;
    titres_alternatifs: boolean;

    // Métadonnées de publication
    date_debut: boolean;
    date_fin: boolean;
    serialization: boolean;

    // Classification
    themes: boolean;
    demographics: boolean;
    genres: boolean;

    // Statistiques MAL
    score: boolean;
    rank: boolean;
    popularity: boolean;

    // Production
    auteurs: boolean;

    // Contenu
    synopsis: boolean;
    background: boolean;
  };
  [key: string]: unknown;
}

export default function MangaEnrichmentConfigModal({ onClose, onSave }: MangaEnrichmentConfigModalProps) {
  const [config, setConfig] = useState<EnrichmentConfig>({
    enabled: true,
    autoTranslate: false,
    fields: {
      titre_romaji: true,
      titre_natif: true,
      titre_anglais: true,
      titres_alternatifs: true,
      date_debut: true,
      date_fin: true,
      serialization: true,
      themes: true,
      demographics: true,
      genres: true,
      score: true,
      rank: true,
      popularity: true,
      auteurs: true,
      synopsis: true,
      background: true,
    }
  });

  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ current: number; total: number; item: string } | null>(null);

  // Charger la config (fusion avec valeurs par défaut)
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await window.electronAPI.getMangaEnrichmentConfig();
      if (savedConfig) {
        // Fusionner avec les valeurs par défaut pour s'assurer que tous les nouveaux champs sont à true
        setConfig({
          enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : true,
          autoTranslate: savedConfig.autoTranslate !== undefined ? savedConfig.autoTranslate : false,
          fields: {
            // Utiliser les valeurs sauvegardées ou true par défaut
            titre_romaji: savedConfig.fields?.titre_romaji !== false,
            titre_natif: savedConfig.fields?.titre_natif !== false,
            titre_anglais: savedConfig.fields?.titre_anglais !== false,
            titres_alternatifs: savedConfig.fields?.titres_alternatifs !== false,
            date_debut: savedConfig.fields?.date_debut !== false,
            date_fin: savedConfig.fields?.date_fin !== false,
            serialization: savedConfig.fields?.serialization !== false,
            themes: savedConfig.fields?.themes !== false,
            demographics: savedConfig.fields?.demographics !== false,
            genres: savedConfig.fields?.genres !== false,
            score: savedConfig.fields?.score !== false,
            rank: savedConfig.fields?.rank !== false,
            popularity: savedConfig.fields?.popularity !== false,
            auteurs: savedConfig.fields?.auteurs !== false,
            synopsis: savedConfig.fields?.synopsis !== false,
            background: savedConfig.fields?.background !== false,
          }
        });
      }
    };
    loadConfig();
  }, []);

  // Écouter la progression de l'enrichissement
  useEffect(() => {
    const unsubProgress = window.electronAPI.onMangaEnrichmentProgress?.((_, progress) => {
      setEnriching(true);
      setEnrichmentProgress(progress);
    });

    const unsubComplete = window.electronAPI.onMangaEnrichmentComplete?.((_, stats) => {
      setEnriching(false);
      setStopping(false);
      setEnrichmentProgress(null);
      if (stats?.cancelled) {
        console.log('ℹ️ Enrichissement manga interrompu par l’utilisateur.');
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
      await window.electronAPI.saveMangaEnrichmentConfig(config);
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
      const result = await window.electronAPI.startMangaEnrichment();
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
      const result = await window.electronAPI.stopMangaEnrichment?.();
      if (!result?.success) {
        console.warn('Stop enrichissement manga non pris en compte:', result?.error);
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
    <Modal maxWidth="900px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column' }} onClickOverlay={onClose}>
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
            📚 Enrichissement manga
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
                Activer l'enrichissement des mangas via Jikan lors de la synchronisation MAL
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
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              gap: '8px',
              alignItems: 'start'
            }}>
              <Info size={16} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                L'enrichissement se fait en arrière-plan après l'import. Seuls les <strong>nouveaux mangas</strong> seront enrichis.
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
                {/* Colonne 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Titres alternatifs */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      📝 Titres
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'titre_romaji', label: 'Titre romaji' },
                        { key: 'titre_natif', label: 'Titre natif (japonais/coréen)' },
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

                  {/* Publication */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      📅 Publication
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'date_debut', label: 'Date de début' },
                        { key: 'date_fin', label: 'Date de fin' },
                        { key: 'serialization', label: 'Magazine de prépublication' },
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
                        { key: 'demographics', label: 'Démographie (Seinen, Shōnen, etc.)' },
                        { key: 'genres', label: 'Genres' },
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

                {/* Colonne 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Statistiques MAL */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      📊 Statistiques MAL
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'score', label: 'Score MAL' },
                        { key: 'rank', label: 'Classement MAL' },
                        { key: 'popularity', label: 'Popularité MAL' },
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

                  {/* Production & Contenu */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      ✍️ Production & Contenu
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'auteurs', label: 'Auteurs' },
                        { key: 'synopsis', label: 'Synopsis complet' },
                        { key: 'background', label: 'Informations contextuelles' },
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
            </div>
          </>
        )}
      </div>

      {/* Progression */}
      {enrichmentProgress && (
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(245, 158, 11, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>
              {stopping ? 'Arrêt en cours...' : 'Enrichissement en cours...'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {enrichmentProgress.current} / {enrichmentProgress.total}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'var(--surface)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
              transition: 'width 0.3s'
            }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {enrichmentProgress.item}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '20px 24px',
        borderTop: '1px solid var(--border)',
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
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
