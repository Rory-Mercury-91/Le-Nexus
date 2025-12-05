import { Play } from 'lucide-react';
import { useState } from 'react';
import { TvShowListItem } from '../../types';
import { getTmdbImageUrl } from '../../utils/tmdb';
import { CardActionsMenu, CardCover, CardTitle, FavoriteBadge, ImageOnlyCard, StatusBadge, COMMON_STATUSES } from './common';

interface TvShowCardProps {
  show: TvShowListItem;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onToggleHidden: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  imageOnly?: boolean;
  imageObjectFit?: 'cover' | 'contain';
}

export default function TvShowCard({
  show,
  onClick,
  onToggleFavorite,
  onToggleHidden,
  onChangeStatus,
  imageOnly = false,
  imageObjectFit = 'cover'
}: TvShowCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const posterUrl = getTmdbImageUrl(show.poster_path, 'w342');
  const currentStatus = show.statut_visionnage || 'À regarder';
  const episodesVus = show.episodes_vus || 0;
  const episodesTotal = show.nb_episodes || 0;
  const progressPercent = episodesTotal > 0 ? Math.round((episodesVus / episodesTotal) * 100) : 0;

  if (imageOnly) {
    return (
      <ImageOnlyCard
        coverSrc={posterUrl}
        title={show.titre}
        fallbackIcon={<Play size={48} />}
        imageObjectFit={imageObjectFit}
        isFavorite={!!show.is_favorite}
        isHidden={!!show.is_hidden}
        currentStatus={currentStatus}
        availableStatuses={COMMON_STATUSES.SERIES}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onChangeStatus={onChangeStatus}
        onMenuOpen={setIsMenuOpen}
        isMenuOpen={isMenuOpen}
        onClick={onClick}
        statusCategory="series"
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: 0,
        color: 'inherit',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        zIndex: isMenuOpen ? 1000 : 1,
        height: '100%'
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '2/3',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)'
      }}>
        <CardCover
          src={posterUrl}
          alt={show.titre}
          fallbackIcon={<Play size={48} />}
          objectFit={imageObjectFit}
        />

        <FavoriteBadge
          isFavorite={!!show.is_favorite}
          onToggle={onToggleFavorite}
        />

        <StatusBadge status={currentStatus} type="series" />

        <CardActionsMenu
          isFavorite={!!show.is_favorite}
          isHidden={!!show.is_hidden}
          currentStatus={currentStatus}
          availableStatuses={COMMON_STATUSES.SERIES}
          onToggleFavorite={onToggleFavorite}
          onToggleHidden={onToggleHidden}
          onChangeStatus={onChangeStatus}
          onMenuOpen={setIsMenuOpen}
          statusCategory="series"
        />
      </div>

      {/* Contenu : Barre de progression et titre */}
      <div style={{ 
        padding: '10px 12px 6px 12px', 
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Barre de progression */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Texte : X/Y épisodes vus     X% */}
          <div style={{ 
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{episodesVus}/{episodesTotal || '?'} épisodes vus</span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{progressPercent}%</span>
          </div>
          
          {/* Barre de progression */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.max(0, Math.min(100, progressPercent))}%`,
              height: '100%',
              background: progressPercent === 100 
                ? 'linear-gradient(90deg, var(--success), var(--success-light))'
                : progressPercent >= 50
                ? 'linear-gradient(90deg, var(--primary-light), var(--success))'
                : 'linear-gradient(90deg, var(--primary), var(--primary-light))',
              borderRadius: '999px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        
        {/* Titre */}
        <CardTitle title={show.titre}>{show.titre}</CardTitle>
      </div>
    </div>
  );
}
