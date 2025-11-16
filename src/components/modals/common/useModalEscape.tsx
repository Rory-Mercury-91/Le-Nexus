import { useEffect } from 'react';

/**
 * Hook pour fermer un modal avec la touche Échap
 */
export function useModalEscape(onClose: () => void, disabled = false) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disabled]);
}
