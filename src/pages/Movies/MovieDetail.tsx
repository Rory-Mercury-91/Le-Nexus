import { ArrowLeft, Calendar, Clapperboard, Clock, Globe2, Heart, MapPin, Settings, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackToTopButton } from '../../components/collections';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import MovieDisplaySettingsModal from '../../components/modals/common/MovieDisplaySettingsModal';
import { useToast } from '../../hooks/common/useToast';
import { MovieDetail as MovieDetailType, WatchProviderMap, WatchProviderResponse } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate, formatRuntime, formatVoteAverage, getTmdbImageUrl } from '../../utils/tmdb';

type MovieDisplayPrefs = {
  banner: boolean;
  synopsis: boolean;
  metadata: boolean;
  keywords: boolean;
  videos: boolean;
  images: boolean;
  providers: boolean;
  recommendations: boolean;
  externalLinks: boolean;
};

const movieDisplayDefaults: MovieDisplayPrefs = {
  banner: true,
  synopsis: true,
  metadata: true,
  keywords: true,
  videos: true,
  images: true,
  providers: true,
  recommendations: true,
  externalLinks: true
};

const MOVIE_STATUS_OPTIONS = COMMON_STATUSES.MOVIE;
type MovieStatus = (typeof MOVIE_STATUS_OPTIONS)[number];

