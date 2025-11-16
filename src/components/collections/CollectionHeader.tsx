import { Plus } from 'lucide-react';
import React, { ReactNode } from 'react';

interface CollectionHeaderProps {
  title: string;
  icon?: string;
  count?: number;
  countLabel?: string;
  onAdd?: () => void;
  addButtonLabel?: string;
  extraButtons?: ReactNode;
}

const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  title,
  icon,
  count,
  countLabel,
  onAdd,
  addButtonLabel,
  extraButtons
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '700', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px' 
      }}>
        {icon && (
          <span style={{ fontSize: '32px' }}>{icon}</span>
        )}
        {title}
        {typeof count === 'number' && countLabel && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>
            ({count} {countLabel})
          </span>
        )}
      </h1>
      
      {(extraButtons || (onAdd && addButtonLabel)) && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {extraButtons}
          {onAdd && addButtonLabel && (
            <button
              onClick={onAdd}
              className="btn btn-primary"
            >
              <Plus size={20} />
              {addButtonLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionHeader;
