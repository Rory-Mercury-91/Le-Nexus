import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';

interface ImageModalProps {
  src: string;
  alt: string;
  onClose: () => void;
  onSaveImage?: () => void;
}

export default function ImageModal({ src, alt, onClose, onSaveImage }: ImageModalProps) {
  useDisableBodyScroll(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        cursor: 'pointer'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          cursor: 'pointer',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          zIndex: 10001
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        aria-label="Fermer"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          if (onSaveImage) {
            e.preventDefault();
            onSaveImage();
          }
        }}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: '8px',
          cursor: onSaveImage ? 'context-menu' : 'default'
        }}
      />
    </div>,
    document.body
  );
}
