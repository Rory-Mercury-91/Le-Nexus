import { BookOpen, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CardCover } from '../../../components/cards/common';
import { AdulteGame, ProgressItem, RecentProgress } from '../../../types';
import { getTmdbImageUrl } from '../../../utils/tmdb';
import { rememberScrollTarget } from '../../../hooks/common/useScrollRestoration';

interface RecentProgressSectionProps {
  recentProgress: RecentProgress | null;
  adulteGames: AdulteGame[];
  hasPassword: boolean;
}

export default function RecentProgressSection({
  recentProgress,
  adulteGames,
  hasPassword
}: RecentProgressSectionProps) {
  if (!recentProgress) {
    return null;
  }

  // Fusionner et trier par date toutes les progressions
  const allProgress: (ProgressItem | { type: 'jeu'; gameId: number; gameTitre: string; couvertureUrl?: string | null; dateProgression: string; statutPerso: string })[] = [
    ...(recentProgress.tomes || []),
    ...(recentProgress.chapitres || []),
    ...(recentProgress.episodes || []),
    ...((recentProgress.movies as ProgressItem[] | undefined) || []),
    ...((recentProgress.tvShows as ProgressItem[] | undefined) || []),
    // Ajouter les jeux adultes récents si pas de mot de passe
    ...(!hasPassword && adulteGames.length > 0
      ? adulteGames
          .filter(g => g.statut_perso && g.statut_perso !== 'À jouer' && (g.derniere_session || g.updated_at))
          .map(g => ({
            type: 'jeu' as const,
            gameId: g.id,
            gameTitre: g.titre,
            couvertureUrl: g.couverture_url,
            dateProgression: g.derniere_session || g.updated_at || new Date().toISOString(),
            statutPerso: g.statut_perso || ''
          }))
          .sort((a, b) => {
            const dateA = new Date(a.dateProgression).getTime();
            const dateB = new Date(b.dateProgression).getTime();
            return dateB - dateA;
          })
          .slice(0, 6) // Limiter à 6 jeux récents
      : [])
  ].sort((a, b) => {
    const dateA = a.dateProgression ? new Date(a.dateProgression).getTime() : 0;
    const dateB = b.dateProgression ? new Date(b.dateProgression).getTime() : 0;
    return dateB - dateA;
  });

  if (allProgress.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📖 Progression récente
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px',
        overflow: 'visible',
        position: 'relative'
      }}>
        {allProgress.slice(0, 6).map((item, index) => {
          const isEpisode = item.type === 'episode';
          const isTvShow = item.type === 'tv';
          const isMovie = item.type === 'movie';
          const isJeu = item.type === 'jeu';
          const title = isJeu
            ? (item as any).gameTitre
            : isMovie
              ? (item as any).movieTitre
              : isTvShow
                ? (item as any).showTitre
                : (item.serieTitre || item.animeTitre || '');
          const rawPosterPath = isMovie || isTvShow ? (item as any).posterPath : undefined;
          const coverUrl = isJeu
            ? (item as any).couvertureUrl
            : isMovie || isTvShow
              ? getTmdbImageUrl(rawPosterPath, 'w342') || (item.couvertureUrl || undefined)
              : (item.couvertureUrl || undefined);
          const tmdbId = isMovie || isTvShow ? (item as any).tmdbId : undefined;
          
          // Calculer la progression
          let progressLabel = '';
          
          if (item.type === 'tome') {
            progressLabel = `Tome ${item.numero}`;
          } else if (item.type === 'chapitre') {
            const chapitresLus = item.chapitresLus || 0;
            const nbChapitres = item.nbChapitres || 0;
            progressLabel = `${chapitresLus}/${nbChapitres} lu`;
          } else if (item.type === 'episode') {
            const episodesVus = item.episodesVus || 0;
            const nbEpisodes = item.nbEpisodes || 0;
            progressLabel = `${episodesVus}/${nbEpisodes} ep.`;
          } else if (item.type === 'tv') {
            const episodesVus = (item as any).episodesVus || 0;
            const nbEpisodes = (item as any).nbEpisodes || 0;
            progressLabel = nbEpisodes > 0 ? `${episodesVus}/${nbEpisodes} ep.` : `${episodesVus} ép. vus`;
          } else if (item.type === 'movie') {
            const statutVisionnage = (item as any).statutVisionnage || 'Vu';
            progressLabel = statutVisionnage === 'Terminé' ? 'Film terminé' : statutVisionnage;
          } else if (item.type === 'jeu') {
            const jeuItem = item as any;
            progressLabel = jeuItem.statutPerso || 'En cours';
          }

          const handleRememberTarget = () => {
            if (isJeu && (item as any).gameId) {
              rememberScrollTarget('collection.adulteGames.scroll', (item as any).gameId);
            } else if (isMovie && (item as any).movieId) {
              rememberScrollTarget('collection.movies.scroll', (item as any).movieId);
            } else if ((isTvShow || item.type === 'tv') && (item as any).showId) {
              rememberScrollTarget('collection.series.scroll', (item as any).showId);
            } else if ((isEpisode || item.type === 'episode') && item.animeId) {
              rememberScrollTarget('collection.animes.scroll', item.animeId);
            } else if ((item.type === 'tome' || item.type === 'chapitre') && item.serieId) {
              rememberScrollTarget('collection.mangas.scroll', item.serieId);
            }
          };

          // Trouver le jeu pour déterminer son type (RAWG ou adulte)
          const gameItem = isJeu ? adulteGames.find(g => g.id === (item as any).gameId) : null;
          const isRawgGame = gameItem?.game_site === 'RAWG';

          return (
            <Link
              key={
                isJeu
                  ? `jeu-${(item as any).gameId}-${index}`
                  : isMovie
                    ? `movie-${(item as any).movieId}-${index}`
                    : isTvShow
                      ? `tv-${(item as any).showId}-${index}`
                      : `${item.type}-${item.serieId || item.animeId}-${index}`
              }
              to={
                isJeu
                  ? (isRawgGame ? `/games/rawg/${(item as any).gameId}` : `/adulte-game/${(item as any).gameId}`)
                  : isMovie
                    ? (tmdbId ? `/movies/${tmdbId}` : '#')
                    : isTvShow
                      ? (tmdbId ? `/series/${tmdbId}` : '#')
                      : isEpisode
                        ? (item.animeId ? `/animes/${item.animeId}` : '#')
                        : `/serie/${item.serieId}`
              }
              className="card"
              style={{
                padding: '0',
                textDecoration: 'none',
                color: 'inherit',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => handleRememberTarget()}
            >
              {/* Couverture */}
              <div style={{
                width: '100%',
                aspectRatio: '2/3',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--surface)'
              }}>
                <CardCover
                  src={coverUrl}
                  alt={title}
                  fallbackIcon={
                    isJeu
                      ? <span style={{ fontSize: '48px' }}>🎮</span>
                      : isMovie
                        ? <span style={{ fontSize: '48px' }}>🎞️</span>
                        : (isEpisode || isTvShow)
                          ? <Tv size={48} />
                          : <BookOpen size={48} />
                  }
                  objectFit="cover"
                />
                
                {/* Badge type en haut à droite */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: isJeu
                    ? 'rgba(139, 92, 246, 0.95)'
                    : isMovie
                      ? 'rgba(236, 72, 153, 0.95)'
                      : (isEpisode || isTvShow)
                        ? 'rgba(99, 102, 241, 0.95)'
                        : 'rgba(236, 72, 153, 0.95)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  backdropFilter: 'blur(4px)',
                  zIndex: 2
                }}>
                  {isJeu ? '🎮' : isMovie ? '🎞️' : (isEpisode || isTvShow) ? '📺' : '📚'}
                </div>
              </div>

              {/* Contenu */}
              <div style={{ 
                padding: '10px 12px 6px 12px', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '6px',
                borderTop: '1px solid var(--border)'
              }}>
                {progressLabel && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    {progressLabel}
                  </div>
                )}
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.4'
                }}>
                  {title}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
