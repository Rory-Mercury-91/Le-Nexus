import { Folder } from 'lucide-react';

interface DirectoryStepProps {
  baseDirectory: string | null;
  onChooseDirectory: () => Promise<void>;
  error?: string;
}

export default function DirectoryStep({ baseDirectory }: DirectoryStepProps) {
  return (
    <div>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(139, 92, 246, 0.15)',
        border: '3px solid var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <Folder size={40} style={{ color: 'var(--primary)' }} />
      </div>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '12px'
      }}>
        Choisissez l'emplacement
      </h2>
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        Sélectionnez où stocker vos données (base de données, couvertures, images de profil).
      </p>

      <div style={{
        padding: '20px',
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '12px',
        marginBottom: '24px',
        textAlign: 'left'
      }}>
        <p style={{
          fontSize: '14px',
          lineHeight: '1.7',
          color: 'var(--text-secondary)',
          margin: 0
        }}>
          💡 <strong>Conseil :</strong> Choisissez un dossier synchronisé (OneDrive, Google Drive, Proton Drive, etc.)
          pour sauvegarder automatiquement vos données dans le cloud.
        </p>
      </div>

      <div style={{
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        textAlign: 'left'
      }}>
        <strong>Ce qui sera stocké :</strong>
        <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
          <li>📦 Base de données (toutes vos séries et tomes)</li>
          <li>🖼️ Images de profils</li>
          <li>📚 Couvertures de séries et tomes</li>
        </ul>
      </div>

      {/* Affichage du chemin sélectionné */}
      {baseDirectory && (
        <div style={{
          padding: '16px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          color: 'var(--text)',
          wordBreak: 'break-all'
        }}>
          <strong>📁 Emplacement sélectionné :</strong>
          <div style={{ marginTop: '8px', fontFamily: 'monospace' }}>
            {baseDirectory}
          </div>
        </div>
      )}
    </div>
  );
}
