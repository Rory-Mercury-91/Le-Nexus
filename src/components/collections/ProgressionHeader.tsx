import React from 'react';

export interface ProgressionStats {
  // Manga
  seriesEnCours?: number;
  seriesTerminees?: number;
  tomesLus?: number;
  tomesTotal?: number;
  chapitresLus?: number;
  chapitresTotal?: number;
  progressionTomes?: number | null;
  progressionChapitres?: number | null;

  // Anime
  animesEnCours?: number;
  animesTermines?: number;
  episodesVus?: number;
  episodesTotal?: number;

  // JEUX ADULTES
  jeuxEnCours?: number;
  jeuxEnCoursTraduits?: number;
  jeuxTermines?: number;
  jeuxTerminesTraduits?: number;
  jeuxJoues?: number;
  jeuxTotal?: number;

  // Films
  filmsEnCours?: number;
  filmsTermines?: number;
  filmsVus?: number;
  filmsTotal?: number;

  // Séries TV
  seriesTvEnCours?: number;
  seriesTvTerminees?: number;
  seriesTvTotal?: number;
  episodesVusSeries?: number;
  episodesTotalSeries?: number;
}

interface ProgressionHeaderProps {
  type: 'manga' | 'anime' | 'adulte-game' | 'movie' | 'series';
  stats: ProgressionStats;
}

const ProgressionHeader: React.FC<ProgressionHeaderProps> = ({ type, stats }) => {
  const getProgressionText = () => {
    if (type === 'manga') {
      const hasTomes = (stats.tomesTotal ?? 0) > 0;
      const hasChapitres = (stats.chapitresTotal ?? 0) > 0;

      const tomePercent = hasTomes
        ? Math.round(
            stats.progressionTomes != null
              ? stats.progressionTomes
              : ((stats.tomesLus || 0) / (stats.tomesTotal || 1)) * 100
          )
        : null;
      const chapitrePercent = hasChapitres
        ? Math.round(
            stats.progressionChapitres != null
              ? stats.progressionChapitres
              : ((stats.chapitresLus || 0) / (stats.chapitresTotal || 1)) * 100
          )
        : null;

      const percentSources = [tomePercent, chapitrePercent].filter(v => typeof v === 'number');
      const pourcentage = percentSources.length > 0
        ? Math.round(percentSources.reduce((sum, value) => sum + (value || 0), 0) / percentSources.length)
        : 0;

      return (
        <>
          <span style={{ fontWeight: '600' }}>📚 Mangas :</span>
          <span style={{ color: '#3b82f6' }}>{stats.seriesEnCours || 0} séries en cours</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#10b981' }}>{stats.seriesTerminees || 0} séries terminées</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          {hasTomes && (
            <>
              <span style={{ color: '#eab308' }}>
                {stats.tomesLus || 0}/{stats.tomesTotal || 0} tomes ({tomePercent ?? 0}%)
              </span>
              {hasChapitres && <span style={{ color: 'var(--text-secondary)' }}> | </span>}
            </>
          )}
          {hasChapitres && (
            <span style={{ color: '#f59e0b' }}>
              {stats.chapitresLus || 0}/{stats.chapitresTotal || 0} chapitres ({chapitrePercent ?? 0}%)
            </span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{pourcentage}%</span>
        </>
      );
    }

    if (type === 'anime') {
      const pourcentage = stats.episodesTotal
        ? Math.round((stats.episodesVus! / stats.episodesTotal) * 100)
        : 0;

      return (
        <>
          <span style={{ fontWeight: '600' }}>🎬 Animes :</span>
          <span style={{ color: '#3b82f6' }}>{stats.animesEnCours || 0} animés en cours</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#10b981' }}>{stats.animesTermines || 0} animés terminés</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#eab308' }}>
            {stats.episodesVus || 0}/{stats.episodesTotal || 0} épisodes vus
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{pourcentage}%</span>
        </>
      );
    }

    if (type === 'adulte-game') {
      const pourcentage = stats.jeuxTotal
        ? Math.round((stats.jeuxJoues! / stats.jeuxTotal) * 100)
        : 0;

      return (
        <>
          <span style={{ fontWeight: '600' }}>🎮 Jeux adulte :</span>
          <span style={{ color: '#3b82f6' }}>
            {stats.jeuxEnCours || 0} jeux en cours
            {stats.jeuxEnCoursTraduits ? (
              <span> ({stats.jeuxEnCoursTraduits} traduits)</span>
            ) : null}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#10b981' }}>
            {stats.jeuxTermines || 0} jeux terminés
            {stats.jeuxTerminesTraduits ? (
              <span> ({stats.jeuxTerminesTraduits} traduits)</span>
            ) : null}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#eab308' }}>
            {stats.jeuxJoues || 0}/{stats.jeuxTotal || 0} jeux joués
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{pourcentage}%</span>
        </>
      );
    }

    if (type === 'movie') {
      const total = stats.filmsTotal ?? 0;
      const vus = stats.filmsVus ?? stats.filmsTermines ?? 0;
      const pourcentage = total > 0 ? Math.round((vus / total) * 100) : 0;

      return (
        <>
          <span style={{ fontWeight: '600' }}>🎞️ Films :</span>
          <span style={{ color: '#3b82f6' }}>{stats.filmsEnCours || 0} films en cours</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#10b981' }}>{stats.filmsTermines || 0} films terminés</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#eab308' }}>
            {vus}/{total} films vus
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{pourcentage}%</span>
        </>
      );
    }

    if (type === 'series') {
      const episodesVus = stats.episodesVusSeries ?? 0;
      const episodesTotal = stats.episodesTotalSeries ?? 0;
      const pourcentage = episodesTotal > 0 ? Math.round((episodesVus / episodesTotal) * 100) : 0;

      return (
        <>
          <span style={{ fontWeight: '600' }}>📺 Séries :</span>
          <span style={{ color: '#3b82f6' }}>{stats.seriesTvEnCours || 0} séries en cours</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#10b981' }}>{stats.seriesTvTerminees || 0} séries terminées</span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ color: '#eab308' }}>
            {episodesVus}/{episodesTotal} épisodes vus
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> | </span>
          <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{pourcentage}%</span>
        </>
      );
    }

    return null;
  };

  return (
    <div className="card" style={{ 
      padding: '20px 24px', 
      marginBottom: '24px',
      textAlign: 'center'
    }}>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '12px', 
        fontSize: '16px', 
        color: 'var(--text)'
      }}>
        {getProgressionText()}
      </div>
    </div>
  );
};

export default ProgressionHeader;
