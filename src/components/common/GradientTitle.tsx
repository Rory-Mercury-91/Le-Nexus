import { ReactNode } from 'react';

interface GradientTitleProps {
  children: ReactNode;
  fontSize?: string;
  marginBottom?: string;
  style?: React.CSSProperties;
}

/**
 * Titre avec gradient (utilisé dans Layout, SplashScreen, OnboardingWizard)
 */
export default function GradientTitle({ 
  children, 
  fontSize = '36px',
  marginBottom,
  style 
}: GradientTitleProps) {
  return (
    <h1 style={{
      fontSize,
      fontWeight: '700',
      marginBottom,
      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      ...style
    }}>
      {children}
    </h1>
  );
}
