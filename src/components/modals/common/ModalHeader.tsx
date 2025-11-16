import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalHeaderProps {
  title: ReactNode;
  onClose: () => void;
}

/**
 * Header standardisé pour les modals
 */
export default function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <X size={24} />
      </button>
    </div>
  );
}
