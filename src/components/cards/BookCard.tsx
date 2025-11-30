import { Book } from 'lucide-react';
import { useState } from 'react';
import { BookListItem } from '../../types';
import { CardActionsMenu, CardCover, CardTitle, COMMON_STATUSES, FavoriteBadge, ImageOnlyCard, StatusBadge } from './common';

interface BookCardProps {
  book: BookListItem;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onToggleHidden: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  imageOnly?: boolean;
  imageObjectFit?: 'cover' | 'contain';
}

export default function BookCard({
  book,
  onClick,
  onToggleFavorite,
  onToggleHidden,
  onChangeStatus,
  imageOnly = false,
  imageObjectFit = 'cover'
}: BookCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const coverUrl = book.couverture_url || undefined;
  const currentStatus = book.statut_lecture || 'À lire';

  if (imageOnly) {
    return (
      <ImageOnlyCard
        coverSrc={coverUrl}
        title={book.titre}
        fallbackIcon={<Book size={48} />}
        imageObjectFit={imageObjectFit}
        isFavorite={!!book.is_favorite}
        isHidden={!!book.is_hidden}
        currentStatus={currentStatus}
        availableStatuses={COMMON_STATUSES.BOOK}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onChangeStatus={onChangeStatus}
        onMenuOpen={setIsMenuOpen}
        isMenuOpen={isMenuOpen}
        onClick={onClick}
        statusCategory="book"
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
          src={coverUrl}
          alt={book.titre}
          fallbackIcon={<Book size={48} />}
          objectFit={imageObjectFit}
        />

        <FavoriteBadge
          isFavorite={!!book.is_favorite}
          onToggle={onToggleFavorite}
        />

        <StatusBadge status={currentStatus} type="book" />

        <CardActionsMenu
          isFavorite={!!book.is_favorite}
          isHidden={!!book.is_hidden}
          currentStatus={currentStatus}
          availableStatuses={COMMON_STATUSES.BOOK}
          onToggleFavorite={onToggleFavorite}
          onToggleHidden={onToggleHidden}
          onChangeStatus={onChangeStatus}
          onMenuOpen={setIsMenuOpen}
          statusCategory="book"
        />
      </div>

      {/* Contenu : Titre */}
      <div style={{
        padding: '10px 12px 6px 12px',
        borderTop: '1px solid var(--border)'
      }}>
        <CardTitle title={book.titre}>{book.titre}</CardTitle>
      </div>
    </div>
  );
}
