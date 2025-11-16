import { BookOpen, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import {
    CostsByOwner,
    EvolutionChart,
    KpiCards,
    ProgressionSection,
    RecentProgressSection,
    RepartitionChart
} from './components';

export default function Dashboard() {
  const {
    stats,
    lectureStats,
    recentProgress,
    animes,
    movies,
    tvShows,
    adulteGames,
    loading,
    refreshing,
    evolutionStats,
    contentPrefs,
    hasPassword,
    handleRefresh
  } = useDashboard();

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement des statistiques...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Vérification de sécurité : si users n'existe pas, initialiser un tableau vide
  const users = stats.users || [];

  // Calculer le coût total dynamiquement
  const coutTotal = users.reduce((sum: number, user: { id: number }) => sum + (stats.totaux[user.id] || 0), 0);


  return (
    <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🏠</span>
            Tableau de bord
          </h1>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
        </div>

        <ProgressionSection
          contentPrefs={contentPrefs}
          lectureStats={lectureStats}
          animes={animes}
          movies={movies}
          tvShows={tvShows}
          adulteGames={adulteGames}
          hasPassword={hasPassword}
        />

        <RecentProgressSection
          recentProgress={recentProgress}
          adulteGames={adulteGames}
          hasPassword={hasPassword}
        />

        <KpiCards stats={stats} lectureStats={lectureStats} coutTotal={coutTotal} />

        {evolutionStats && <EvolutionChart evolutionStats={evolutionStats} />}

        <RepartitionChart stats={stats} />

        <CostsByOwner stats={stats} coutTotal={coutTotal} />

        {stats.nbSeries === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--surface)',
            borderRadius: '16px',
            marginTop: '40px'
          }}>
            <BookOpen size={64} style={{ color: 'var(--text-secondary)', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
              Aucune série pour le moment
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Commencez par ajouter vos premières séries à votre collection !
            </p>
            <Link to="/collection" className="btn btn-primary">
              <BookOpen size={20} />
              Aller à la collection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
