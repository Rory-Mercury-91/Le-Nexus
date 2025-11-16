import React from 'react';
import CoverImage from '../../common/CoverImage';

interface CardCoverProps {
  src?: string;
  alt: string;
  fallbackIcon: React.ReactNode;
  objectFit?: 'cover' | 'contain';
  shouldBlur?: boolean;
  hasMasterPassword?: boolean; // Indique si le code maître est défini et actif
}

export default function CardCover({ src, alt, fallbackIcon, objectFit = 'cover', shouldBlur = false, hasMasterPassword = false }: CardCoverProps) {
  if (src) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <CoverImage
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            objectPosition: objectFit === 'cover' ? 'top' : 'center',
            filter: shouldBlur ? 'blur(20px) brightness(0.3)' : 'none',
            transition: 'filter 0.3s ease'
          }}
        />
        {shouldBlur && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1,
            gap: '8px'
          }}>
            {/* Afficher le badge +18 uniquement si le code maître est défini et actif */}
            {hasMasterPassword && (
              <>
                <div style={{
                  fontSize: '48px',
                  opacity: 0.9
                }}>
                  🔞
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '2px'
                }}>
                  +18
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)'
    }}>
      {fallbackIcon}
    </div>
  );
}
