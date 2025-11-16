import { Loader2, Upload } from 'lucide-react';

interface AddAnimeMalImportSectionProps {
  malInput: string;
  setMalInput: (value: string) => void;
  importing: boolean;
  onImport: () => void;
}

/**
 * Section d'import depuis MyAnimeList pour AddAnimeModal
 */
export default function AddAnimeMalImportSection({
  malInput,
  setMalInput,
  importing,
  onImport
}: AddAnimeMalImportSectionProps) {
  return (
    <div style={{ 
      marginBottom: '24px', 
      padding: '20px', 
      border: '2px solid rgba(46, 81, 162, 0.3)',
      borderRadius: '12px',
      background: 'rgba(46, 81, 162, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: '#2e51a2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          MAL
        </div>
        <label style={{ fontWeight: '600', fontSize: '15px' }}>
          Importer depuis MyAnimeList
        </label>
      </div>
      <p style={{ 
        fontSize: '12px', 
        color: 'var(--text-secondary)', 
        marginBottom: '12px',
        lineHeight: '1.5'
      }}>
        🚀 <strong>Import complet automatique</strong> : ID ou URL → Toutes les données (cover HD, synopsis traduit, genres, etc.) récupérées automatiquement !
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Ex: 59027 ou https://myanimelist.net/anime/59027/..."
          value={malInput}
          onChange={(e) => setMalInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onImport();
            }
          }}
          className="input"
          style={{ flex: 1 }}
          disabled={importing}
        />
        <button
          type="button"
          onClick={onImport}
          className="btn"
          style={{
            background: '#2e51a2',
            color: 'white',
            border: 'none'
          }}
          disabled={importing || !malInput.trim()}
        >
          {importing ? (
            <>
              <Loader2 size={20} className="spin" />
              Import...
            </>
          ) : (
            <>
              <Upload size={20} />
              Importer
            </>
          )}
        </button>
      </div>
      <p style={{ 
        fontSize: '11px', 
        color: 'var(--text-secondary)', 
        marginTop: '8px',
        fontStyle: 'italic'
      }}>
        💡 Exemples : <code style={{ 
          background: 'rgba(139, 92, 246, 0.1)', 
          padding: '2px 6px', 
          borderRadius: '4px',
          fontSize: '11px'
        }}>59027</code> ou <code style={{ 
          background: 'rgba(139, 92, 246, 0.1)', 
          padding: '2px 6px', 
          borderRadius: '4px',
          fontSize: '11px'
        }}>https://myanimelist.net/anime/59027/Spy_x_Family_Season_3</code>
      </p>
    </div>
  );
}
