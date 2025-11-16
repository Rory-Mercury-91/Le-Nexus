import React, { useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import { useDevMode } from '../../../hooks/common/useDevMode';

interface AdulteGameBannerProps {
  coverUrl?: string | null;
  title: string;
  gameId: number;
  onCoverUpdated?: () => void;
}

const AdulteGameBanner: React.FC<AdulteGameBannerProps> = ({ coverUrl, title, gameId, onCoverUpdated }) => {
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { devMode } = useDevMode();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile && title) {
      // Supprimer l'ancienne image locale si elle existe
      if (coverUrl && coverUrl.startsWith('covers/')) {
        await window.electronAPI.deleteCoverImage(coverUrl);
      }

      // Sauvegarder la nouvelle image
      const filePath = (imageFile as any).path;
      const result = await window.electronAPI.saveCoverFromPath(filePath, title, 'adulte-game');
      
      if (result.success && result.localPath) {
        // Mettre à jour la base de données
        await window.electronAPI.updateAdulteGameGame(gameId, {
          couverture_url: result.localPath
        });
        
        // Notifier le parent pour recharger les données
        if (onCoverUpdated) {
          onCoverUpdated();
        }
      }
    }
  };
  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('adulte-game', gameId);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || 'Erreur lors de l’export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données jeu adulte:', error);
      window.alert(error?.message || 'Erreur inattendue lors de l’export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: '0 30px', maxWidth: '1600px', margin: '0 auto' }}>
      <div
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: dragging ? '4px dashed var(--primary)' : 'none',
          background: dragging ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
          transition: 'all 0.2s',
          cursor: dragging ? 'copy' : 'default'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {devMode && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 110,
              alignItems: 'flex-end'
            }}
          >
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              background: 'rgba(0,0,0,0.6)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'monospace'
            }}>
              ID: {gameId}
            </span>
            <button
              onClick={handleExport}
              className="btn btn-outline"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px'
              }}
              disabled={exporting}
            >
              {exporting ? 'Extraction...' : 'Extraire données'}
            </button>
          </div>
        )}

        {dragging && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'var(--primary)',
              fontSize: '24px',
              fontWeight: '600',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '20px 40px',
              borderRadius: '12px'
            }}
          >
            Déposez l'image ici pour la remplacer
          </div>
        )}
        
        <CoverImage
          src={coverUrl || null}
          alt={title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            objectFit: 'contain',
            opacity: dragging ? 0.3 : 1,
            transition: 'opacity 0.2s',
            borderRadius: '12px'
          }}
        />
      </div>
    </div>
  );
};

export default AdulteGameBanner;
