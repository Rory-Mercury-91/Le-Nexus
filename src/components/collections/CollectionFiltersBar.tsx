import React, { ReactNode, cloneElement, isValidElement } from 'react';

interface CollectionFiltersBarProps {
  children: ReactNode;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  onOpenHelp?: () => void;
}

const CollectionFiltersBar: React.FC<CollectionFiltersBarProps> = ({
  children,
  onClearFilters,
  hasActiveFilters = false,
  onOpenHelp
}) => {
  // Cloner les enfants pour passer les props au CollectionSearchBar s'il existe
  const clonedChildren = React.Children.map(children, (child) => {
    if (isValidElement(child)) {
      // Vérifier si c'est un CollectionSearchBar via displayName ou type
      const componentType = child.type as any;
      
      // Essayer plusieurs méthodes de détection
      const displayName = componentType?.displayName;
      const componentName = componentType?.name;
      const isSearchBar = displayName === 'CollectionSearchBar' || 
                         componentName === 'CollectionSearchBar' ||
                         (typeof componentType === 'function' && componentType.displayName === 'CollectionSearchBar');
      
      if (isSearchBar) {
        return cloneElement(child as React.ReactElement<any>, {
          hasActiveFilters,
          onClearFilters,
          onOpenHelp
        });
      }
    }
    return child;
  });

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      {clonedChildren}
    </div>
  );
};

export default CollectionFiltersBar;
