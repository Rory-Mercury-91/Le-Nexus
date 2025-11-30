import { useState } from 'react';
import { X } from 'lucide-react';
import AddSerieModal from '../manga/AddSerieModal';
import AddBookModal from '../book/AddBookModal';
import AddComicModal from './AddComicModal';
import AddBdModal from './AddBdModal';

interface AddContentTypeModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type ContentType = 'manga' | 'manhwa' | 'manhua' | 'lightNovel' | 'webtoon' | 'comics' | 'bd' | 'books';

interface ContentTypeOption {
  type: ContentType;
  label: string;
  icon: string;
  description: string;
}

const CONTENT_TYPE_OPTIONS: ContentTypeOption[] = [
  { type: 'manga', label: 'Manga', icon: '📘', description: 'Manga japonais' },
  { type: 'manhwa', label: 'Manhwa', icon: '📙', description: 'Manhwa coréen' },
  { type: 'manhua', label: 'Manhua', icon: '📕', description: 'Manhua chinois' },
  { type: 'lightNovel', label: 'Light Novel', icon: '📓', description: 'Light Novel' },
  { type: 'webtoon', label: 'Webtoon', icon: '📱', description: 'Webtoon' },
  { type: 'comics', label: 'Comics', icon: '🦸', description: 'Comics américains' },
  { type: 'bd', label: 'BD', icon: '📗', description: 'Bande dessinée franco-belge' },
  { type: 'books', label: 'Livres', icon: '📖', description: 'Livres' }
];

export default function AddContentTypeModal({ onClose, onComplete }: AddContentTypeModalProps) {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [showSerieModal, setShowSerieModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showComicModal, setShowComicModal] = useState(false);
  const [showBdModal, setShowBdModal] = useState(false);

  const handleTypeSelect = (type: ContentType) => {
    setSelectedType(type);
    
    if (type === 'books') {
      setShowBookModal(true);
    } else if (type === 'comics') {
      setShowComicModal(true);
    } else if (type === 'bd') {
      setShowBdModal(true);
    } else {
      // Pour les séries manga/manhwa/etc., ouvrir AddSerieModal
      // TODO: Pré-sélectionner le media_type dans le formulaire
      setShowSerieModal(true);
    }
  };

  const handleSerieModalComplete = () => {
    setShowSerieModal(false);
    setSelectedType(null);
    onComplete();
  };

  const handleBookModalComplete = () => {
    setShowBookModal(false);
    setSelectedType(null);
    onComplete();
  };

  if (showSerieModal) {
    return (
      <AddSerieModal
        onClose={() => {
          setShowSerieModal(false);
          setSelectedType(null);
          onClose();
        }}
        onComplete={handleSerieModalComplete}
      />
    );
  }

  if (showBookModal) {
    return (
      <AddBookModal
        onClose={() => {
          setShowBookModal(false);
          setSelectedType(null);
          onClose();
        }}
        onComplete={handleBookModalComplete}
      />
    );
  }

  if (showComicModal) {
    return (
      <AddComicModal
        onClose={() => {
          setShowComicModal(false);
          setSelectedType(null);
          onClose();
        }}
        onComplete={handleSerieModalComplete}
      />
    );
  }

  if (showBdModal) {
    return (
      <AddBdModal
        onClose={() => {
          setShowBdModal(false);
          setSelectedType(null);
          onClose();
        }}
        onComplete={handleSerieModalComplete}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Ajouter une œuvre</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={24} />
          </button>
        </div>

        <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
          Quel type d'œuvre voulez-vous ajouter ?
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {CONTENT_TYPE_OPTIONS.map(option => (
            <button
              key={option.type}
              onClick={() => handleTypeSelect(option.type)}
              style={{
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>{option.icon}</div>
              <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text)' }}>
                {option.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
