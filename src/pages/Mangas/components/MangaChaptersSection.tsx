import { Serie } from '../../../types';

interface MangaChaptersSectionProps {
  serie: Serie;
  onChapitresLusChange: (value: number) => Promise<void>;
  onNbChapitresChange: (value: number) => Promise<void>;
  shouldShow: boolean;
}

export function MangaChaptersSection({ serie, onChapitresLusChange, onNbChapitresChange, shouldShow }: MangaChaptersSectionProps) {
  const shouldShowChapters = (serie.type_contenu && (serie.type_contenu === 'chapitre' || serie.type_contenu === 'volume+chapitre')) || 
    (serie.chapitres_lus !== null && serie.chapitres_lus !== undefined) || 
    (serie.nb_chapitres !== null && serie.nb_chapitres !== undefined);

  if (!shouldShow || !shouldShowChapters) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📖 Chapitres ({serie.nb_chapitres || 0})
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Chapitres lus :
        </span>
        <input
          type="number"
          min="0"
          max={serie.nb_chapitres || 9999}
          value={serie.chapitres_lus || 0}
          onChange={async (e) => {
            const newValue = Math.min(Math.max(0, parseInt(e.target.value) || 0), serie.nb_chapitres || 9999);
            await onChapitresLusChange(newValue);
          }}
          style={{
            width: '80px',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            fontSize: '14px',
            textAlign: 'center'
          }}
        />
        
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          |
        </span>
        
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Chapitres total :
        </span>
        <input
          type="number"
          min="0"
          value={serie.nb_chapitres || 0}
          onChange={async (e) => {
            const newValue = Math.max(0, parseInt(e.target.value) || 0);
            await onNbChapitresChange(newValue);
          }}
          style={{
            width: '80px',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            fontSize: '14px',
            textAlign: 'center'
          }}
        />
      </div>
    </div>
  );
}
