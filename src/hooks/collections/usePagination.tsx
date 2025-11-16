import { useEffect, useState } from 'react';

export type ItemsPerPage = 25 | 50 | 100 | 'all';

interface UsePaginationOptions<T> {
  items: T[];
  defaultItemsPerPage?: ItemsPerPage;
  storageKey?: string;
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
 * Hook pour gérer la pagination avec choix du nombre d'éléments par page
 */
export function usePagination<T>({ 
  items, 
  defaultItemsPerPage = 50,
  storageKey 
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
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
