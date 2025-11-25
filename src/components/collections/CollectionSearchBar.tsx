import { Search } from 'lucide-react';
import React from 'react';

interface CollectionSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: (e: React.FormEvent) => void;
  showSubmitButton?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const CollectionSearchBar: React.FC<CollectionSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = 'Rechercher...',
  onSubmit,
  showSubmitButton = true,
  hasActiveFilters = false,
  onClearFilters
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }}
          />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input"
            style={{ paddingLeft: '48px' }}
          />
        </div>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn btn-outline"
            style={{ 
              height: '40px', 
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Réinitialiser tous les filtres"
          >
            <span>✕</span>
            <span>Réinitialiser</span>
          </button>
        )}
        {showSubmitButton && (
          <button type="submit" className="btn btn-primary" style={{ height: '40px', flexShrink: 0 }}>
            Rechercher
          </button>
        )}
      </div>
    </form>
  );
};

CollectionSearchBar.displayName = 'CollectionSearchBar';

export default CollectionSearchBar;
