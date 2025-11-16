import { ReactNode } from 'react';
import { useAdulteGameLock } from '../../hooks/useAdulteGameLock';
import AdulteGameUnlockModal from '../modals/adulte-game/AdulteGameUnlockModal';

interface ProtectedContentProps {
  children: ReactNode;
  isSensitive: boolean;
  onCancel?: () => void;
  additionalContent?: ReactNode; // Pour ToastContainer ou autre contenu à afficher avant la modale
}

/**
 * Composant wrapper pour protéger les contenus sensibles (animes, mangas)
 * Affiche automatiquement la modale de déverrouillage si nécessaire
 */
export default function ProtectedContent({ 
  children, 
  isSensitive, 
  onCancel,
  additionalContent 
}: ProtectedContentProps) {
  const { isLocked, hasPassword, unlock } = useAdulteGameLock();
  const needsUnlock = isSensitive && hasPassword && isLocked;

  // Si le contenu est sensible et verrouillé, afficher la modale de déverrouillage
  if (needsUnlock) {
    return (
      <>
        {additionalContent}
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <AdulteGameUnlockModal
            onUnlock={unlock}
            onCancel={onCancel || (() => window.history.back())}
          />
        </div>
      </>
    );
  }

  return <>{children}</>;
}
