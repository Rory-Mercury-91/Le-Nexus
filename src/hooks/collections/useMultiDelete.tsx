import { useCallback, useState } from 'react';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

interface UseMultiDeleteOptions<T extends { id: number | string }> {
  deleteApi: (id: number | string) => Promise<{ success: boolean; error?: string }>;
  itemName: string;
  getItemTitle: (item: T) => string;
  onDeleteComplete?: () => void;
}

export function useMultiDelete<T extends { id: number | string }>({
  deleteApi,
  itemName,
  getItemTitle,
  onDeleteComplete
}: UseMultiDeleteOptions<T>) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    if (isSelectionMode) {
      setSelectedIds(new Set());
    }
  }, [isSelectionMode]);

  const toggleItemSelection = useCallback((id: number | string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isItemSelected = useCallback((id: number | string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const handleDeleteSelected = useCallback(async (items: T[]) => {
    if (selectedIds.size === 0) {
      showToast({
        title: 'Aucune sélection',
        message: 'Veuillez sélectionner au moins un élément à supprimer.',
        type: 'warning'
      });
      return;
    }

    const selectedItems = items.filter(item => selectedIds.has(item.id));
    const itemTitles = selectedItems.map(getItemTitle).slice(0, 5);
    const remainingCount = selectedItems.length - itemTitles.length;
    const titlesText = itemTitles.join(', ');
    const remainingText = remainingCount > 0 ? ` et ${remainingCount} autre${remainingCount > 1 ? 's' : ''}` : '';

    const confirmed = await confirm({
      title: `Supprimer ${selectedItems.length} ${itemName}${selectedItems.length > 1 ? 's' : ''} ?`,
      message: `Êtes-vous sûr de vouloir supprimer :\n\n${titlesText}${remainingText}\n\nCette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const id of selectedIds) {
        try {
          const result = await deleteApi(id);
          if (result?.success) {
            successCount++;
          } else {
            errorCount++;
            if (result?.error) {
              errors.push(result.error);
            }
          }
        } catch (error: any) {
          errorCount++;
          errors.push(error?.message || 'Erreur inconnue');
        }
      }

      if (successCount > 0) {
        showToast({
          title: `${successCount} ${itemName}${successCount > 1 ? 's' : ''} supprimé${successCount > 1 ? 's' : ''}`,
          message: errorCount > 0 ? `${errorCount} erreur${errorCount > 1 ? 's' : ''} lors de la suppression.` : undefined,
          type: successCount === selectedIds.size ? 'success' : 'warning'
        });
      }

      if (errorCount > 0 && successCount === 0) {
        showToast({
          title: 'Erreur',
          message: errors[0] || `Impossible de supprimer les ${itemName}s.`,
          type: 'error'
        });
      }

      setSelectedIds(new Set());
      setIsSelectionMode(false);

      if (onDeleteComplete) {
        onDeleteComplete();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, deleteApi, itemName, getItemTitle, confirm, showToast, onDeleteComplete]);

  return {
    isSelectionMode,
    selectedIds,
    selectedCount: selectedIds.size,
    isDeleting,
    toggleSelectionMode,
    toggleItemSelection,
    selectAll,
    deselectAll,
    isItemSelected,
    handleDeleteSelected,
    ConfirmDialog
  };
}
