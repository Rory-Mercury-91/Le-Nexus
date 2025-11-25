import { CheckCircle, ExternalLink, Info, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import BlacklistModal from '../../../components/modals/adulte-game/BlacklistModal';
import { AdulteGameBlacklistCard, AdulteGameMentionsCard, AdulteGameWebhookCard } from './AdulteGameSyncSettings';
import AdulteGameTranslatorsSettings from './AdulteGameTranslatorsSettings';

type SyncFrequencyValue = 1 | 3 | 6 | 12 | 24;

interface AdulteGameSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

const tooltipTexts = {
  f95: "Connexion requise pour récupérer tous les tags, y compris ceux réservés aux comptes connectés.",
  manualSync: "Lance immédiatement l'import pour les traducteurs sélectionnés.",
} as const;

type TooltipId = keyof typeof tooltipTexts;

export default function AdulteGameSettings({ showToast }: AdulteGameSettingsProps) {

  // État unifié pour la synchronisation
  const [config, setConfig] = useState({
    enabled: false,
    traducteurs: [] as string[],
    sheetUrl: '',
    syncFrequency: 6 as SyncFrequencyValue,
    lastSync: null as string | null,
    gamesCount: 0,
    discordWebhookUrl: '',
    discordMentions: {} as Record<string, string>,
    discordNotifyGameUpdates: true,
    discordNotifyTranslationUpdates: true
  });

  const [traducteursList, setTraducteursList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [loadingTraducteurs, setLoadingTraducteurs] = useState(true);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklistCount, setBlacklistCount] = useState(0);
  const [f95Connected, setF95Connected] = useState(false);
  const [checkingF95, setCheckingF95] = useState(true);

  // Conversion entre format string ('1h', '3h') et numérique (1, 3) pour compatibilité backend
  const stringToNumber = (str: string): SyncFrequencyValue => {
    const num = parseInt(str.replace('h', ''), 10);
    return (num === 1 || num === 3 || num === 6 || num === 12 || num === 24) ? num : 3;
  };

  const numberToString = (num: SyncFrequencyValue): string => {
    return `${num}h`;
  };

  // Charger la config et la liste des traducteurs au démarrage
  useEffect(() => {
    loadConfig();
    loadTraducteurs();
    void loadBlacklistCount();
    void checkF95Connection();
    // Attendre un peu avant de considérer le chargement comme terminé
    setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
  }, []);

  const checkF95Connection = async () => {
    try {
      setCheckingF95(true);
      const connected = await window.electronAPI.checkF95Connection?.();
      setF95Connected(connected || false);
    } catch (error) {
      console.error('Erreur vérification connexion F95:', error);
      setF95Connected(false);
    } finally {
      setCheckingF95(false);
    }
  };

  const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null);

  const handleF95Connect = useCallback(async () => {
    try {
      const result = await window.electronAPI.connectF95?.();
      if (result?.success) {
        showToast({
          type: 'success',
          title: 'Connexion réussie',
          message: 'Vous êtes maintenant connecté à F95Zone'
        });
        await checkF95Connection();
      } else {
        showToast({
          type: 'error',
          title: 'Erreur de connexion',
          message: result?.error || 'Impossible de se connecter à F95Zone'
        });
      }
    } catch (error: any) {
      console.error('Erreur connexion F95:', error);
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible de se connecter'
      });
    }
  }, [showToast]);

  const handleF95Disconnect = useCallback(async () => {
    try {
      await window.electronAPI.disconnectF95?.();
      showToast({
        type: 'success',
        title: 'Déconnexion réussie',
        message: 'Vous avez été déconnecté de F95Zone'
      });
      await checkF95Connection();
    } catch (error: any) {
      console.error('Erreur déconnexion F95:', error);
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible de se déconnecter'
      });
    }
  }, [showToast]);

  // Sauvegarde instantanée quand la config change (après interaction utilisateur)
  useEffect(() => {
    if (isInitialLoad || !hasUserInteracted) return;
    saveConfigInstant();
  }, [config.enabled, config.syncFrequency, config.traducteurs, isInitialLoad, hasUserInteracted]);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.getTraductionConfig();
      // Convertir le format string vers numérique si nécessaire
      const syncFrequency = typeof savedConfig.syncFrequency === 'string'
        ? stringToNumber(savedConfig.syncFrequency)
        : savedConfig.syncFrequency;
      setConfig({
        ...savedConfig,
        syncFrequency,
        discordWebhookUrl: savedConfig.discordWebhookUrl || '',
        discordMentions: savedConfig.discordMentions || {},
        discordNotifyGameUpdates: savedConfig.discordNotifyGameUpdates !== false,
        discordNotifyTranslationUpdates: savedConfig.discordNotifyTranslationUpdates !== false
      });
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  };

  const loadTraducteurs = async () => {
    try {
      setLoadingTraducteurs(true);
      const result = await window.electronAPI.fetchTraducteurs();
      if (result.success) {
        setTraducteursList(result.traducteurs);
      } else {
        console.error('❌ Erreur chargement traducteurs:', result.error);
        showToast({
          type: 'warning',
          title: 'Liste des traducteurs non disponible',
          message: 'Vérifiez votre connexion internet'
        });
      }
    } catch (error) {
      console.error('Erreur loadTraducteurs:', error);
    } finally {
      setLoadingTraducteurs(false);
    }
  };

  const loadBlacklistCount = async () => {
    try {
      const list = await window.electronAPI.getAdulteGameBlacklist?.();
      if (Array.isArray(list)) {
        setBlacklistCount(list.length);
      } else {
        setBlacklistCount(0);
      }
    } catch (error) {
      console.error('Erreur chargement compteur liste noire:', error);
    }
  };

  const saveConfigInstant = async (overrideConfig?: typeof config) => {
    try {
      const currentConfig = overrideConfig ?? config;
      // Convertir le format numérique vers string pour le backend
      const configToSave = {
        ...currentConfig,
        syncFrequency: numberToString(currentConfig.syncFrequency) as any,
        discordWebhookUrl: (currentConfig.discordWebhookUrl || '').trim(),
        discordMentions: Object.fromEntries(
          Object.entries(currentConfig.discordMentions || {}).map(([key, value]) => [
            key,
            (value || '').replace(/[^0-9]/g, '').trim()
          ]).filter(([key, value]) => key.trim().length > 0 && value.length > 0)
        ),
        discordNotifyGameUpdates: currentConfig.discordNotifyGameUpdates !== false,
        discordNotifyTranslationUpdates: currentConfig.discordNotifyTranslationUpdates !== false
      };
      const result = await window.electronAPI.saveTraductionConfig(configToSave);
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Configuration sauvegardée',
          duration: 2000
        });
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde config:', error);
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: error.message || 'Impossible de sauvegarder'
      });
    }
  };

  const handleWebhookChange = (value: string) => {
    setHasUserInteracted(true);
    setConfig(prev => ({
      ...prev,
      discordWebhookUrl: value
    }));
  };

  const handleToggleTraducteur = (traducteur: string) => {
    setHasUserInteracted(true);
    setConfig(prev => ({
      ...prev,
      traducteurs: prev.traducteurs.includes(traducteur)
        ? prev.traducteurs.filter(t => t !== traducteur)
        : [...prev.traducteurs, traducteur]
    }));
    setSearchQuery(''); // Réinitialiser la recherche après sélection
  };

  const handleRemoveTraducteur = (traducteur: string) => {
    setHasUserInteracted(true);
    setConfig(prev => ({
      ...prev,
      traducteurs: prev.traducteurs.filter(t => t !== traducteur),
      discordMentions: Object.fromEntries(
        Object.entries(prev.discordMentions).filter(([key]) => key !== traducteur)
      )
    }));
  };

  const handleChangeMention = (traducteur: string, value: string) => {
    setHasUserInteracted(true);
    setConfig(prev => ({
      ...prev,
      discordMentions: {
        ...prev.discordMentions,
        [traducteur]: value.replace(/[^0-9]/g, '')
      }
    }));
  };

  const handleBlacklistRemoval = async (_id: number) => {
    await loadBlacklistCount();
    showToast({
      type: 'success',
      title: 'Jeu retiré de la liste noire',
      message: 'Le jeu pourra être recréé lors des prochaines synchronisations'
    });
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Jamais';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  const handleSyncNow = async () => {
    if (config.traducteurs.length === 0) {
      showToast({
        type: 'warning',
        title: 'Aucun traducteur sélectionné',
        message: 'Veuillez sélectionner au moins un traducteur'
      });
      return;
    }

    setSyncing(true);
    try {
      const result = await window.electronAPI.syncTraductionsNow();
      if (result.success) {
        const createdCount = result.created || 0;
        const updatedCount = result.updated || 0;
        const matchedCount = result.matched || 0;

        let message = '';
        if (createdCount > 0 && updatedCount > 0) {
          message = `${createdCount} créé(s), ${updatedCount} mis à jour`;
        } else if (createdCount > 0) {
          message = `${createdCount} créé(s)`;
        } else if (updatedCount > 0) {
          message = `${updatedCount} mis à jour`;
        } else if (matchedCount > 0) {
          message = `${matchedCount} jeu(x) trouvé(s)`;
        } else {
          message = 'Aucune modification';
        }

        showToast({
          type: 'success',
          title: 'Synchronisation terminée',
          message: message
        });
        loadConfig(); // Recharger pour avoir lastSync
      } else {
        console.error('❌ Erreur sync:', result.error);
        showToast({
          type: 'error',
          title: 'Erreur de synchronisation',
          message: result.error || 'Erreur inconnue'
        });
      }
    } catch (error: any) {
      console.error('Erreur sync:', error);
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible de synchroniser'
      });
    } finally {
      setSyncing(false);
    }
  };

  const TooltipIcon = ({ id, placement = 'center' }: { id: TooltipId; placement?: 'center' | 'end' }) => (
    <span
      tabIndex={0}
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
      onFocus={() => setActiveTooltip(id)}
      onBlur={() => setActiveTooltip(null)}
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
        borderRadius: '50%'
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
            maxWidth: '260px',
            textAlign: 'center',
          }}
        >
          {tooltipTexts[id]}
        </div>
      )}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
        }}
      >
        <AdulteGameBlacklistCard onOpen={() => setShowBlacklist(true)} count={blacklistCount} />
        
        {/* Carte de connexion F95Zone */}
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              Connexion F95Zone
              </div>
              <TooltipIcon id="f95" placement="end" />
            </div>
            {checkingF95 ? (
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />
            ) : f95Connected ? (
              <CheckCircle size={16} style={{ color: '#10b981' }} />
            ) : (
              <XCircle size={16} style={{ color: '#ef4444' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {f95Connected ? (
              <button
                onClick={handleF95Disconnect}
                className="btn"
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Se déconnecter
              </button>
            ) : (
              <button
                onClick={handleF95Connect}
                className="btn"
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  boxShadow: '0 14px 30px rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ExternalLink size={14} />
                Se connecter
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
        }}
      >
        <AdulteGameTranslatorsSettings
          traducteurs={config.traducteurs}
          traducteursList={traducteursList}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          loadingTraducteurs={loadingTraducteurs}
          onToggleTraducteur={handleToggleTraducteur}
          onRemoveTraducteur={handleRemoveTraducteur}
          syncing={syncing}
          onSyncNow={handleSyncNow}
          lastSync={config.lastSync}
          gamesCount={config.gamesCount}
          renderActions={false}
        />

        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            Synchronisation manuelle
              <TooltipIcon id="manualSync" placement="end" />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <button
              onClick={handleSyncNow}
              disabled={syncing || config.traducteurs.length === 0}
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: syncing
                  ? 'var(--surface-light)'
                  : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                color: syncing ? 'var(--text-secondary)' : '#ffffff',
                border: 'none',
                boxShadow: '0 14px 30px rgba(99, 102, 241, 0.35)',
                cursor: syncing || config.traducteurs.length === 0 ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                fontWeight: 600
              }}
            >
              <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </button>
            <div
              style={{
                padding: '12px',
                background: 'var(--surface)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span>
                Dernière synchronisation :{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {config.lastSync ? formatLastSync(config.lastSync) : 'Jamais'}
                </strong>
              </span>
              <span>
                Jeux traités :{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {config.gamesCount ?? 0}
                </strong>
              </span>
            </div>
          </div>
          {config.traducteurs.length === 0 && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)'
              }}
            >
              Ajoutez au moins un traducteur pour activer la synchronisation.
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
        }}
      >
        <AdulteGameWebhookCard
          webhookUrl={config.discordWebhookUrl}
          onChangeWebhook={handleWebhookChange}
        />
        <AdulteGameMentionsCard
          traducteurs={config.traducteurs}
          discordMentions={config.discordMentions}
          onChangeMention={handleChangeMention}
        />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {showBlacklist && (
        <BlacklistModal
          onClose={() => {
            setShowBlacklist(false);
            void loadBlacklistCount();
          }}
          onRemove={handleBlacklistRemoval}
        />
      )}
    </div>
  );
}
