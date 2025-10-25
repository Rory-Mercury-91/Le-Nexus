import { Eye, Heart, Tv } from 'lucide-react';
import { AnimeSerie } from '../../types';
import CoverImage from '../common/CoverImage';

interface AnimeCardProps {
  anime: AnimeSerie;
  onClick: () => void;
  imageObjectFit?: 'cover' | 'contain';
  presentationMode?: boolean;
  imageOnly?: boolean;
}

export default function AnimeCard({ anime, onClick, imageObjectFit = 'cover', presentationMode = false, imageOnly = false }: AnimeCardProps) {
  const cardHeight = imageOnly ? '300px' : (presentationMode ? '560px' : '420px');
  const coverHeight = imageOnly ? '300px' : (presentationMode ? '420px' : '280px');

  // Mode images uniquement : afficher seulement la couverture avec bannières et badge favori
  if (imageOnly) {
    return (
      <div
        onClick={onClick}
        className="card"
        style={{
          position: 'relative',
          display: 'block',
          height: coverHeight,
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          background: 'var(--surface)'
        }}
      >
        {/* Image de couverture */}
        {anime.couverture_url ? (
          <CoverImage
            src={anime.couverture_url}
            alt={anime.titre}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <Tv size={48} />
          </div>
        )}

        {/* Bannières diagonales pour les tags En cours / Terminé / Abandonné */}
        {(() => {
          if (anime.tag !== 'en_cours' && anime.tag !== 'termine' && anime.tag !== 'abandonne') return null;
          
          const episodesVus = anime.episodes_vus || 0;
          const episodesTotal = anime.nb_episodes || 0;
          const isComplete = anime.tag === 'termine' || (episodesTotal > 0 && episodesVus === episodesTotal);
          const isWatching = anime.tag === 'en_cours' || (episodesVus > 0 && episodesVus < episodesTotal);
          const isAbandoned = anime.tag === 'abandonne';
          
          if (!isComplete && !isWatching && !isAbandoned) return null;
          
          let backgroundColor = '#f59e0b'; // En cours (orange)
          let label = 'En cours';
          
          if (isComplete) {
            backgroundColor = '#10b981'; // Terminé (vert)
            label = 'Terminé';
          } else if (isAbandoned) {
            backgroundColor = '#6b7280'; // Abandonné (gris)
            label = 'Abandonné';
          }
          
          return (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '120px',
              height: '120px',
              overflow: 'hidden',
              zIndex: 3
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '180px',
                height: '32px',
                background: backgroundColor,
                transform: 'translate(-50%, -50%) rotate(-45deg) translateY(-44px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '9px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}>
                {label}
              </div>
            </div>
          );
        })()}

        {/* Badge favori en haut à droite */}
        {anime.is_favorite && (
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Favori"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              flexShrink: 0,
              zIndex: 4
            }}
          >
            <Heart size={18} fill="#ef4444" color="#ef4444" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        cursor: 'pointer',
        background: 'var(--surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        height: cardHeight,
        position: 'relative'
      }}
    >

      {/* Image de couverture */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: coverHeight,
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
        overflow: 'hidden'
      }}>
        {anime.couverture_url ? (
          <CoverImage
            src={anime.couverture_url}
            alt={anime.titre}
            style={{
              width: '100%',
              height: '100%',
              objectFit: imageObjectFit
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Tv size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          </div>
        )}

        {/* Bannières diagonales pour les tags En cours / Terminé / Abandonné */}
        {(() => {
          // Afficher pour "en_cours", "termine" et "abandonne"
          if (anime.tag !== 'en_cours' && anime.tag !== 'termine' && anime.tag !== 'abandonne') return null;
          
          const episodesVus = anime.episodes_vus || 0;
          const episodesTotal = anime.nb_episodes || 0;
          const isComplete = anime.tag === 'termine' || (episodesTotal > 0 && episodesVus === episodesTotal);
          const isWatching = anime.tag === 'en_cours' || (episodesVus > 0 && episodesVus < episodesTotal);
          const isAbandoned = anime.tag === 'abandonne';
          
          if (!isComplete && !isWatching && !isAbandoned) return null;
          
          let backgroundColor = '#f59e0b'; // En cours (orange)
          let label = 'En cours';
          
          if (isComplete) {
            backgroundColor = '#10b981'; // Terminé (vert)
            label = 'Terminé';
          } else if (isAbandoned) {
            backgroundColor = '#6b7280'; // Abandonné (gris)
            label = 'Abandonné';
          }
          
          return (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '120px',
              height: '120px',
              overflow: 'hidden',
              zIndex: 3
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '180px',
                height: '32px',
                background: backgroundColor,
                transform: 'translate(-50%, -50%) rotate(-45deg) translateY(-44px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '9px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}>
                {label}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Contenu */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Titre + Badge Favori + Logo MAL */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            lineHeight: '1.3',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '40px',
            flex: 1
          }}>
            {anime.titre}
          </h3>
          
          {/* Logo MyAnimeList (fond bleu, dans le titre) */}
          {anime.mal_id && (
            <div style={{
              height: '20px',
              borderRadius: '4px',
              background: '#2e51a2',
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              fontSize: '9px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              MAL
            </div>
          )}
          
          {/* Badge favori à côté du titre */}
          {anime.is_favorite && (
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="Favori"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#ef4444',
                flexShrink: 0,
                marginTop: '2px'
              }}
            >
              <Heart size={14} fill="#fff" color="#fff" />
            </div>
          )}
        </div>


        {/* Informations */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginTop: 'auto',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          {/* Type */}
          {anime.type && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tv size={14} />
              <span>{anime.type}</span>
            </div>
          )}

          {/* Épisodes */}
          {anime.nb_episodes && anime.nb_episodes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={14} />
              <span>
                {anime.episodes_vus || 0}/{anime.nb_episodes} épisode{anime.nb_episodes > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
