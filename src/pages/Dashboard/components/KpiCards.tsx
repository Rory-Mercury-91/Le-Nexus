import { BookOpen, CreditCard, Package } from 'lucide-react';
import { LectureStatistics, Statistics } from '../../../types';

const COLORS = {
  series: '#f97316',      // Orange pour Séries
  tomes: '#d946ef'        // Magenta pour Tomes
};

interface KpiCardsProps {
  stats: Statistics;
  lectureStats: LectureStatistics | null;
  coutTotal: number;
}

export default function KpiCards({ stats, lectureStats, coutTotal }: KpiCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '16px' }}>
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <BookOpen size={24} style={{ color: COLORS.series, margin: '0 auto 8px' }} />
        <div style={{ fontSize: '32px', fontWeight: '700', color: COLORS.series, marginBottom: '4px' }}>
          {stats.nbSeries}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Série{stats.nbSeries > 1 ? 's' : ''}
        </div>
      </div>

      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <Package size={24} style={{ color: COLORS.tomes, margin: '0 auto 8px' }} />
        <div style={{ fontSize: '32px', fontWeight: '700', color: COLORS.tomes, marginBottom: '4px' }}>
          {stats.nbTomes}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Tome{stats.nbTomes > 1 ? 's' : ''}
        </div>
      </div>

      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', margin: '0 auto 8px' }}>💰</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--warning)', marginBottom: '4px' }}>
          {coutTotal.toFixed(0)}€
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Investissement
        </div>
        {stats.totalMihon && stats.totalMihon > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '500', marginTop: '4px' }}>
            Gain Mihon : {stats.totalMihon.toFixed(0)}€
          </div>
        )}
      </div>

      {stats.nbAbonnementsActifs !== undefined && stats.nbAbonnementsActifs > 0 && (
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <CreditCard size={24} style={{ color: '#10b981', margin: '0 auto 8px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
            {stats.nbAbonnementsActifs}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Abonnement{stats.nbAbonnementsActifs > 1 ? 's' : ''} actif{stats.nbAbonnementsActifs > 1 ? 's' : ''}
          </div>
          {(() => {
            const totalAbonnements = stats.coutsAbonnementsParProprietaire 
              ? Object.values(stats.coutsAbonnementsParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) 
              : 0;
            if (totalAbonnements > 0) {
              return (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {totalAbonnements.toFixed(2)}€/mois
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {lectureStats && (lectureStats.tomesTotal > 0 || lectureStats.chapitresTotal > 0) && (
        <div className="card" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '24px', margin: '0 auto 4px' }}>📖</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
            Progression lecture
          </div>
          <div style={{ fontSize: '30px', fontWeight: '700', color: 'var(--success)' }}>
            {lectureStats.progression.toFixed(0)}%
          </div>
          {lectureStats.tomesTotal > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {lectureStats.tomesLus}/{lectureStats.tomesTotal} tomes (
              {Math.round(
                lectureStats.progressionTomes != null
                  ? lectureStats.progressionTomes
                  : (lectureStats.tomesLus / lectureStats.tomesTotal) * 100
              )}
              %)
            </div>
          )}
          {lectureStats.chapitresTotal > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {lectureStats.chapitresLus}/{lectureStats.chapitresTotal} chapitres (
              {Math.round(
                lectureStats.progressionChapitres != null
                  ? lectureStats.progressionChapitres
                  : (lectureStats.chapitresLus / lectureStats.chapitresTotal) * 100
              )}
              %)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
