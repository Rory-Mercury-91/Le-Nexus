import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface TampermonkeySettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number }) => void;
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
    <div>
      <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        Les scripts Tampermonkey permettent d'intégrer Nexus avec vos sites préférés (Nautiljon, F95Zone, LewdCorner). Importez des mangas et Jeux Adultes en un clic !
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
          marginBottom: '15px',
          gap: '24px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text)'
            }}>
              Installation guidée
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Interface visuelle avec tous les scripts disponibles. Un simple clic pour installer chaque script dans votre navigateur, la page guidant également l'installation de l'extension Tampermonkey si nécessaire.
            </p>
          </div>
          <button
            onClick={handleOpenInstallation}
            disabled={opening}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '160px',
              justifyContent: 'center',
              flexShrink: 0
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
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>📚</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lectures</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>Nautiljon, MyAnimeList</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>🎬</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Animes</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>Nautiljon, MyAnimeList</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>🎮</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Jeux adultes</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>F95Zone, LewdCorner</div>
          </div>
        </div>
      </div>

    </div>
  );
}
