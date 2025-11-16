interface GlobalSearchFooterProps {
  resultsCount: number;
}

/**
 * Footer avec raccourcis clavier pour GlobalSearch
 */
export default function GlobalSearchFooter({ resultsCount }: GlobalSearchFooterProps) {
  if (resultsCount === 0) return null;

  return (
    <div style={{
      padding: '12px 20px',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '11px',
      color: 'var(--text-secondary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <kbd style={{
          padding: '2px 4px',
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          fontFamily: 'monospace'
        }}>↑↓</kbd>
        <span>Naviguer</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <kbd style={{
          padding: '2px 4px',
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          fontFamily: 'monospace'
        }}>↵</kbd>
        <span>Ouvrir</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <kbd style={{
          padding: '2px 4px',
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          fontFamily: 'monospace'
        }}>ESC</kbd>
        <span>Fermer</span>
      </div>
    </div>
  );
}
