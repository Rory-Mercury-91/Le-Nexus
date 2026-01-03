import { Info } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import Toggle from '../../../components/common/Toggle';

interface NotificationSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  onHeaderActionsChange?: (node: ReactNode | null) => void;
  globalSyncInterval: 1 | 3 | 6 | 12 | 24;
}

type NotificationFrequency = '6h' | '12h' | 'daily' | 'manual';
type TraductionSyncFrequency = '1h' | '3h' | '6h' | '12h' | '24h' | 'manual';

interface NotificationConfig {
  enabled: boolean;
  checkAnimes: boolean;
  checkAdulteGame: boolean;
  notifyNautiljonSync: boolean;
  notifyMalSync: boolean;
  notifyEnrichment: boolean;
  notifyBackup: boolean;
  frequency: NotificationFrequency;
  soundEnabled: boolean;
  checkOnStartup: boolean;
}

interface TraductionConfig {
  enabled?: boolean;
  traducteurs?: string[];
  sheetUrl?: string;
  syncFrequency?: TraductionSyncFrequency;
  lastSync?: string | null;
  gamesCount?: number;
  discordWebhookUrl?: string;
  discordMentions?: Record<string, string>;
  discordNotifyGameUpdates?: boolean;
  discordNotifyTranslationUpdates?: boolean;
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: false,
  checkAnimes: true,
  checkAdulteGame: true,
  notifyNautiljonSync: true,
  notifyMalSync: true,
  notifyEnrichment: true,
  notifyBackup: true,
  frequency: '12h',
  soundEnabled: true,
  checkOnStartup: false,
};

const DEFAULT_TRADUCTION_CONFIG: TraductionConfig = {
  enabled: false,
  traducteurs: [],
  sheetUrl: '',
  syncFrequency: '6h',
  lastSync: null,
  gamesCount: 0,
  discordWebhookUrl: '',
  discordMentions: {},
  discordNotifyGameUpdates: true,
  discordNotifyTranslationUpdates: true,
};

const TRADUCTION_SYNC_OPTIONS: TraductionSyncFrequency[] = ['1h', '3h', '6h', '12h', '24h', 'manual'];

const sanitizeTraductionSyncFrequency = (value: unknown): TraductionSyncFrequency => {
  if (typeof value === 'string') {
    if (TRADUCTION_SYNC_OPTIONS.includes(value as TraductionSyncFrequency)) {
      return value as TraductionSyncFrequency;
    }
    if (value === 'daily') {
      return '24h';
    }
  }
  if (typeof value === 'number') {
    const mapped = `${value}h`;
    if (TRADUCTION_SYNC_OPTIONS.includes(mapped as TraductionSyncFrequency)) {
      return mapped as TraductionSyncFrequency;
    }
  }
  return '6h';
};

const TOOLTIP_TEXTS: Record<string, string> = {
  general: 'Service général : Active la réception des notifications du Nexus sur votre bureau.',
  content: 'Filtres : Sélectionnez les types d’alertes que vous souhaitez recevoir.',
  sound: 'Feedback : Joue un son lorsque Nexus envoie une notification.',
  startup: 'Rafraîchissement : Lance une vérification de l’état des données au démarrage si l’intervalle de la dernière synchro interne est dépassé.',
  enrichment: 'Détails complétés : Alerte quand les informations secondaires (Jikan/AniList) ont fini d’enrichir les données MAL.',
};

