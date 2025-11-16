import { Calendar, Layers, Play } from 'lucide-react';
import { useState } from 'react';
import { TvShowListItem } from '../../types';
import { formatAirDate, formatVoteAverage, getTmdbImageUrl } from '../../utils/tmdb';
import { CardActionsMenu, CardContent, CardCover, FavoriteBadge, ImageOnlyCard, StatusBadge, COMMON_STATUSES } from './common';

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
  const firstAirDate = formatAirDate(show.date_premiere);
  const score = formatVoteAverage(show.note_moyenne);
  const currentStatus = show.statut_visionnage || 'À regarder';
  const episodesVus = show.episodes_vus || 0;
  const episodesTotal = show.nb_episodes || 0;

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
        zIndex: isMenuOpen ? 1000 : 1
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

      <CardContent
        progress={{
          current: episodesVus,
          total: episodesTotal,
          label: episodesTotal > 0
            ? `${episodesVus}/${episodesTotal} épisodes vus`
            : `${episodesVus} épisode${episodesVus > 1 ? 's' : ''} vus`
        }}
        title={show.titre}
      >
        {score && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fde68a',
            background: 'rgba(234, 179, 8, 0.18)',
            padding: '4px 8px',
            borderRadius: '999px',
            marginTop: '2px'
          }}>
            <Play size={12} />
            {score}
          </span>
        )}
      </CardContent>

      <div style={{
        padding: '0 16px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {firstAirDate && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              {firstAirDate}
            </span>
          )}
          {show.nb_saisons !== undefined && show.nb_saisons !== null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} />
              {show.nb_saisons} saison{show.nb_saisons > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {show.genres && show.genres.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {show.genres.slice(0, 3).map((genre) => (
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
            {show.genres.length > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                +{show.genres.length - 3}
              </span>
            )}
          </div>
        )}

        {show.prochain_episode && (
          <div style={{
            background: 'rgba(var(--primary-rgb), 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            border: '1px dashed rgba(var(--primary-rgb), 0.2)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            <strong style={{ color: 'var(--text)' }}>Prochain épisode</strong>
            <br />
            {show.prochain_episode.air_date
              ? formatAirDate(show.prochain_episode.air_date)
              : 'Date inconnue'}
            {show.prochain_episode.name ? ` • ${show.prochain_episode.name}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
