import { BookOpen, Eye, Heart, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimeSerie, AnimeTag } from '../types';
import CoverImage from '../common/CoverImage';

const TAG_CONFIG = {
  a_regarder: { icon: BookOpen, label: 'À regarder', color: '#3b82f6' },
  en_cours: { icon: Eye, label: 'En cours', color: '#f59e0b' },
  termine: { icon: BookOpen, label: 'Terminé', color: '#10b981' },
  abandonne: { icon: BookOpen, label: 'Abandonné', color: '#6b7280' }
};

interface AnimeListItemProps {
  anime: AnimeSerie;
  onUpdate?: () => void;
}

export default function AnimeListItem({ anime, onUpdate }: AnimeListItemProps) {
  const navigate = useNavigate();
  const TagIcon = anime.tag && TAG_CONFIG[anime.tag] ? TAG_CONFIG[anime.tag].icon : null;
  const tagColor = anime.tag && TAG_CONFIG[anime.tag] ? TAG_CONFIG[anime.tag].color : null;

  // Calculer la progression
  const episodesVus = anime.nb_episodes_vus || 0;
  const totalEpisodes = anime.nb_episodes_total || 0;
  const progression = totalEpisodes > 0 ? Math.round((episodesVus / totalEpisodes) * 100) : 0;

  return (
    <div
      onClick={() => navigate(`/animes/${anime.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px',
        background: 'var(--surface)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {/* Couverture miniature */}
      <div style={{
        width: '60px',
        height: '85px',
        borderRadius: '6px',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--background)'
      }}>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)22'
          }}>
            <Tv size={24} style={{ color: 'var(--primary)' }} />
          </div>
        )}
      </div>

      {/* Informations */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '4px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {anime.titre}
          </h3>
          
          {/* Badge favori uniquement */}
          {anime.is_favorite && (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Heart size={12} fill="#fff" color="#fff" />
            </div>
          )}
        </div>

        {/* Progression et infos */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          {anime.nb_saisons && anime.nb_saisons > 0 && (
            <>
              <span>{anime.nb_saisons} saison{anime.nb_saisons > 1 ? 's' : ''}</span>
              <span>•</span>
            </>
          )}
          {totalEpisodes > 0 && (
            <>
              <span>{episodesVus} / {totalEpisodes} épisode{totalEpisodes > 1 ? 's' : ''}</span>
              <span>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px' }}>
                <div style={{
                  flex: 1,
                  height: '6px',
                  background: 'var(--background)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progression}%`,
                    height: '100%',
                    background: progression === 100 ? 'var(--success)' : 'var(--primary)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '40px' }}>
                  {progression}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Type d'anime */}
      <div style={{
        padding: '4px 12px',
        background: 'var(--background)',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        {anime.type}
      </div>
    </div>
  );
}

