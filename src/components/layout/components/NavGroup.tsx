import { ChevronDown, ChevronRight } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface NavGroupProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

/**
 * Groupe de navigation avec sous-menus expandable
 */
export default function NavGroup({ icon, label, children, defaultExpanded = false }: NavGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '12px',
          padding: '12px',
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          color: 'var(--text-secondary)',
          background: 'transparent',
          fontWeight: '500',
          transition: 'all 0.2s',
          minHeight: '44px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>
        <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
        {isExpanded ? (
          <ChevronDown size={16} style={{ opacity: 0.6 }} />
        ) : (
          <ChevronRight size={16} style={{ opacity: 0.6 }} />
        )}
      </div>
      {isExpanded && (
        <div style={{
          marginLeft: '20px',
          marginTop: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingLeft: '12px',
          borderLeft: '2px solid var(--border)'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
