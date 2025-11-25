import { Download, ExternalLink, Flag, Languages, User } from 'lucide-react';
import React from 'react';

interface Traduction {
  version: string;
  lien: string;
  type: string;
  traducteur: string;
}

interface AdulteGameTraductionCardProps {
  version_traduite?: string | null;
  version_actuelle?: string | null;
  type_trad_fr?: string | null;
  traducteur?: string | null;
  lien_traduction?: string | null;
  traductions_multiples?: string | null;
}

const AdulteGameTraductionCard: React.FC<AdulteGameTraductionCardProps> = ({
  version_traduite,
  version_actuelle,
  type_trad_fr,
  traducteur,
  lien_traduction,
  traductions_multiples
}) => {
  
  // Parser les traductions multiples
  let traductions: Traduction[] = [];
  try {
    if (traductions_multiples) {
      traductions = JSON.parse(traductions_multiples);
    }
  } catch (e) {
    console.error('Erreur parsing traductions_multiples:', e);
  }
  
  // Si plusieurs traductions, afficher la liste complète
  const hasMultipleTraductions = traductions.length > 1;
  
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
        <Flag size={24} style={{ color: 'var(--primary)' }} />
        Traduction française
      </h2>

      {hasMultipleTraductions ? (
        /* PLUSIEURS TRADUCTIONS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}
          >
            {traductions.length} traductions disponibles pour ce jeu
          </div>
          
          {traductions.map((trad, index) => (
            <div
              key={index}
              style={{
                background: 'var(--surface-light)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Version */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Download size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
                  Version {trad.version}
                </span>
              </div>

              {/* Type + Traducteur */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="badge badge-primary">
                  <Languages size={12} style={{ marginRight: '4px' }} />
                  {trad.type}
                </div>
                <div className="badge badge-secondary">
                  <User size={12} style={{ marginRight: '4px' }} />
                  {trad.traducteur}
                </div>
              </div>

              {/* Lien */}
              <a
                href={trad.lien}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  width: '100%'
                }}
              >
                <ExternalLink size={16} />
                Télécharger cette traduction
              </a>
            </div>
          ))}
        </div>
      ) : (
        /* UNE SEULE TRADUCTION (affichage classique) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px 24px'
          }}
        >
          {/* Ligne 1 : Traducteur | Type de traduction */}
          {traducteur && (
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
                <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Traducteur
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '500',
                  color: 'var(--secondary)'
                }}
              >
                {traducteur}
              </div>
            </div>
          )}

          {type_trad_fr && (
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
                <Languages size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Type de traduction
              </div>
              <div className="badge badge-primary">
                {type_trad_fr}
              </div>
            </div>
          )}

          {/* Ligne 2 : Version traduite | Patch de traduction */}
          {version_traduite && (
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
                Version traduite
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: (() => {
                    if (!version_traduite) {
                      return 'var(--text-secondary)';
                    }
                    // Si c'est "intégré", couleur neutre
                    if (version_traduite.toLowerCase().includes('intégré')) {
                      return 'var(--text)';
                    }
                    // Sinon, comparer avec la version actuelle
                    if (version_actuelle && version_traduite !== version_actuelle) {
                      return 'var(--error)';
                    }
                    return 'var(--success)';
                  })()
                }}
              >
                {version_traduite}
              </div>
            </div>
          )}

          {lien_traduction && (
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
                Patch de traduction
              </div>
              <a
                href={lien_traduction}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  padding: '8px 16px'
                }}
              >
                <ExternalLink size={16} />
                Télécharger le patch FR
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdulteGameTraductionCard;
