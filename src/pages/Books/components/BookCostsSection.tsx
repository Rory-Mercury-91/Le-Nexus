interface BookCostsSectionProps {
  costsByUser: Array<{ user: { id: number; name: string; color: string; emoji: string }; cost: number }>;
  totalPrix: number;
  profileImages: Record<string, string | null>;
  shouldShow: boolean;
}

export default function BookCostsSection({ costsByUser, totalPrix, profileImages, shouldShow }: BookCostsSectionProps) {
  if (!shouldShow || costsByUser.length === 0) return null;

  return (
    <div>
      <h4 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
        💰 Coûts par propriétaire
      </h4>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>
          Coût total : {totalPrix.toFixed(2)}€
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {costsByUser.map(({ user, cost }) => {
          const avatarUrl = profileImages[user.name];

          return (
            <div
              key={user.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px'
              }}
            >
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
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <span>{user.emoji || '👤'}</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                  fontSize: '18px',
                  fontWeight: '700',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text)'
                }}>
                  {cost.toFixed(2)}€
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
