import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import Toggle from '../../../components/common/Toggle';
import type { ContentPreferences } from '../../../types';

interface AppearanceSettingsProps {
  theme: 'dark' | 'light';
  autoLaunch: boolean;
  autoDownloadCovers: boolean;
  contentPrefs: ContentPreferences;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onAutoLaunchChange: (enabled: boolean) => void;
  onAutoDownloadCoversChange: (enabled: boolean) => void;
  onContentPrefChange: (key: keyof ContentPreferences, value: boolean) => void;
}

export default function AppearanceSettings({
  theme,
  autoLaunch,
  autoDownloadCovers,
  contentPrefs,
  onThemeChange,
  onAutoLaunchChange,
  onAutoDownloadCoversChange,
  onContentPrefChange,
}: AppearanceSettingsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tooltipTexts: Record<string, string> = {
    theme: 'Mémorisation : Le thème est automatiquement sauvegardé d\'une session à l\'autre.',
    startup: 'Confort : Démarre Nexus automatiquement au lancement de Windows.',
    autoDownloadCovers: 'Téléchargement : Les couvertures seront automatiquement téléchargées localement lors des imports (Mihon, Nautiljon, etc.). Utile pour contourner les protections Cloudflare.',
    visibility: 'Affichage : Contrôle si ces pages de contenu s\'affichent ou non dans la navigation et sur l\'accueil.'
  };

  const TooltipIcon = ({ id, icon, ariaLabel }: { id: keyof typeof tooltipTexts; icon: string; ariaLabel: string }) => (
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
        outline: 'none'
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
            lineHeight: '1.45',
            zIndex: 20,
            minWidth: '220px',
            maxWidth: '260px',
            textAlign: 'center'
          }}
        >
          {tooltipTexts[id]}
        </div>
      )}
    </span>
  );

  const visibilityOptions: Array<{ label: string; key: keyof ContentPreferences; description?: string }> = [
    { label: '📚 Lectures', key: 'showMangas', description: 'Manga, Manhwa, Manhua, Comics, BD, Livres' },
    { label: '🎬 Vidéos', key: 'showVideos', description: 'Animes, Films et Séries' },
    { label: '🎮 Jeux', key: 'showAdulteGame', description: 'Jeux adultes, Jeux vidéo (RAWG)' },
    { label: '💳 Abonnements', key: 'showSubscriptions', description: 'Abonnements et achats ponctuels' }
  ];


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Paramètres généraux */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)' }}>
          Paramètres généraux
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {/* Thème */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '16px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)' }}>
              Thème de l'application
              <TooltipIcon id="theme" icon="💡" ariaLabel="Informations sur la mémorisation du thème" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onThemeChange('dark')}
                className="btn"
                style={{
                  padding: '10px 12px',
                  background: theme === 'dark' ? 'var(--primary)' : 'var(--surface-light)',
                  border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: theme === 'dark' ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                title="Mode sombre"
              >
                <Moon size={20} />
              </button>
              <button
                onClick={() => onThemeChange('light')}
                className="btn"
                style={{
                  padding: '10px 12px',
                  background: theme === 'light' ? 'var(--primary)' : 'var(--surface-light)',
                  border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: theme === 'light' ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                title="Mode clair"
              >
                <Sun size={20} />
              </button>
            </div>
          </div>

          {/* Démarrage */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '16px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)' }}>
              Lancer Nexus au démarrage
              <TooltipIcon id="startup" icon="❓" ariaLabel="Informations sur le démarrage automatique" />
            </div>
            <Toggle checked={autoLaunch} onChange={onAutoLaunchChange} />
          </div>

          {/* Téléchargement automatique des couvertures */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '16px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)' }}>
              Téléchargement automatique des couvertures
              <TooltipIcon id="autoDownloadCovers" icon="💡" ariaLabel="Informations sur le téléchargement automatique" />
            </div>
            <Toggle checked={autoDownloadCovers} onChange={onAutoDownloadCoversChange} />
          </div>
        </div>
      </div>

      {/* Visibilité */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text)' }}>
          Visibilité des contenus
          <TooltipIcon id="visibility" icon="💡" ariaLabel="Informations sur la visibilité des contenus" />
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {visibilityOptions.map(({ label, key, description }) => {
            // Pour showVideos, calculer la valeur avec fallback sur les anciennes préférences
            let checked: boolean;
            if (key === 'showVideos') {
              checked = contentPrefs.showVideos !== undefined
                ? contentPrefs.showVideos
                : (contentPrefs.showAnimes || contentPrefs.showMovies || contentPrefs.showSeries);
            } else {
              checked = contentPrefs[key] ?? false;
            }

            return (
              <div
                key={key}
                style={{
                  flex: '1 1 180px',
                  minWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: 'var(--surface)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{label}</span>
                  <Toggle
                    checked={checked}
                    onChange={(checked) => onContentPrefChange(key, checked)}
                  />
                </div>
                {description && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{description}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
