import { ReactNode } from 'react';

interface CardTitleProps {
  children: ReactNode;
  title?: string;
}

/**
 * Titre standardisé pour les cartes
 */
export default function CardTitle({ children, title }: CardTitleProps) {
  return (
    <h3 style={{
      fontSize: '13px',
      fontWeight: '600',
      lineHeight: '1.3',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      flex: 1,
      margin: 0,
      color: 'var(--text)',
      minHeight: '34px'
    }} title={title}>
      {children}
    </h3>
  );
}
