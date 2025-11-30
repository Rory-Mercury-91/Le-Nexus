import { Book } from 'lucide-react';
import { useState } from 'react';
import LazyImage from '../../../components/common/LazyImage';
import ImageModal from '../../../components/modals/common/ImageModal';
import { useCoverDragAndDrop } from '../../../hooks/details/useCoverDragAndDrop';
import { Book as BookType } from '../../../types';

interface BookCoverProps {
  book: BookType;
  size?: 'small' | 'medium' | 'large';
  onCoverUpdated?: () => void;
  onMarkAsRead?: () => void;
  onMarkAsOwned?: () => void;
  isMarkingAsRead?: boolean;
  isMarkingAsOwned?: boolean;
}

export default function BookCover({ 
  book, 
  size = 'medium', 
  onCoverUpdated,
  onMarkAsRead,
  onMarkAsOwned,
  isMarkingAsRead = false,
  isMarkingAsOwned = false
}: BookCoverProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  
  const sizeMap = {
    small: { width: 120, height: 180 },
    medium: { width: 200, height: 300 },
    large: { width: 300, height: 450 }
  };

  const dimensions = sizeMap[size];

  // Hook pour le drag & drop de couverture
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useCoverDragAndDrop({
    mediaType: 'book',
    title: book.titre,
    itemId: book.id,
    currentCoverUrl: book.couverture_url || undefined,
    saveOptions: {
      mediaType: 'Book'
    },
    updateCoverApi: async (itemId, coverUrl) => {
      await window.electronAPI.booksUpdate?.({ bookId: Number(itemId), bookData: { couverture_url: coverUrl } });
    },
    onCoverUpdated: () => {
      onCoverUpdated?.();
    },
    onError: (error) => {
      console.error('Erreur mise à jour couverture livre:', error);
    }
  });

  // Déterminer le nom du site et le type d'icône
  const getSiteInfo = () => {
    if (!book.source_url) return null;
    
    if (book.source_donnees === 'google_books' || book.source_url.includes('books.google.com')) {
      return { name: 'Google Books', url: book.source_url };
    }
    if (book.source_donnees === 'open_library' || book.source_url.includes('openlibrary.org')) {
      return { name: 'Open Library', url: book.source_url };
    }
    if (book.source_donnees === 'bnf' || book.source_url.includes('catalogue.bnf.fr')) {
      return { name: 'BNF', url: book.source_url };
    }
    return { name: 'Source', url: book.source_url };
  };

  const siteInfo = getSiteInfo();

  return (
    <div style={{ width: dimensions.width, flexShrink: 0 }}>
      {/* Image de couverture avec drag & drop */}
      <div
        style={{
          width: '100%',
          height: dimensions.height,
          borderRadius: '12px',
          overflow: 'hidden',
          border: isDragging ? '3px dashed var(--primary)' : '2px solid var(--border)',
          position: 'relative',
          transition: 'border-color 0.2s',
          background: isDragging ? 'var(--primary)22' : 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: book.couverture_url ? 'pointer' : 'default',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
        onClick={() => book.couverture_url && setShowImageModal(true)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)22',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            padding: '20px',
            gap: '12px'
          }}>
            📥
            <div>Déposer l'image<br />du livre</div>
          </div>
        ) : book.couverture_url ? (
          <LazyImage
            src={book.couverture_url}
            alt={book.titre}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <Book size={dimensions.width / 3} style={{ color: 'var(--text-secondary)' }} />
        )}
      </div>

      {/* Boutons d'action rapide */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
        {/* Lien externe */}
        {siteInfo && (
          <button
            onClick={() => window.electronAPI?.openExternal?.(siteInfo.url)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 16px',
              background: 'var(--primary)',
              border: '2px solid var(--primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              width: 'auto',
              height: 'auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-hover)';
              e.currentTarget.style.borderColor = 'var(--primary-hover)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--primary-rgb), 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title={`Voir sur ${siteInfo.name}`}
          >
            <span style={{
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              letterSpacing: '0.5px'
            }}>
              {siteInfo.name}
            </span>
          </button>
        )}

        {/* Bouton Marquer comme lu */}
        {onMarkAsRead && (
          <button
            onClick={onMarkAsRead}
            disabled={isMarkingAsRead || book.statut_lecture === 'Terminé'}
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              opacity: book.statut_lecture === 'Terminé' ? 0.6 : 1,
              cursor: book.statut_lecture === 'Terminé' ? 'not-allowed' : 'pointer'
            }}
          >
            {isMarkingAsRead ? '⏳' : '✅'} Marquer comme lu
          </button>
        )}

        {/* Bouton Marquer comme possédé */}
        {onMarkAsOwned && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('BookCover: onClick onMarkAsOwned called');
              onMarkAsOwned();
            }}
            disabled={isMarkingAsOwned}
            className="btn btn-outline"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isMarkingAsOwned ? 'not-allowed' : 'pointer'
            }}
          >
            {isMarkingAsOwned ? '⏳' : '💰'} Marquer comme possédé
          </button>
        )}
      </div>

      {/* Modal image plein écran */}
      {showImageModal && book.couverture_url && (
        <ImageModal
          src={book.couverture_url}
          alt={book.titre}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}
