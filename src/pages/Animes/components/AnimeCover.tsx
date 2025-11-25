import { Tv } from 'lucide-react';
import { useMemo, useState } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import ExternalLinkIcon from '../../../components/common/ExternalLinkIcon';
import DetailStatusSection from '../../../components/details/DetailStatusSection';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { AnimeSerie } from '../../../types';
import { COMMON_STATUSES } from '../../../utils/status';

const ANIME_STATUS_OPTIONS = COMMON_STATUSES.ANIME;
type AnimeStatus = (typeof ANIME_STATUS_OPTIONS)[number];

interface AnimeCoverProps {
  anime: AnimeSerie;
  episodesVus: number;
  nbEpisodes: number;
  onStatusChange: (status: AnimeStatus) => void;
  onToggleFavorite: () => void;
  shouldShow: (field: string) => boolean;
  onCoverUpdated?: () => void;
}

export default function AnimeCover({
  anime,
  episodesVus,
  nbEpisodes,
  onStatusChange,
  onToggleFavorite,
  shouldShow,
  onCoverUpdated
}: AnimeCoverProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  // Calculer le statut actuel selon la progression
  const currentStatus = useMemo(() => {
    // Si aucun épisode n'est vu → "À regarder"
    if (episodesVus === 0) {
      return 'À regarder';
    }

    // Si tous les épisodes sont vus, c'est terminé
    if (nbEpisodes > 0 && episodesVus >= nbEpisodes) {
      return 'Terminé';
    }

    // Si au moins 1 épisode est vu → "En cours"
    if (episodesVus >= 1) {
      return 'En cours';
    }

    // Sinon, utiliser le statut actuel ou "À regarder" par défaut
    // Mapper "En attente" vers "En pause" car "En attente" n'est pas dans les statuts valides
    const statut = anime.statut_visionnage || 'À regarder';
    return statut === 'En attente' ? 'En pause' : (statut as AnimeStatus);
  }, [anime.statut_visionnage, episodesVus, nbEpisodes]);

  // Hook pour le drag & drop de couverture
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useCoverDragAndDrop({
    mediaType: 'anime',
    title: anime.titre,
    itemId: anime.id,
    currentCoverUrl: anime.couverture_url,
    saveOptions: {
      mediaType: 'Anime'
    },
    updateCoverApi: async (itemId, coverUrl) => {
      await window.electronAPI.updateAnime?.(Number(itemId), { couverture_url: coverUrl });
    },
    onCoverUpdated: () => {
      onCoverUpdated?.();
    },
    onError: (error) => {
      console.error('Erreur mise à jour couverture anime:', error);
    }
  });

  if (!shouldShow('couverture')) return null;

  return (
    <div style={{ width: 'clamp(180px, 20vw, 250px)', flexShrink: 0 }}>
      {/* Image couverture avec drag & drop */}
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: isDragging ? '3px dashed var(--primary)' : '2px solid var(--border)',
          background: isDragging ? 'var(--primary)22' : 'var(--surface)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          cursor: anime.couverture_url ? 'pointer' : 'default',
          transition: 'border-color 0.2s',
          position: 'relative'
        }}
        onClick={() => anime.couverture_url && setShowImageModal(true)}
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
            <div>Déposer l'image<br />de l'anime</div>
          </div>
        ) : anime.couverture_url ? (
          <CoverImage
            src={anime.couverture_url}
            alt={anime.titre}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '2/3',
              objectFit: 'cover',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (e.currentTarget) {
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '2/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background)'
          }}>
            <Tv size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          </div>
        )}
      </div>

      {/* Liens rapides */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
        {anime.mal_id && (
          <ExternalLinkIcon
            href={`https://myanimelist.net/anime/${anime.mal_id}`}
            type="mal"
            size={40}
            title="Voir sur MyAnimeList"
          />
        )}

        {(anime.nautiljon_url || (anime.mal_url && anime.mal_url.includes('nautiljon.com'))) && (
          <ExternalLinkIcon
            href={anime.nautiljon_url || anime.mal_url!}
            type="nautiljon"
            size={40}
            title="Voir sur Nautiljon"
          />
        )}
      </div>

      {/* Section Mon Statut : Utilisation du composant commun */}
      <DetailStatusSection
        isFavorite={!!anime.is_favorite}
        currentStatus={currentStatus}
        availableStatuses={ANIME_STATUS_OPTIONS}
        statusCategory="anime"
        onToggleFavorite={onToggleFavorite}
        onStatusChange={(status) => onStatusChange(status as AnimeStatus)}
        showLabel={true}
      />

      {/* Modal image plein écran */}
      {showImageModal && anime.couverture_url && (
        <ImageModal
          src={anime.couverture_url}
          alt={anime.titre}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
