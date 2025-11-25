import { useEffect } from 'react';

/**
 * Hook qui désactive le scroll du body quand une modale est ouverte
 */
export function useDisableBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Sauvegarder la position actuelle du scroll
      const scrollY = window.scrollY;
      
      // Désactiver le scroll en ajoutant overflow: hidden au body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Nettoyer lors du démontage ou quand la modale se ferme
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Restaurer la position du scroll
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
}
