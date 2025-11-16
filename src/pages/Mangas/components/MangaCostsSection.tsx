import { Serie } from '../../../types';

interface MangaCostsSectionProps {
  costsByUser: Array<{ user: { id: number; name: string; color: string; emoji: string }; cost: number; tomesCount: number }>;
  totalPrix: number;
  serie: Serie;
  profileImages: Record<string, string | null>;
  shouldShow: boolean;
}

export function MangaCostsSection({ costsByUser, totalPrix, serie, profileImages, shouldShow }: MangaCostsSectionProps) {
  if (!shouldShow) return null;

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '16px',
        alignItems: 'center'
      }}>
        <h4 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          💰 Coûts par propriétaire
        </h4>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
            Coût total : {totalPrix.toFixed(2)}€
          </span>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        {costsByUser.map(({ user, cost, tomesCount }) => (
          <div key={user.id} style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '16px',
            background: 'var(--surface)',
            border: `2px solid ${user.color}33`,
            borderRadius: '12px'
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
            
            {/* Nom du propriétaire */}
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600',
              color: user.color
            }}>
              {user.name}
            </span>
            
            {/* Prix */}
            <span style={{ 
              fontSize: '20px',
              fontWeight: '700',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text)'
            }}>
              {cost.toFixed(2)}€
            </span>
            
            {/* Nombre de tomes/chapitres */}
            <span style={{ 
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              {serie.type_contenu && (serie.type_contenu === 'chapitre' || serie.type_contenu === 'volume+chapitre')
                ? `${serie.nb_chapitres || 0} chapitre${(serie.nb_chapitres || 0) > 1 ? 's' : ''}`
                : `${tomesCount} tome${tomesCount > 1 ? 's' : ''}`
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
