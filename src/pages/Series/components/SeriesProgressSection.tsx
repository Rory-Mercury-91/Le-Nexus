import { TvShowDetail } from '../../../types';

interface SeriesProgressSectionProps {
  show: TvShowDetail;
  seasonsTotal: number;
  onMarkAllEpisodes: () => Promise<void>;
  isMarkingAllEpisodes: boolean;
}

export default function SeriesProgressSection({
  show,
  seasonsTotal,
  onMarkAllEpisodes,
  isMarkingAllEpisodes
}: SeriesProgressSectionProps) {
  const rawEpisodesTotal = show.nb_episodes ?? show.episodes?.length ?? 0;
  const rawEpisodesSeen = show.episodes_vus ?? (show.episodes?.filter((episode) => episode.vu).length ?? 0);
  const effectiveEpisodesTotal = rawEpisodesTotal > 0 ? rawEpisodesTotal : rawEpisodesSeen;
  const clampedEpisodesSeen =
    effectiveEpisodesTotal > 0 ? Math.min(rawEpisodesSeen, effectiveEpisodesTotal) : rawEpisodesSeen;
  const progression =
    effectiveEpisodesTotal > 0 ? Math.min(100, Math.round((clampedEpisodesSeen / effectiveEpisodesTotal) * 100)) : 0;
  const rawSeasonsSeen = show.saisons_vues ?? 0;
  const effectiveSeasonsTotal = seasonsTotal > 0 ? seasonsTotal : rawSeasonsSeen;
  const clampedSeasonsSeen =
    effectiveSeasonsTotal > 0 ? Math.min(rawSeasonsSeen, effectiveSeasonsTotal) : rawSeasonsSeen;
  const hasProgress = effectiveEpisodesTotal > 0;
  const allSeen = hasProgress && clampedEpisodesSeen >= effectiveEpisodesTotal;

  const nextEpisode = show.episodes?.find((episode) => !episode.vu);
  const nextEpisodeLabel = nextEpisode
    ? `S${nextEpisode.saison_numero.toString().padStart(2, '0')}E${nextEpisode.episode_numero
      .toString()
      .padStart(2, '0')} · ${nextEpisode.titre || 'Titre inconnu'}`
    : null;

  if (!hasProgress) {
    return null;
  }

  return (
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>📺</span>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Votre progression</h3>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text)' }}>
        <span>
          Épisodes vus :{' '}
          <strong>
            {clampedEpisodesSeen} / {effectiveEpisodesTotal}
          </strong>
        </span>
        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{progression}%</span>
      </div>

      <div
        style={{
          width: '100%',
          height: '8px',
          background: 'var(--surface-light)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}
      >
        <div
          style={{
            width: `${Math.min(100, progression)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 1), rgba(59, 130, 246, 1))',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {effectiveSeasonsTotal > 0 && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Saisons complétées :{' '}
          <strong>
            {clampedSeasonsSeen} / {effectiveSeasonsTotal}
          </strong>
        </div>
      )}

      {nextEpisodeLabel && !allSeen && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(var(--primary-rgb), 0.08)',
            border: '1px solid rgba(var(--primary-rgb), 0.18)',
            fontSize: '13px',
            color: 'var(--text)'
          }}
        >
          Prochain épisode à regarder&nbsp;: <strong>{nextEpisodeLabel}</strong>
        </div>
      )}

      {allSeen && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            fontSize: '13px',
            color: '#22c55e',
            fontWeight: 600,
            textAlign: 'center'
          }}
        >
          🎉 Tous les épisodes vus !
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          void onMarkAllEpisodes();
        }}
        disabled={allSeen || isMarkingAllEpisodes}
        style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '10px' }}
      >
        {isMarkingAllEpisodes ? 'Marquage en cours…' : '✓ Tout marquer comme vu'}
      </button>
    </div>
  );
}
