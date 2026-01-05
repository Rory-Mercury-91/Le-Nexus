interface TabConfig {
  id: string;
  icon?: string;
  label: string;
  condition?: boolean; // Pour afficher conditionnellement certains onglets
}

interface SubTabsProps {
  tabs: TabConfig[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  marginBottom?: string; // Marge inférieure personnalisable (par défaut: '24px')
}

/**
 * Composant réutilisable pour afficher des sous-onglets avec changement d'état local
 * (sans navigation). Utilisé dans les paramètres et autres composants avec onglets multiples.
 */
export default function SubTabs({ tabs, activeTabId, onTabChange, marginBottom = '24px' }: SubTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0',
        marginBottom,
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin'
      }}
    >
      {tabs
        .filter(tab => tab.condition !== false) // Filtrer les onglets conditionnels
        .map((tab) => {
          const isActive = activeTabId === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
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
              {tab.icon && <span style={{ fontSize: '16px' }}>{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
    </div>
  );
}
