import { CheckCircle, Lock } from 'lucide-react';

interface SummaryStepProps {
  name: string;
  emoji: string;
  color: string;
  avatarPreview: string | null;
  baseDirectory: string | null;
  showMangas: boolean;
  showAnimes: boolean;
  showMovies: boolean;
  showSeries: boolean;
  showAdulteGame: boolean;
  adulteGamePassword: string;
}

export default function SummaryStep({
  name,
  emoji,
  color,
  avatarPreview,
  baseDirectory,
  showMangas,
  showAnimes,
  showMovies,
  showSeries,
  showAdulteGame,
  adulteGamePassword
}: SummaryStepProps) {
  return (
    <div>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.15)',
        border: '3px solid var(--success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <CheckCircle size={40} style={{ color: 'var(--success)' }} />
      </div>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '12px'
      }}>
        Tout est prêt !
      </h2>
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        Votre espace personnel a été créé avec succès. Vous pouvez maintenant commencer à gérer votre collection.
      </p>

      {/* Récapitulatif */}
      <div style={{
        padding: '24px',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '32px',
        textAlign: 'left'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '16px',
          color: 'var(--text-secondary)'
        }}>
          Récapitulatif
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: avatarPreview ? 'transparent' : `${color}22`,
            border: `2px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            overflow: 'hidden'
          }}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              emoji
            )}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {avatarPreview ? (
                <span>✅ Avatar personnalisé</span>
              ) : (
                <>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: color,
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }} />
                  Couleur personnalisée
                </>
              )}
            </div>
          </div>
        </div>
        {baseDirectory && (
          <div style={{
            padding: '12px',
            background: 'var(--background)',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            wordBreak: 'break-all'
          }}>
            📁 {baseDirectory}
          </div>
        )}
        
        {/* Préférences de contenu */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--background)',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            Contenu affiché sur l'accueil :
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {showMangas && (
              <span style={{
                padding: '4px 12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--primary)'
              }}>
                📚 Mangas
              </span>
            )}
            {showAnimes && (
              <span style={{
                padding: '4px 12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--primary)'
              }}>
                🎬 Animes
              </span>
            )}
            {showMovies && (
              <span style={{
                padding: '4px 12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--primary)'
              }}>
                🎞️ Films
              </span>
            )}
            {showSeries && (
              <span style={{
                padding: '4px 12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--primary)'
              }}>
                📺 Séries
              </span>
            )}
            {showAdulteGame && (
              <span style={{
                padding: '4px 12px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--primary)'
              }}>
                🎮 Jeux adulte
              </span>
            )}
          </div>
        </div>
        
        {/* Protection contenus adultes */}
        {(showAdulteGame || showMangas || showAnimes) && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: adulteGamePassword ? 'rgba(16, 185, 129, 0.1)' : 'var(--background)',
            border: adulteGamePassword ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: adulteGamePassword ? 'var(--success)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Lock size={14} />
              {adulteGamePassword ? '🔒 Protection des contenus adultes activée' : '🔓 Protection des contenus adultes non configurée'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
