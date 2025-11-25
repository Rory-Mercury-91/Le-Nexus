import { ReactNode } from 'react';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';

interface ModalProps {
  children: ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  onClickOverlay?: () => void;
  style?: React.CSSProperties;
}

/**
 * Wrapper modal standardisé avec overlay
 */
export default function Modal({ 
  children, 
  maxWidth = '900px',
  maxHeight,
  onClickOverlay,
  style 
}: ModalProps) {
  // Désactiver le scroll du body quand la modale est ouverte
  useDisableBodyScroll(true);

  return (
    <div 
      className="modal-overlay"
      onClick={onClickOverlay}
    >
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth,
          maxHeight,
          ...style 
        }}
      >
        {children}
      </div>
    </div>
  );
}
