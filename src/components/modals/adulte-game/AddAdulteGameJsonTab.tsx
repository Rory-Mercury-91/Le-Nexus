
interface AddAdulteGameJsonTabProps {
  jsonData: string;
  setJsonData: (data: string) => void;
  setJsonError: (error: string) => void;
  jsonError: string;
  loading: boolean;
  onImport: () => void;
}

/**
 * Onglet d'import JSON (LewdCorner) pour AddAdulteGameModal
 */
export default function AddAdulteGameJsonTab({
  jsonData,
  setJsonData,
  setJsonError,
  jsonError,
  loading,
  onImport
}: AddAdulteGameJsonTabProps) {
  return (
    <div>
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <p style={{ marginBottom: '8px', color: 'var(--text)' }}>
          Le script fonctionne avec <strong>Tampermonkey</strong>.
        </p>
        <button
          onClick={() => window.electronAPI.openExternal?.('https://raw.githubusercontent.com/Hunteraulo1/f95list-extractor/refs/heads/main/dist/toolExtractor.user.js')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            textDecoration: 'underline',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '0',
            font: 'inherit'
          }}
        >
          📥 Installer le script
        </button>
      </div>

      <p style={{
        fontSize: '14px',
        marginBottom: '12px',
        color: 'var(--text-secondary)'
      }}>
        Veuillez coller les données de <strong>LC Extractor</strong> :
      </p>

      <textarea
        value={jsonData}
        onChange={(e) => {
          setJsonData(e.target.value);
          setJsonError(''); // Réinitialiser l'erreur quand l'utilisateur tape
        }}
        placeholder='{"id":2745,"domain":"LewdCorner","name":"Blackheart Hotel: Aftermath","version":"v1.0","status":"EN COURS","tags":"3dcg, anal sex, animated...","type":"RenPy","link":"https://lewdcorner.com/threads/2745","image":"https://..."}'
        style={{
          width: '100%',
          minHeight: '250px',
          padding: '16px',
          borderRadius: '8px',
          border: jsonError ? '2px solid var(--error)' : '1px solid var(--border)',
          background: 'var(--background)',
          color: 'var(--text)',
          fontSize: '13px',
          fontFamily: 'monospace',
          resize: 'vertical',
          marginBottom: '16px'
        }}
      />

      {jsonError && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          color: 'var(--error)',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          ⚠️ {jsonError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onImport}
          disabled={!jsonData.trim() || loading}
          className="btn btn-primary"
        >
          {loading ? 'Import en cours...' : 'Importer le jeu'}
        </button>
      </div>
    </div>
  );
}
