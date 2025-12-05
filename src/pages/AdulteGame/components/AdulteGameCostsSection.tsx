import { ShoppingBag } from 'lucide-react';

interface AdulteGameCostsSectionProps {
  costsByUser: Array<{ user: { id: number; name: string; color: string; emoji: string }; cost: number }>;
  totalPrix: number;
  profileImages: Record<string, string | null>;
  onMarkAsOwned: () => void;
  shouldShow: boolean;
}

export default function AdulteGameCostsSection({
  costsByUser,
  totalPrix,
  profileImages,
  onMarkAsOwned,
  shouldShow
}: AdulteGameCostsSectionProps) {
  if (!shouldShow) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          💰 Possession
        </h4>
        <button
          type="button"
          className="btn btn-outline"
          onClick={onMarkAsOwned}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '13px'
          }}
        >
          <ShoppingBag size={14} />
          {costsByUser.length > 0 ? 'Modifier' : 'Marquer comme possédé'}
        </button>
      </div>

      {costsByUser.length > 0 ? (
        <>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>
              Coût total : {totalPrix.toFixed(2)}€
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
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
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}
                >
                  {/* Avatar du propriétaire */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: `2px solid ${user.color}`,
                    background: `${user.color}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
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
                      fontSize: '16px',
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
        </>
      ) : (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px dashed var(--border)',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Ce jeu n'est pas encore marqué comme possédé.
          </p>
        </div>
      )}
    </div>
  );
}
