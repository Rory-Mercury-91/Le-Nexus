import { Code, Info, Merge } from 'lucide-react';
import { useEffect, useState } from 'react';
import Toggle from '../../../components/common/Toggle';

type MergeType = 'manga' | 'anime' | 'movie' | 'tv' | 'game' | 'book';

interface DevSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  onOpenMergeModal: (payload: { type: MergeType; sourceId: number; targetId: number }) => Promise<void> | void;
  mergePreviewLoading?: boolean;
}

const tooltipTexts = {
  'dev-mode': 'Fonctionnalités activées :\n\n• DevTools ouverts automatiquement\n• ID affiché à droite du titre sur les pages de détails (mangas, animes, jeux adulte)\n• Accès aux fonctions de débogage dans la console',
  'verbose-logs': '📋 Logs backend activés :\n\n• Tous les logs du backend sont affichés dans la console DevTools (F12)\n• Les logs sont préfixés avec [BACKEND]\n• Les logs incluent les informations sur les cookies, les chemins, les erreurs, etc.',
  'merge-series': 'Fusion avancée : comparez les deux entrées, choisissez les champs à copier et la source sera ensuite supprimée. Les données associées (tomes, statuts, etc.) sont transférées automatiquement quand c’est possible.'
} as const;

type TooltipId = keyof typeof tooltipTexts;

export default function DevSettings({ showToast, onOpenMergeModal, mergePreviewLoading = false }: DevSettingsProps) {
  const [devMode, setDevMode] = useState(false);
  const [verboseLogging, setVerboseLogging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [mergeType, setMergeType] = useState<MergeType>('manga');
  const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [devModeEnabled, verboseEnabled] = await Promise.all([
        window.electronAPI.getDevMode?.(),
        window.electronAPI.getVerboseLogging?.()
      ]);
      setDevMode(devModeEnabled || false);
      setVerboseLogging(verboseEnabled || false);
    } catch (error) {
      console.error('Erreur chargement paramètres dev:', error);
    } finally {
      setLoading(false);
    }
  };

  const mergeOptions = [
    { value: 'manga', label: 'Lectures (Mangas)' },
    { value: 'anime', label: 'Animes' },
    { value: 'movie', label: 'Films' },
    { value: 'tv', label: 'Séries TV' },
    { value: 'game', label: 'Jeux' },
    { value: 'book', label: 'Livres' }
  ] as const;

  const handleOpenMergeModal = async () => {
    if (!sourceId || !targetId) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez saisir les deux IDs',
        type: 'error'
      });
      return;
    }

    const sourceIdNum = parseInt(sourceId, 10);
    const targetIdNum = parseInt(targetId, 10);

    if (isNaN(sourceIdNum) || isNaN(targetIdNum)) {
      showToast({
        title: 'Erreur',
        message: 'Les IDs doivent être des nombres valides',
        type: 'error'
      });
      return;
    }

    if (sourceIdNum === targetIdNum) {
      showToast({
        title: 'Erreur',
        message: 'Impossible de fusionner une entrée avec elle-même',
        type: 'error'
      });
      return;
    }

    await onOpenMergeModal({
      type: mergeType,
      sourceId: sourceIdNum,
      targetId: targetIdNum
    });
  };

  const handleDevModeChange = async (enabled: boolean) => {
    try {
      await window.electronAPI.setDevMode?.(enabled);
      setDevMode(enabled);
      showToast({
        title: enabled ? 'Mode développeur activé' : 'Mode développeur désactivé',
        message: enabled ? 'Les DevTools sont ouverts et les IDs sont affichés' : 'Les DevTools sont fermés et les IDs sont masqués',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Erreur changement mode dev:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le mode développeur',
        type: 'error'
      });
    }
  };

  const handleVerboseLoggingChange = async (enabled: boolean) => {
    try {
      await window.electronAPI.setVerboseLogging?.(enabled);
      setVerboseLogging(enabled);
      showToast({
        title: enabled ? 'Logs verbose activés' : 'Logs verbose désactivés',
        message: enabled ? 'Les logs du backend seront affichés dans la console DevTools' : 'Les logs du backend ne seront plus affichés',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Erreur changement logs verbose:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier les logs verbose',
        type: 'error'
      });
    }
  };

  const TooltipIcon = ({ id, placement = 'center' }: { id: TooltipId; placement?: 'center' | 'end' }) => (
    <span
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
      onFocus={() => setActiveTooltip(id)}
      onBlur={() => setActiveTooltip(null)}
      tabIndex={0}
      aria-label={tooltipTexts[id]}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        outline: 'none',
        borderRadius: '50%',
        marginLeft: '6px',
      }}
    >
      <Info size={16} aria-hidden="true" />
      {activeTooltip === id && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: placement === 'end' ? 'auto' : '50%',
            right: placement === 'end' ? 0 : 'auto',
            transform: placement === 'end' ? 'none' : 'translateX(-50%)',
            background: 'var(--surface-light)',
            color: 'var(--text)',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.22)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            lineHeight: 1.45,
            zIndex: 30,
            minWidth: '220px',
            maxWidth: '300px',
            whiteSpace: 'pre-line',
          }}
        >
          {tooltipTexts[id]}
        </div>
      )}
    </span>
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: '20px',
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {[
            {
              key: 'dev-mode',
              title: 'Mode développeur',
              description: 'Active les DevTools et affiche les IDs sur les pages de détails.',
              checked: devMode,
              onChange: handleDevModeChange
            },
            {
              key: 'verbose-logs',
              title: 'Logs verbose (backend)',
              description: 'Affiche tous les logs du backend dans la console DevTools (F12).',
              checked: verboseLogging,
              onChange: handleVerboseLoggingChange
            }
          ].map(({ key, title, description, checked, onChange }) => (
            <div
              key={key}
              style={{
                flex: '1 1 320px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface-light)'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}
              >
                <Code size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                  {title}
                  <TooltipIcon id={key as TooltipId} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</div>
              </div>
              <Toggle checked={checked} onChange={onChange} />
            </div>
          ))}
        </div>
      </div>

      {devMode && (
        <div
          style={{
            marginTop: '20px',
            padding: '20px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
            🔧 Outils de développement
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: 'var(--text)'
                }}
              >
                Fusionner deux entrées
                <TooltipIcon id="merge-series" />
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'flex-end'
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      marginBottom: '4px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Type d&apos;entrée
                  </label>
                  <select
                    value={mergeType}
                    onChange={(e) =>
                      setMergeType(e.target.value as 'manga' | 'anime' | 'movie' | 'tv' | 'game')
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-light)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  >
                    {mergeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      marginBottom: '4px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    ID source (sera supprimée)
                  </label>
                  <input
                    type="number"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    placeholder="Ex: 123"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-light)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      marginBottom: '4px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    ID cible (reçoit les données)
                  </label>
                  <input
                    type="number"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="Ex: 456"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-light)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <button
                  className="btn"
                  onClick={handleOpenMergeModal}
                  disabled={mergePreviewLoading || !sourceId || !targetId}
                  style={{
                    padding: '8px 16px',
                    minWidth: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {mergePreviewLoading ? (
                    'Préparation...'
                  ) : (
                    <>
                      <Merge size={16} style={{ marginRight: '6px' }} />
                      Fusionner
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginTop: '12px',
        fontStyle: 'italic'
      }}>
        💡 Utilisez <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>await window.electronAPI.debugGetSerieData(ID)</code> dans la console pour voir toutes les données d'une série
      </p>
    </div>
  );
}
