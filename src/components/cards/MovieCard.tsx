import { Calendar, Clock, Star } from 'lucide-react';
import { useState } from 'react';
import { MovieListItem } from '../../types';
import { formatAirDate, formatRuntime, formatVoteAverage, getTmdbImageUrl } from '../../utils/tmdb';
import { CardActionsMenu, CardCover, FavoriteBadge, ImageOnlyCard, StatusBadge, COMMON_STATUSES } from './common';

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
  const releaseDate = formatAirDate(movie.date_sortie);
  const runtime = formatRuntime(movie.duree);
  const score = formatVoteAverage(movie.note_moyenne);
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

      <div style={{
        padding: '14px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderTop: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)', flex: 1 }}>
              {movie.titre}
            </h3>
            {score && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fde68a',
                background: 'rgba(234, 179, 8, 0.15)',
                padding: '4px 8px',
                borderRadius: '999px'
              }}>
                <Star size={12} />
                {score}
              </span>
            )}
          </div>
          {movie.titre_original && movie.titre_original !== movie.titre && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {movie.titre_original}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {releaseDate && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              {releaseDate}
            </span>
          )}
          {runtime && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              {runtime}
            </span>
          )}
        </div>

        {movie.genres && movie.genres.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {movie.genres.slice(0, 3).map((genre) => (
              <span
                key={genre.id}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(var(--primary-rgb), 0.12)',
                  borderRadius: '999px',
                  padding: '4px 10px'
                }}
              >
                {genre.name}
              </span>
            ))}
            {movie.genres.length > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                +{movie.genres.length - 3}
              </span>
            )}
          </div>
        )}

        {movie.synopsis && movie.synopsis.trim().length > 0 && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {movie.synopsis}
          </p>
        )}
      </div>
    </div>
  );
}
