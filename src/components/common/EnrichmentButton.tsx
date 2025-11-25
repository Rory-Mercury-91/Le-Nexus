import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface EnrichmentButtonProps {
  onEnrich: () => void;
  onForceEnrich: () => void;
  enriching: boolean;
  buttonLabel?: string;
  forceButtonLabel?: string;
}

export default function EnrichmentButton({
  onEnrich,
  onForceEnrich,
  enriching,
  buttonLabel = '🚀 Enrichir',
  forceButtonLabel = '🔄 Force vérification'
}: EnrichmentButtonProps) {
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

  return (
    <div ref={buttonRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          if (enriching) return;
          setShowMenu(!showMenu);
        }}
        disabled={enriching}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        {enriching ? '⏳ Enrichissement...' : buttonLabel}
        {!enriching && <ChevronDown size={16} />}
      </button>

      {showMenu && !enriching && (
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
                onEnrich();
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
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
            <button
              onClick={() => {
                onForceEnrich();
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
          </div>
        </>
      )}
    </div>
  );
}
