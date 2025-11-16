import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import Toggle from '../../../components/common/Toggle';
import type { ContentPreferences } from '../../../types';

interface AppearanceSettingsProps {
  theme: 'dark' | 'light';
  autoLaunch: boolean;
  contentPrefs: ContentPreferences;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onAutoLaunchChange: (enabled: boolean) => void;
  onContentPrefChange: (key: keyof ContentPreferences, value: boolean) => void;
  tmdbLanguage: string;
  tmdbRegion: string;
  onTmdbLanguageChange: (value: string) => void | Promise<void>;
  onTmdbRegionChange: (value: string) => void | Promise<void>;
  onOpenMangaSettings: () => void;
  onOpenAnimeSettings: () => void;
  onOpenMovieSettings: () => void;
  onOpenSeriesSettings: () => void;
  onOpenAdultGameSettings: () => void;
}

export default function AppearanceSettings({
  theme,
  autoLaunch,
  contentPrefs,
  onThemeChange,
  onAutoLaunchChange,
  onContentPrefChange,
  tmdbLanguage,
  tmdbRegion,
  onTmdbLanguageChange,
  onTmdbRegionChange,
  onOpenMangaSettings,
  onOpenAnimeSettings,
  onOpenMovieSettings,
  onOpenSeriesSettings,
  onOpenAdultGameSettings,
}: AppearanceSettingsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [languageInput, setLanguageInput] = useState(tmdbLanguage);
  const [regionInput, setRegionInput] = useState(tmdbRegion);

  useEffect(() => {
    setLanguageInput(tmdbLanguage);
  }, [tmdbLanguage]);

  useEffect(() => {
    setRegionInput(tmdbRegion);
  }, [tmdbRegion]);

  const tooltipTexts: Record<string, string> = {
    theme: 'Mémorisation : Le thème est automatiquement sauvegardé d\'une session à l\'autre.',
    startup: 'Confort : Démarre Nexus automatiquement au lancement de Windows.',
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

  const visibilityOptions: Array<{ label: string; key: keyof ContentPreferences }> = [
    { label: '📚 Mangas', key: 'showMangas' },
    { label: '🎬 Animes', key: 'showAnimes' },
    { label: '🎞️ Films', key: 'showMovies' },
    { label: '📺 Séries', key: 'showSeries' },
    { label: '🎮 Jeux adultes', key: 'showAdulteGame' }
  ];

  const personalizationCards: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    onOpen: () => void;
  }> = [
      {
        id: 'manga',
        title: 'Mangas',
        description: 'Activez ou masquez les sections des fiches mangas (bibliothèque et détails).',
        icon: '📚',
        onOpen: onOpenMangaSettings,
      },
      {
        id: 'anime',
        title: 'Animes',
        description: 'Choisissez les informations affichées sur les fiches animes et les listes d\'épisodes.',
        icon: '🎬',
        onOpen: onOpenAnimeSettings,
      },
      {
        id: 'movies',
        title: 'Films',
        description: 'Personnalisez les sections visibles des fiches films importées depuis TMDb.',
        icon: '🎞️',
        onOpen: onOpenMovieSettings,
      },
      {
        id: 'series',
        title: 'Séries TV',
        description: 'Définissez les blocs affichés pour les fiches séries et le suivi des saisons.',
        icon: '📺',
        onOpen: onOpenSeriesSettings,
      },
      {
        id: 'adult-game',
        title: 'Jeux adultes',
        description: 'Configurez les sections visibles par défaut : informations principales, traduction, tags…',
        icon: '🎮',
        onOpen: onOpenAdultGameSettings,
      },
    ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Thème */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
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
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onThemeChange('dark')}
            className="btn"
            style={{
              flex: '1 1 160px',
              padding: '12px 16px',
              background: theme === 'dark' ? 'var(--primary)' : 'var(--surface-light)',
              border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
              color: theme === 'dark' ? 'white' : 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            <Moon size={18} />
            Mode sombre
          </button>
          <button
            onClick={() => onThemeChange('light')}
            className="btn"
            style={{
              flex: '1 1 160px',
              padding: '12px 16px',
              background: theme === 'light' ? 'var(--primary)' : 'var(--surface-light)',
              border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
              color: theme === 'light' ? 'white' : 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            <Sun size={18} />
            Mode clair
          </button>
        </div>
      </div>

      {/* Démarrage */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
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

      {/* Visibilité */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px'
        }}
      >
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
          {visibilityOptions.map(({ label, key }) => (
            <div
              key={key}
              style={{
                flex: '1 1 180px',
                minWidth: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--surface-light)'
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{label}</span>
              <Toggle
                checked={contentPrefs[key]}
                onChange={(checked) => onContentPrefChange(key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Paramètres régionaux */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px'
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
          🌐 Paramètres Régionaux et de Langue
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
          Ces réglages influencent la langue et la disponibilité des contenus récupérés via les services externes (TMDb…).
        </p>
        <div
          style={{
            display: 'grid',
            gap: '14px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Langue par défaut</label>
            <input
              type="text"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onBlur={() => onTmdbLanguageChange(languageInput)}
              placeholder="fr-FR"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text)',
                fontSize: '13px',
                letterSpacing: '0.3px'
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Format attendu : langue-pays (ex. fr-FR, en-US).
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Région par défaut</label>
            <input
              type="text"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value.toUpperCase())}
              onBlur={() => onTmdbRegionChange(regionInput)}
              placeholder="FR"
              maxLength={2}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text)',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Détermine les disponibilités (VOD/cinéma) utilisées par défaut.
            </span>
          </div>
        </div>
      </div>

      {/* Personnalisation des fiches */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>Personnalisation des Fiches de Contenu</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}
        >
          {personalizationCards.map((card) => (
            <div
              key={card.id}
              style={{
                background: 'var(--surface)',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(var(--primary-rgb), 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  {card.icon}
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{card.title}</h3>
              </div>

              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                {card.description}
              </p>

              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={card.onOpen}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px'
                  }}
                >
                  ⚙️ Configurer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
