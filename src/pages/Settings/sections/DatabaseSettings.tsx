import { CheckCircle, Download, FolderOpen, Upload } from 'lucide-react';

interface DatabaseSettingsProps {
  baseDirectory: string;
  exporting: boolean;
  importing: boolean;
  showSuccess: boolean;
  showExportSuccess: boolean;
  showImportSuccess: boolean;
  onChangeBaseDirectory: () => void;
  onExport: () => void;
  onImport: () => void;
}

export default function DatabaseSettings({
  baseDirectory,
  exporting,
  importing,
  showSuccess,
  showExportSuccess,
  showImportSuccess,
  onChangeBaseDirectory,
  onExport,
  onImport,
}: DatabaseSettingsProps) {
  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        💾 Emplacement de la base
      </h2>
      
      <div>
        <div style={{
          background: 'var(--surface)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontFamily: 'monospace',
          fontSize: '12px',
          wordBreak: 'break-all'
        }}>
          {baseDirectory}
        </div>

        <button onClick={onChangeBaseDirectory} className="btn btn-primary">
          <FolderOpen size={18} />
          Changer l'emplacement
        </button>

        {showSuccess && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} />
            Emplacement modifié avec succès !
          </div>
        )}

        <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          padding: '12px',
          background: 'var(--surface)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--primary)'
        }}>
          💡 Tous les utilisateurs partagent cette base de données. Idéal pour une utilisation cloud (Proton Drive, OneDrive, etc.).
        </p>

        {/* Export/Import intégré */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Export / Import
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={onExport}
              className="btn btn-primary"
              disabled={exporting}
            >
              <Download size={18} />
              {exporting ? 'Export en cours...' : 'Exporter'}
            </button>

            <button
              onClick={onImport}
              className="btn btn-outline"
              disabled={importing}
            >
              <Upload size={18} />
              {importing ? 'Import en cours...' : 'Importer'}
            </button>
          </div>

          {showExportSuccess && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={18} />
              Base de données exportée avec succès !
            </div>
          )}

          {showImportSuccess && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={18} />
              Import réussi ! Rechargement...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
