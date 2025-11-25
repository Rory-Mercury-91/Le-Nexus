import { RefreshCw } from 'lucide-react';
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

        {/* Section d'ajout pour collections vides */}
        {(() => {
          const emptyCollections = [];

          // Vérifier chaque type de contenu selon les préférences
          if (contentPrefs.showMangas && stats.nbSeries === 0) {
            emptyCollections.push({
              icon: '📚',
              label: 'Ajoute ta première lecture',
              route: '/collection',
              color: '#f59e0b'
            });
          }

          if (contentPrefs.showAnimes && animes.length === 0) {
            emptyCollections.push({
              icon: '🎬',
              label: 'Ajoute ton premier animé',
              route: '/animes',
              color: '#3b82f6'
            });
          }

          if (contentPrefs.showMovies && movies.length === 0) {
            emptyCollections.push({
              icon: '🎞️',
              label: 'Ajoute ton premier film',
              route: '/movies',
              color: '#22c55e'
            });
          }

          if (contentPrefs.showSeries && tvShows.length === 0) {
            emptyCollections.push({
              icon: '📺',
              label: 'Ajoute ta première série',
              route: '/series',
              color: '#6366f1'
            });
          }

          if (contentPrefs.showAdulteGame && adulteGames.length === 0) {
            emptyCollections.push({
              icon: '🎮',
              label: 'Ajoute ton premier jeu adulte',
              route: '/adulte-game',
              color: '#ec4899'
            });
          }

          if (emptyCollections.length === 0) {
            return null;
          }

          return (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--surface)',
              borderRadius: '16px'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Commencez votre collection
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                Ajoutez vos premiers contenus à votre collection !
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {emptyCollections.map((collection, index) => (
                  <Link
                    key={index}
                    to={collection.route}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: '200px',
                      justifyContent: 'center',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      background: 'var(--surface-light)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.borderColor = collection.color;
                      e.currentTarget.style.color = collection.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.15)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-light)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{collection.icon}</span>
                    {collection.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
