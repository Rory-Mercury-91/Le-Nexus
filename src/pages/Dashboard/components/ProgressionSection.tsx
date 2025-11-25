import { AdulteGame, AnimeSerie, ContentPreferences, LectureStatistics, MovieListItem, TvShowListItem } from '../../../types';

interface ProgressionSectionProps {
  contentPrefs: ContentPreferences;
  lectureStats: LectureStatistics | null;
  animes: AnimeSerie[];
  movies: MovieListItem[];
  tvShows: TvShowListItem[];
  adulteGames: AdulteGame[];
  hasPassword: boolean;
}

export default function ProgressionSection({
  contentPrefs,
  lectureStats,
  animes,
  movies,
  tvShows,
  adulteGames,
  hasPassword
}: ProgressionSectionProps) {
  // Vérifier si la section doit être affichée
  if (
    !(
      (contentPrefs.showMangas && lectureStats && (lectureStats.tomesTotal > 0 || lectureStats.chapitresTotal > 0)) ||
      (contentPrefs.showAnimes && animes.length > 0) ||
      (contentPrefs.showMovies && movies.length > 0) ||
      (contentPrefs.showSeries && tvShows.length > 0) ||
      (!hasPassword && contentPrefs.showAdulteGame && adulteGames.length > 0)
    )
  ) {
    return null;
  }

  return (
    <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📊 Progression
      </h2>
      
      {/* Progression Lectures */}
      {contentPrefs.showMangas && lectureStats && (lectureStats.tomesTotal > 0 || lectureStats.chapitresTotal > 0) && (
        <div style={{ marginBottom: '16px' }}>
          {(() => {
            const hasTomes = lectureStats.tomesTotal > 0;
            const hasChapitres = lectureStats.chapitresTotal > 0;
            const progressionTomes = hasTomes
              ? Math.round(
                  lectureStats.progressionTomes != null
                    ? lectureStats.progressionTomes
                    : (lectureStats.tomesLus / lectureStats.tomesTotal) * 100
                )
              : null;
            const progressionChapitres = hasChapitres
              ? Math.round(
                  lectureStats.progressionChapitres != null
                    ? lectureStats.progressionChapitres
                    : (lectureStats.chapitresLus / lectureStats.chapitresTotal) * 100
                )
              : null;

            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📚</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Lectures :</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {hasTomes && (
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                      {lectureStats.tomesLus}/{lectureStats.tomesTotal} tomes ({progressionTomes ?? 0}%)
                    </span>
                  )}
                  {hasTomes && hasChapitres && <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>}
                  {hasChapitres && (
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>
                      {lectureStats.chapitresLus}/{lectureStats.chapitresTotal} chapitres ({progressionChapitres ?? 0}%)
                    </span>
                  )}
                  {(hasTomes || hasChapitres) && <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>}
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>
                    {lectureStats.seriesCompletes}/{lectureStats.seriesTotal} séries
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>
                    {lectureStats.progression.toFixed(0)}% (global)
                  </span>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lectureStats.tomesTotal > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Progression tomes
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--surface)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: `${Math.min(
                      100,
                      lectureStats.progressionTomes != null
                        ? lectureStats.progressionTomes
                        : (lectureStats.tomesLus / lectureStats.tomesTotal) * 100
                    )}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}

            {lectureStats.chapitresTotal > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Progression chapitres
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--surface)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: `${Math.min(
                      100,
                      lectureStats.progressionChapitres != null
                        ? lectureStats.progressionChapitres
                        : (lectureStats.chapitresLus / lectureStats.chapitresTotal) * 100
                    )}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Progression globale
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--surface)',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  width: `${lectureStats.progression}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progression Animes */}
      {contentPrefs.showAnimes && animes.length > 0 && (() => {
        const episodesVus = animes.reduce((acc, a) => acc + (a.episodes_vus || 0), 0);
        const episodesTotal = animes.reduce((acc, a) => acc + (a.nb_episodes || 0), 0);
        const animesAvecProgression = animes.filter(a => (a.episodes_vus || 0) > 0).length;
        const animesTotal = animes.length;
        const progression = episodesTotal > 0 ? (episodesVus / episodesTotal) * 100 : 0;

        return (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🎬</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Animes :</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                  {episodesVus}/{episodesTotal} ép.
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                  {animesAvecProgression}/{animesTotal} séries
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>
                  {progression.toFixed(0)}%
                </span>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: `${progression}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        );
      })()}

      {/* Progression Films */}
      {contentPrefs.showMovies && movies.length > 0 && (() => {
        const totalFilms = movies.length;
        const filmsEnCours = movies.filter((movie) => movie.statut_visionnage === 'En cours').length;
        const filmsTermines = movies.filter((movie) => movie.statut_visionnage === 'Terminé').length;
        const filmsVus = movies.filter(
          (movie) =>
            movie.statut_visionnage === 'Terminé' ||
            movie.statut_visionnage === 'En cours' ||
            movie.statut_visionnage === 'En pause' ||
            movie.date_visionnage
        ).length;
        const progression = totalFilms > 0 ? (filmsVus / totalFilms) * 100 : 0;

        return (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🎞️</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Films :</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>
                  {filmsEnCours}/{totalFilms} en cours
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                  {filmsTermines} terminés
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#eab308' }}>
                  {filmsVus}/{totalFilms} vus
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>
                  {progression.toFixed(0)}%
                </span>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: `${Math.min(100, progression)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(244, 114, 182, 1), rgba(192, 38, 211, 1))',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        );
      })()}

      {/* Progression Séries TV */}
      {contentPrefs.showSeries && tvShows.length > 0 && (() => {
        const seriesTotal = tvShows.length;
        const seriesEnCours = tvShows.filter((show) => show.statut_visionnage === 'En cours').length;
        const seriesTerminees = tvShows.filter((show) => show.statut_visionnage === 'Terminé').length;
        const episodesVus = tvShows.reduce((acc, show) => acc + (show.episodes_vus || 0), 0);
        const episodesTotal = tvShows.reduce((acc, show) => acc + (show.nb_episodes || 0), 0);
        const progression = episodesTotal > 0 ? (episodesVus / episodesTotal) * 100 : 0;

        return (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📺</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Séries :</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>
                  {seriesEnCours}/{seriesTotal} en cours
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                  {seriesTerminees} terminées
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#eab308' }}>
                  {episodesVus}/{episodesTotal} épisodes vus
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>
                  {progression.toFixed(0)}%
                </span>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: `${Math.min(100, progression)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 1), rgba(99, 102, 241, 1))',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        );
      })()}

      {/* Progression Jeux adulte (conditionnelle si pas de mot de passe) */}
      {!hasPassword && contentPrefs.showAdulteGame && adulteGames.length > 0 && (() => {
        const jeuxJoues = adulteGames.filter(g => g.statut_perso && g.statut_perso !== 'À lire').length;
        const jeuxTotal = adulteGames.length;
        const progression = jeuxTotal > 0 ? (jeuxJoues / jeuxTotal) * 100 : 0;

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🎮</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Jeux adulte :</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#eab308' }}>
                  {jeuxJoues}/{jeuxTotal} jeux joués
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6' }}>
                  {progression.toFixed(0)}%
                </span>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: `${progression}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
