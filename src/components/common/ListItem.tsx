import { useState } from 'react';
import CardActionsMenu from '../cards/common/CardActionsMenu';

interface ListItemProps {
  title: string;
  subtitle?: string | React.ReactNode; // Peut être une string ou un ReactNode (pour inclure des badges)
  progression?: number | null;
  currentStatus: string;
  availableStatuses: string[];
  isFavorite?: boolean;
  isHidden?: boolean;
  badges?: React.ReactNode; // Badges personnalisés (FR, etc.)
  statusBadge?: React.ReactNode; // Badge de statut (Abandonné, En pause, etc.)
  rightContent?: React.ReactNode;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  onToggleHidden: () => Promise<void>;
}

export default function ListItem({
  title,
  subtitle,
  progression = null,
  currentStatus,
  availableStatuses,
  isFavorite = false,
  badges,
  statusBadge,
  rightContent,
  onClick,
  onToggleFavorite,
  onChangeStatus,
  onToggleHidden,
  isHidden = false
}: ListItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggleFavoriteWrapper = () => {
    onToggleFavorite();
  };

  const handleChangeStatusWrapper = (status: string) => {
    onChangeStatus(status);
  };

  const handleToggleHiddenWrapper = () => {
    onToggleHidden();
  };

  const handleMenuOpen = (isOpen: boolean) => {
    setIsMenuOpen(isOpen);
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid transparent',
        position: 'relative',
        minHeight: '56px',
        zIndex: isMenuOpen ? 1000 : 'auto'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {/* Titre et sous-titre */}
      <div style={{
        flex: '0 1 60%',
        minWidth: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: subtitle ? '4px' : '0' }}>
          {badges}
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            margin: 0
          }}>
            {title}
          </h3>
        </div>
        {subtitle && (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Badges de statut */}
      {statusBadge && (
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center'
        }}>
          {statusBadge}
        </div>
      )}

      {/* Barre de progression */}
      {typeof progression === 'number' && (
        <div style={{
          flex: '0 1 40%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '120px'
        }}>
          <div style={{
            flex: 1,
            height: '8px',
            background: 'var(--background)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.max(0, Math.min(100, progression))}%`,
              height: '100%',
              background: (() => {
                if (progression <= 0) return '#6366f1';
                if (progression >= 100) return 'linear-gradient(90deg, #10b981, #059669)';

                // Gradient progressif du violet vers le vert
                const startColor = '#6366f1';
                const midColor = '#8b5cf6';
                const endColor = '#10b981';

                if (progression < 50) {
                  return `linear-gradient(90deg, ${startColor}, ${midColor})`;
                } else {
                  const ratio = (progression - 50) / 50;
                  return `linear-gradient(90deg, ${midColor} 0%, ${endColor} ${Math.max(0, Math.min(100, ratio * 100))}%)`;
                }
              })(),
              transition: 'width 0.3s ease, background 0.3s ease'
            }} />
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            minWidth: '45px',
            color: progression >= 100 ? '#10b981' : 'var(--text-secondary)'
          }}>
            {Math.max(0, Math.min(100, Math.round(progression)))}%
          </span>
        </div>
      )}

      {rightContent && (
        <div style={{ flexShrink: 0, fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
          {rightContent}
        </div>
      )}

      {/* Menu trois points avec CardActionsMenu */}
      <div style={{ 
        position: 'relative', 
        flexShrink: 0, 
        width: '40px',
        height: '40px',
        marginLeft: '8px'
      }}>
        <div style={{ position: 'absolute', top: '0', right: '0', zIndex: 1 }}>
          <CardActionsMenu
            isFavorite={isFavorite}
            isHidden={isHidden}
            currentStatus={currentStatus}
            availableStatuses={availableStatuses}
            onToggleFavorite={handleToggleFavoriteWrapper}
            onToggleHidden={handleToggleHiddenWrapper}
            onChangeStatus={handleChangeStatusWrapper}
            onMenuOpen={handleMenuOpen}
            statusCategory="manga"
          />
        </div>
      </div>
    </div>
  );
}
