import { AnimeSerie } from '../../../types';

interface AnimeMalBlockProps {
  anime: AnimeSerie;
  shouldShow: (field: string) => boolean;
}

export default function AnimeMalBlock({ anime, shouldShow }: AnimeMalBlockProps) {
  if (!anime.mal_id || !shouldShow('mal_block')) return null;
  
  const hasMalData = anime.score || anime.rank_mal || anime.popularity_mal || anime.scored_by || 
                    anime.favorites || anime.background;
  
  if (!hasMalData) return null;

  return (
    <div style={{
      padding: '16px',
      marginTop: '20px',
      marginBottom: '20px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: 'var(--surface)'
    }}>
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: '700', 
        marginBottom: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        color: 'var(--text)'
      }}>
        <span style={{
          background: '#2E51A2',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'white',
          fontWeight: '700'
        }}>
          📊 MAL
        </span>
        Informations MyAnimeList
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Ligne 1: Toutes les statistiques sur une seule ligne */}
        {(anime.score || anime.rank_mal || anime.popularity_mal || anime.scored_by || anime.favorites) && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '20px',
            alignItems: 'start'
          }}>
            {anime.score && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Score MAL
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  {anime.score.toFixed(2)}
                </span>
              </div>
            )}
            
            {anime.rank_mal && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Rank MAL
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  #{anime.rank_mal.toLocaleString()}
                </span>
              </div>
            )}
            
            {anime.popularity_mal && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Popularité MAL
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  #{anime.popularity_mal.toLocaleString()}
                </span>
              </div>
            )}

            {anime.scored_by && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Noté par
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  {anime.scored_by.toLocaleString()} utilisateurs
                </span>
              </div>
            )}

            {anime.favorites && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Favoris
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>
                  {anime.favorites.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ligne 2: Background pleine largeur (en dernier) */}
        {anime.background && (
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Background (historique/description détaillée)
            </span>
            <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6', margin: 0 }}>
              {anime.background}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
