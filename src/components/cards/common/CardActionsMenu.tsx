import { Eye, EyeOff, Heart, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatStatusLabel, StatusCategory } from '../../../utils/status';

interface CardActionsMenuProps {
  isFavorite: boolean;
  isHidden: boolean;
  currentStatus: string;
  availableStatuses: readonly string[] | string[];
  onToggleFavorite: () => void;
  onToggleHidden: () => void;
  onChangeStatus: (status: string) => void;
  onMenuOpen?: (isOpen: boolean) => void;
  statusCategory?: StatusCategory;
}

export default function CardActionsMenu({
  isFavorite,
  isHidden,
  currentStatus,
  availableStatuses,
  onToggleFavorite,
  onToggleHidden,
  onChangeStatus,
  onMenuOpen,
  statusCategory
}: CardActionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [alignRight, setAlignRight] = useState(true);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right?: number; left?: number }>({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu en cliquant en dehors ou en scrollant
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && menuRef.current && buttonRef.current) {
        const target = event.target as Node;
        if (!menuRef.current.contains(target) && !buttonRef.current.contains(target)) {
          setShowMenu(false);
          onMenuOpen?.(false);
        }
      }
    };

    const handleScroll = () => {
      if (showMenu) {
        setShowMenu(false);
        onMenuOpen?.(false);
      }
    };

    const handleWheel = () => {
      if (showMenu) {
        setShowMenu(false);
        onMenuOpen?.(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('wheel', handleWheel, { passive: true });
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('wheel', handleWheel);
      };
    }
  }, [showMenu, onMenuOpen]);

  // Calculer la position du menu pour qu'il s'adapte au contenu présent
  useLayoutEffect(() => {
    if (!showMenu || !buttonRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      const menuEl = menuRef.current;
      const menuWidth = menuEl?.offsetWidth ?? 0;
      const menuHeight = menuEl?.offsetHeight ?? 0;
      const spaceOnRight = window.innerWidth - rect.right;
      const spaceOnLeft = rect.left;

      const shouldAlignRight = spaceOnRight >= spaceOnLeft || spaceOnRight >= menuWidth;
      setAlignRight(shouldAlignRight);

      const tentativeTop = rect.bottom + 4;
      const maxTop = window.innerHeight - menuHeight - 8;
      const top = Math.max(8, Math.min(tentativeTop, maxTop));

      if (shouldAlignRight) {
        const right = Math.max(8, window.innerWidth - rect.right);
        setMenuPosition({ top, right });
      } else {
        const maxLeft = window.innerWidth - menuWidth - 8;
        const left = Math.min(Math.max(8, rect.left), maxLeft);
        setMenuPosition({ top, left });
      }
    };

    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showMenu, availableStatuses, currentStatus]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !showMenu;
    setShowMenu(newState);
    onMenuOpen?.(newState);
  };

  const handleAction = async (e: React.MouseEvent, action: () => void | Promise<void>) => {
    e.preventDefault();
    e.stopPropagation();
    await action();
    setShowMenu(false);
    onMenuOpen?.(false);
  };

  return (
    <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10000 }}>
      {/* Bouton menu */}
      <button
        ref={buttonRef}
        onClick={handleToggleMenu}
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          transition: 'background 0.2s',
          position: 'relative',
          zIndex: 10000,
          willChange: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.85)';
        }}
      >
        <MoreVertical size={16} />
      </button>

      {/* Dropdown menu - position fixe pour s'ouvrir au-dessus des tuiles */}
      {showMenu ? createPortal(
        <>
          {/* Overlay transparent pour capturer les clics en dehors du menu */}
          <div
            onClick={(e) => {
              // Si le clic est sur l'overlay (pas sur le menu), fermer le menu
              if (e.target === e.currentTarget) {
                setShowMenu(false);
                onMenuOpen?.(false);
              }
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              background: 'transparent',
              pointerEvents: 'auto'
            }}
          />
          
          {/* Menu lui-même */}
          <div
            ref={menuRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              ...(alignRight && menuPosition.right !== undefined ? { right: `${menuPosition.right}px` } : {}),
              ...(!alignRight && menuPosition.left !== undefined ? { left: `${menuPosition.left}px` } : {}),
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              width: 'max-content',
              minWidth: '140px',
              maxWidth: '280px',
              maxHeight: '400px',
              overflowY: 'auto',
              overflowX: 'hidden',
              zIndex: 10001,
              pointerEvents: 'auto'
            }}
          >
          {/* Toggle Favori */}
          <button
            onClick={(e) => handleAction(e, onToggleFavorite)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              background: isFavorite ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              border: 'none',
              color: isFavorite ? 'var(--error)' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: isFavorite ? '600' : '400',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isFavorite ? 'rgba(239, 68, 68, 0.15)' : 'transparent';
            }}
          >
            <Heart size={16} fill={isFavorite ? 'var(--error)' : 'none'} />
            {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </button>

          {/* Séparateur */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Statuts */}
          {availableStatuses.map(status => {
            const isCurrentStatus = currentStatus === status;
            const label = formatStatusLabel(status, statusCategory ? { category: statusCategory } : undefined);
            return (
              <button
                key={status}
                onClick={(e) => handleAction(e, () => {
                  // Si on reclique sur le statut actuel, on le retire (revient au premier statut de la liste)
                  if (isCurrentStatus) {
                    onChangeStatus(availableStatuses[0]);
                  } else {
                    onChangeStatus(status);
                  }
                })}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: isCurrentStatus ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: isCurrentStatus ? 'var(--primary)' : 'var(--text)',
                  fontWeight: isCurrentStatus ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentStatus) {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                  } else {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCurrentStatus ? 'rgba(99, 102, 241, 0.1)' : 'transparent';
                }}
              >
                {isCurrentStatus ? `✓ ${label}` : label}
              </button>
            );
          })}

          {/* Séparateur */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Toggle Masquer */}
          <button
            onClick={(e) => handleAction(e, onToggleHidden)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: isHidden ? 'rgba(251, 146, 60, 0.15)' : 'transparent',
              border: 'none',
              color: isHidden ? 'var(--warning)' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: isHidden ? '600' : '400',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(251, 146, 60, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isHidden ? 'rgba(251, 146, 60, 0.15)' : 'transparent';
            }}
          >
            {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
            {isHidden ? 'Démasquer' : 'Masquer'}
          </button>
        </div>
        </>,
        document.body
      ) : null}
    </div>
  );
}
