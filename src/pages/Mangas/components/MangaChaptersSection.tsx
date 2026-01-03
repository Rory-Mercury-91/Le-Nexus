import { FileText } from 'lucide-react';
import { Serie } from '../../../types';

interface MangaChaptersSectionProps {
  serie: Serie;
  onChapitresLusChange: (value: number) => Promise<void>;
  onNbChapitresChange: (value: number) => Promise<void>;
  onChapitresMihonChange: (value: boolean) => Promise<void>;
  shouldShow: boolean;
}

export function MangaChaptersSection({ serie, onChapitresLusChange, onNbChapitresChange, onChapitresMihonChange, shouldShow }: MangaChaptersSectionProps) {
  // Toujours afficher la section si shouldShow est true, même si les données sont à 0/null
  // Cela permet d'afficher la section pour tous les utilisateurs lors d'un partage
  if (!shouldShow) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <FileText size={20} />
        Chapitres ({serie.nb_chapitres || 0})
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

        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          |
        </span>

        {/* Checkbox Mihon */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={serie.chapitres_mihon === 1}
            onChange={async (e) => {
              await onChapitresMihonChange(e.target.checked);
            }}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: 'var(--warning)',
              flexShrink: 0
            }}
            title={serie.chapitres_mihon === 1 ? 'Marquer comme non Mihon' : 'Marquer comme Mihon'}
          />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Mihon
          </span>
        </label>
      </div>
    </div>
  );
}
