import { Film } from 'lucide-react';
import { useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import DetailStatusSection from '../../../components/details/DetailStatusSection';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { MovieDetail } from '../../../types';
import { COMMON_STATUSES } from '../../../utils/status';
import { getTmdbImageUrl } from '../../../utils/tmdb';

const MOVIE_STATUS_OPTIONS = COMMON_STATUSES.MOVIE;
type MovieStatus = (typeof MOVIE_STATUS_OPTIONS)[number];

interface MovieCoverProps {
  movie: MovieDetail;
  onStatusChange: (status: MovieStatus) => void;
  onToggleFavorite: () => void;
  updatingStatus?: boolean;
  togglingFavorite?: boolean;
  onCoverUpdated?: () => void;
}

export default function MovieCover({
  movie,
  onStatusChange,
  onToggleFavorite,
  updatingStatus = false,
  togglingFavorite = false,
  onCoverUpdated
}: MovieCoverProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  const posterUrl = movie.poster_path ? getTmdbImageUrl(movie.poster_path, 'w780') : null;

  // Hook pour le drag & drop de couverture
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useCoverDragAndDrop({
    mediaType: 'movie',
    title: movie.titre,
    itemId: movie.id,
    currentCoverUrl: movie.poster_path,
    saveOptions: {
      mediaType: 'Movie'
    },
    updateCoverApi: async (itemId, coverUrl) => {
      await window.electronAPI.updateMovie?.(Number(itemId), { poster_path: coverUrl });
    },
    onCoverUpdated: () => {
      onCoverUpdated?.();
    },
    onError: (error) => {
      console.error('Erreur mise à jour couverture film:', error);
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
            <div>Déposer l'image<br />du film</div>
          </div>
        ) : posterUrl ? (
          <CoverImage
            src={posterUrl}
            alt={movie.titre}
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
            <Film size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          </div>
        )}
      </div>

      {/* Section Mon Statut : Utilisation du composant commun */}
      <DetailStatusSection
        isFavorite={!!movie.is_favorite}
        currentStatus={movie.statut_visionnage || 'À regarder'}
        availableStatuses={MOVIE_STATUS_OPTIONS}
        statusCategory="movie"
        onToggleFavorite={onToggleFavorite}
        onStatusChange={(status) => onStatusChange(status as MovieStatus)}
        togglingFavorite={togglingFavorite}
        updatingStatus={updatingStatus}
        showLabel={true}
      />

      {/* Modal image plein écran */}
      {showImageModal && posterUrl && (
        <ImageModal
          src={posterUrl}
          alt={movie.titre}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
