import { ReactNode } from 'react';
import { CardActionsMenu, CardCover, MihonBadge } from './index';
import { StatusCategory } from '../../../utils/status';

interface ImageOnlyCardProps {
  coverSrc?: string;
  title: string;
  fallbackIcon: ReactNode;
  imageObjectFit?: 'cover' | 'contain';
  isFavorite: boolean;
  currentStatus: string;
  availableStatuses: readonly string[] | string[];
  onToggleFavorite: () => Promise<void>;
  onToggleHidden: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  onMenuOpen: (isOpen: boolean) => void;
  isMenuOpen: boolean;
  isHidden?: boolean;
  onClick: () => void;
  shouldBlur?: boolean;
  hasMasterPassword?: boolean; // Indique si le code maître est défini et actif
  statusCategory?: StatusCategory;
  showMihonBadge?: boolean;
}

/**
 * Mode image uniquement partagé entre AnimeCard et MangaCard
 */
export default function ImageOnlyCard({
  coverSrc,
  title,
  fallbackIcon,
  imageObjectFit = 'cover',
  isFavorite,
  currentStatus,
  availableStatuses,
  onToggleFavorite,
  onToggleHidden,
  onChangeStatus,
  onMenuOpen,
  isMenuOpen,
  onClick,
  isHidden = false,
  shouldBlur = false,
  hasMasterPassword = false,
  statusCategory,
  showMihonBadge = false
}: ImageOnlyCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        width: '100%',
        aspectRatio: '2/3',
        borderRadius: '12px',
        overflow: 'visible',
        border: '1px solid var(--border)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        zIndex: isMenuOpen ? 1000 : 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <CardCover
          src={coverSrc}
          alt={title}
          fallbackIcon={fallbackIcon}
          objectFit={imageObjectFit}
          shouldBlur={shouldBlur}
          hasMasterPassword={hasMasterPassword}
        />
      </div>

      {/* Badge Mihon (coin inférieur gauche) */}
      <MihonBadge show={showMihonBadge} />

      {/* Menu actions uniquement */}
      <CardActionsMenu
        isFavorite={isFavorite}
        isHidden={isHidden}
        currentStatus={currentStatus}
        availableStatuses={availableStatuses}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onChangeStatus={onChangeStatus}
        onMenuOpen={onMenuOpen}
        statusCategory={statusCategory}
      />
    </div>
  );
}
