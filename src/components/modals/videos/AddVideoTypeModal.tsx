import { X } from 'lucide-react';
import { useState } from 'react';
import AddAnimeModal from './AddAnimeModal';
import AddMovieModal from './AddMovieModal';
import AddSeriesModal from './AddSeriesModal';

interface AddVideoTypeModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type VideoType = 'anime' | 'series' | 'movie';

interface VideoTypeOption {
  type: VideoType;
  label: string;
  icon: string;
  description: string;
}

const VIDEO_TYPE_OPTIONS: VideoTypeOption[] = [
  { type: 'anime', label: 'Anime', icon: '📺', description: 'Anime (MAL, AniList)' },
  { type: 'series', label: 'Série', icon: '📺', description: 'Série TV (TMDb)' },
  { type: 'movie', label: 'Film', icon: '🎬', description: 'Film (TMDb)' }
];

export default function AddVideoTypeModal({ onClose, onComplete }: AddVideoTypeModalProps) {
  const [showAnimeModal, setShowAnimeModal] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [showMovieModal, setShowMovieModal] = useState(false);

  const handleTypeSelect = (type: VideoType) => {
    if (type === 'anime') {
      setShowAnimeModal(true);
    } else if (type === 'series') {
      setShowSeriesModal(true);
    } else if (type === 'movie') {
      setShowMovieModal(true);
    }
  };

  const handleAnimeModalComplete = () => {
    setShowAnimeModal(false);
    onComplete();
  };

  const handleSeriesModalComplete = () => {
    setShowSeriesModal(false);
    onComplete();
  };

  const handleMovieModalComplete = () => {
    setShowMovieModal(false);
    onComplete();
  };

  if (showAnimeModal) {
    return (
      <AddAnimeModal
        onClose={() => {
          setShowAnimeModal(false);
          onClose();
        }}
        onSuccess={handleAnimeModalComplete}
      />
    );
  }

  if (showSeriesModal) {
    return (
      <AddSeriesModal
        onClose={() => {
          setShowSeriesModal(false);
          onClose();
        }}
        onSuccess={handleSeriesModalComplete}
      />
    );
  }

  if (showMovieModal) {
    return (
      <AddMovieModal
        onClose={() => {
          setShowMovieModal(false);
          onClose();
        }}
        onSuccess={handleMovieModalComplete}
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
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Ajouter une vidéo</h2>
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
          Quel type de vidéo voulez-vous ajouter ?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {VIDEO_TYPE_OPTIONS.map(option => (
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
