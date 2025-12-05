import { Plus, Trash2, X } from 'lucide-react';
import React, { ReactNode } from 'react';

interface CollectionHeaderProps {
  title: string;
  icon?: string;
  count?: number;
  countLabel?: string;
  onAdd?: () => void;
  addButtonLabel?: string;
  extraButtons?: ReactNode;
  // Mode suppression multiple
  isSelectionMode?: boolean;
  selectedCount?: number;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onDeleteSelected?: () => void;
  isDeleting?: boolean;
}

const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  title,
  icon,
  count,
  countLabel,
  onAdd,
  addButtonLabel,
  extraButtons,
  isSelectionMode = false,
  selectedCount = 0,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  isDeleting = false
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 0,
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

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {isSelectionMode ? (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--surface-light)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
              </span>
              <button
                onClick={onSelectAll}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title="Tout sélectionner"
              >
                Tout
              </button>
              <button
                onClick={onDeselectAll}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title="Tout désélectionner"
              >
                Aucun
              </button>
            </div>
            <button
              onClick={onDeleteSelected}
              disabled={selectedCount === 0 || isDeleting}
              className="btn btn-danger"
              style={{
                opacity: selectedCount === 0 ? 0.5 : 1,
                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Trash2 size={18} />
              Supprimer ({selectedCount})
            </button>
            <button
              onClick={onToggleSelectionMode}
              className="btn btn-outline"
            >
              <X size={18} />
              Annuler
            </button>
          </>
        ) : (
          <>
            {extraButtons}
            {onToggleSelectionMode && (
              <button
                onClick={onToggleSelectionMode}
                className="btn btn-outline"
                title="Mode suppression multiple"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
            )}
            {onAdd && addButtonLabel && (
              <button
                onClick={onAdd}
                className="btn btn-primary"
              >
                <Plus size={20} />
                {addButtonLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionHeader;
