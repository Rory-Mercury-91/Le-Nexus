import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAdulteGameLock } from '../../hooks/useAdulteGameLock';
import { Serie } from '../../types';
import { computeMangaProgress } from '../../utils/manga-progress';
import { isSensitiveManga } from '../../utils/manga-sensitivity';
import { getSerieStatusLabel } from '../../utils/manga-status';
import { CardActionsMenu, CardBadge, CardContent, CardCover, COMMON_STATUSES, FavoriteBadge, ImageOnlyCard, MihonBadge, StatusBadge, useIsNew } from './common';

interface MangaCardProps {
  serie: Serie;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  onToggleHidden: () => Promise<void>;
  imageObjectFit?: 'cover' | 'contain';
  imageOnly?: boolean;
}

export default function MangaCard({
  serie,
  onClick,
  onToggleFavorite,
  onChangeStatus,
  onToggleHidden,
  imageObjectFit = 'cover',
  imageOnly = false
}: MangaCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const checkIfMasquee = async () => {
      const masquee = await window.electronAPI.isSerieMasquee(serie.id);
      setIsHidden(masquee);
    };
    checkIfMasquee();
  }, [serie.id]);

  const progress = computeMangaProgress(serie);

  // Vérifier si la série a des tomes ou chapitres Mihon
  const hasMihon = serie.tomes?.some(tome => tome.mihon === 1) || serie.chapitres_mihon === 1;

  const checkIsNew = useIsNew(serie.created_at, {
    hideIfCompleted: true,
    hideIfFullProgress: true,
    currentProgress: progress.current,
    totalProgress: progress.total,
    completedStatus: 'lu',
    currentStatus: serie.tag || undefined
  });
  const isNew = checkIsNew;

  const currentStatus = getSerieStatusLabel(serie);

  // Vérifier si le manga est sensible et si la section est verrouillée
  // L'image ne doit être floutée que si le code maître est défini ET actif ET que le manga est sensible
  const { isLocked, hasPassword } = useAdulteGameLock();
  const isSensitive = isSensitiveManga(serie.rating);
  const shouldBlurImage = hasPassword && isSensitive && isLocked;

  const handleStatusChange = async (newStatus: string) => {
    await onChangeStatus(newStatus);
  };

  const handleToggleHidden = async () => {
    await onToggleHidden();
    // Re-vérifier le statut après le toggle
    const masquee = await window.electronAPI.isSerieMasquee(serie.id);
    setIsHidden(masquee);
  };

  // Mode Images uniquement : juste l'image et le menu
  if (imageOnly) {
    return (
      <ImageOnlyCard
        coverSrc={serie.couverture_url || undefined}
        title={serie.titre}
        fallbackIcon={<BookOpen size={48} />}
        imageObjectFit={imageObjectFit}
        isFavorite={serie.is_favorite || false}
        isHidden={isHidden}
        currentStatus={currentStatus}
        availableStatuses={COMMON_STATUSES.MANGA}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={handleToggleHidden}
        onChangeStatus={handleStatusChange}
        onMenuOpen={setIsMenuOpen}
        isMenuOpen={isMenuOpen}
        onClick={onClick}
        shouldBlur={shouldBlurImage}
        hasMasterPassword={hasPassword}
        statusCategory="manga"
        showMihonBadge={hasMihon}
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
          src={serie.couverture_url || undefined}
          alt={serie.titre}
          fallbackIcon={<BookOpen size={48} />}
          objectFit={imageObjectFit}
          shouldBlur={shouldBlurImage}
          hasMasterPassword={hasPassword}
        />

        {/* Badge Favori (en haut à gauche) */}
        <FavoriteBadge isFavorite={!!serie.is_favorite} onToggle={onToggleFavorite} />

        {/* Badge Nouveau (à gauche, après le cœur) */}
        <CardBadge show={isNew()} offsetForFavorite={!!serie.is_favorite} />

        {/* Badge Statut (Abandonné, En pause, etc.) */}
        <StatusBadge key={`status-${serie.id}-${currentStatus}`} status={currentStatus} type="manga" />

        {/* Badge Mihon (coin inférieur gauche) */}
        <MihonBadge show={hasMihon} />

        {/* Menu actions */}
        <CardActionsMenu
          isFavorite={serie.is_favorite || false}
          isHidden={isHidden}
          currentStatus={currentStatus}
          availableStatuses={COMMON_STATUSES.MANGA}
          onToggleFavorite={onToggleFavorite}
          onToggleHidden={handleToggleHidden}
          onChangeStatus={handleStatusChange}
          onMenuOpen={setIsMenuOpen}
        statusCategory="manga"
        />
      </div>

      {/* Contenu : Progression + Titre */}
      <CardContent
        progress={{
          current: progress.current,
          total: progress.total,
          label: progress.label
        }}
        title={serie.titre}
      />
    </div>
  );
}
