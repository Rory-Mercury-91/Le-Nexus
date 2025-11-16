import { ReactNode } from 'react';

interface CollapsibleSectionProps {
  id: string;
  title: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  defaultIcon?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function CollapsibleSection({
  id,
  title,
  isOpen,
  onToggle,
  children,
  defaultIcon,
  className = '',
  style = {}
}: CollapsibleSectionProps) {
  return (
    <div 
      id={id}
      className={`card ${className}`}
      style={{ 
        marginBottom: '24px',
        padding: '0',
        overflow: 'hidden',
        ...style 
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: isOpen ? '1px solid var(--border)' : 'none',
          userSelect: 'none',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {defaultIcon && <span style={{ fontSize: '20px' }}>{defaultIcon}</span>}
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          margin: 0,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {title}
        </h2>
        <span style={{ marginLeft: 'auto', fontSize: '14px', opacity: 0.6 }}>
          {isOpen ? '▲ Masquer' : '▼ Cliquez pour afficher'}
        </span>
      </div>
      {isOpen && (
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
