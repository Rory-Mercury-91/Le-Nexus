import { Statistics } from '../../../types';

interface CostsByOwnerProps {
  stats: Statistics;
  coutTotal: number;
}

export default function CostsByOwner({ stats, coutTotal }: CostsByOwnerProps) {
  const users = stats.users || [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px' }}>
        {users.map(user => {
          const nbMangas = stats.nbMangasParProprietaire?.[user.id] || 0;
          const nbBd = stats.nbBdParProprietaire?.[user.id] || 0;
          const nbComics = stats.nbComicsParProprietaire?.[user.id] || 0;
          const nbLivres = stats.nbLivresParProprietaire?.[user.id] || 0;
          const nbJeuxVideos = stats.nbJeuxVideosParProprietaire?.[user.id] || 0;
          const nbJeuxAdultes = stats.nbJeuxAdultesParProprietaire?.[user.id] || 0;
          const coutAbonnements = stats.coutsAbonnementsParProprietaire?.[user.id] || 0;
          const coutAchatsPonctuels = stats.coutsAchatsPonctuelsParProprietaire?.[user.id] || 0;

          return (
            <div key={user.id} className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: user.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{user.emoji}</span>
                {user.name}
              </h3>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
                {(stats.totaux[user.id] || 0).toFixed(2)}€
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {nbMangas > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    📖 {nbMangas} manga{nbMangas > 1 ? 's' : ''}
                  </p>
                )}
                {nbBd > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    📚 {nbBd} BD{nbBd > 1 ? 's' : ''}
                  </p>
                )}
                {nbComics > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    💥 {nbComics} comic{nbComics > 1 ? 's' : ''}
                  </p>
                )}
                {nbLivres > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    📗 {nbLivres} livre{nbLivres > 1 ? 's' : ''}
                  </p>
                )}
                {nbJeuxVideos > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    🎮 {nbJeuxVideos} jeu{nbJeuxVideos > 1 ? 'x' : ''} vidéo{nbJeuxVideos > 1 ? 's' : ''}
                  </p>
                )}
                {nbJeuxAdultes > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    🔞 {nbJeuxAdultes} jeu{nbJeuxAdultes > 1 ? 'x' : ''} adulte{nbJeuxAdultes > 1 ? 's' : ''}
                  </p>
                )}
                {coutAbonnements > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    💳 {coutAbonnements.toFixed(2)}€/mois (abonnements)
                  </p>
                )}
                {coutAchatsPonctuels > 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    🛒 {coutAchatsPonctuels.toFixed(2)}€ (achats ponctuels)
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--surface), var(--surface-light))' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--warning)' }}>
            Total
          </h3>
          <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
            {coutTotal.toFixed(2)}€
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(() => {
              const totalMangas = stats.nbMangasParProprietaire ? Object.values(stats.nbMangasParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalBd = stats.nbBdParProprietaire ? Object.values(stats.nbBdParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalComics = stats.nbComicsParProprietaire ? Object.values(stats.nbComicsParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalLivres = stats.nbLivresParProprietaire ? Object.values(stats.nbLivresParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalJeuxVideos = stats.nbJeuxVideosParProprietaire ? Object.values(stats.nbJeuxVideosParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalJeuxAdultes = stats.nbJeuxAdultesParProprietaire ? Object.values(stats.nbJeuxAdultesParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalAbonnements = stats.coutsAbonnementsParProprietaire ? Object.values(stats.coutsAbonnementsParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;
              const totalAchatsPonctuels = stats.coutsAchatsPonctuelsParProprietaire ? Object.values(stats.coutsAchatsPonctuelsParProprietaire).reduce((sum: number, val: any) => sum + (val || 0), 0) : 0;

              return (
                <>
                  {totalMangas > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      📖 {totalMangas} manga{totalMangas > 1 ? 's' : ''}
                    </p>
                  )}
                  {totalBd > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      📚 {totalBd} BD{totalBd > 1 ? 's' : ''}
                    </p>
                  )}
                  {totalComics > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      💥 {totalComics} comic{totalComics > 1 ? 's' : ''}
                    </p>
                  )}
                  {totalLivres > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      📗 {totalLivres} livre{totalLivres > 1 ? 's' : ''}
                    </p>
                  )}
                  {totalJeuxVideos > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      🎮 {totalJeuxVideos} jeu{totalJeuxVideos > 1 ? 'x' : ''} vidéo{totalJeuxVideos > 1 ? 's' : ''}
                    </p>
                  )}
                  {totalJeuxAdultes > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      🔞 {totalJeuxAdultes} jeu{totalJeuxAdultes > 1 ? 'x' : ''} adulte{totalJeuxAdultes > 1 ? 's' : ''}
                    </p>
                  )}
                  {totalAbonnements > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      💳 {totalAbonnements.toFixed(2)}€/mois (abonnements)
                    </p>
                  )}
                  {totalAchatsPonctuels > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      🛒 {totalAchatsPonctuels.toFixed(2)}€ (achats ponctuels)
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
