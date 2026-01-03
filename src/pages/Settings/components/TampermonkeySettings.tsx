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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Section Installation guidée */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '24px'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--text)'
          }}>
            Installation guidée
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            Les scripts Tampermonkey permettent d'intégrer Nexus avec vos sites préférés (Nautiljon, F95Zone, LewdCorner). Importez des mangas et Jeux Adultes en un clic ! Interface visuelle avec tous les scripts disponibles. Un simple clic pour installer chaque script dans votre navigateur, la page guidant également l'installation de l'extension Tampermonkey si nécessaire.
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

      {/* Grille des trois catégories */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px'
      }}>
        {/* Lectures */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '16px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
          <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 600, marginBottom: '6px' }}>Lectures</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8 }}>Nautiljon, MyAnimeList</div>
        </div>

        {/* Animes */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '16px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
          <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 600, marginBottom: '6px' }}>Animes</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8 }}>Nautiljon, MyAnimeList</div>
        </div>

        {/* Jeux adultes */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '16px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎮</div>
          <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 600, marginBottom: '6px' }}>Jeux adultes</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8 }}>F95Zone, LewdCorner</div>
        </div>
      </div>
    </div>
  );
}
