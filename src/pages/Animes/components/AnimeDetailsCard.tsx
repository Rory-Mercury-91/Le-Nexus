import { AnimeSerie } from '../../../types';
import { translateRating } from '../../../utils/translations';

interface AnimeDetailsCardProps {
  anime: AnimeSerie;
}

export default function AnimeDetailsCard({ anime }: AnimeDetailsCardProps) {
  return (
    <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Informations</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
        {/* Studios */}
        {anime.studios && (
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Studios : </strong>
            <span style={{ fontSize: '14px' }}>{anime.studios}</span>
          </div>
        )}

        {/* Producteurs */}
        {anime.producteurs && (
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Producteurs : </strong>
            <span style={{ fontSize: '14px' }}>{anime.producteurs}</span>
          </div>
        )}

        {/* Diffuseurs */}
        {anime.diffuseurs && (
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Diffuseurs : </strong>
            <span style={{ fontSize: '14px' }}>{anime.diffuseurs}</span>
          </div>
        )}

        {/* Rating */}
        {anime.rating && (
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Classification : </strong>
            <span style={{ fontSize: '14px' }}>{translateRating(anime.rating)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
