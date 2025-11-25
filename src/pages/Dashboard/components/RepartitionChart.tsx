import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Statistics } from '../../../types';

const COLORS = {
  series: '#f97316',      // Orange pour Séries
  tomes: '#d946ef'        // Magenta pour Tomes
};

const TYPES_VOLUME = [
  'Tous les tomes',
  'Broché',
  'Broché Collector',
  'Coffret',
  'Kindle',
  'Webtoon',
  'Webtoon Physique',
  'Light Novel',
  'Scan Manga',
  'Scan Webtoon'
];

interface RepartitionChartProps {
  stats: Statistics;
}

export default function RepartitionChart({ stats }: RepartitionChartProps) {
  const [showRepartition, setShowRepartition] = useState(false);
  const [filtreType, setFiltreType] = useState<string>('Tous les tomes');
  
  const users = stats.users || [];
  
  if (users.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRepartition ? '20px' : '0', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => setShowRepartition(!showRepartition)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} style={{ color: COLORS.tomes }} />
            📊 Répartition par propriétaire
          </h3>
          {showRepartition ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {/* Dropdown pour filtrer par type */}
        {showRepartition && (
          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {TYPES_VOLUME.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>
      
      {showRepartition && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={users.map(user => {
                // Calculer le nombre de tomes selon le filtre
                let nbTomes = 0;
                if (filtreType === 'Tous les tomes') {
                  nbTomes = stats.nbTomesParProprietaire[user.id] || 0;
                } else {
                  // Vérification de sécurité : si nbTomesParProprietaireParType n'existe pas, afficher 0
                  nbTomes = stats.nbTomesParProprietaireParType?.[user.id]?.[filtreType] || 0;
                }
                
                return {
                  name: user.name,
                  tomes: nbTomes,
                  cout: stats.totaux[user.id] || 0
                };
              })}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-secondary)" 
                style={{ fontSize: '12px', fontWeight: '600' }} 
              />
              <YAxis 
                yAxisId="left"
                stroke="var(--text-secondary)" 
                style={{ fontSize: '12px' }}
                label={{ value: 'Tomes', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="var(--text-secondary)" 
                style={{ fontSize: '12px' }}
                label={{ value: 'Coût (€)', angle: 90, position: 'insideRight', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-light)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                formatter={(value, name) => {
                  if (name === 'tomes') {
                    return [`${value} tome${Number(value) > 1 ? 's' : ''}`, filtreType];
                  } else {
                    return [`${Number(value).toFixed(2)}€`, 'Coût total'];
                  }
                }}
              />
              {/* Barre des tomes (filtrée) */}
              <Bar 
                yAxisId="left"
                dataKey="tomes" 
                fill={COLORS.tomes}
                radius={[8, 8, 0, 0]}
              />
              {/* Barre du coût (fixe) */}
              <Bar 
                yAxisId="right"
                dataKey="cout" 
                fill={COLORS.series}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.tomes }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Tomes ({filtreType})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.series }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Coût total</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
