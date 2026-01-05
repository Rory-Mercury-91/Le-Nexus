import { useNavigate } from 'react-router-dom';

interface TabConfig {
  path: string;
  icon: string;
  label: string;
  count?: number;
  condition?: boolean; // Pour afficher conditionnellement certains onglets
}

interface SubNavigationTabsProps {
  tabs: TabConfig[];
  currentPath: string;
}

/**
 * Composant réutilisable pour afficher des sous-onglets de navigation
 * avec un style cohérent dans toute l'application
 */
export default function SubNavigationTabs({ tabs, currentPath }: SubNavigationTabsProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        gap: '0',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin'
      }}
    >
      {tabs
        .filter(tab => tab.condition !== false) // Filtrer les onglets conditionnels
        .map((tab) => {
          const isActive = currentPath === tab.path || 
            (tab.path.endsWith('/all') && currentPath === tab.path.replace('/all', ''));

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                position: 'relative',
                padding: '12px 20px',
                border: 'none',
                background: isActive ? 'var(--surface-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                marginBottom: '-2px', // Pour chevaucher la bordure du bas
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'var(--surface)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              <span>
                {tab.label}
                {tab.count !== undefined && ` (${tab.count})`}
              </span>
            </button>
          );
        })}
    </div>
  );
}
