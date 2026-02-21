import { Download, ExternalLink, User } from 'lucide-react';
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
      {hasMultipleTraductions ? (
        /* PLUSIEURS TRADUCTIONS - Affichage en grille 4 colonnes x 2 lignes */
        (() => {
          // Prendre les 2 premières traductions
          const displayTranslations = traductions.slice(0, 2);
          const hasSameTranslator = displayTranslations.length === 2 &&
            displayTranslations[0].traducteur === displayTranslations[1].traducteur;

          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gridTemplateRows: 'auto auto',
                gap: '20px 24px',
                alignItems: 'start'
              }}
            >
              {/* Colonne 1 : Traducteur */}
              <div
                style={{
                  gridRow: hasSameTranslator ? '1 / 3' : '1 / 2',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
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
                  {displayTranslations[0].traducteur || 'Inconnu'}
                </div>
              </div>

              {/* Colonnes 2-4 pour la première traduction */}
              {displayTranslations[0].type && (
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
                    Type de traduction
                  </div>
                  <div className="badge badge-primary">
                    {displayTranslations[0].type
                      .replace(/^(Traduction\s+)?(Type\s+(de\s+)?traduction\s*:?\s*)?/i, '')
                      .trim() || displayTranslations[0].type}
                  </div>
                </div>
              )}

              {displayTranslations[0].version && (
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
                    version traduction
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: version_actuelle && displayTranslations[0].version !== version_actuelle
                        ? 'var(--error)'
                        : 'var(--success)'
                    }}
                  >
                    {displayTranslations[0].version}
                  </div>
                </div>
              )}

              {displayTranslations[0].lien && (
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
                    href={displayTranslations[0].lien}
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
                    Lien du patch FR
                  </a>
                </div>
              )}

              {/* Ligne 2 : Traducteur (si différent) ou contenu traduction 2 */}
              {displayTranslations.length > 1 && (
                <>
                  {!hasSameTranslator && (
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
                        {displayTranslations[1].traducteur || 'Inconnu'}
                      </div>
                    </div>
                  )}

                  {displayTranslations[1].type && (
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
                        Type de traduction
                      </div>
                      <div className="badge badge-primary">
                        {displayTranslations[1].type
                          .replace(/^(Traduction\s+)?(Type\s+(de\s+)?traduction\s*:?\s*)?/i, '')
                          .trim() || displayTranslations[1].type}
                      </div>
                    </div>
                  )}

                  {displayTranslations[1].version && (
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
                        version traduction
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: version_actuelle && displayTranslations[1].version !== version_actuelle
                            ? 'var(--error)'
                            : 'var(--success)'
                        }}
                      >
                        {displayTranslations[1].version}
                      </div>
                    </div>
                  )}

                  {displayTranslations[1].lien && (
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
                        href={displayTranslations[1].lien}
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
                        Lien du patch FR
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()
      ) : (
        /* UNE SEULE TRADUCTION (affichage classique) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '20px 24px'
          }}
        >
          {/* Ligne : Traducteur | Type de traduction | version traduction | Patch de traduction */}
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
                Type de traduction
              </div>
              <div className="badge badge-primary">
                {type_trad_fr
                  .replace(/^(Traduction\s+)?(Type\s+(de\s+)?traduction\s*:?\s*)?/i, '')
                  .trim() || type_trad_fr}
              </div>
            </div>
          )}

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
                version traduction
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
                Lien du patch FR
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdulteGameTraductionCard;
