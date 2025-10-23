import { BookOpen, Eye, Heart, Tv } from 'lucide-react';
import { AnimeSerie, AnimeTag } from '../types';
import CoverImage from './CoverImage';
import PlatformLogo from './PlatformLogo';

const TAG_CONFIG = {
  a_regarder: { icon: BookOpen, label: 'À regarder', color: '#3b82f6' },
  en_cours: { icon: Eye, label: 'En cours', color: '#f59e0b' },
  termine: { icon: BookOpen, label: 'Terminé', color: '#10b981' },
  abandonne: { icon: BookOpen, label: 'Abandonné', color: '#6b7280' }
};

interface AnimeCardProps {
  anime: AnimeSerie;
  onClick: () => void;
  imageObjectFit?: 'cover' | 'contain';
  presentationMode?: boolean;
}

export default function AnimeCard({ anime, onClick, imageObjectFit = 'cover', presentationMode = false }: AnimeCardProps) {
  const TagIcon = anime.tag && TAG_CONFIG[anime.tag] ? TAG_CONFIG[anime.tag].icon : null;
  const tagColor = anime.tag && TAG_CONFIG[anime.tag] ? TAG_CONFIG[anime.tag].color : null;
  const tagLabel = anime.tag && TAG_CONFIG[anime.tag] ? TAG_CONFIG[anime.tag].label : null;

  const cardHeight = presentationMode ? '560px' : '420px';
  const coverHeight = presentationMode ? '420px' : '280px';

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'watching': 'En cours',
      'completed': 'Terminé',
      'on_hold': 'En pause',
      'dropped': 'Abandonné',
      'plan_to_watch': 'Prévu'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'watching': '#3b82f6',
      'completed': '#10b981',
      'on_hold': '#f59e0b',
      'dropped': '#ef4444',
      'plan_to_watch': '#6366f1'
    };
    return colorMap[status] || '#6b7280';
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'TV': 'TV',
      'Movie': 'Film',
      'OVA': 'OVA',
      'ONA': 'ONA',
      'Special': 'Spécial'
    };
    return typeMap[type] || type;
  };

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
      {/* Badges tags (favori + tag) */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        display: 'flex',
        flexDirection: 'row',
        gap: '6px',
        zIndex: 10
      }}>
        {/* Badge Favori */}
        {anime.is_favorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Favori"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ef4444',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Heart size={16} fill="#fff" color="#fff" />
          </button>
        )}

        {/* Badge Tag */}
        {TagIcon && tagColor && (
          <div
            title={tagLabel || ''}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: tagColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            <TagIcon size={16} color="#fff" />
          </div>
        )}
      </div>

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

        {/* Logo source d'import */}
        {anime.source_import && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            height: '24px',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: anime.source_import === 'adn' ? '#1E3A8A' : 
                       anime.source_import === 'adkami' ? '#8B5CF6' : 
                       '#F47521',
            padding: '0 6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <PlatformLogo platform={anime.source_import} height={20} />
          </div>
        )}

        {/* Badge Statut */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: getStatusColor(anime.statut),
          color: 'white',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {getStatusLabel(anime.statut)}
        </div>

        {/* Badge Type */}
        {anime.type && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            transform: 'translateX(-85px)'
          }}>
            {getTypeLabel(anime.type)}
          </div>
        )}

        {/* Bandeau diagonal pour progression de visionnage */}
        {(() => {
          const episodesVus = anime.nb_episodes_vus || 0;
          const episodesTotal = anime.nb_episodes_total || 0;
          
          // Terminé : tous les épisodes vus
          const isComplete = episodesTotal > 0 && episodesVus === episodesTotal;
          // En cours : au moins 1 épisode vu mais pas tous
          const isWatching = episodesVus > 0 && episodesVus < episodesTotal;
          
          if (!isComplete && !isWatching) return null;
          
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
                background: isComplete ? '#10b981' : '#f59e0b',
                transform: 'translate(-50%, -50%) rotate(-45deg) translateY(-44px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}>
                {isComplete ? 'Terminé' : 'En cours'}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Contenu */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Titre */}
        <h3 style={{
          fontSize: '15px',
          fontWeight: '600',
          marginBottom: '8px',
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          minHeight: '40px'
        }}>
          {anime.titre}
        </h3>

        {/* Informations */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginTop: 'auto',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          {/* Saisons */}
          {anime.nb_saisons && anime.nb_saisons > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tv size={14} />
              <span>{anime.nb_saisons} saison{anime.nb_saisons > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Épisodes */}
          {anime.nb_episodes_total && anime.nb_episodes_total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={14} />
              <span>
                {anime.nb_episodes_vus || 0}/{anime.nb_episodes_total} épisode{anime.nb_episodes_total > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
