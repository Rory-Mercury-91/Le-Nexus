import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Statistics } from '../../../types';

const COLORS = {
  series: '#f97316',      // Orange pour Séries
  tomes: '#d946ef'        // Magenta pour Tomes
};

const FILTER_OPTIONS = [
  { value: 'global', label: '🌐 Global' },
  { value: 'mangas', label: '📖 Mangas' },
  { value: 'bd', label: '📚 BD' },
  { value: 'comics', label: '💥 Comics' },
  { value: 'livres', label: '📗 Livres' },
  { value: 'jeux-videos', label: '🎮 Jeux vidéo' },
  { value: 'jeux-adultes', label: '🔞 Jeux adultes' },
  { value: 'abonnements', label: '💳 Abonnements' },
  { value: 'achats-ponctuels', label: '🛒 Achats ponctuels' }
];

interface RepartitionChartProps {
  stats: Statistics;
}

export default function RepartitionChart({ stats }: RepartitionChartProps) {
  const [showRepartition, setShowRepartition] = useState(false);
  const [filtrePage, setFiltrePage] = useState<string>('global');

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

        {/* Dropdown pour filtrer par page */}
        {showRepartition && (
          <select
            value={filtrePage}
            onChange={(e) => setFiltrePage(e.target.value)}
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
            {FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
      </div>

      {showRepartition && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={users.map(user => {
                // Calculer le nombre d'items et le coût selon le filtre
                let nbItems = 0;
                let cout = 0;

                if (filtrePage === 'global') {
                  // Global : tous les coûts
                  cout = stats.totaux[user.id] || 0;
                  // Compter tous les items (incluant abonnements et achats ponctuels)
                  nbItems = (stats.nbTomesParProprietaire?.[user.id] || 0) +
                    (stats.nbLivresParProprietaire?.[user.id] || 0) +
                    (stats.nbJeuxParProprietaire?.[user.id] || 0) +
                    ((stats.coutsAbonnementsParProprietaire?.[user.id] || 0) > 0 ? 1 : 0) +
                    ((stats.coutsAchatsPonctuelsParProprietaire?.[user.id] || 0) > 0 ? 1 : 0);
                } else if (filtrePage === 'mangas') {
                  nbItems = stats.nbMangasParProprietaire?.[user.id] || 0;
                  cout = stats.coutsMangasParProprietaire?.[user.id] || 0;
                } else if (filtrePage === 'bd') {
                  nbItems = stats.nbBdParProprietaire?.[user.id] || 0;
                  cout = stats.coutsBdParProprietaire?.[user.id] || 0;
                } else if (filtrePage === 'comics') {
                  nbItems = stats.nbComicsParProprietaire?.[user.id] || 0;
                  cout = stats.coutsComicsParProprietaire?.[user.id] || 0;
                } else if (filtrePage === 'livres') {
                  nbItems = stats.nbLivresParProprietaire?.[user.id] || 0;
                  cout = stats.coutsLivresParProprietaire?.[user.id] || 0;
                } else if (filtrePage === 'jeux-videos') {
                  nbItems = stats.nbJeuxVideosParProprietaire?.[user.id] || 0;
                  cout = stats.coutsJeuxVideosParProprietaire?.[user.id] || 0;
                } else if (filtrePage === 'jeux-adultes') {
                  nbItems = stats.nbJeuxAdultesParProprietaire?.[user.id] || 0;
                  cout = stats.coutsJeuxAdultesParProprietaire?.[user.id] || 0;
                } else if (filtrePage === 'abonnements') {
                  // Pour les abonnements, on affiche le coût mensuel (pas de nombre d'items)
                  cout = stats.coutsAbonnementsParProprietaire?.[user.id] || 0;
                  nbItems = cout > 0 ? 1 : 0; // On met 1 pour avoir une barre visible
                } else if (filtrePage === 'achats-ponctuels') {
                  // Pour les achats ponctuels, on affiche le coût total
                  cout = stats.coutsAchatsPonctuelsParProprietaire?.[user.id] || 0;
                  nbItems = cout > 0 ? 1 : 0; // On met 1 pour avoir une barre visible
                }

                return {
                  name: user.name,
                  items: nbItems,
                  cout: Math.max(0, cout) // S'assurer que le coût n'est pas négatif
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
                label={{ value: 'Items', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)', fontSize: '12px' } }}
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
                  if (name === 'items') {
                    const filterLabel = FILTER_OPTIONS.find(opt => opt.value === filtrePage)?.label || filtrePage;
                    if (filtrePage === 'abonnements' || filtrePage === 'achats-ponctuels') {
                      // Pour les abonnements et achats ponctuels, on n'affiche pas le nombre d'items
                      return [null, null];
                    }
                    return [`${value} item${Number(value) > 1 ? 's' : ''}`, filterLabel];
                  } else {
                    if (filtrePage === 'abonnements') {
                      return [`${Number(value).toFixed(2)}€/mois`, 'Coût mensuel'];
                    }
                    return [`${Number(value).toFixed(2)}€`, 'Coût'];
                  }
                }}
              />
              {/* Barre des items (filtrée) */}
              <Bar
                yAxisId="left"
                dataKey="items"
                fill={COLORS.tomes}
                radius={[8, 8, 0, 0]}
              />
              {/* Barre du coût (filtrée) */}
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
              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                {FILTER_OPTIONS.find(opt => opt.value === filtrePage)?.label || filtrePage}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.series }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Coût</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
