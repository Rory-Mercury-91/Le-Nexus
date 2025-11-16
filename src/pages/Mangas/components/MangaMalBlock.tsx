import { Serie } from '../../../types';

interface MangaMalBlockProps {
  serie: Serie;
  shouldShow: (field: string) => boolean;
}

export default function MangaMalBlock({ serie, shouldShow }: MangaMalBlockProps) {
  if (!serie.mal_id || !shouldShow('mal_block')) return null;
  
  const hasMalData = serie.score_mal || serie.rank_mal || serie.popularity_mal || serie.background || 
                    serie.statut_lecture || serie.score_utilisateur;
  
  if (!hasMalData) return null;

  return (
    <div style={{
      padding: '16px',
      marginBottom: '20px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: 'var(--surface)'
    }}>
      <div style={{ 
        fontSize: '12px', 
        fontWeight: '600', 
        color: 'var(--text-secondary)', 
        marginBottom: '16px',
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px'
      }}>
        <span style={{
          background: '#2E51A2',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'white',
          fontWeight: '600'
        }}>
          MAL
        </span>
        <span>Informations MyAnimeList</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Ligne 1: Toutes les statistiques et infos personnelles sur une seule ligne */}
        {(serie.score_mal || serie.rank_mal || serie.popularity_mal || serie.score_utilisateur || serie.statut_lecture) && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '20px',
            alignItems: 'start'
          }}>
            {serie.score_mal && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Score MAL
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  {serie.score_mal.toFixed(2)}
                </span>
              </div>
            )}
            
            {serie.rank_mal && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Rank MAL
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  {serie.rank_mal.toLocaleString()}
                </span>
              </div>
            )}
            
            {serie.popularity_mal && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Popularité MAL
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  {serie.popularity_mal.toLocaleString()}
                </span>
              </div>
            )}
            
            {serie.score_utilisateur && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Votre note
                </span>
                <span style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: '700' }}>
                  ⭐ {serie.score_utilisateur}/10
                </span>
              </div>
            )}
            
            {serie.statut_lecture && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Votre statut MAL
                </span>
                <span style={{ 
                  fontSize: '15px', 
                  fontWeight: '600',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: serie.statut_lecture === 'Terminée' ? 'rgba(16, 185, 129, 0.15)' : 
                             serie.statut_lecture === 'En cours' ? 'rgba(59, 130, 246, 0.15)' : 
                             'rgba(107, 114, 128, 0.15)',
                  color: serie.statut_lecture === 'Terminée' ? '#10b981' : 
                         serie.statut_lecture === 'En cours' ? '#3b82f6' : 
                         '#6b7280'
                }}>
                  {serie.statut_lecture}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ligne 2: Background pleine largeur (en dernier) */}
        {serie.background && (
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Background (historique/description détaillée)
            </span>
            <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6', margin: 0 }}>
              {serie.background}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
