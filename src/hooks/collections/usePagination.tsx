import { useEffect, useRef, useState } from 'react';

export type ItemsPerPage = 25 | 50 | 100 | 'all';

interface UsePaginationOptions<T> {
  items: T[];
  defaultItemsPerPage?: ItemsPerPage;
  storageKey?: string;
  scrollStorageKey?: string; // Clé pour effacer la position de scroll sauvegardée lors du changement de page
}

interface UsePaginationReturn<T> {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: ItemsPerPage;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: ItemsPerPage) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

/**
 * Fonction utilitaire pour remonter en haut de la page
 * Utilise 'auto' pour un scroll immédiat et fiable
 * Essaie plusieurs cibles pour être sûr que ça fonctionne
 */
function scrollToTop() {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Essayer de trouver le conteneur de scroll
  const scrollContainer = document.getElementById('app-scroll-container');
  
  // Essayer plusieurs cibles dans l'ordre de priorité
  const targets: Array<Window | HTMLElement | null> = [
    scrollContainer,
    document.scrollingElement as HTMLElement | null,
    document.documentElement,
    document.body,
    window
  ].filter(Boolean) as Array<Window | HTMLElement>;
  
  // Scroller sur tous les éléments possibles pour être sûr
  targets.forEach(target => {
    if (target instanceof Window) {
      target.scrollTo({ top: 0, behavior: 'auto' });
      // Fallback
      if (target.scrollY !== 0 && target.pageYOffset !== 0) {
        target.scrollTo(0, 0);
      }
    } else if (target instanceof HTMLElement) {
      target.scrollTo({ top: 0, behavior: 'auto' });
      // Fallback direct
      target.scrollTop = 0;
    }
  });
}

/**
 * Hook pour gérer la pagination avec choix du nombre d'éléments par page
 */
export function usePagination<T>({ 
  items, 
  defaultItemsPerPage = 50,
  storageKey,
  scrollStorageKey
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const previousPageRef = useRef<number>(1);
  const isInitialMountRef = useRef<boolean>(true);
  const [itemsPerPage, setItemsPerPageState] = useState<ItemsPerPage>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = saved === 'all' ? 'all' : parseInt(saved, 10);
        if (parsed === 'all' || [25, 50, 100].includes(parsed)) {
          return parsed as ItemsPerPage;
        }
      }
    }
    return defaultItemsPerPage;
  });

  // Sauvegarder la préférence
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(itemsPerPage));
    }
  }, [itemsPerPage, storageKey]);

  // Réinitialiser à la page 1 quand les items ou itemsPerPage changent
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, itemsPerPage]);

  // Remonter en haut quand la page change (sauf au premier rendu)
  // Lors d'un changement de page manuel, on efface la position de scroll sauvegardée
  // pour éviter qu'elle soit restaurée, puis on remonte en haut
  useEffect(() => {
    // Ignorer le premier rendu pour ne pas interférer avec la restauration du scroll
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousPageRef.current = currentPage;
      return;
    }

    // Si la page a changé, c'est un changement manuel
    if (previousPageRef.current !== currentPage) {
      previousPageRef.current = currentPage;
      
      // Effacer la position de scroll sauvegardée AVANT de scroller
      if (scrollStorageKey && typeof window !== 'undefined') {
        try {
          window.sessionStorage?.removeItem(scrollStorageKey);
          // Effacer aussi la clé de target si elle existe
          window.sessionStorage?.removeItem(`${scrollStorageKey}::target`);
        } catch (error) {
          // Ignorer les erreurs de sessionStorage
        }
      }
      
      // Remonter en haut immédiatement (plusieurs fois pour être sûr)
      scrollToTop();
      
      // Répéter le scroll après quelques frames pour s'assurer que ça prend
      // et pour surmonter toute restauration qui pourrait se produire
      requestAnimationFrame(() => {
        scrollToTop();
        requestAnimationFrame(() => {
          scrollToTop();
          // Une dernière fois après un petit délai pour être sûr
          setTimeout(() => {
            scrollToTop();
            // Vérifier et forcer une dernière fois si nécessaire
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                const container = document.getElementById('app-scroll-container');
                if (container && container.scrollTop > 0) {
                  container.scrollTop = 0;
                }
                if (window.scrollY > 0 || window.pageYOffset > 0) {
                  window.scrollTo(0, 0);
                }
              }
            }, 100);
          }, 50);
        });
      });
    }
  }, [currentPage, scrollStorageKey]);

  const setItemsPerPage = (newItemsPerPage: ItemsPerPage) => {
    setItemsPerPageState(newItemsPerPage);
    setCurrentPage(1); // Retour à la première page
  };

  const totalItems = items.length;
  const actualItemsPerPage = itemsPerPage === 'all' ? totalItems : itemsPerPage;
  const totalPages = actualItemsPerPage > 0 ? Math.ceil(totalItems / actualItemsPerPage) : 1;

  // Calculer les items paginés
  const paginatedItems = itemsPerPage === 'all' 
    ? items 
    : items.slice((currentPage - 1) * actualItemsPerPage, currentPage * actualItemsPerPage);

  // Les fonctions de navigation utilisent setCurrentPage directement
  // L'effet se chargera de gérer le scroll
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  return {
    paginatedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  };
}
