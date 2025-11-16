import { BookOpen, Package } from 'lucide-react';
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '16px', marginBottom: '32px' }}>
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

      <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
        <div style={{ fontSize: '24px', margin: '0 auto 8px' }}>💰</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--warning)', marginBottom: '4px' }}>
          {coutTotal.toFixed(0)}€
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Investissement
        </div>
      </div>

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
