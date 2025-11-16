import { Search, X } from 'lucide-react';

interface GlobalSearchInputProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
}

/**
 * Barre de recherche pour GlobalSearch
 */
export default function GlobalSearchInput({
  searchTerm,
  setSearchTerm,
  inputRef,
  onClose
}: GlobalSearchInputProps) {
  return (
    <div style={{
      padding: '20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <Search size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher par titre ou ID (MAL, F95, LewdCorner)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            color: 'var(--text)',
            fontWeight: '500',
            width: '100%'
          }}
        />
        {searchTerm && /^\d+$/.test(searchTerm.trim()) && (
          <div style={{
            fontSize: '11px',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🔍 Recherche par ID numérique
          </div>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <kbd style={{
          padding: '2px 6px',
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>ESC</kbd>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
