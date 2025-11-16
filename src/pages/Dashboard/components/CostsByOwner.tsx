import { Statistics } from '../../../types';

interface CostsByOwnerProps {
  stats: Statistics;
  coutTotal: number;
}

export default function CostsByOwner({ stats, coutTotal }: CostsByOwnerProps) {
  const users = stats.users || [];

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px' }}>
        {users.map(user => {
          const nbTomes = stats.nbTomesParProprietaire[user.id] || 0;
          return (
            <div key={user.id} className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: user.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{user.emoji}</span>
                {user.name}
              </h3>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                {(stats.totaux[user.id] || 0).toFixed(2)}€
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {nbTomes} tome{nbTomes > 1 ? 's' : ''}
              </p>
            </div>
          );
        })}

        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--warning)' }}>
            Total
          </h3>
          <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
            {coutTotal.toFixed(2)}€
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            {stats.nbTomes} tome{stats.nbTomes > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

