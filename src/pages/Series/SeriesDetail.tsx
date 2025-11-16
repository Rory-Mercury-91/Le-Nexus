import { ArrowLeft, Calendar, Check, ChevronDown, Heart, Layers, MapPin, Play, Settings, Star } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackToTopButton } from '../../components/collections';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import SeriesDisplaySettingsModal from '../../components/modals/common/SeriesDisplaySettingsModal';
import { useToast } from '../../hooks/common/useToast';
import { TvEpisode, TvShowDetail, WatchProviderMap, WatchProviderResponse } from '../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { formatAirDate, formatVoteAverage, getTmdbImageUrl } from '../../utils/tmdb';
import SeriesProgressSection from './components/SeriesProgressSection';

type SeriesDisplayPrefs = {
  banner: boolean;
  synopsis: boolean;
  nextEpisode: boolean;
  metadata: boolean;
  seasons: boolean;
  episodes: boolean;
  streaming: boolean;
  externalLinks: boolean;
};

const seriesDisplayDefaults: SeriesDisplayPrefs = {
  banner: true,
  synopsis: true,
  nextEpisode: true,
  metadata: true,
  seasons: true,
  episodes: true,
  streaming: true,
  externalLinks: true
};

const SERIES_STATUS_OPTIONS = COMMON_STATUSES.SERIES;
type SeriesStatus = (typeof SERIES_STATUS_OPTIONS)[number];

interface SeasonGroup {
  seasonNumber: number;
  title: string;
  poster?: string | null;
  synopsis?: string | null;
  airDate?: string | null;
  episodes: TvEpisode[];
}

