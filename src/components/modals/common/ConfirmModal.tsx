import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import { useModalEscape } from './useModalEscape';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isDanger = false
}: ConfirmModalProps) {
  useModalEscape(onCancel);

  return createPortal(
    <Modal maxWidth="500px" onClickOverlay={onCancel}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isDanger && (
            <AlertTriangle size={24} style={{ color: 'var(--error)' }} />
          )}
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{title}</h2>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px'
          }}
        >
          <X size={24} />
        </button>
      </div>

        <p style={{
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: '32px',
          fontSize: '15px'
        }}>
          {message}
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            className="btn btn-outline"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </Modal>,
    document.body
  );
}
