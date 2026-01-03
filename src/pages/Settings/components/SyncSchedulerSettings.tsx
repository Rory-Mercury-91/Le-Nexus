import { Info } from 'lucide-react';
import { useState } from 'react';
import Toggle from '../../../components/common/Toggle';

interface SyncSchedulerSettingsProps {
  globalSyncInterval: 1 | 3 | 6 | 12 | 24;
  globalSyncUpdating: boolean;
  onGlobalSyncIntervalChange: (interval: 1 | 3 | 6 | 12 | 24) => void | Promise<void>;
  
  malAutoSyncEnabled: boolean;
  onMalAutoSyncChange: (enabled: boolean) => void;
  malConnected: boolean;
  
  anilistAutoSyncEnabled: boolean;
  onAnilistAutoSyncChange: (enabled: boolean) => void;
  anilistConnected: boolean;
  
  nautiljonAutoSyncEnabled: boolean;
  onNautiljonAutoSyncChange: (enabled: boolean) => void;
  nautiljonAutoSyncIncludeTomes: boolean;
  onNautiljonIncludeTomesChange: (include: boolean) => void;
}

const tooltipTexts = {
  globalSyncInterval: "Fréquence appliquée à toutes les routines automatiques activées (MyAnimeList, AniList, Nautiljon, Jeux adultes…).",
  malAutoSync: "Met à jour vos progressions MAL automatiquement à l'intervalle défini.",
  anilistAutoSync: "Met à jour vos progressions AniList automatiquement à l'intervalle défini.",
  nautiljonAutoSync: "Actualise en arrière-plan les fiches Nautiljon liées aux séries suivies.",
  nautiljonTomes: "Inclut les tomes/volumes Nautiljon dans la synchronisation automatique.",
} as const;

type TooltipId = keyof typeof tooltipTexts;

const TooltipIcon = ({ id }: { id: TooltipId }) => {
  const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null);
  
  return (
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
      }}
    >
      <Info size={16} aria-hidden="true" />
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
          {tooltipTexts[id]}
        </div>
      )}
    </span>
  );
};

export default function SyncSchedulerSettings({
  globalSyncInterval,
  globalSyncUpdating,
  onGlobalSyncIntervalChange,
  malAutoSyncEnabled,
  onMalAutoSyncChange,
  malConnected,
  anilistAutoSyncEnabled,
  onAnilistAutoSyncChange,
  anilistConnected,
  nautiljonAutoSyncEnabled,
  onNautiljonAutoSyncChange,
  nautiljonAutoSyncIncludeTomes,
  onNautiljonIncludeTomesChange,
}: SyncSchedulerSettingsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Fréquence de Synchronisation Globale */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '240px',
            flex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              Fréquence de Synchronisation Globale
            </h3>
            <TooltipIcon id="globalSyncInterval" />
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Appliquée à toutes les routines automatiques activées (MyAnimeList, AniList, Nautiljon, Jeux adultes…).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={globalSyncInterval}
            onChange={(e) => onGlobalSyncIntervalChange(Number(e.target.value) as 1 | 3 | 6 | 12 | 24)}
            disabled={globalSyncUpdating}
            aria-busy={globalSyncUpdating}
            style={{
              fontWeight: 600,
              width: '240px',
              flex: '0 0 240px',
              cursor: globalSyncUpdating ? 'wait' : 'pointer',
              opacity: globalSyncUpdating ? 0.65 : 1,
            }}
            className="select"
          >
            <option value={1}>Toutes les heures</option>
            <option value={3}>Toutes les 3 heures</option>
            <option value={6}>Toutes les 6 heures</option>
            <option value={12}>Toutes les 12 heures</option>
            <option value={24}>Tous les jours</option>
          </select>
        </div>
      </div>

      {/* Synchronisations automatiques */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
          Synchronisations automatiques
        </h4>
        
        <div
          style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {/* MyAnimeList */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                🔄 Synchronisation automatique MyAnimeList
              </div>
              <TooltipIcon id="malAutoSync" />
            </div>
            <Toggle
              checked={malAutoSyncEnabled}
              onChange={onMalAutoSyncChange}
              disabled={!malConnected}
            />
          </div>

          {/* AniList */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                🔄 Synchronisation automatique AniList
              </div>
              <TooltipIcon id="anilistAutoSync" />
            </div>
            <Toggle
              checked={anilistAutoSyncEnabled}
              onChange={onAnilistAutoSyncChange}
              disabled={!anilistConnected}
            />
          </div>

          {/* Nautiljon */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                📚 Synchronisation automatique de Nautiljon
              </div>
              <TooltipIcon id="nautiljonAutoSync" />
            </div>
            <Toggle
              checked={nautiljonAutoSyncEnabled}
              onChange={onNautiljonAutoSyncChange}
            />
          </div>

          {/* Nautiljon Tomes */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                📚 Gestion des tomes/volumes (Nautiljon)
              </div>
              <TooltipIcon id="nautiljonTomes" />
            </div>
            <Toggle
              checked={nautiljonAutoSyncIncludeTomes}
              onChange={onNautiljonIncludeTomesChange}
              disabled={!nautiljonAutoSyncEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
