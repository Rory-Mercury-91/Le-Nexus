import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EvolutionStatistics } from '../../../types';

const COLORS = {
  series: '#f97316',      // Orange pour Séries
  tomes: '#d946ef'        // Magenta pour Tomes
};

interface EvolutionChartProps {
  evolutionStats: EvolutionStatistics;
}

export default function EvolutionChart({ evolutionStats }: EvolutionChartProps) {
  const [showEvolution, setShowEvolution] = useState(false);
  const [periodeEvolution, setPeriodeEvolution] = useState<'mois' | 'annee'>('mois');

  if (!evolutionStats || evolutionStats.totalTomes === 0) {
    return null;
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showEvolution ? '20px' : '0', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={() => setShowEvolution(!showEvolution)}
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
            📈 Évolution de votre collection
          </h3>
          {showEvolution ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {/* Dropdown pour la période */}
        {showEvolution && (
          <select
            value={periodeEvolution}
            onChange={(e) => setPeriodeEvolution(e.target.value as 'mois' | 'annee')}
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
            <option value="mois">Par mois</option>
            <option value="annee">Par année</option>
          </select>
        )}
      </div>
      
      {showEvolution && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={(() => {
              const data = periodeEvolution === 'mois' ? evolutionStats.parMois : evolutionStats.parAnnee;
              return Object.keys(data).sort().map(key => ({
                periode: periodeEvolution === 'mois' 
                  ? new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
                  : key,
                tomes: data[key].count,
                montant: data[key].total
              }));
            })()}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              dataKey="periode" 
              stroke="var(--text-secondary)" 
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="var(--text-secondary)" 
              style={{ fontSize: '11px' }}
              label={{ value: 'Tomes', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="var(--text-secondary)" 
              style={{ fontSize: '11px' }}
              label={{ value: 'Montant (€)', angle: 90, position: 'insideRight', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
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
                  return [`${value} tome${Number(value) > 1 ? 's' : ''}`, 'Tomes achetés'];
                } else {
                  return [`${Number(value).toFixed(2)}€`, 'Montant dépensé'];
                }
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'tomes') return 'Tomes achetés';
                if (value === 'montant') return 'Montant dépensé (€)';
                return value;
              }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="tomes" 
              stroke={COLORS.tomes}
              strokeWidth={2}
              dot={{ fill: COLORS.tomes, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="montant" 
              stroke={COLORS.series}
              strokeWidth={2}
              dot={{ fill: COLORS.series, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
