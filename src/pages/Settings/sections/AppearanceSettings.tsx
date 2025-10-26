import { Moon, Sun } from 'lucide-react';

interface AppearanceSettingsProps {
  theme: 'dark' | 'light';
  autoLaunch: boolean;
  contentPrefs: { showMangas: boolean; showAnimes: boolean; showAvn: boolean };
  onThemeChange: (theme: 'dark' | 'light') => void;
  onAutoLaunchChange: (enabled: boolean) => void;
  onContentPrefChange: (key: 'showMangas' | 'showAnimes' | 'showAvn', value: boolean) => void;
}

export default function AppearanceSettings({
  theme,
  autoLaunch,
  contentPrefs,
  onThemeChange,
  onAutoLaunchChange,
  onContentPrefChange,
}: AppearanceSettingsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
      {/* Card gauche : Apparence */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎨 Apparence
        </h2>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--text-secondary)'
            }}>
              Thème de l'application
            </label>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => onThemeChange('dark')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: theme === 'dark' ? 'var(--primary)' : 'var(--surface)',
                  border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: theme === 'dark' ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Moon size={20} />
                Mode sombre
              </button>

              <button
                onClick={() => onThemeChange('light')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: theme === 'light' ? 'var(--primary)' : 'var(--surface)',
                  border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: theme === 'light' ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Sun size={20} />
                Mode clair
              </button>
            </div>

            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              borderLeft: '3px solid var(--primary)',
              marginTop: '12px'
            }}>
              💡 Le thème est automatiquement sauvegardé
            </p>
          </div>

          {/* Démarrage automatique */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '16px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            >
              <input
                type="checkbox"
                checked={autoLaunch}
                onChange={(e) => onAutoLaunchChange(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Lancer au démarrage
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Démarrer automatiquement Le Nexus avec Windows
                </div>
              </div>
            </label>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              ℹ️ Désactivé en mode développement
            </p>
          </div>
      </div>

      {/* Card droite : Préférences de contenu */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 Contenu affiché
        </h2>
          
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}>
            Choisissez les types de contenu (Manga, Animé, AVN) qui s'affichent dans la navigation et sur votre page d'accueil.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Mangas */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: contentPrefs.showMangas ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                border: contentPrefs.showMangas ? '2px solid var(--primary)' : '2px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onContentPrefChange('showMangas', !contentPrefs.showMangas)}
            >
              <input
                type="checkbox"
                checked={contentPrefs.showMangas}
                onChange={(e) => {
                  e.stopPropagation();
                  onContentPrefChange('showMangas', e.target.checked);
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>
                  📚 Mangas
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Afficher dans la navigation et sur l'accueil
                </div>
              </div>
            </label>

            {/* Animes */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: contentPrefs.showAnimes ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                border: contentPrefs.showAnimes ? '2px solid var(--primary)' : '2px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onContentPrefChange('showAnimes', !contentPrefs.showAnimes)}
            >
              <input
                type="checkbox"
                checked={contentPrefs.showAnimes}
                onChange={(e) => {
                  e.stopPropagation();
                  onContentPrefChange('showAnimes', e.target.checked);
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>
                  🎬 Animes
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Afficher dans la navigation et sur l'accueil
                </div>
              </div>
            </label>

            {/* AVN */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: contentPrefs.showAvn ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                border: contentPrefs.showAvn ? '2px solid var(--primary)' : '2px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onContentPrefChange('showAvn', !contentPrefs.showAvn)}
            >
              <input
                type="checkbox"
                checked={contentPrefs.showAvn}
                onChange={(e) => {
                  e.stopPropagation();
                  onContentPrefChange('showAvn', e.target.checked);
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>
                  🎮 AVN (Adult Visual Novels)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Afficher dans la navigation et sur l'accueil
                </div>
              </div>
            </label>
          </div>

            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '12px',
              fontStyle: 'italic'
            }}>
              💡 Les modifications sont appliquées immédiatement
            </p>
      </div>
    </div>
  );
}
