import { ReactNode } from 'react';

interface FullScreenOverlayProps {
  children: ReactNode;
  zIndex?: number;
  padding?: string;
}

/**
 * Composant pour les écrans plein écran (SplashScreen, OnboardingWizard, UserSelector)
 */
export default function FullScreenOverlay({ 
  children, 
  zIndex = 9999,
  padding = '0'
}: FullScreenOverlayProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, var(--background) 0%, #1a1f35 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex,
      padding
    }}>
      {children}
    </div>
  );
}
