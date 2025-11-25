import { Tv } from 'lucide-react';
import { useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import DetailStatusSection from '../../../components/details/DetailStatusSection';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { TvShowDetail } from '../../../types';
import { COMMON_STATUSES } from '../../../utils/status';
import { getTmdbImageUrl } from '../../../utils/tmdb';

const SERIES_STATUS_OPTIONS = COMMON_STATUSES.SERIES;
type SeriesStatus = (typeof SERIES_STATUS_OPTIONS)[number];

interface SeriesCoverProps {
  show: TvShowDetail;
  onStatusChange: (status: SeriesStatus) => void;
  onToggleFavorite: () => void;
  updatingStatus?: boolean;
  togglingFavorite?: boolean;
  onCoverUpdated?: () => void;
}

export default function SeriesCover({
  show,
  onStatusChange,
  onToggleFavorite,
  updatingStatus = false,
  togglingFavorite = false,
  onCoverUpdated
}: SeriesCoverProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  const posterUrl = show.poster_path ? getTmdbImageUrl(show.poster_path, 'w780') : null;

  // Hook pour le drag & drop de couverture
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useCoverDragAndDrop({
    mediaType: 'serie',
    title: show.titre,
    itemId: show.id,
    currentCoverUrl: show.poster_path,
    saveOptions: {
      mediaType: 'Series'
    },
    updateCoverApi: async (itemId, coverUrl) => {
      await window.electronAPI.updateTvShow?.(Number(itemId), { poster_path: coverUrl });
    },
    onCoverUpdated: () => {
      onCoverUpdated?.();
    },
    onError: (error) => {
      console.error('Erreur mise à jour couverture série:', error);
    }
  });

  return (
    <div style={{ width: 'clamp(180px, 20vw, 250px)', flexShrink: 0, flexGrow: 0 }}>
      {/* Image poster avec drag & drop */}
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: isDragging ? '3px dashed var(--primary)' : '2px solid var(--border)',
          background: isDragging ? 'var(--primary)22' : 'var(--surface)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          cursor: posterUrl ? 'pointer' : 'default',
          transition: 'border-color 0.2s',
          position: 'relative'
        }}
        onClick={() => posterUrl && setShowImageModal(true)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div style={{
            width: '100%',
            aspectRatio: '2/3',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            padding: '20px',
            gap: '12px'
          }}>
            📥
            <div>Déposer l'image<br />de la série</div>
          </div>
        ) : posterUrl ? (
          <CoverImage
            src={posterUrl}
            alt={show.titre}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '2/3',
              objectFit: 'cover',
              display: 'block',
              filter: 'none',
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden' as any,
              transform: 'translateZ(0)'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '2/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--background)'
            }}
          >
            <Tv size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          </div>
        )}
      </div>

      {/* Section Mon Statut : Utilisation du composant commun */}
      <DetailStatusSection
        isFavorite={!!show.is_favorite}
        currentStatus={show.statut_visionnage || 'À regarder'}
        availableStatuses={SERIES_STATUS_OPTIONS}
        statusCategory="series"
        onToggleFavorite={onToggleFavorite}
        onStatusChange={(status) => onStatusChange(status as SeriesStatus)}
        togglingFavorite={togglingFavorite}
        updatingStatus={updatingStatus}
        showLabel={true}
      />

      {/* Modal image plein écran */}
      {showImageModal && posterUrl && (
        <ImageModal
          src={posterUrl}
          alt={show.titre}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
