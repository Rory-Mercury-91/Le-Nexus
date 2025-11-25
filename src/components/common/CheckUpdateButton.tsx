import { ChevronDown, RefreshCw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface CheckUpdateButtonProps {
  onCheckUpdate: () => void;
  onForceCheckUpdate?: () => void;
  isUpdating: boolean;
  buttonLabel?: string;
  forceButtonLabel?: string;
}

export default function CheckUpdateButton({
  onCheckUpdate,
  onForceCheckUpdate,
  isUpdating,
  buttonLabel = 'Vérifier MAJ',
  forceButtonLabel = '🔄 Force vérification'
}: CheckUpdateButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  // Si pas de force check, utiliser le bouton simple
  if (!onForceCheckUpdate) {
    return (
      <button
        onClick={onCheckUpdate}
        disabled={isUpdating}
        className="btn btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: isUpdating ? 0.6 : 1
        }}
      >
        <RefreshCw
          size={18}
          style={isUpdating ? { animation: 'spin 1s linear infinite' } : {}}
        />
        {isUpdating ? 'Vérification...' : buttonLabel}
      </button>
    );
  }

  return (
    <div ref={buttonRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          if (isUpdating) return;
          setShowMenu(!showMenu);
        }}
        disabled={isUpdating}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: isUpdating ? 0.6 : 1
        }}
      >
        <RefreshCw
          size={18}
          style={isUpdating ? { animation: 'spin 1s linear infinite' } : {}}
        />
        {isUpdating ? 'Vérification...' : buttonLabel}
        {!isUpdating && <ChevronDown size={16} />}
      </button>

      {showMenu && !isUpdating && (
        <>
          {/* Overlay pour fermer le menu */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999
            }}
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu dropdown */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: '220px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow)',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => {
                onCheckUpdate();
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: onForceCheckUpdate !== undefined ? '1px solid var(--border)' : 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '14px',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-light)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <span>{buttonLabel}</span>
            </button>
            {onForceCheckUpdate && (
              <button
                onClick={() => {
                  onForceCheckUpdate();
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <span>{forceButtonLabel}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