export default function MovieDetail() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [movie, setMovie] = useState<MovieDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayPrefs, setDisplayPrefs] = useState<MovieDisplayPrefs>(movieDisplayDefaults);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showDisplaySettingsModal, setShowDisplaySettingsModal] = useState(false);

  const refreshDisplayPrefs = useCallback(async () => {
    try {
      const prefs = await window.electronAPI.getMovieDisplaySettings?.();
      if (prefs) {
        setDisplayPrefs({ ...movieDisplayDefaults, ...prefs });
      } else {
        setDisplayPrefs(movieDisplayDefaults);
      }
    } catch (err) {
      console.error('Erreur chargement préférences films:', err);
    }
  }, []);

  useEffect(() => {
    if (!tmdbId) {
      setError('Identifiant TMDb manquant');
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [detail, prefs] = await Promise.all([
          window.electronAPI.getMovieDetail({ tmdbId: Number(tmdbId) }),
          window.electronAPI.getMovieDisplaySettings?.()
        ]);
        if (!detail) {
          setError('Film introuvable dans votre collection');
          setMovie(null);
        } else {
          setMovie({
            ...detail,
            genres: detail.genres || [],
            langues_parlees: detail.langues_parlees || [],
            compagnies: detail.compagnies || []
          });
          if (prefs) {
            setDisplayPrefs({ ...movieDisplayDefaults, ...prefs });
          }
          setError(null);
        }
      } catch (err: any) {
        console.error('Erreur chargement film:', err);
        setError(err?.message || 'Impossible de charger les détails du film');
        setMovie(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [tmdbId]);

  const backgroundUrl = useMemo(() => {
    if (!displayPrefs.banner || !movie?.backdrop_path) return undefined;
    return getTmdbImageUrl(movie.backdrop_path, 'w780');
  }, [movie, displayPrefs.banner]);

  const posterUrl = useMemo(() => {
    if (!displayPrefs.banner || !movie?.poster_path) return undefined;
    return getTmdbImageUrl(movie.poster_path, 'w500');
  }, [movie, displayPrefs.banner]);

  const releaseDate = formatAirDate(movie?.date_sortie);
  const runtime = formatRuntime(movie?.duree);
  const score = formatVoteAverage(movie?.note_moyenne);

  const keywords = useMemo(() => {
    const keywordCollection = (movie?.mots_cles || []) as Array<{ id: number; name: string }>;
    return keywordCollection.filter(Boolean);
  }, [movie]);

  const streamingProviders = useMemo(() => {
    if (!movie?.fournisseurs) {
      return [];
    }
    const providerData = movie.fournisseurs;
    const providerMap =
      ((providerData as WatchProviderResponse).results ??
        (providerData as WatchProviderMap | undefined)) ?? undefined;

    const france = providerMap?.FR;
    if (!france) return [];

    const unique = new Map<number, { provider_id: number; provider_name: string; logo_path: string; type: string }>();
    (['flatrate', 'rent', 'buy'] as const).forEach((type) => {
      (france[type] || []).forEach((provider) => {
        unique.set(provider.provider_id, { ...provider, type });
      });
    });
    return Array.from(unique.values());
  }, [movie]);

  const videos = useMemo(() => {
    const directResults = movie?.videos?.results;
    const rawVideos = movie?.donnees_brutes?.videos as { results?: Array<{ site: string; key: string; id: string; name?: string; type?: string }> } | undefined;
    const list = directResults || rawVideos?.results || [];
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((video) => video.site === 'YouTube' || video.site === 'Vimeo');
  }, [movie]);

  const backdrops = useMemo(() => {
    const directBackdrops = movie?.images?.backdrops;
    const rawImages = movie?.donnees_brutes?.images as { backdrops?: Array<{ file_path: string; iso_639_1?: string }> } | undefined;
    const list = directBackdrops || rawImages?.backdrops || [];
    if (!Array.isArray(list)) {
      return [];
    }
    return list.slice(0, 8);
  }, [movie]);

  const recommendations = useMemo(() => {
    const rawRecommendations = movie?.donnees_brutes?.recommendations as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string }> } | undefined;
    const rawSimilar = movie?.donnees_brutes?.similar as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string }> } | undefined;
    const recs = rawRecommendations?.results || rawSimilar?.results || [];
    if (!Array.isArray(recs)) {
      return [];
    }
    return recs.slice(0, 8).filter((item) => item && item.id);
  }, [movie]);

  const handleStatusChange = useCallback(
    async (newStatus: MovieStatus) => {
      if (!movie || updatingStatus || movie.statut_visionnage === newStatus) {
        return;
      }

      try {
        setUpdatingStatus(true);
        const result = await window.electronAPI.setMovieStatus({
          movieId: movie.id,
          statut: newStatus
        });

        if (result?.success) {
          setMovie((prev) => (prev ? { ...prev, statut_visionnage: result.statut || newStatus } : prev));
          showToast({
            title: 'Statut mis à jour',
            message: `Le film est maintenant marqué comme « ${result?.statut || newStatus} ».`,
            type: 'success'
          });
        }
      } catch (err: any) {
        console.error('Erreur changement statut film:', err);
        showToast({
          title: 'Erreur',
          message: err?.message || 'Impossible de mettre à jour le statut.',
          type: 'error'
        });
      } finally {
        setUpdatingStatus(false);
      }
    },
    [movie, showToast, updatingStatus]
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!movie || togglingFavorite) {
      return;
    }

    try {
      setTogglingFavorite(true);
      const result = await window.electronAPI.toggleMovieFavorite(movie.id);
      if (result?.success) {
        setMovie((prev) => (prev ? { ...prev, is_favorite: result.isFavorite } : prev));
        showToast({
          title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
          message: result.isFavorite
            ? 'Ce film apparaît désormais dans vos favoris.'
            : 'Ce film ne fait plus partie de vos favoris.',
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Erreur bascule favori film:', err);
      showToast({
        title: 'Erreur',
        message: err?.message || 'Impossible de mettre à jour le favori.',
        type: 'error'
      });
    } finally {
      setTogglingFavorite(false);
    }
  }, [movie, showToast, togglingFavorite]);

  const handleOpenDisplaySettings = useCallback(() => {
    setShowDisplaySettingsModal(true);
  }, []);

  const handleCloseDisplaySettings = useCallback(async () => {
    setShowDisplaySettingsModal(false);
    await refreshDisplayPrefs();
  }, [refreshDisplayPrefs]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement du film...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{error || 'Film introuvable'}</p>
        <button
          className="btn btn-outline"
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <DetailPageHeader backLabel="Retour aux films" backTo="/movies" />
      <div className="fade-in" style={{ minHeight: '100vh', paddingBottom: '80px', paddingTop: '110px' }}>
        <div
          style={{
            position: 'relative',
            height: '420px',
            background: backgroundUrl ? `linear-gradient(90deg, rgba(8, 12, 24, 0.92) 0%, rgba(8, 12, 24, 0.4) 60%), url(${backgroundUrl}) center/cover`
              : 'linear-gradient(135deg, #111826 0%, #1f2937 100%)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(8,12,24,0.85) 0%, rgba(8,12,24,0.95) 60%, #080c18 100%)'
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              gap: '32px',
              padding: '40px 60px'
            }}
          >
            {displayPrefs.banner && (
              <div
                style={{
                  width: '220px',
                  flexShrink: 0,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 18px 30px rgba(0,0,0,0.35)',
                  background: 'rgba(0,0,0,0.25)'
                }}
              >
                {posterUrl ? (
                  <img src={posterUrl} alt={movie.titre} style={{ width: '100%', display: 'block' }} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '320px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '14px',
                      padding: '16px',
                      textAlign: 'center'
                    }}
                  >
                    Pas d&apos;image
                  </div>
                )}
              </div>
            )}

            <div style={{ color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div>
                <h1 style={{ fontSize: '34px', fontWeight: 800, margin: 0 }}>
                  {movie.titre}
                </h1>
                {movie.titre_original && movie.titre_original !== movie.titre && (
                  <p style={{ margin: '6px 0 0 0', opacity: 0.75, fontSize: '15px' }}>
                    {movie.titre_original}
                  </p>
                )}
                {movie.tagline && (
                  <p style={{ margin: '12px 0 0 0', fontStyle: 'italic', opacity: 0.8 }}>
                    « {movie.tagline} »
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  fontSize: '14px'
                }}
              >
                {score && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#34d399',
                      borderRadius: '999px',
                      padding: '8px 14px',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <Star size={16} />
                    {score} / 10
                  </span>
                )}
                {releaseDate && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: 0.85
                    }}
                  >
                    <Calendar size={16} />
                    {releaseDate}
                  </span>
                )}
                {runtime && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
                    <Clock size={16} />
                    {runtime}
                  </span>
                )}
                {movie.statut && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
                    <Clapperboard size={16} />
                    {movie.statut}
                  </span>
                )}
              </div>

              {movie.genres && movie.genres.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      style={{
                        fontSize: '13px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#bfdbfe'
                      }}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '40px 60px', marginTop: '-40px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '40px',
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '18px 24px'
            }}
          >
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Statut de visionnage</span>
                <select
                  className="select"
                  value={movie.statut_visionnage || 'À regarder'}
                  onChange={(e) => handleStatusChange(e.target.value as MovieStatus)}
                  disabled={updatingStatus}
                  style={{ minWidth: '200px' }}
                >
                  {MOVIE_STATUS_OPTIONS.map((option) => {
                    const label = formatStatusLabel(option, { category: 'movie' });
                    return (
                      <option key={option} value={option}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={togglingFavorite}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  background: movie.is_favorite ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                  color: movie.is_favorite ? '#ffffff' : '#ef4444',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: movie.is_favorite ? '0 3px 10px rgba(0, 0, 0, 0.35)' : 'none',
                  cursor: togglingFavorite ? 'progress' : 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '200px',
                  opacity: togglingFavorite ? 0.85 : 1
                }}
                onMouseEnter={(e) => {
                  if (!movie.is_favorite && !togglingFavorite) {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!movie.is_favorite && !togglingFavorite) {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <Heart size={16} fill={movie.is_favorite ? '#ffffff' : '#ef4444'} />
                <span>{movie.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleOpenDisplaySettings}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              Personnaliser l’affichage
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
              gap: '32px',
              alignItems: 'flex-start'
            }}
          >
            {(displayPrefs.synopsis || (displayPrefs.keywords && keywords.length > 0)) && (
              <section
                style={{
                  background: 'var(--surface)',
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {displayPrefs.synopsis && (
                  <>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Synopsis</h2>
                    <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      {movie.synopsis || 'Aucun synopsis disponible.'}
                    </p>
                  </>
                )}

                {displayPrefs.keywords && keywords.length > 0 && (
                  <>
                    <h3 style={{ margin: '16px 0 0', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                      Mots-clés
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {keywords.map((keyword) => (
                        <span
                          key={keyword.id}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {keyword.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {displayPrefs.videos && videos.length > 0 && (
              <section
                style={{
                  background: 'var(--surface)',
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Bandes-annonces & vidéos</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {videos.slice(0, 6).map((video) => (
                    <button
                      key={video.id}
                      className="btn btn-outline"
                      onClick={() => window.electronAPI.openExternal?.(video.site === 'YouTube'
                        ? `https://www.youtube.com/watch?v=${video.key}`
                        : `https://vimeo.com/${video.key}`)}
                      style={{
                        justifyContent: 'flex-start',
                        minWidth: '220px',
                        padding: '10px 14px',
                        borderRadius: '10px'
                      }}
                    >
                      {video.name || video.type}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {displayPrefs.images && backdrops.length > 0 && (
              <section
                style={{
                  background: 'var(--surface)',
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Galerie</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {backdrops.map((image) => (
                    <div
                      key={`${image.file_path}-${image.iso_639_1 || 'default'}`}
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        cursor: 'zoom-in'
                      }}
                      onClick={() => {
                        const full = getTmdbImageUrl(image.file_path, 'original');
                        if (full) {
                          window.electronAPI.openExternal?.(full);
                        }
                      }}
                    >
                      <img
                        src={getTmdbImageUrl(image.file_path, 'w342')}
                        alt={image.iso_639_1 || 'Backdrop'}
                        style={{ width: '100%', display: 'block' }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {displayPrefs.recommendations && recommendations.length > 0 && (
              <section
                style={{
                  background: 'var(--surface)',
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Recommandations TMDb</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onClick={() => window.electronAPI.openExternal?.(`https://www.themoviedb.org/movie/${rec.id}`)}
                    >
                      {rec.poster_path ? (
                        <img
                          src={getTmdbImageUrl(rec.poster_path, 'w185')}
                          alt={rec.title || rec.name}
                          style={{ width: '100%', display: 'block' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            paddingBottom: '150%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Pas d&apos;image
                        </div>
                      )}
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text)' }}>
                        {rec.title || rec.name}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <aside
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              {displayPrefs.metadata && (
                <div
                  style={{
                    background: 'var(--surface)',
                    borderRadius: '18px',
                    border: '1px solid var(--border)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Informations</h3>
                  <InfoLine icon={<MapPin size={16} />} label="Pays">
                    {movie.pays_production?.map((p) => p.name).join(', ') || 'Inconnu'}
                  </InfoLine>
                  <InfoLine icon={<Globe2 size={16} />} label="Langues">
                    {movie.langues_parlees?.map((l) => l.name || l.english_name).join(', ') || 'Inconnues'}
                  </InfoLine>
                  <InfoLine icon={<Clapperboard size={16} />} label="Studios">
                    {movie.compagnies?.map((c: { id: number; name: string; logo_path: string | null; origin_country: string }) => c.name).join(', ') || 'Non renseigné'}
                  </InfoLine>
                </div>
              )}

              {displayPrefs.providers && streamingProviders.length > 0 && (
                <div
                  style={{
                    background: 'var(--surface)',
                    borderRadius: '18px',
                    border: '1px solid var(--border)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                    Disponibilité (France)
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {streamingProviders.map((provider) => (
                      <span
                        key={provider.provider_id}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          borderRadius: '999px',
                          background: 'rgba(var(--primary-rgb), 0.12)',
                          border: '1px solid rgba(var(--primary-rgb), 0.25)',
                          color: 'var(--text)'
                        }}
                      >
                        {provider.provider_name} <small style={{ opacity: 0.7 }}>({provider.type})</small>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {displayPrefs.externalLinks && (
                <div
                  style={{
                    background: 'var(--surface)',
                    borderRadius: '18px',
                    border: '1px solid var(--border)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Liens externes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {movie.ids_externes?.imdb_id && (
                      <ExternalLinkButton
                        href={`https://www.imdb.com/title/${movie.ids_externes.imdb_id}`}
                        label="Voir sur IMDb"
                      />
                    )}
                    {movie.site_officiel && (
                      <ExternalLinkButton href={movie.site_officiel} label="Site officiel" />
                    )}
                    {!movie.ids_externes?.imdb_id && !movie.site_officiel && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Aucun lien externe disponible.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
        {showDisplaySettingsModal && (
          <MovieDisplaySettingsModal onClose={handleCloseDisplaySettings} showToast={showToast} />
        )}
        <BackToTopButton />
      </div>
    </>
  );
}

interface InfoLineProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function InfoLine({ icon, label, children }: InfoLineProps) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px' }}>
      <span style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{children}</span>
      </div>
    </div>
  );
}

interface ExternalLinkButtonProps {
  href: string;
  label: string;
}

function ExternalLinkButton({ href, label }: ExternalLinkButtonProps) {
  return (
    <button
      onClick={() => window.electronAPI.openExternal?.(href)}
      className="btn btn-outline"
      style={{
        justifyContent: 'flex-start',
        padding: '10px 14px',
        fontSize: '13px',
        color: 'var(--text)',
        borderRadius: '10px'
      }}
    >
      {label}
    </button>
  );
}
