import React, { useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { useDevMode } from '../../../hooks/common/useDevMode';

interface AdulteGameBannerProps {
  coverUrl?: string | null;
  title: string;
  gameId: number;
  onCoverUpdated?: () => void;
}

const AdulteGameBanner: React.FC<AdulteGameBannerProps> = ({ coverUrl, title, gameId, onCoverUpdated }) => {
  const [exporting, setExporting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const { devMode } = useDevMode();

  // Utiliser le hook générique pour le drag & drop
  const {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useCoverDragAndDrop({
    itemId: gameId,
    title: title,
    mediaType: 'adulte-game',
    currentCoverUrl: coverUrl || null,
    saveOptions: {},
    updateCoverApi: async (itemId, newCoverUrl) => {
      await window.electronAPI.updateAdulteGameGame(Number(itemId), {
        couverture_url: newCoverUrl
      });
    },
    onCoverUpdated: () => {
      if (onCoverUpdated) {
        onCoverUpdated();
      }
    },
    onError: (error) => {
      console.error('Erreur drag & drop couverture:', error);
    }
  });
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
    <div>
      <div
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          borderRadius: '0',
          overflow: 'hidden',
          border: isDragging ? '4px dashed var(--primary)' : 'none',
          background: isDragging ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
          transition: 'all 0.2s',
          cursor: isDragging ? 'copy' : 'default'
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

        {isDragging && (
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

        <div
          onClick={() => coverUrl && setShowImageModal(true)}
          onMouseEnter={(e) => {
            if (coverUrl && !isDragging) {
              e.currentTarget.style.cursor = 'pointer';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            transition: 'transform 0.2s',
            borderRadius: '0',
            overflow: 'hidden'
          }}
        >
          <CoverImage
            src={coverUrl || null}
            alt={title}
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'contain',
              opacity: isDragging ? 0.3 : 1,
              transition: 'opacity 0.2s',
              borderRadius: '0'
            }}
          />
        </div>
      </div>

      {showImageModal && coverUrl && (
        <ImageModal
          src={coverUrl}
          alt={title}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
};

export default AdulteGameBanner;
