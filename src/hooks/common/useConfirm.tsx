import { useCallback, useState } from 'react';
import ConfirmModal from '../../components/modals/common/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ isOpen: false, options: { title: '', message: '' }, resolve: null });
  }, [confirmState.resolve]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ isOpen: false, options: { title: '', message: '' }, resolve: null });
  }, [confirmState.resolve]);

  const ConfirmDialog = useCallback(() => {
    if (!confirmState.isOpen) return null;

    return (
      <ConfirmModal
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        isDanger={confirmState.options.isDanger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }, [confirmState, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
