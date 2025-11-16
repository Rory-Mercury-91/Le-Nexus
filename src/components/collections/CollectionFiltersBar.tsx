import React, { ReactNode } from 'react';

interface CollectionFiltersBarProps {
  children: ReactNode;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

const CollectionFiltersBar: React.FC<CollectionFiltersBarProps> = ({
  children,
  onClearFilters,
  hasActiveFilters = false
}) => {
  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      {children}
      
      {hasActiveFilters && onClearFilters && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
          <button
            onClick={onClearFilters}
            className="btn btn-outline"
            style={{ marginLeft: 'auto' }}
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionFiltersBar;
