import { Check, Clock, Play } from 'lucide-react';

interface Episode {
  numero: number;
  vu: boolean;
  date_visionnage: string | null;
}

interface AnimeEpisodesGridProps {
  episodes: Episode[];
  episodesVus: number;
  nbEpisodes: number;
  duree?: number | null;
  onToggleEpisode: (numero: number, currentVu: boolean) => void;
  onMarquerToutVu: () => void;
  shouldShow: (field: string) => boolean;
}

export default function AnimeEpisodesGrid({
  episodes,
  episodesVus,
  nbEpisodes,
  duree,
  onToggleEpisode,
  onMarquerToutVu,
  shouldShow
}: AnimeEpisodesGridProps) {
  if (nbEpisodes === 0 || !shouldShow('episodes')) return null;

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Play size={24} style={{ color: 'var(--primary)' }} />
          Épisodes
          <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            {episodesVus}/{nbEpisodes}
          </span>
          {duree && (() => {
            // Extraire juste le nombre de la durée (peut être "30", "30 min", "30 min per ep", etc.)
            const match = duree.toString().match(/(\d+)/);
            const dureeMinutes = match ? match[1] : duree;
            return (
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                {dureeMinutes} min par ep
              </span>
            );
          })()}
        </h2>

        <button
          onClick={onMarquerToutVu}
          className="btn btn-outline"
          disabled={episodesVus === nbEpisodes}
        >
          <Check size={16} />
          Tout marquer comme vu
        </button>
      </div>

      {/* Barre de progression */}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'var(--background)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <div style={{
          width: `${nbEpisodes > 0 ? (episodesVus / nbEpisodes) * 100 : 0}%`,
          height: '100%',
          background: episodesVus === nbEpisodes ? 'var(--success)' : 'var(--primary)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Grille d'épisodes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
        gap: '8px'
      }}>
        {episodes.map((episode) => {
          const isVu = episode.vu;
          return (
            <button
              key={episode.numero}
              onClick={() => onToggleEpisode(episode.numero, isVu)}
              style={{
                padding: '12px 8px',
                background: isVu ? 'var(--primary)' : 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: isVu ? 'white' : 'var(--text)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              onMouseOver={(e) => {
                if (!isVu) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                }
              }}
              onMouseOut={(e) => {
                if (!isVu) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                }
              }}
            >
              {isVu && <Check size={14} />}
              {episode.numero}
            </button>
          );
        })}
      </div>
    </div>
  );
}
