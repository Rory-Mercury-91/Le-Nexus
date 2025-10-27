import { Eye, Heart, MoreVertical, Tv } from 'lucide-react';
import { useState } from 'react';
import { AnimeSerie } from '../../types';
import CoverImage from '../common/CoverImage';

interface AnimeCardProps {
  anime: AnimeSerie;
  onClick: () => void;
  onStatusChange?: (animeId: number, newStatus: string) => Promise<void>;
  onToggleFavorite?: (animeId: number) => Promise<void>;
  imageObjectFit?: 'cover' | 'contain';
  presentationMode?: boolean;
  imageOnly?: boolean;
}

export default function AnimeCard({ anime, onClick, onStatusChange, onToggleFavorite, imageObjectFit = 'cover', presentationMode = false, imageOnly = false }: AnimeCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const cardHeight = imageOnly ? '300px' : (presentationMode ? '560px' : '420px');
  const coverHeight = imageOnly ? '300px' : (presentationMode ? '420px' : '280px');

  // Vérifier si l'anime est nouveau (< 7 jours)
  const isNew = () => {
    if (!anime.created_at) return false;
    const createdDate = new Date(anime.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < 7;
  };

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

        {/* Badge "Nouveau" */}
        {isNew() && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.5)',
            zIndex: 2,
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🆕 Nouveau
          </span>
        )}

        {/* Bannières diagonales pour les statuts En cours / Terminé / Abandonné */}
        {(() => {
          const statut = anime.statut_visionnage;
          if (!statut || statut === 'À regarder') return null;
          
          let backgroundColor = '#f59e0b'; // En cours (orange)
          let label = 'En cours';
          
          if (statut === 'Terminé') {
            backgroundColor = '#10b981'; // Terminé (vert)
            label = 'Terminé';
          } else if (statut === 'Abandonné') {
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

        {/* Menu actions en haut à droite */}
        {(onStatusChange || onToggleFavorite) && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 5 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  minWidth: '180px',
                  zIndex: 1000
                }}
              >
                {onStatusChange && (
                  <>
                    <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      STATUT
                    </div>
                    {['En cours', 'Terminé', 'Abandonné', 'À regarder'].map(status => (
                      <button
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(anime.id, status);
                          setShowMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 16px',
                          background: anime.statut_visionnage === status ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: anime.statut_visionnage === status ? 'var(--primary)' : 'var(--text)'
                        }}
                      >
                        {anime.statut_visionnage === status && '✓ '}{status}
                      </button>
                    ))}
                  </>
                )}
                {onToggleFavorite && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(anime.id);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Heart size={14} fill={anime.is_favorite ? '#ef4444' : 'none'} color={anime.is_favorite ? '#ef4444' : 'currentColor'} />
                      {anime.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    </button>
                  </>
                )}
              </div>
            )}
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

        {/* Badge "Nouveau" */}
        {isNew() && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.5)',
            zIndex: 2,
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🆕 Nouveau
          </span>
        )}

        {/* Bannières diagonales pour les statuts En cours / Terminé / Abandonné */}
        {(() => {
          const statut = anime.statut_visionnage;
          if (!statut || statut === 'À regarder') return null;
          
          let backgroundColor = '#f59e0b'; // En cours (orange)
          let label = 'En cours';
          
          if (statut === 'Terminé') {
            backgroundColor = '#10b981'; // Terminé (vert)
            label = 'Terminé';
          } else if (statut === 'Abandonné') {
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

      {/* Menu actions en haut à droite */}
      {(onStatusChange || onToggleFavorite) && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 5 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                minWidth: '180px',
                zIndex: 1000
              }}
            >
              {onStatusChange && (
                <>
                  <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    STATUT
                  </div>
                  {['En cours', 'Terminé', 'Abandonné', 'À regarder'].map(status => (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(anime.id, status);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        background: anime.statut_visionnage === status ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: anime.statut_visionnage === status ? 'var(--primary)' : 'var(--text)'
                      }}
                    >
                      {anime.statut_visionnage === status && '✓ '}{status}
                    </button>
                  ))}
                </>
              )}
              {onToggleFavorite && (
                <>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(anime.id);
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Heart size={14} fill={anime.is_favorite ? '#ef4444' : 'none'} color={anime.is_favorite ? '#ef4444' : 'currentColor'} />
                    {anime.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
