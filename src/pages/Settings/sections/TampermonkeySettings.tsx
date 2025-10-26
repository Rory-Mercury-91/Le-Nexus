import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface TampermonkeySettingsProps {
  showToast: (options: { title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

export default function TampermonkeySettings({ showToast }: TampermonkeySettingsProps) {
  const [opening, setOpening] = useState(false);

  const handleOpenInstallation = async () => {
    if (opening) return;

    setOpening(true);
    try {
      const result = await window.electronAPI.openTampermonkeyInstallation();
      
      if (result.success) {
        showToast({
          title: 'Page d\'installation ouverte',
          message: 'La page s\'est ouverte dans votre navigateur par défaut',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || 'Impossible d\'ouvrir la page d\'installation',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue',
        type: 'error'
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <div className="settings-section">
        <div className="settings-header">
          <h2 className="settings-title">🎭 Scripts Tampermonkey</h2>
        </div>
        <div className="settings-content">
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Les scripts Tampermonkey permettent d'intégrer Le Nexus avec vos sites préférés (Crunchyroll, ADN, 
            Nautiljon, F95Zone, etc.). Marquez automatiquement vos épisodes vus, importez des mangas et plus encore !
          </p>

          <div style={{ 
            background: 'var(--surface-light)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: 'var(--text)'
                }}>
                  Installation guidée
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Interface visuelle avec tous les scripts disponibles. Un simple clic pour installer chaque script dans votre navigateur.
                </p>
              </div>
              <button
                onClick={handleOpenInstallation}
                disabled={opening}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  fontSize: '15px',
                  minWidth: '160px',
                  justifyContent: 'center'
                }}
              >
                <ExternalLink size={18} />
                {opening ? 'Ouverture...' : 'Ouvrir le guide'}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '15px',
              background: 'var(--surface)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>✅</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Marquage épisodes</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>Crunchyroll, ADN, ADKami</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>📚</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Import mangas</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>Nautiljon</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>📥</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Import animes</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>MyAnimeList</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>🎮</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Import AVN</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>F95Zone</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '15px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderLeft: '4px solid var(--primary)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--primary)' }}>💡 Astuce :</strong> Vous devez installer l'extension Tampermonkey dans votre navigateur avant d'installer les scripts. La page d'installation vous guidera !
          </div>
        </div>
      </div>
    </div>
  );
}
