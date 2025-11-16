import { Tv } from 'lucide-react';
import { useState } from 'react';
import { useAdulteGameLock } from '../../hooks/useAdulteGameLock';
import { AnimeSerie } from '../../types';
import { isSensitiveAnime } from '../../utils/anime-sensitivity';
import { CardActionsMenu, CardBadge, CardContent, CardCover, COMMON_STATUSES, FavoriteBadge, ImageOnlyCard, StatusBadge, useIsNew } from './common';

interface AnimeCardProps {
  anime: AnimeSerie;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  onToggleHidden: () => Promise<void>;
  imageObjectFit?: 'cover' | 'contain';
  imageOnly?: boolean;
}

export default function AnimeCard({
  anime,
  onClick,
  onToggleFavorite,
  onChangeStatus,
  onToggleHidden,
  imageObjectFit = 'cover',
  imageOnly = false
}: AnimeCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const checkIsNew = useIsNew(anime.created_at, {
    hideIfCompleted: true,
    hideIfFullProgress: true,
    currentProgress: anime.episodes_vus || 0,
    totalProgress: anime.nb_episodes || 0,
    completedStatus: 'Terminé',
    currentStatus: anime.statut_visionnage || undefined
  });
  const isNew = checkIsNew;

  // Calculer progression
  const episodesVus = anime.episodes_vus || 0;
  const episodesTotal = anime.nb_episodes || 0;

  // Vérifier si l'anime est sensible et si la section est verrouillée
  // L'image ne doit être floutée que si le code maître est défini ET actif ET que l'anime est sensible
  const { isLocked, hasPassword } = useAdulteGameLock();
  const isSensitive = isSensitiveAnime(anime.rating);
  const shouldBlurImage = hasPassword && isSensitive && isLocked;

  const handleStatusChange = async (newStatus: string) => {
    await onChangeStatus(newStatus);
  };

  // Mode Images uniquement : juste l'image et le menu
  if (imageOnly) {
    return (
      <ImageOnlyCard
        coverSrc={anime.couverture_url || undefined}
        title={anime.titre}
        fallbackIcon={<Tv size={48} />}
        imageObjectFit={imageObjectFit}
        isFavorite={anime.is_favorite || false}
        isHidden={Boolean(anime.is_masquee)}
        currentStatus={anime.statut_visionnage || 'À regarder'}
        availableStatuses={COMMON_STATUSES.ANIME}
        key={`image-only-${anime.id}-${anime.statut_visionnage}-${anime.is_favorite}`}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onChangeStatus={handleStatusChange}
        onMenuOpen={setIsMenuOpen}
        statusCategory="anime"
        isMenuOpen={isMenuOpen}
        onClick={onClick}
        shouldBlur={shouldBlurImage}
        hasMasterPassword={hasPassword}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: '0',
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
      {/* Couverture */}
      <div style={{
        width: '100%',
        aspectRatio: '2/3',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)'
      }}>
        <CardCover
          src={anime.couverture_url || undefined}
          alt={anime.titre}
          fallbackIcon={<Tv size={48} />}
          objectFit={imageObjectFit}
          shouldBlur={shouldBlurImage}
          hasMasterPassword={hasPassword}
        />

        {/* Badge Favori (en haut à gauche) */}
        <FavoriteBadge isFavorite={!!anime.is_favorite} onToggle={onToggleFavorite} />

        {/* Badge Nouveau (à gauche, après le cœur) */}
        <CardBadge show={isNew()} offsetForFavorite={!!anime.is_favorite} />

        {/* Badge Statut (Abandonné, En attente, etc.) */}
        <StatusBadge key={`status-${anime.id}-${anime.statut_visionnage}`} status={anime.statut_visionnage || ''} type="anime" />

        {/* Menu actions */}
        <CardActionsMenu
          isFavorite={anime.is_favorite || false}
          isHidden={Boolean(anime.is_masquee)}
          currentStatus={anime.statut_visionnage || 'À regarder'}
          availableStatuses={COMMON_STATUSES.ANIME}
          onToggleFavorite={onToggleFavorite}
          onToggleHidden={onToggleHidden}
          onChangeStatus={handleStatusChange}
          onMenuOpen={setIsMenuOpen}
          statusCategory="anime"
        />
      </div>

      {/* Contenu : Progression + Titre */}
      <CardContent
        progress={{
          current: episodesVus,
          total: episodesTotal,
          label: `${episodesVus}/${episodesTotal > 0 ? episodesTotal : '?'} épisodes vus`
        }}
        title={anime.titre}
      />
    </div>
  );
}
