import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalHeaderProps {
  title: ReactNode;
  description?: string;
  onClose: () => void;
}

/**
 * Header standardisé pour les modals
 */
export default function ModalHeader({ title, description, onClose }: ModalHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px'
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, marginBottom: description ? '8px' : 0 }}>
          {title}
        </h2>
        {description && (
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)', 
            margin: 0,
            lineHeight: '1.5'
          }}>
            {description}
          </p>
        )}
      </div>
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
