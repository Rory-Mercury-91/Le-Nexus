import { Code, Download, ExternalLink, Tag } from 'lucide-react';
import React from 'react';
import { translateAdulteGameTag } from '../../../utils/translations';

interface AdulteGameInfoCardProps {
  titre?: string | null;
  statut_jeu?: string | null;
  moteur?: string | null;
  developpeur?: string | null;
  plateforme?: string | null;
  version?: string | null;
  tags?: string | string[] | null;
  f95_thread_id?: number | null;
  lien_f95?: string | null;
  Lewdcorner_thread_id?: number | null;
  lien_lewdcorner?: string | null;
  currentUserId?: number | null;
  tagPreferences?: Record<string, 'liked' | 'disliked' | 'neutral'>;
  onTagClick?: (tag: string) => void;
}

// Dictionnaire des statuts de jeu avec émoticônes
const STATUTS_JEU: Record<string, { label: string; color: string }> = {
  'EN COURS': { label: '🎮 EN COURS', color: 'var(--primary)' },
  'TERMINÉ': { label: '✅ TERMINÉ', color: 'var(--success)' },
  'ABANDONNÉ': { label: '❌ ABANDONNÉ', color: 'var(--error)' }
};

const AdulteGameInfoCard: React.FC<AdulteGameInfoCardProps> = ({
  titre,
  statut_jeu,
  moteur,
  developpeur,
  currentUserId,
  tagPreferences = {},
  onTagClick,
  plateforme,
  version,
  tags,
  f95_thread_id,
  lien_f95,
  Lewdcorner_thread_id,
  lien_lewdcorner
}) => {
  const getStatutInfo = (statut?: string | null) => {
    if (!statut) return null;
    const statutUpper = statut.toUpperCase();
    return STATUTS_JEU[statutUpper] || null;
  };

  // Parser les tags (peut être JSON array, string, ou déjà parsé)
  const parseTags = (): string[] => {
    if (!tags) return [];

    // Si c'est déjà un tableau
    if (Array.isArray(tags)) {
      return tags;
    }

    // Si c'est une string
    if (typeof tags === 'string') {
      try {
        // Essayer de parser comme JSON
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Si ce n'est pas du JSON valide, séparer par virgules
        return tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }
    }

    return [];
  };

  const rawTagsList = parseTags();

  // Garder les tags originaux (en anglais) pour les préférences
  const tagsList = rawTagsList;

  // Fonction helper pour déterminer le nom du site dynamiquement
  const getThreadLink = () => {
    // Priorité aux liens LewdCorner spécifiques
    if (lien_lewdcorner) return lien_lewdcorner;
    if (Lewdcorner_thread_id) {
      return `https://lewdcorner.com/threads/${Lewdcorner_thread_id}/`;
    }

    // Puis liens F95Zone
    if (lien_f95) return lien_f95;
    if (f95_thread_id) {
      return `https://f95zone.to/threads/${f95_thread_id}/`;
    }

    return null;
  };

  const getSiteName = (link: string | null): string => {
    if (!link) return 'Lien du jeu';

    // Vérifier F95Zone
    if (link.includes('f95zone.to')) {
      return 'F95Zone';
    }

    // Vérifier LewdCorner
    if (link.includes('lewdcorner.com')) {
      return 'LewdCorner';
    }

    // Autres liens
    return 'Lien du jeu';
  };

  const threadLink = getThreadLink();
  const siteName = getSiteName(threadLink);

  return (
    <div className="card">
      {/* Titre du jeu avec bouton à droite */}
      {titre && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--text)',
              lineHeight: '1.4',
              flex: 1,
              wordBreak: 'break-word'
            }}
          >
            {titre}
          </div>
          {threadLink && (
            <a
              href={threadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '8px 16px',
                flexShrink: 0,
                alignSelf: 'flex-start'
              }}
            >
              <ExternalLink size={16} />
              {siteName}
            </a>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '20px 24px'
        }}
      >

        {/* Ligne : Statut du jeu | Version actuelle | Développeur | Moteur */}
        {statut_jeu && (() => {
          const statutInfo = getStatutInfo(statut_jeu);
          return (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Statut du jeu
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: statutInfo?.color || 'var(--text-secondary)',
                  padding: '6px 12px',
                  background: statutInfo ? `${statutInfo.color}20` : 'var(--surface-light)',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}
              >
                {statutInfo?.label || statut_jeu}
              </div>
            </div>
          );
        })()}

        {version && (
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <Download size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Version actuelle
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: 'var(--text)'
              }}
            >
              {version || 'Indisponible'}
            </div>
          </div>
        )}

        {developpeur && (
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Développeur
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--text)'
              }}
            >
              {developpeur}
            </div>
          </div>
        )}

        {moteur && (
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <Code size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Moteur
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--text)'
              }}
            >
              {moteur}
            </div>
          </div>
        )}

        {/* Tags (pleine largeur) */}
        {tagsList.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Tag size={14} />
              Tags
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              {tagsList.map((tag, index) => {
                const preference = tagPreferences[tag] || 'neutral';
                const colors = {
                  liked: { bg: '#10b981', border: '#10b981' },     // Vert
                  disliked: { bg: '#ef4444', border: '#ef4444' },  // Rouge
                  neutral: { bg: '#f59e0b', border: '#f59e0b' }    // Orange (défaut)
                };
                const color = colors[preference];

                // Traduire le tag pour l'affichage uniquement
                const translatedTag = translateAdulteGameTag(tag);

                return (
                  <div
                    key={index}
                    onClick={() => onTagClick?.(tag)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      textTransform: 'lowercase',
                      background: color.bg,
                      color: 'white',
                      border: `2px solid ${color.border}`,
                      fontWeight: '500',
                      cursor: onTagClick ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      opacity: onTagClick ? 1 : 0.9
                    }}
                    onMouseEnter={(e) => {
                      if (onTagClick) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (onTagClick) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {translatedTag}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdulteGameInfoCard;
