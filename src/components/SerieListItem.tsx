import { BookOpen, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Serie } from '../types';

const TAG_CONFIG = {
  a_lire: { icon: BookOpen, label: 'À lire', color: '#3b82f6' },
  en_cours: { icon: BookOpen, label: 'En cours', color: '#f59e0b' },
  lu: { icon: BookOpen, label: 'Lu', color: '#10b981' },
  abandonne: { icon: BookOpen, label: 'Abandonné', color: '#6b7280' }
};

interface SerieListItemProps {
  serie: Serie;
  onUpdate?: () => void;
}

export default function SerieListItem({ serie, onUpdate }: SerieListItemProps) {
  const navigate = useNavigate();
  const TagIcon = serie.tag && TAG_CONFIG[serie.tag] ? TAG_CONFIG[serie.tag].icon : null;
  const tagColor = serie.tag && TAG_CONFIG[serie.tag] ? TAG_CONFIG[serie.tag].color : null;

  // Calculer la progression
  const tomesLus = serie.tomes?.filter((t: any) => t?.lu).length || 0;
  const totalTomes = serie.tomes?.length || 0;
  const progression = totalTomes > 0 ? Math.round((tomesLus / totalTomes) * 100) : 0;

  return (
    <div
      onClick={() => navigate(`/serie/${serie.id}`)}
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
        {serie.couverture_url ? (
          <img
            src={`manga://${serie.couverture_url}`}
            alt={serie.titre}
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
            <BookOpen size={24} style={{ color: 'var(--primary)' }} />
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
            {serie.titre}
          </h3>
          
          {/* Badges compacts */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {serie.is_favorite && (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Heart size={12} fill="#fff" color="#fff" />
              </div>
            )}
            {TagIcon && tagColor && (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: tagColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TagIcon size={12} color="#fff" />
              </div>
            )}
          </div>
        </div>

        {/* Progression et infos */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          <span>{totalTomes} tome{totalTomes > 1 ? 's' : ''}</span>
          {totalTomes > 0 && (
            <>
              <span>•</span>
              <span>{tomesLus} lu{tomesLus > 1 ? 's' : ''}</span>
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

      {/* Type de volume */}
      <div style={{
        padding: '4px 12px',
        background: 'var(--background)',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        {serie.type_volume}
      </div>
    </div>
  );
}

