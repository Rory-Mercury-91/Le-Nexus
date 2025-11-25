import { Activity, Calendar, Code, Download, ExternalLink, Globe } from 'lucide-react';
import React from 'react';

interface AdulteGameInfoCardProps {
  titre?: string | null;
  statut_jeu?: string | null;
  moteur?: string | null;
  developpeur?: string | null;
  plateforme?: string | null;
  version?: string | null;
  version_traduite?: string | null;
  version_jouee?: string | null;
  derniere_session?: string | null;
  f95_thread_id?: number | null;
  lien_f95?: string | null;
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
  plateforme,
  version,
  version_traduite: _version_traduite,
  version_jouee,
  derniere_session,
  f95_thread_id,
  lien_f95
}) => {
  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Jamais';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getStatutInfo = (statut?: string | null) => {
    if (!statut) return null;
    const statutUpper = statut.toUpperCase();
    return STATUTS_JEU[statutUpper] || null;
  };

  // Fonction helper pour déterminer le nom du site dynamiquement
  const getSiteName = (): string => {
    if (lien_f95) {
      if (lien_f95.includes('lewdcorner.com')) {
        return 'LewdCorner';
      } else if (lien_f95.includes('f95zone.to')) {
        return 'F95Zone';
      }
    }
    if (plateforme) {
      return plateforme;
    }
    return 'Autre';
  };

  const getThreadLink = () => {
    if (lien_f95) return lien_f95;
    if (f95_thread_id) {
      const siteName = getSiteName();
      if (siteName === 'LewdCorner') {
        return `https://lewdcorner.com/threads/${f95_thread_id}/`;
      } else {
        return `https://f95zone.to/threads/${f95_thread_id}/`;
      }
    }
    return null;
  };

  const threadLink = getThreadLink();
  const siteName = getSiteName();

  return (
    <div className="card">
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <Activity size={24} style={{ color: 'var(--primary)' }} />
        Informations principales
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px 24px'
        }}
      >
        {/* Titre du jeu */}
        {titre && (
          <div style={{ gridColumn: '1 / -1' }}>
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
              Titre du jeu
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text)'
              }}
            >
              {titre}
            </div>
          </div>
        )}

        {/* Ligne 1 : Statut du jeu | Version actuelle */}
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
              {version || 'Non connue'}
            </div>
          </div>
        )}

        {/* Ligne 2 : Développeur | Moteur */}
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

        {/* Ligne 3 : Plateforme | Lien du thread */}
        {(plateforme || lien_f95) && (
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
              <Globe size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Plateforme
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--text)'
              }}
            >
              {siteName}
            </div>
          </div>
        )}

        {threadLink && (
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
              Lien du thread
            </div>
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
                padding: '8px 16px'
              }}
            >
              <ExternalLink size={16} />
              {siteName === 'LewdCorner' ? 'LewdCorner Thread' : siteName === 'F95Zone' ? 'F95Zone Thread' : `${siteName} Thread`}
            </a>
          </div>
        )}

        {/* Ligne 4 : Version jouée | Dernière session */}
        {version_jouee && (
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
              Version jouée
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--secondary)'
              }}
            >
              {version_jouee}
            </div>
          </div>
        )}

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
            <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Dernière session
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: '500',
              color: 'var(--text)'
            }}
          >
            {formatDateTime(derniere_session)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdulteGameInfoCard;
