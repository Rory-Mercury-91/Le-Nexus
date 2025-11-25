import { Serie } from '../../../types';

interface MangaCostsSectionProps {
  costsByUser: Array<{ user: { id: number; name: string; color: string; emoji: string }; cost: number; tomesCount: number }>;
  totalPrix: number;
  totalMihon: number;
  serie: Serie;
  profileImages: Record<string, string | null>;
  shouldShow: boolean;
}

export function MangaCostsSection({ costsByUser, totalPrix, totalMihon, serie, profileImages, shouldShow }: MangaCostsSectionProps) {
  if (!shouldShow) return null;

  return (
    <div>
      <h4 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
        💰 Coûts par propriétaire
      </h4>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>
          Coût total : {totalPrix.toFixed(2)}€
        </div>
        {totalMihon > 0 && (
          <div style={{ fontSize: '13px', color: 'var(--warning)' }}>
            Gain Mihon : {totalMihon.toFixed(2)}€
          </div>
        )}
      </div>
      
      <div style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {costsByUser.map(({ user, cost, tomesCount }) => (
          <div key={user.id} style={{ 
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* Avatar du propriétaire */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: `2px solid ${user.color}`,
              background: `${user.color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '700',
              color: user.color,
              overflow: 'hidden'
            }}>
              {profileImages[user.name] ? (
                <img 
                  src={profileImages[user.name]!} 
                  alt={user.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span>{user.emoji}</span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Nom du propriétaire avec nombre de tomes/chapitres */}
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: user.color
              }}>
                {user.name}
                <span style={{ 
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontWeight: '400',
                  marginLeft: '4px'
                }}>
                  ({serie.type_contenu && (serie.type_contenu === 'chapitre' || serie.type_contenu === 'volume+chapitre')
                    ? `${serie.nb_chapitres || 0} chapitre${(serie.nb_chapitres || 0) > 1 ? 's' : ''}`
                    : `${tomesCount} tome${tomesCount > 1 ? 's' : ''}`
                  })
                </span>
              </span>
              
              {/* Prix */}
              <span style={{ 
                fontSize: '18px',
                fontWeight: '700',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text)'
              }}>
                {cost.toFixed(2)}€
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
