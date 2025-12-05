import { Gamepad2 } from 'lucide-react';
import { useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { useAdulteGameLock } from '../../../hooks/useAdulteGameLock';
import { RawgGameDetail } from '../../../hooks/details/useRawgGameDetail';
import { shouldBlurByEsrbRating } from '../../../utils/esrb-rating';

interface RawgGameBannerProps {
  game: RawgGameDetail;
  onCoverUpdated?: () => void;
}

export default function RawgGameBanner({
  game,
  onCoverUpdated
}: RawgGameBannerProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const { isLocked, hasPassword } = useAdulteGameLock();

  // Utiliser l'image de fond RAWG ou l'image de couverture
  const bannerUrl = game.rawgData?.background_image || game.couverture_url;

  // Déterminer si l'image doit être floutée (seulement si code maître défini ET actif ET rating ESRB nécessite floutage)
  const esrbRating = (() => {
    const esrb = game.rawgData?.esrb_rating;
    if (!esrb) return null;
    if (typeof esrb === 'string') return esrb;
    return esrb.name || null;
  })();
  const shouldBlur = hasPassword && isLocked && shouldBlurByEsrbRating(esrbRating);

  // Hook pour le drag & drop de bannière
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useCoverDragAndDrop({
    mediaType: 'adulte-game',
    title: game.titre,
    itemId: game.id,
    currentCoverUrl: bannerUrl || null,
    saveOptions: {
      mediaType: 'AdulteGame'
    },
    updateCoverApi: async (itemId, coverUrl) => {
      await window.electronAPI.updateAdulteGameGame(Number(itemId), {
        couverture_url: coverUrl
      });
    },
    onCoverUpdated: () => {
      onCoverUpdated?.();
    },
    onError: (error) => {
      console.error('Erreur mise à jour bannière jeu:', error);
    }
  });

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Bannière horizontale */}
      <div
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: isDragging ? '3px dashed var(--primary)' : 'none',
          background: isDragging ? 'var(--primary)22' : 'transparent',
          position: 'relative',
          cursor: bannerUrl ? 'pointer' : 'default',
          transition: 'border-color 0.2s'
        }}
        onClick={() => bannerUrl && setShowImageModal(true)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)22',
            color: 'var(--primary)',
            fontSize: '18px',
            fontWeight: '600',
            textAlign: 'center',
            gap: '12px'
          }}>
            📥
            <div>Déposez l'image ici pour remplacer la bannière</div>
          </div>
        ) : bannerUrl ? (
          <CoverImage
            src={bannerUrl}
            alt={game.titre}
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'contain',
              opacity: isDragging ? 0.3 : 1,
              transition: 'opacity 0.2s',
              borderRadius: '12px',
              filter: shouldBlur ? 'blur(20px) brightness(0.3)' : 'none'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)'
            }}
          >
            <Gamepad2 size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          </div>
        )}

      </div>

      {/* Modal image plein écran */}
      {showImageModal && bannerUrl && (
        <ImageModal
          src={bannerUrl}
          alt={game.titre}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