export default function SeriesDetail() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [show, setShow] = useState<TvShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayPrefs, setDisplayPrefs] = useState<SeriesDisplayPrefs>(seriesDisplayDefaults);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showDisplaySettingsModal, setShowDisplaySettingsModal] = useState(false);
  const [markingEpisodeId, setMarkingEpisodeId] = useState<number | null>(null);
  const [markingAllEpisodes, setMarkingAllEpisodes] = useState(false);

  const refreshDisplayPrefs = useCallback(async () => {
    try {
      const prefs = await window.electronAPI.getSeriesDisplaySettings?.();
      if (prefs) {
        setDisplayPrefs({ ...seriesDisplayDefaults, ...prefs });
      } else {
        setDisplayPrefs(seriesDisplayDefaults);
      }
    } catch (err) {
      console.error('Erreur chargement préférences séries:', err);
    }
  }, []);

  const loadShow = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;

      if (!tmdbId) {
        setError('Identifiant TMDb manquant');
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        const [detail, prefs] = await Promise.all([
          window.electronAPI.getTvShowDetail({ tmdbId: Number(tmdbId) }),
          window.electronAPI.getSeriesDisplaySettings?.()
        ]);
        if (!detail) {
          setError('Série introuvable dans votre collection');
          setShow(null);
        } else {
          setShow({
            ...detail,
            genres: detail.genres || [],
            mots_cles: detail.mots_cles || [],
            seasons: detail.seasons || [],
            episodes: detail.episodes || []
          });
          if (prefs) {
            setDisplayPrefs({ ...seriesDisplayDefaults, ...prefs });
          }
          setError(null);
        }
      } catch (err: any) {
        console.error('Erreur chargement série:', err);
        setError(err?.message || 'Impossible de charger les détails de la série');
        setShow(null);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [tmdbId]
  );

  useEffect(() => {
    loadShow();
  }, [loadShow]);

  const backgroundUrl = useMemo(() => {
    if (!displayPrefs.banner || !show?.backdrop_path) return undefined;
    return getTmdbImageUrl(show.backdrop_path, 'w780');
  }, [show, displayPrefs.banner]);

  const posterUrl = useMemo(() => {
    if (!displayPrefs.banner || !show?.poster_path) return undefined;
    return getTmdbImageUrl(show.poster_path, 'w500');
  }, [show, displayPrefs.banner]);

  const score = formatVoteAverage(show?.note_moyenne);
  const firstAirDate = formatAirDate(show?.date_premiere);

  const groupedSeasons = useMemo<SeasonGroup[]>(() => {
    if (!show) return [];
    const seasonMap = new Map<number, SeasonGroup>();

    show.seasons?.forEach((season) => {
      seasonMap.set(season.numero, {
        seasonNumber: season.numero,
        title: season.titre || `Saison ${season.numero}`,
        poster: season.poster_path,
        synopsis: season.synopsis,
        airDate: season.date_premiere,
        episodes: []
      });
    });

    show.episodes?.forEach((episode) => {
      const group = seasonMap.get(episode.saison_numero);
      if (group) {
        group.episodes.push(episode);
      } else {
        seasonMap.set(episode.saison_numero, {
          seasonNumber: episode.saison_numero,
          title: `Saison ${episode.saison_numero}`,
          episodes: [episode]
        });
      }
    });

    return Array.from(seasonMap.values()).sort((a, b) => a.seasonNumber - b.seasonNumber);
  }, [show]);

  const streamingProviders = useMemo(() => {
    if (!show?.fournisseurs) {
      return [];
    }
    const providerData = show.fournisseurs;
    const providerMap =
      ((providerData as WatchProviderResponse).results ??
        (providerData as WatchProviderMap | undefined)) ?? undefined;

    const france = providerMap?.FR;
    if (!france) {
      return [];
    }

    const unique = new Map<number, { provider_id: number; provider_name: string; logo_path: string; type: string }>();
    (['flatrate', 'rent', 'buy'] as const).forEach((type) => {
      (france[type] || []).forEach((provider) => {
        unique.set(provider.provider_id, { ...provider, type });
      });
    });

    return Array.from(unique.values());
  }, [show]);

  const nextEpisode = show?.prochain_episode;
  const nextEpisodeAirDate = nextEpisode?.air_date ?? nextEpisode?.airdate ?? null;

  const showSynopsisSection = displayPrefs.synopsis;
  const showNextEpisodeCard = displayPrefs.nextEpisode && !!nextEpisode;
  const showSeasonsList = displayPrefs.seasons && groupedSeasons.length > 0;

  const handleStatusChange = useCallback(
    async (newStatus: SeriesStatus) => {
      if (!show || updatingStatus || show.statut_visionnage === newStatus) {
        return;
      }

      try {
        setUpdatingStatus(true);
        const result = await window.electronAPI.setTvShowStatus({
          showId: show.id,
          statut: newStatus
        });

        if (result?.success) {
          setShow((prev) => (prev ? { ...prev, statut_visionnage: result.statut || newStatus } : prev));
          window.dispatchEvent(
            new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
          );
          loadShow({ silent: true });
          showToast({
            title: 'Statut mis à jour',
            message: `La série est maintenant marquée comme « ${result?.statut || newStatus} ».`,
            type: 'success'
          });
        }
      } catch (err: any) {
        console.error('Erreur changement statut série:', err);
        showToast({
          title: 'Erreur',
          message: err?.message || 'Impossible de mettre à jour le statut.',
          type: 'error'
        });
      } finally {
        setUpdatingStatus(false);
      }
    },
    [show, showToast, updatingStatus, loadShow]
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!show || togglingFavorite) {
      return;
    }

    try {
      setTogglingFavorite(true);
      const result = await window.electronAPI.toggleTvFavorite(show.id);
      if (result?.success) {
        setShow((prev) => (prev ? { ...prev, is_favorite: result.isFavorite } : prev));
        window.dispatchEvent(
          new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
        );
        loadShow({ silent: true });
        showToast({
          title: result.isFavorite ? 'Ajoutée aux favoris' : 'Retirée des favoris',
          message: result.isFavorite
            ? 'Cette série apparaît désormais dans vos favoris.'
            : 'Cette série ne fait plus partie de vos favoris.',
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Erreur bascule favori série:', err);
      showToast({
        title: 'Erreur',
        message: err?.message || 'Impossible de mettre à jour le favori.',
        type: 'error'
      });
    } finally {
      setTogglingFavorite(false);
    }
  }, [show, showToast, togglingFavorite, loadShow]);

  const handleOpenDisplaySettings = useCallback(() => {
    setShowDisplaySettingsModal(true);
  }, []);

  const handleCloseDisplaySettings = useCallback(async () => {
    setShowDisplaySettingsModal(false);
    await refreshDisplayPrefs();
  }, [refreshDisplayPrefs]);

  const handleOpenExternal = (url?: string | null) => {
    if (!url) return;
    window.electronAPI.openExternal?.(url);
  };

  const handleMarkEpisode = async (episode: TvEpisode) => {
    try {
      if (!show) {
        return;
      }
      const currentUser = await window.electronAPI.getCurrentUser();
      if (!currentUser) {
        showToast({
          title: 'Utilisateur requis',
          message: 'Sélectionnez un utilisateur avant de marquer un épisode.',
          type: 'warning'
        });
        return;
      }
      const users = await window.electronAPI.getAllUsers();
      const user = users.find((u: any) => u.name === currentUser);
      if (!user) {
        showToast({
          title: 'Utilisateur introuvable',
          message: 'Impossible d’identifier l’utilisateur courant.',
          type: 'error'
        });
        return;
      }
      const nextVu = !(episode.vu);
      setMarkingEpisodeId(episode.id);
      const result = await window.electronAPI.markTvEpisode({
        episodeId: episode.id,
        userId: user.id,
        vu: nextVu
      });

      setShow((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedEpisodes = prev.episodes.map((ep) =>
          ep.id === episode.id
            ? {
              ...ep,
              vu: nextVu,
              date_visionnage: nextVu ? result?.dateVisionnage ?? new Date().toISOString() : null
            }
            : ep
        );
        return {
          ...prev,
          episodes: updatedEpisodes,
          episodes_vus: typeof result?.episodesVus === 'number' ? result.episodesVus : prev.episodes_vus,
          saisons_vues: typeof result?.saisonsVues === 'number' ? result.saisonsVues : prev.saisons_vues
        };
      });

      window.dispatchEvent(
        new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
      );
      await loadShow({ silent: true });
      showToast({
        title: nextVu ? 'Épisode marqué' : 'Épisode remis en attente',
        message: nextVu
          ? `${episode.titre || `Épisode ${episode.episode_numero}`} est marqué comme vu.`
          : `${episode.titre || `Épisode ${episode.episode_numero}`} est de nouveau marqué comme non vu.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Erreur marquage épisode:', err);
      showToast({
        title: 'Erreur',
        message: err?.message || 'Impossible de mettre à jour l’épisode.',
        type: 'error'
      });
    } finally {
      setMarkingEpisodeId(null);
    }
  };

  const handleMarkAllEpisodes = useCallback(async () => {
    if (!show || markingAllEpisodes) {
      return;
    }

    const totalEpisodes = show.nb_episodes ?? show.episodes?.length ?? 0;
    if (totalEpisodes === 0) {
      showToast({
        title: 'Aucun épisode',
        message: 'Cette série ne contient aucun épisode à marquer.',
        type: 'info'
      });
      return;
    }

    try {
      setMarkingAllEpisodes(true);
      const result = await window.electronAPI.markAllTvEpisodes({ showId: show.id, vu: true });

      if (result?.success) {
        setShow((prev) => {
          if (!prev) {
            return prev;
          }
          const dateVisionnage = result.dateVisionnage || new Date().toISOString();
          const updatedEpisodes = prev.episodes.map((episode) => ({
            ...episode,
            vu: true,
            date_visionnage: episode.date_visionnage || dateVisionnage
          }));
          return {
            ...prev,
            episodes: updatedEpisodes,
            episodes_vus: typeof result.episodesVus === 'number' ? result.episodesVus : prev.episodes_vus,
            saisons_vues: typeof result.saisonsVues === 'number' ? result.saisonsVues : prev.saisons_vues,
            statut_visionnage: 'Terminé'
          };
        });

        window.dispatchEvent(
          new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
        );
        await loadShow({ silent: true });
        showToast({
          title: 'Progression mise à jour',
          message: 'Tous les épisodes sont désormais marqués comme vus.',
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Erreur marquage complet série:', err);
      showToast({
        title: 'Erreur',
        message: err?.message || 'Impossible de marquer tous les épisodes comme vus.',
        type: 'error'
      });
    } finally {
      setMarkingAllEpisodes(false);
    }
  }, [show, markingAllEpisodes, loadShow, showToast]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement de la série...</p>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{error || 'Série introuvable'}</p>
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
      <DetailPageHeader backLabel="Retour aux séries" backTo="/series" />
      <div className="fade-in" style={{ minHeight: '100vh', paddingBottom: '80px', paddingTop: '110px' }}>
        <div
          style={{
            position: 'relative',
            height: '420px',
            background: backgroundUrl
              ? `linear-gradient(90deg, rgba(8, 12, 24, 0.92) 0%, rgba(8, 12, 24, 0.4) 60%), url(${backgroundUrl}) center/cover`
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
                  <img src={posterUrl} alt={show.titre} style={{ width: '100%', display: 'block' }} />
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
                <h1 style={{ fontSize: '34px', fontWeight: 800, margin: 0 }}>{show.titre}</h1>
                {show.titre_original && show.titre_original !== show.titre && (
                  <p style={{ margin: '6px 0 0 0', opacity: 0.75, fontSize: '15px' }}>{show.titre_original}</p>
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
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#93c5fd',
                      borderRadius: '999px',
                      padding: '8px 14px',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <Star size={16} />
                    {score} / 10
                  </span>
                )}
                {firstAirDate && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
                    <Calendar size={16} />
                    {firstAirDate}
                  </span>
                )}
                {show.nb_saisons != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
                    <Layers size={16} />
                    {show.nb_saisons} saison{show.nb_saisons > 1 ? 's' : ''}
                  </span>
                )}
                {show.nb_episodes != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
                    <Play size={16} />
                    {show.nb_episodes} épisode{show.nb_episodes > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {show.genres && show.genres.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {show.genres.map((genre) => (
                    <span
                      key={genre.id}
                      style={{
                        fontSize: '13px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        background: 'rgba(34, 197, 94, 0.18)',
                        border: '1px solid rgba(34, 197, 94, 0.32)',
                        color: '#86efac'
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
                  value={show.statut_visionnage || 'À regarder'}
                  onChange={(e) => handleStatusChange(e.target.value as SeriesStatus)}
                  disabled={updatingStatus}
                  style={{ minWidth: '200px' }}
                >
                  {SERIES_STATUS_OPTIONS.map((option) => {
                    const label = formatStatusLabel(option, { category: 'series' });
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
                  background: show.is_favorite ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                  color: show.is_favorite ? '#ffffff' : '#ef4444',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: show.is_favorite ? '0 3px 10px rgba(0, 0, 0, 0.35)' : 'none',
                  cursor: togglingFavorite ? 'progress' : 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '200px',
                  opacity: togglingFavorite ? 0.85 : 1
                }}
                onMouseEnter={(e) => {
                  if (!show.is_favorite && !togglingFavorite) {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!show.is_favorite && !togglingFavorite) {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <Heart size={16} fill={show.is_favorite ? '#ffffff' : '#ef4444'} />
                <span>{show.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
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
            {(showSynopsisSection || showNextEpisodeCard || showSeasonsList) && (
              <section
                style={{
                  background: 'var(--surface)',
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}
              >
                {showSynopsisSection && (
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Synopsis</h2>
                    <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: '12px' }}>
                      {show.synopsis || 'Aucun synopsis disponible.'}
                    </p>
                  </div>
                )}

                {showNextEpisodeCard && nextEpisode && (
                  <div
                    style={{
                      borderRadius: '16px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      background: 'rgba(59, 130, 246, 0.12)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>Prochain épisode</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {nextEpisodeAirDate ? formatAirDate(nextEpisodeAirDate) : 'Date inconnue'}
                      {nextEpisode.name ? ` • ${nextEpisode.name}` : ''}
                    </div>
                    {nextEpisode.url && (
                      <button
                        className="btn btn-outline"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={() => handleOpenExternal(nextEpisode.url)}
                      >
                        Détails TV Maze
                      </button>
                    )}
                  </div>
                )}

                {showSeasonsList && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {groupedSeasons.map((season) => (
                      <SeasonCard
                        key={season.seasonNumber}
                        season={season}
                        showEpisodes={displayPrefs.episodes}
                        onEpisodeClick={handleMarkEpisode}
                        markingEpisodeId={markingEpisodeId}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <aside
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <SeriesProgressSection
                show={show}
                seasonsTotal={show.nb_saisons ?? groupedSeasons.length}
                onMarkAllEpisodes={handleMarkAllEpisodes}
                isMarkingAllEpisodes={markingAllEpisodes}
              />
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
                    {show.pays_production?.map((p) => p.name).join(', ') || 'Inconnu'}
                  </InfoLine>
                  <InfoLine icon={<Layers size={16} />} label="Statut">
                    {show.statut || 'Indisponible'}
                  </InfoLine>
                  <InfoLine icon={<Play size={16} />} label="Diffusion">
                    {show.dernier_episode?.air_date ? `Dernier: ${formatAirDate(show.dernier_episode.air_date)}` : '—'}
                    <br />
                    {nextEpisodeAirDate ? `Prochain: ${formatAirDate(nextEpisodeAirDate)}` : '—'}
                  </InfoLine>
                </div>
              )}

              {displayPrefs.streaming && streamingProviders.length > 0 && (
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

              {displayPrefs.externalLinks && show.ids_externes && (
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
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Liens externes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {show.ids_externes?.imdb_id && (
                      <ExternalLinkButton
                        href={`https://www.imdb.com/title/${show.ids_externes.imdb_id}`}
                        label="Voir sur IMDb"
                      />
                    )}
                    {show.ids_externes?.facebook_id && (
                      <ExternalLinkButton
                        href={`https://www.facebook.com/${show.ids_externes.facebook_id}`}
                        label="Facebook"
                      />
                    )}
                    {show.ids_externes?.instagram_id && (
                      <ExternalLinkButton
                        href={`https://www.instagram.com/${show.ids_externes.instagram_id}`}
                        label="Instagram"
                      />
                    )}
                    {show.ids_externes?.twitter_id && (
                      <ExternalLinkButton
                        href={`https://twitter.com/${show.ids_externes.twitter_id}`}
                        label="Twitter / X"
                      />
                    )}
                    {show.ids_externes?.wikidata_id && (
                      <ExternalLinkButton
                        href={`https://www.wikidata.org/wiki/${show.ids_externes.wikidata_id}`}
                        label="Wikidata"
                      />
                    )}
                    {show.ids_externes?.tvdb_id && (
                      <ExternalLinkButton
                        href={`https://thetvdb.com/?tab=series&id=${show.ids_externes.tvdb_id}`}
                        label="TVDB"
                      />
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
        {showDisplaySettingsModal && (
          <SeriesDisplaySettingsModal onClose={handleCloseDisplaySettings} showToast={showToast} />
        )}
        <BackToTopButton />
      </div>
    </>
  );
}

function SeasonCard({
  season,
  showEpisodes,
  onEpisodeClick,
  markingEpisodeId
}: {
  season: SeasonGroup;
  showEpisodes: boolean;
  onEpisodeClick: (episode: TvEpisode) => void;
  markingEpisodeId: number | null;
}) {
  const poster = getTmdbImageUrl(season.poster || undefined, 'w342');
  const [expanded, setExpanded] = useState(showEpisodes && season.seasonNumber === 1);
  const toggleHint = showEpisodes
    ? expanded
      ? 'Cliquez pour masquer la liste des épisodes'
      : 'Cliquez pour afficher la liste des épisodes'
    : null;

  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden'
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (showEpisodes) {
            setExpanded((prev) => !prev);
          }
        }}
        style={{
          display: 'flex',
          width: '100%',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          padding: 0,
          cursor: showEpisodes ? 'pointer' : 'default'
        }}
        disabled={!showEpisodes}
      >
        <div style={{ display: 'flex', gap: '20px', padding: '20px', alignItems: 'center', flex: 1 }}>
          {poster ? (
            <img
              src={poster}
              alt={season.title}
              style={{ width: '90px', borderRadius: '10px', border: '1px solid var(--border)' }}
            />
          ) : (
            <div
              style={{
                width: '90px',
                height: '120px',
                borderRadius: '10px',
                border: '1px dashed var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '12px'
              }}
            >
              Saison {season.seasonNumber}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text)'
                  }}
                >
                  {season.title}
                </h3>
                {season.airDate && (
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {formatAirDate(season.airDate)}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    borderRadius: '999px',
                    padding: '6px 10px',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)'
                  }}
                >
                  {season.episodes.length} épisode{season.episodes.length > 1 ? 's' : ''}
                </span>
                {showEpisodes && (
                  <ChevronDown
                    size={18}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                )}
              </div>
            </div>
            {toggleHint && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}
              >
                {toggleHint}
              </span>
            )}

            {season.synopsis && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                {season.synopsis}
              </p>
            )}
          </div>
        </div>
      </button>

      {expanded && showEpisodes && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {season.episodes.map((episode) => {
            const isEpisodeSeen = Boolean(episode.vu);
            const isProcessing = markingEpisodeId === episode.id;

            return (
              <Fragment key={episode.id}>
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '60px minmax(0, 1fr) auto',
                    gap: '16px',
                    alignItems: 'center'
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(var(--primary-rgb), 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      fontWeight: 700
                    }}
                  >
                    S{episode.saison_numero.toString().padStart(2, '0')}
                    <br />
                    E{episode.episode_numero.toString().padStart(2, '0')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {episode.titre || `Épisode ${episode.episode_numero}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
                      {episode.date_diffusion && <span>{formatAirDate(episode.date_diffusion)}</span>}
                      {episode.duree && <span>{episode.duree} min</span>}
                      {episode.note_moyenne && <span>⭐ {formatVoteAverage(episode.note_moyenne)}</span>}
                    </div>
                    {episode.synopsis && (
                      <p
                        style={{
                          margin: 0,
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          lineHeight: 1.6
                        }}
                      >
                        {episode.synopsis}
                      </p>
                    )}
                  </div>

                  <button
                    className="btn btn-outline"
                    onClick={() => onEpisodeClick(episode)}
                    disabled={isProcessing}
                    style={{
                      justifySelf: 'flex-end',
                      background: isEpisodeSeen ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                      borderColor: isEpisodeSeen ? 'rgba(34, 197, 94, 0.5)' : undefined,
                      color: isEpisodeSeen ? '#22c55e' : 'var(--text)',
                      opacity: isProcessing ? 0.7 : 1
                    }}
                  >
                    {isProcessing
                      ? 'Enregistrement...'
                      : isEpisodeSeen ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={14} />
                          Marquer non vu
                        </span>
                      ) : (
                        'Marquer vu'
                      )}
                  </button>
                </div>
                <div style={{ height: '1px', background: 'var(--border)' }} />
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
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
