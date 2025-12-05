import { ChevronDown, ChevronRight } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavGroupProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  isExpanded?: boolean; // Contrôle externe
  onToggle?: () => void; // Callback pour le toggle
  to?: string; // Route de navigation quand on clique sur le groupe
}

/**
 * Groupe de navigation avec sous-menus expandable
 */
export default function NavGroup({
  icon,
  label,
  children,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggle,
  to
}: NavGroupProps) {
  const navigate = useNavigate();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Utiliser l'état contrôlé si fourni, sinon utiliser l'état interne
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    // Toggle normal pour expander/reduire
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    // Si on a une route, naviguer vers cette route
    if (to) {
      e.stopPropagation();
      navigate(to);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '12px',
          padding: '12px',
          borderRadius: '8px',
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
        <span
          style={{ whiteSpace: 'nowrap', flex: 1, cursor: to ? 'pointer' : 'default' }}
          onClick={handleLabelClick}
        >
          {label}
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          {isExpanded ? (
            <ChevronDown size={16} style={{ opacity: 0.6 }} />
          ) : (
            <ChevronRight size={16} style={{ opacity: 0.6 }} />
          )}
        </span>
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
