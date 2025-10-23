import { useCallback, useState } from 'react';

interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: (() => void) | null;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null
  });

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (alertState.resolve) {
      alertState.resolve();
    }
    setAlertState({ isOpen: false, options: { title: '', message: '' }, resolve: null });
  }, [alertState.resolve]);

  const AlertDialog = useCallback(() => {
    if (!alertState.isOpen) return null;

    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div 
          className="modal" 
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '400px' }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
            {alertState.options.title}
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '24px',
            fontSize: '15px'
          }}>
            {alertState.options.message}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleClose} className="btn btn-primary">
              {alertState.options.confirmText || 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [alertState, handleClose]);

  return { alert: showAlert, AlertDialog };
}
