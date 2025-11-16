import { Calendar } from 'lucide-react';
import { AnimeSerie } from '../../../types';
import { translateSeason } from '../../../utils/translations';

interface AnimeInfoCardsProps {
  anime: AnimeSerie;
  shouldShow: (field: string) => boolean;
}

export default function AnimeInfoCards({ anime, shouldShow }: AnimeInfoCardsProps) {
  const showDateDebut = Boolean(anime.date_debut) && shouldShow('date_debut');
  const showDateFin = Boolean(anime.date_fin) && shouldShow('date_fin');
  const showDateSortieVf = Boolean(anime.date_sortie_vf) && shouldShow('date_sortie_vf');
  const showDiffusionBlock = showDateDebut || showDateFin || showDateSortieVf;
  const showSaison = Boolean(anime.saison_diffusion) && shouldShow('saison_diffusion');

  if (!showDiffusionBlock && !showSaison) {
    return null;
  }

  return (
    <div style={{
      marginTop: '20px',
      marginBottom: '20px'
    }}>
      <div style={{
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: showDiffusionBlock && showSaison ? 'repeat(2, 1fr)' : '1fr',
        gap: '16px'
      }}>
        {/* Première colonne : Diffusion */}
        {showDiffusionBlock && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Diffusion</div>
            {(showDateDebut || showDateFin) && (
              <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                <span>
                  {showDateDebut && new Date(anime.date_debut!).toLocaleDateString('fr-FR')}
                  {showDateDebut && showDateFin && ' ⇒ '}
                  {showDateFin && new Date(anime.date_fin!).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
            {showDateSortieVf && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #0055A4 0%, #0055A4 33%, #FFFFFF 33%, #FFFFFF 66%, #EF4135 66%, #EF4135 100%)',
                  color: '#000000',
                  flexShrink: 0,
                  letterSpacing: '0.5px'
                }}>
                  FR
                </span>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  Disponibilité VF : {anime.date_sortie_vf ? new Date(anime.date_sortie_vf).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Deuxième colonne : Saison de diffusion */}
        {showSaison && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Saison de diffusion</div>
            <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500' }}>
              {anime.saison_diffusion ? translateSeason(anime.saison_diffusion) : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