export default function NotificationSettings({ showToast, onHeaderActionsChange, globalSyncInterval }: NotificationSettingsProps) {
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [globalSyncTooltipVisible, setGlobalSyncTooltipVisible] = useState(false);
  const [traductionConfig, setTraductionConfig] = useState<TraductionConfig>(DEFAULT_TRADUCTION_CONFIG);
  const [adulteGameNotifications, setAdulteGameNotifications] = useState({
    game: true,
    translation: true,
  });
  const [savingTraduction, setSavingTraduction] = useState(false);

  useEffect(() => {
    loadConfig();
    loadAdulteGameNotificationConfig();
    const timeoutId = setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (isInitialLoad || !hasUserInteracted) return;

    const timeoutId = setTimeout(() => {
      handleSaveConfig();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [config, isInitialLoad, hasUserInteracted]);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.getNotificationConfig();
      setConfig((prev) => ({
        ...prev,
        ...savedConfig,
        notifyNautiljonSync: savedConfig.notifyNautiljonSync ?? prev.notifyNautiljonSync,
        notifyMalSync: savedConfig.notifyMalSync ?? prev.notifyMalSync,
        notifyEnrichment: savedConfig.notifyEnrichment ?? prev.notifyEnrichment,
        notifyBackup: savedConfig.notifyBackup ?? prev.notifyBackup,
        frequency: (savedConfig.frequency as NotificationFrequency | undefined) ?? prev.frequency,
      }));
    } catch (error) {
      console.error('Erreur chargement config notifications:', error);
    }
  };

  const loadAdulteGameNotificationConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.getTraductionConfig?.();
      const mergedConfig: TraductionConfig = {
        ...DEFAULT_TRADUCTION_CONFIG,
        ...(savedConfig || {}),
        syncFrequency: sanitizeTraductionSyncFrequency(savedConfig?.syncFrequency),
      };
      setTraductionConfig(mergedConfig);
      setAdulteGameNotifications({
        game: mergedConfig.discordNotifyGameUpdates !== false,
        translation: mergedConfig.discordNotifyTranslationUpdates !== false,
      });
    } catch (error) {
      console.error('Erreur chargement config traductions (notifications jeux adultes):', error);
      setTraductionConfig(DEFAULT_TRADUCTION_CONFIG);
      setAdulteGameNotifications({ game: true, translation: true });
    }
  };

  const saveTraductionNotifications = async (configToSave: TraductionConfig) => {
    try {
      setSavingTraduction(true);
      await window.electronAPI.saveTraductionConfig({
        enabled: configToSave.enabled ?? false,
        traducteurs: configToSave.traducteurs ?? [],
        sheetUrl: configToSave.sheetUrl ?? '',
        syncFrequency: sanitizeTraductionSyncFrequency(configToSave.syncFrequency),
        lastSync: configToSave.lastSync ?? null,
        gamesCount: configToSave.gamesCount ?? 0,
        discordWebhookUrl: configToSave.discordWebhookUrl ?? '',
        discordMentions: configToSave.discordMentions ?? {},
        discordNotifyGameUpdates: configToSave.discordNotifyGameUpdates ?? true,
        discordNotifyTranslationUpdates: configToSave.discordNotifyTranslationUpdates ?? true,
      });
    } catch (error: any) {
      console.error('Erreur sauvegarde notifications jeux adultes:', error);
      showToast({
        title: 'Erreur de sauvegarde',
        message: error?.message || 'Impossible de sauvegarder les notifications jeux adultes.',
        type: 'error',
      });
    } finally {
      setSavingTraduction(false);
    }
  };

  const handleSaveConfig = async (silent = false) => {
    try {
      const result = await window.electronAPI.saveNotificationConfig(config);

      if (result.success) {
        if (!silent) {
          showToast({
            title: 'Configuration sauvegardée',
            type: 'success',
            duration: 2000,
          });
        }
      } else {
        showToast({
          title: 'Erreur de sauvegarde',
          message: result.error || 'Erreur lors de la sauvegarde',
          type: 'error',
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur de sauvegarde',
        message: error.message,
        type: 'error',
      });
    }
  };

  const updateConfig = useCallback(<K extends keyof NotificationConfig>(key: K, value: NotificationConfig[K]) => {
    setHasUserInteracted(true);
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const TooltipIcon = ({ id, icon, ariaLabel }: { id: string; icon: string; ariaLabel: string }) => (
    <span
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
      onFocus={() => setActiveTooltip(id)}
      onBlur={() => setActiveTooltip(null)}
      tabIndex={0}
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        lineHeight: 1,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <span aria-hidden="true">{icon}</span>
      {activeTooltip === id && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
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
          {TOOLTIP_TEXTS[id]}
        </div>
      )}
    </span>
  );

  const webhookConfigured = Boolean(traductionConfig.discordWebhookUrl && traductionConfig.discordWebhookUrl.trim().length > 0);

  const intervalLabel = globalSyncInterval === 24 ? '24h (quotidien)' : `${globalSyncInterval}h`;
  const globalSyncTooltipText = `🔄 Les vérifications suivent la fréquence de synchronisation globale : toutes les ${intervalLabel}.`;

  useEffect(() => {
    if (!onHeaderActionsChange) {
      return;
    }

    onHeaderActionsChange(
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Activer les notifications
          <TooltipIcon id="general" icon="💡" ariaLabel={TOOLTIP_TEXTS.general} />
        </span>
        <Toggle
          checked={config.enabled}
          onChange={(checked) => updateConfig('enabled', checked)}
        />
        <span
          onMouseEnter={() => setGlobalSyncTooltipVisible(true)}
          onMouseLeave={() => setGlobalSyncTooltipVisible(false)}
          onFocus={() => setGlobalSyncTooltipVisible(true)}
          onBlur={() => setGlobalSyncTooltipVisible(false)}
          tabIndex={0}
          aria-label={globalSyncTooltipText}
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
          }}
        >
          <Info size={16} aria-hidden="true" />
          {globalSyncTooltipVisible && (
            <div
              role="tooltip"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
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
                maxWidth: '280px',
                textAlign: 'center',
                whiteSpace: 'normal',
              }}
            >
              {globalSyncTooltipText}
            </div>
          )}
        </span>
      </div>
    );
  }, [config.enabled, onHeaderActionsChange, updateConfig, globalSyncInterval, intervalLabel, globalSyncTooltipText, globalSyncTooltipVisible]);

  const handleToggleAdulteGameNotification = (type: 'game' | 'translation', value: boolean) => {
    setAdulteGameNotifications((prev) => {
      const updatedState = { ...prev, [type]: value };
      setTraductionConfig((prevConfig) => {
        const merged = { ...DEFAULT_TRADUCTION_CONFIG, ...prevConfig };
        const nextConfig: TraductionConfig = {
          ...merged,
          discordNotifyGameUpdates: type === 'game' ? value : updatedState.game,
          discordNotifyTranslationUpdates: type === 'translation' ? value : updatedState.translation,
        };
        void saveTraductionNotifications(nextConfig);
        return nextConfig;
      });
      return updatedState;
    });
  };

  const contentToggleItems = [
    {
      id: 'checkAnimes',
      label: '🎬 Nouveaux épisodes d’animes',
      checked: config.checkAnimes,
      onChange: (checked: boolean) => updateConfig('checkAnimes', checked),
    },
    {
      id: 'checkAdulteGame',
      label: '🎮 Mises à jour jeux adultes disponibles',
      checked: config.checkAdulteGame,
      onChange: (checked: boolean) => updateConfig('checkAdulteGame', checked),
    },
    {
      id: 'notifyNautiljonSync',
      label: '📚 Fin de synchronisation Nautiljon',
      checked: config.notifyNautiljonSync,
      onChange: (checked: boolean) => updateConfig('notifyNautiljonSync', checked),
    },
    {
      id: 'notifyMalSync',
      label: '🤝 Fin de synchro MAL',
      checked: config.notifyMalSync,
      onChange: (checked: boolean) => updateConfig('notifyMalSync', checked),
    },
    {
      id: 'notifyEnrichment',
      label: '✨ Fin d’enrichissement des données',
      tooltipId: 'enrichment',
      tooltipIcon: '✨',
      checked: config.notifyEnrichment,
      onChange: (checked: boolean) => updateConfig('notifyEnrichment', checked),
    },
    {
      id: 'notifyBackup',
      label: '💾 Sauvegarde automatique terminée',
      checked: config.notifyBackup,
      onChange: (checked: boolean) => updateConfig('notifyBackup', checked),
    },
    {
      id: 'notifyAdulteGameUpdates',
      label: '🔔 Notification Mises à jour du jeu',
      checked: adulteGameNotifications.game,
      onChange: (checked: boolean) => handleToggleAdulteGameNotification('game', checked),
      disabled: !webhookConfigured,
    },
    {
      id: 'notifyAdulteGameTranslations',
      label: '🔔 Notification Mises à jour de traduction',
      checked: adulteGameNotifications.translation,
      onChange: (checked: boolean) => handleToggleAdulteGameNotification('translation', checked),
      disabled: !webhookConfigured,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {config.enabled ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
            Contenu à surveiller
            <TooltipIcon id="content" icon="💡" ariaLabel={TOOLTIP_TEXTS.content} />
          </div>
          <div
            style={{
              display: 'grid',
              gap: '12px',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              marginBottom: '16px',
            }}
          >
            {contentToggleItems.map(({ id, label, tooltipId, tooltipIcon, checked, onChange, disabled }) => (
              <label
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: 'var(--surface-light)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {label}
                  {tooltipId && <TooltipIcon id={tooltipId} icon={tooltipIcon || 'ℹ️'} ariaLabel={TOOLTIP_TEXTS[tooltipId]} />}
                </span>
                <Toggle
                  checked={checked}
                  onChange={(value) => onChange(value)}
                  disabled={disabled}
                />
              </label>
            ))}
          </div>
          {!webhookConfigured && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              Configurez un webhook Discord dans la section Jeux adultes pour activer ces notifications.
            </p>
          )}
          {savingTraduction && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textAlign: 'center',
              }}
            >
              Sauvegarde des préférences Discord…
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)' }}>
              Options supplémentaires
            </div>
            <div
              style={{
                display: 'grid',
                gap: '12px',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: 'var(--surface-light)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  Son de notification activé
                  <TooltipIcon id="sound" icon="🔔" ariaLabel={TOOLTIP_TEXTS.sound} />
                </span>
                <Toggle checked={config.soundEnabled} onChange={(checked) => updateConfig('soundEnabled', checked)} />
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: 'var(--surface-light)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  Vérifier au démarrage de l'application
                  <TooltipIcon id="startup" icon="🚀" ariaLabel={TOOLTIP_TEXTS.startup} />
                </span>
                <Toggle checked={config.checkOnStartup} onChange={(checked) => updateConfig('checkOnStartup', checked)} />
              </label>
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}
        >
          Les notifications sont désactivées. Activez-les pour recevoir les alertes de synchronisation et de contenu.
        </div>
      )}
    </div>
  );
}
