import { ReactNode } from 'react';
import CardTitle from './CardTitle';
import ProgressBar from './ProgressBar';

interface CardContentProps {
  progress: {
    current: number;
    total: number;
    label: string;
  };
  title: string;
  children?: ReactNode; // Pour badges additionnels (ex: FR badge)
}

/**
 * Section contenu standardisée pour les cartes (progression + titre)
 */
export default function CardContent({ progress, title, children }: CardContentProps) {
  return (
    <div style={{ 
      padding: '10px 12px 6px 12px', 
      display: 'flex', 
      flexDirection: 'column',
      gap: '8px',
      borderTop: '1px solid var(--border)'
    }}>
      {/* Barre de progression */}
      <ProgressBar
        current={progress.current}
        total={progress.total}
        label={progress.label}
      />
      
      {/* Titre + Badges additionnels */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {children}
        <CardTitle title={title}>{title}</CardTitle>
      </div>
    </div>
  );
}
