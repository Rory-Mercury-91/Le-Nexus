import { Ban, BookMarked, BookOpen, CheckCircle2, Eye, EyeOff, Heart, Tag, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import { Serie, SerieTag } from '../types';
import CoverImage from './CoverImage';

interface SerieCardProps {
  serie: Serie;
  onUpdate: () => void;
  imageObjectFit?: 'cover' | 'contain';
}

const TAG_CONFIG: Record<SerieTag, { label: string; icon: any; color: string; bg: string }> = {
  a_lire: { label: 'À lire', icon: BookMarked, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  en_cours: { label: 'En cours', icon: BookMarked, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  lu: { label: 'Lu', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  abandonne: { label: 'Abandonné', icon: Ban, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' }
};

// Tags manuels uniquement (utilisateur peut les définir)
const MANUAL_TAGS: SerieTag[] = ['a_lire', 'abandonne'];

export default function SerieCard({ serie, onUpdate, imageObjectFit = 'cover' }: SerieCardProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [isMasquee, setIsMasquee] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    checkIfMasquee();
    loadCurrentUser();
  }, [serie.id]);

  const loadCurrentUser = async () => {
    const users = await window.electronAPI.getAllUsers();
    const userName = await window.electronAPI.getCurrentUser();
    const user = users.find(u => u.name === userName);
    setCurrentUser(user || null);
  };

  const checkIfMasquee = async () => {
    const masquee = await window.electronAPI.isSerieMasquee(serie.id);
    setIsMasquee(masquee);
  };

  const handleSetTag = async (tag: SerieTag, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) return;
    
    try {
      await window.electronAPI.setSerieTag(serie.id, currentUser.id, tag);
      setShowTagDropdown(false);
      onUpdate();
    } catch (error) {
      console.error('Erreur lors du changement de tag:', error);
    }
  };

  const handleRemoveTag = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) return;
    
    try {
      await window.electronAPI.removeSerieTag(serie.id, currentUser.id);
      setShowTagDropdown(false);
      onUpdate();
    } catch (error) {
      console.error('Erreur lors de la suppression du tag:', error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) return;
    
    try {
      await window.electronAPI.toggleSerieFavorite(serie.id, currentUser.id);
      onUpdate();
    } catch (error) {
      console.error('Erreur lors du toggle favori:', error);
    }
  };

  const handleToggleMasquer = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isMasquee) {
      // Démasquer
      await window.electronAPI.demasquerSerie(serie.id);
      setIsMasquee(false);
    } else {
      // Masquer
      const confirmed = await confirm({
        title: 'Masquer la série',
        message: `Masquer "${serie.titre}" va supprimer vos données de lecture pour cette série. La série restera accessible aux autres utilisateurs.`,
        confirmText: 'Masquer',
        cancelText: 'Annuler',
        isDanger: false
      });

      if (!confirmed) return;

      await window.electronAPI.masquerSerie(serie.id);
      setIsMasquee(true);
    }
    
    onUpdate();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const confirmed = await confirm({
      title: 'Supprimer la série',
      message: `Êtes-vous sûr de vouloir supprimer "${serie.titre}" et tous ses tomes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    await window.electronAPI.deleteSerie(serie.id);
    onUpdate();
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'var(--primary)';
      case 'Terminée': return 'var(--success)';
      case 'Abandonnée': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'badge-primary';
      case 'Terminée': return 'badge-success';
      case 'Abandonnée': return 'badge-error';
      default: return 'badge-primary';
    }
  };

  return (
    <>
      <Link
        to={`/serie/${serie.id}`}
        className="card"
        style={{
          padding: '0',
          textDecoration: 'none',
          color: 'inherit',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '420px'
        }}
      >
      {/* Couverture */}
      <div style={{
        width: '100%',
        height: '280px',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)'
      }}>
        {serie.couverture_url ? (
          <CoverImage
            src={serie.couverture_url}
            alt={serie.titre}
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
            background: 'linear-gradient(135deg, var(--surface-light), var(--surface))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <BookOpen size={48} />
          </div>
        )}
        
        {/* Badge statut */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px'
        }}>
          <span className={`badge ${getStatutBadgeClass(serie.statut)}`}>
            {serie.statut}
          </span>
        </div>

        {/* Badges en haut à gauche (icônes seulement) */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          display: 'flex',
          flexDirection: 'row',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          {/* Badge favori */}
          {serie.is_favorite && (
            <button
              onClick={handleToggleFavorite}
              title="Favori"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.25)',
                backdropFilter: 'blur(10px)',
                border: '2px solid #ef4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
              }}
            >
              <Heart size={18} fill="#ef4444" strokeWidth={2.5} />
            </button>
          )}
          
          {/* Badge tag */}
          {serie.tag && TAG_CONFIG[serie.tag] && (
            <div 
              title={TAG_CONFIG[serie.tag].label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                color: TAG_CONFIG[serie.tag].color,
                background: TAG_CONFIG[serie.tag].bg,
                backdropFilter: 'blur(10px)',
                border: `2px solid ${TAG_CONFIG[serie.tag].color}`,
                boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`
              }}
            >
              {React.createElement(TAG_CONFIG[serie.tag].icon, { size: 18, strokeWidth: 2.5 })}
            </div>
          )}
        </div>

        {/* Bouton tag dropdown */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowTagDropdown(!showTagDropdown);
          }}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 0,
            transition: 'all 0.2s',
            zIndex: 10
          }}
          className="tag-btn"
        >
          <Tag size={18} />
        </button>

        {/* Dropdown de tags */}
        {showTagDropdown && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              bottom: '56px',
              left: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border)',
              zIndex: 20,
              minWidth: '180px'
            }}
          >
            {/* Option Favori */}
            <button
              onClick={handleToggleFavorite}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: serie.is_favorite ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: serie.is_favorite ? '#ef4444' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: serie.is_favorite ? '600' : '400',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = serie.is_favorite ? 'rgba(239, 68, 68, 0.15)' : 'transparent';
              }}
            >
              <Heart size={16} fill={serie.is_favorite ? '#ef4444' : 'none'} />
              {serie.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>
            
            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
            
            {/* Tags manuels uniquement */}
            {MANUAL_TAGS.map((key) => {
              const config = TAG_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={(e) => handleSetTag(key, e)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: serie.tag === key ? `${config.color}20` : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: serie.tag === key ? config.color : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: serie.tag === key ? '600' : '400',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${config.color}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = serie.tag === key ? `${config.color}20` : 'transparent';
                  }}
                >
                  {React.createElement(config.icon, { size: 16 })}
                  {config.label}
                </button>
              );
            })}
            
            {serie.tag && MANUAL_TAGS.includes(serie.tag) && (
              <>
                <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
                <button
                  onClick={handleRemoveTag}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Retirer le tag
                </button>
              </>
            )}
          </div>
        )}

        {/* Bouton masquer/démasquer */}
        <button
          onClick={handleToggleMasquer}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: isMasquee ? 'rgba(59, 130, 246, 0.9)' : 'rgba(249, 115, 22, 0.9)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          className="delete-btn"
          title={isMasquee ? 'Démasquer' : 'Masquer'}
        >
          {isMasquee ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        {/* Bouton supprimer */}
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(239, 68, 68, 0.9)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          className="delete-btn"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Informations */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minHeight: '24px'
        }} title={serie.titre}>
          {serie.titre}
        </h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          gap: '8px'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {serie.type_volume}
          </span>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: '600',
            color: 'var(--primary)',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '4px 8px',
            borderRadius: '6px'
          }}>
            {serie.tomes?.length || 0} tome{(serie.tomes?.length || 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <style>{`
        .card:hover .delete-btn {
          opacity: 1;
        }
        .card:hover .tag-btn {
          opacity: 1;
        }
      `}</style>
      </Link>
      
      <ConfirmDialog />
    </>
  );
}
