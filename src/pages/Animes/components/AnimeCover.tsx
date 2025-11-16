import { Tv } from 'lucide-react';
import { useMemo } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import { AnimeSerie } from '../../../types';
import AnimeStatusSection from './AnimeStatusSection';

interface AnimeCoverProps {
  anime: AnimeSerie;
  episodesVus: number;
  nbEpisodes: number;
  onStatusChange: (status: 'En cours' | 'Terminé' | 'Abandonné' | 'À regarder' | 'En pause') => void;
  onToggleFavorite: () => void;
  shouldShow: (field: string) => boolean;
}

export default function AnimeCover({
  anime,
  episodesVus,
  nbEpisodes,
  onStatusChange,
  onToggleFavorite,
  shouldShow
}: AnimeCoverProps) {
  // Calculer le statut actuel selon la progression
  const currentStatus = useMemo(() => {
    // Si aucun épisode n'est vu → "À regarder"
    if (episodesVus === 0) {
      return 'À regarder';
    }

    // Si tous les épisodes sont vus, c'est terminé
    if (nbEpisodes > 0 && episodesVus >= nbEpisodes) {
      return 'Terminé';
    }

    // Si au moins 1 épisode est vu → "En cours"
    if (episodesVus >= 1) {
      return 'En cours';
    }

    // Sinon, utiliser le statut actuel ou "À regarder" par défaut
    // Mapper "En attente" vers "En pause" car "En attente" n'est pas dans les statuts valides
    const statut = anime.statut_visionnage || 'À regarder';
    return statut === 'En attente' ? 'En pause' : (statut as 'En cours' | 'Terminé' | 'Abandonné' | 'À regarder' | 'En pause');
  }, [anime.statut_visionnage, episodesVus, nbEpisodes]);

  if (!shouldShow('couverture')) return null;

  return (
    <div style={{ width: 'clamp(180px, 20vw, 250px)', flexShrink: 0 }}>
      <div style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {anime.couverture_url ? (
          <CoverImage
            src={anime.couverture_url}
            alt={anime.titre}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '2/3',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '2/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background)'
          }}>
            <Tv size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          </div>
        )}
      </div>

      {/* Liens rapides */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        {anime.mal_id && (
          <button
            onClick={() => window.electronAPI.openExternal?.(`https://myanimelist.net/anime/${anime.mal_id}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px 14px',
              background: '#2E51A2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e3a8a';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2E51A2';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>🔗</span>
            Voir sur MyAnimeList
          </button>
        )}
      </div>

      {/* Section Mon Statut : Favori + Sélecteur de statut */}
      <AnimeStatusSection
        anime={anime}
        currentStatus={currentStatus}
        onStatusChange={onStatusChange}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
