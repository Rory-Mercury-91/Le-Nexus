import { Star } from 'lucide-react';
import { useState } from 'react';
import { MovieListItem } from '../../types';
import { getTmdbImageUrl } from '../../utils/tmdb';
import { CardActionsMenu, CardCover, CardTitle, FavoriteBadge, ImageOnlyCard, StatusBadge, COMMON_STATUSES } from './common';

interface MovieCardProps {
  movie: MovieListItem;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onToggleHidden: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  imageOnly?: boolean;
  imageObjectFit?: 'cover' | 'contain';
}

export default function MovieCard({
  movie,
  onClick,
  onToggleFavorite,
  onToggleHidden,
  onChangeStatus,
  imageOnly = false,
  imageObjectFit = 'cover'
}: MovieCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const posterUrl = getTmdbImageUrl(movie.poster_path, 'w342');
  const currentStatus = movie.statut_visionnage || 'À regarder';

  if (imageOnly) {
    return (
      <ImageOnlyCard
        coverSrc={posterUrl}
        title={movie.titre}
        fallbackIcon={<Star size={48} />}
        imageObjectFit={imageObjectFit}
        isFavorite={!!movie.is_favorite}
        isHidden={!!movie.is_hidden}
        currentStatus={currentStatus}
        availableStatuses={COMMON_STATUSES.MOVIE}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onChangeStatus={onChangeStatus}
        onMenuOpen={setIsMenuOpen}
        isMenuOpen={isMenuOpen}
        onClick={onClick}
        statusCategory="movie"
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: 0,
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        zIndex: isMenuOpen ? 1000 : 1
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '2 / 3',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)'
      }}>
        <CardCover
          src={posterUrl}
          alt={movie.titre}
          fallbackIcon={<Star size={48} />}
          objectFit={imageObjectFit}
        />

        <FavoriteBadge
          isFavorite={!!movie.is_favorite}
          onToggle={onToggleFavorite}
        />

        <StatusBadge status={currentStatus} type="movie" />

        <CardActionsMenu
          isFavorite={!!movie.is_favorite}
          isHidden={!!movie.is_hidden}
          currentStatus={currentStatus}
          availableStatuses={COMMON_STATUSES.MOVIE}
          onToggleFavorite={onToggleFavorite}
          onToggleHidden={onToggleHidden}
          onChangeStatus={onChangeStatus}
          onMenuOpen={setIsMenuOpen}
          statusCategory="movie"
        />
      </div>

      {/* Contenu : Titre */}
      <div style={{ 
        padding: '10px 12px 6px 12px', 
        borderTop: '1px solid var(--border)'
      }}>
        <CardTitle title={movie.titre}>{movie.titre}</CardTitle>
      </div>
    </div>
  );
}
