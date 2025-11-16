import { Serie, Tome } from '../../../types';

interface MangaProgressSectionProps {
  serie: Serie;
  tomes: Tome[];
  onMarkAllRead: () => Promise<void>;
  onMarkAllChaptersRead: () => Promise<void>;
  shouldShow: boolean;
}

export function MangaProgressSection({ serie, tomes, onMarkAllRead, onMarkAllChaptersRead, shouldShow }: MangaProgressSectionProps) {
  const shouldShowProgress = ((serie.type_contenu && serie.type_contenu !== 'chapitre' && tomes.length > 0) || 
    (serie.chapitres_lus !== null && serie.chapitres_lus !== undefined && serie.chapitres_lus > 0));

  if (!shouldShow || !shouldShowProgress) return null;

  const tomesLus = tomes.filter(t => t.lu === 1).length;
  const progressionTomes = tomes.length > 0 ? (tomesLus / tomes.length) * 100 : 0;
  
  const chapitresLus = serie.chapitres_lus || 0;
  const chapitresTotal = serie.nb_chapitres || 0;
  const progressionChapitres = chapitresTotal > 0 ? (chapitresLus / chapitresTotal) * 100 : 0;

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📚 Votre progression
      </h3>
      
      {/* Progression des tomes (si applicable) */}
      {serie.type_contenu && serie.type_contenu !== 'chapitre' && tomes.length > 0 && (
        <div style={{ marginBottom: chapitresLus > 0 ? '20px' : '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
              {tomesLus} / {tomes.length} lus
            </span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
              {progressionTomes.toFixed(0)}%
            </span>
          </div>
          
          {/* Barre de progression tomes */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'var(--surface)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: '12px'
          }}>
            <div style={{
              width: `${progressionTomes}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          {tomesLus === tomes.length && tomes.length > 0 && (
            <div style={{
              padding: '8px',
              background: 'var(--success)22',
              border: '1px solid var(--success)',
              borderRadius: '6px',
              color: 'var(--success)',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              🎉 Série complétée !
            </div>
          )}
          
          <button 
            onClick={onMarkAllRead}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px' }}
          >
            ✓ Tout marquer comme lu
          </button>
        </div>
      )}
      
      {/* Progression des chapitres (si présente) */}
      {chapitresLus > 0 && chapitresTotal > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
              Chapitres lus : {chapitresLus} / {chapitresTotal}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
              {progressionChapitres.toFixed(0)}%
            </span>
          </div>
          
          {/* Barre de progression chapitres */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'var(--surface)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: '12px'
          }}>
            <div style={{
              width: `${progressionChapitres}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          {chapitresLus === chapitresTotal && chapitresTotal > 0 && (
            <div style={{
              padding: '8px',
              background: 'var(--success)22',
              border: '1px solid var(--success)',
              borderRadius: '6px',
              color: 'var(--success)',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              🎉 Tous les chapitres lus !
            </div>
          )}
          
          <button
            onClick={onMarkAllChaptersRead}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px' }}
            disabled={!chapitresTotal}
          >
            ✓ Tout lu
          </button>
        </div>
      )}
    </div>
  );
}
