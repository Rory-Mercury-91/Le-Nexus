import { Search } from 'lucide-react';
import React from 'react';

interface CollectionSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: (e: React.FormEvent) => void;
  showSubmitButton?: boolean;
}

const CollectionSearchBar: React.FC<CollectionSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = 'Rechercher...',
  onSubmit,
  showSubmitButton = true
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
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
        {showSubmitButton && (
          <button type="submit" className="btn btn-primary">
            Rechercher
          </button>
        )}
      </div>
    </form>
  );
};

export default CollectionSearchBar;
