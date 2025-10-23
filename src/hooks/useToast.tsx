import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

interface ToastOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface Toast extends ToastOptions {
  id: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now();
    const toast: Toast = {
      id,
      type: 'info',
      duration: 3000,
      ...options,
    };

    setToasts((prev) => [...prev, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    if (toasts.length === 0) return null;

    const getIcon = (type: string) => {
      switch (type) {
        case 'success':
          return <CheckCircle size={20} />;
        case 'error':
          return <XCircle size={20} />;
        case 'warning':
          return <AlertTriangle size={20} />;
        default:
          return <Info size={20} />;
      }
    };

    const getColor = (type: string) => {
      switch (type) {
        case 'success':
          return 'var(--success)';
        case 'error':
          return 'var(--error)';
        case 'warning':
          return 'var(--warning)';
        default:
          return 'var(--primary)';
      }
    };

    return (
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px'
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="fade-in"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${getColor(toast.type || 'info')}`,
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              minWidth: '300px'
            }}
          >
            <div style={{ color: getColor(toast.type || 'info'), flexShrink: 0 }}>
              {getIcon(toast.type || 'info')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: toast.message ? '4px' : '0' }}>
                {toast.title}
              </div>
              {toast.message && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    );
  }, [toasts, removeToast]);

  return { showToast, ToastContainer };
}
