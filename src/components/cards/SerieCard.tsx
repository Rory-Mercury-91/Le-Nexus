import { Ban, BookMarked, BookOpen, CheckCircle2, Eye, EyeOff, Heart, Tag } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import { Serie, SerieTag } from '../types';
import CoverImage from '../common/CoverImage';

interface SerieCardProps {
  serie: Serie;
  onUpdate: () => void;
  imageObjectFit?: 'cover' | 'contain';
  presentationMode?: boolean;
  imageOnly?: boolean;
}

const TAG_CONFIG: Record<SerieTag, { label: string; icon: any; color: string; bg: string }> = {
  a_lire: { label: 'À lire', icon: BookMarked, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  en_cours: { label: 'En cours', icon: BookMarked, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  lu: { label: 'Lu', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  abandonne: { label: 'Abandonné', icon: Ban, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' }
};

// Tags manuels uniquement (utilisateur peut les définir)
const MANUAL_TAGS: SerieTag[] = ['a_lire', 'abandonne'];

export default function SerieCard({ serie, onUpdate, imageObjectFit = 'cover', presentationMode = false, imageOnly = false }: SerieCardProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [isMasquee, setIsMasquee] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  
  // Dimensions adaptatives selon le mode
  const cardHeight = imageOnly ? '300px' : (presentationMode ? '560px' : '420px');
  const coverHeight = imageOnly ? '300px' : (presentationMode ? '420px' : '280px');

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
      // Si le tag cliqué est déjà actif, on le retire
      if (serie.tag === tag) {
        await window.electronAPI.removeSerieTag(serie.id, currentUser.id);
      } else {
        await window.electronAPI.setSerieTag(serie.id, currentUser.id, tag);
      }
      setShowTagDropdown(false);
      onUpdate();
    } catch (error) {
      console.error('Erreur lors du changement de tag:', error);
    }
  };


  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) return;
    
    try {
      await window.electronAPI.toggleSerieFavorite(serie.id, currentUser.id);
      setShowTagDropdown(false); // Fermer le dropdown après sélection
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
    setShowTagDropdown(false); // Fermer le dropdown après l'action
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

  // Mode images uniquement : afficher seulement la couverture avec bannières et badge favori
  if (imageOnly) {
    return (
      <Link
        to={`/serie/${serie.id}`}
        className="card"
        style={{
          position: 'relative',
          display: 'block',
          height: coverHeight,
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          padding: '0',
          textDecoration: 'none',
          color: 'inherit'
        }}
      >
        {/* Image de couverture */}
        {serie.couverture_url ? (
          <CoverImage
            src={serie.couverture_url}
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
            background: 'linear-gradient(135deg, var(--surface-light), var(--surface))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <BookOpen size={48} />
          </div>
        )}

        {/* Bannières diagonales pour les tags En cours / Lu / Abandonné */}
        {(() => {
          if (serie.tag !== 'en_cours' && serie.tag !== 'lu' && serie.tag !== 'abandonne') return null;
          
          const tomesLus = serie.tomes?.filter((t: any) => t?.lu).length || 0;
          const totalTomes = serie.tomes?.length || 0;
          const isComplete = serie.tag === 'lu' || (totalTomes > 0 && tomesLus === totalTomes);
          const isInProgress = serie.tag === 'en_cours' || (tomesLus > 0 && tomesLus < totalTomes);
          const isAbandoned = serie.tag === 'abandonne';
          
          if (!isComplete && !isInProgress && !isAbandoned) return null;
          
          let backgroundColor = '#f59e0b'; // En cours (orange)
          let label = 'En cours';
          
          if (isComplete) {
            backgroundColor = '#10b981'; // Lu (vert)
            label = 'Lu';
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
        {serie.is_favorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleFavorite(e);
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
              color: '#ef4444',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid #ef4444',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 4
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            }}
          >
            <Heart size={18} fill="#ef4444" strokeWidth={2.5} />
          </button>
        )}

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

            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

            {/* Option Masquer/Démasquer */}
            <button
              onClick={handleToggleMasquer}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: isMasquee ? 'rgba(251, 146, 60, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: isMasquee ? '#fb923c' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isMasquee ? '600' : '400',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251, 146, 60, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isMasquee ? 'rgba(251, 146, 60, 0.15)' : 'transparent';
              }}
            >
              {isMasquee ? <Eye size={16} /> : <EyeOff size={16} />}
              {isMasquee ? 'Démasquer' : 'Masquer'}
            </button>
          </div>
        )}

        <style>{`
          .card:hover .tag-btn {
            opacity: 1;
          }
        `}</style>
      </Link>
    );
  }

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
          height: cardHeight
        }}
      >
      {/* Couverture */}
      <div style={{
        width: '100%',
        height: coverHeight,
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
        
        {/* Bannières diagonales pour les tags En cours / Lu / Abandonné */}
        {(() => {
          // Afficher pour "en_cours", "lu" et "abandonne"
          if (serie.tag !== 'en_cours' && serie.tag !== 'lu' && serie.tag !== 'abandonne') return null;
          
          const tomesLus = serie.tomes?.filter((t: any) => t?.lu).length || 0;
          const totalTomes = serie.tomes?.length || 0;
          const isComplete = serie.tag === 'lu' || (totalTomes > 0 && tomesLus === totalTomes);
          const isInProgress = serie.tag === 'en_cours' || (tomesLus > 0 && tomesLus < totalTomes);
          const isAbandoned = serie.tag === 'abandonne';
          
          if (!isComplete && !isInProgress && !isAbandoned) return null;
          
          let backgroundColor = '#f59e0b'; // En cours (orange)
          let label = 'En cours';
          
          if (isComplete) {
            backgroundColor = '#10b981'; // Lu (vert)
            label = 'Lu';
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

            <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

            {/* Option Masquer/Démasquer */}
            <button
              onClick={handleToggleMasquer}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: isMasquee ? 'rgba(251, 146, 60, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: isMasquee ? '#fb923c' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isMasquee ? '600' : '400',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251, 146, 60, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isMasquee ? 'rgba(251, 146, 60, 0.15)' : 'transparent';
              }}
            >
              {isMasquee ? <Eye size={16} /> : <EyeOff size={16} />}
              {isMasquee ? 'Démasquer' : 'Masquer'}
            </button>
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
      </div>

      {/* Informations */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Titre + Badge Favori */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minHeight: '24px',
            flex: 1
          }} title={serie.titre}>
            {serie.titre}
          </h3>
          
          {/* Badge favori à côté du titre */}
          {serie.is_favorite && (
            <button
              onClick={handleToggleFavorite}
              title="Favori"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid #ef4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              <Heart size={14} fill="#ef4444" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Badge de statut de publication (Nautiljon) sous le titre */}
        <div style={{ marginBottom: '8px' }}>
          <span 
            className={`badge ${getStatutBadgeClass(serie.statut)}`}
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            {serie.statut}
          </span>
        </div>
        
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
            fontSize: '11px', 
            fontWeight: '600',
            color: 'var(--primary)',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '3px 7px',
            borderRadius: '6px'
          }}>
            {(() => {
              const tomesLus = serie.tomes?.filter((t: any) => t?.lu).length || 0;
              const totalTomes = serie.tomes?.length || 0;
              return `${tomesLus} sur ${totalTomes} tome${totalTomes > 1 ? 's' : ''}`;
            })()}
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
