import { X } from 'lucide-react';
import { useState } from 'react';
import { AddBookComicBdModal, AddMangaModal } from './index';

interface AddLectureTypeModalProps {
  onClose: () => void;
  onComplete?: () => void;
}

interface LectureTypeOption {
  type: 'manga' | 'book';
  label: string;
  icon: string;
  description: string;
}

const LECTURE_TYPE_OPTIONS: LectureTypeOption[] = [
  {
    type: 'manga',
    label: 'Manga / Manhwa / Manhua / Light Novel / Webtoon',
    icon: '📘',
    description: 'Séries depuis MAL ou AniList'
  },
  {
    type: 'book',
    label: 'Livre / Comic / BD',
    icon: '📖',
    description: 'Depuis Google Books, Open Library ou BnF'
  }
];

export default function AddLectureTypeModal({ onClose, onComplete }: AddLectureTypeModalProps) {
  const [showMangaModal, setShowMangaModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  const handleTypeSelect = (type: 'manga' | 'book') => {
    if (type === 'manga') {
      setShowMangaModal(true);
    } else if (type === 'book') {
      setShowBookModal(true);
    }
  };

  const handleMangaModalComplete = () => {
    setShowMangaModal(false);
    if (onComplete) onComplete();
  };

  const handleBookModalComplete = () => {
    setShowBookModal(false);
    if (onComplete) onComplete();
  };

  if (showMangaModal) {
    return (
      <AddMangaModal
        onClose={() => {
          setShowMangaModal(false);
          onClose();
        }}
        onSuccess={handleMangaModalComplete}
        onComplete={handleMangaModalComplete}
      />
    );
  }

  if (showBookModal) {
    return (
      <AddBookComicBdModal
        onClose={() => {
          setShowBookModal(false);
          onClose();
        }}
        onSuccess={handleBookModalComplete}
        onComplete={handleBookModalComplete}
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
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Ajouter une lecture</h2>
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
          Quel type de lecture voulez-vous ajouter ?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {LECTURE_TYPE_OPTIONS.map((option) => (
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
                alignItems: 'center',
                gap: '16px'
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
              <div style={{ fontSize: '32px', flexShrink: 0 }}>{option.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                  {option.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
