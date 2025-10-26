import { AlertTriangle, Trash2 } from 'lucide-react';

interface DangerZoneProps {
  onDeleteUserData: () => void;
  onDeleteAllData: () => void;
}

export default function DangerZone({ onDeleteUserData, onDeleteAllData }: DangerZoneProps) {
  return (
    <div style={{ marginBottom: '30px' }}>
      <details style={{
        border: '1px solid var(--error)',
        background: 'rgba(239, 68, 68, 0.05)',
        borderRadius: '12px',
        padding: '0'
      }}>
        <summary style={{
          padding: '20px',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--error)',
          fontSize: '18px',
          fontWeight: '700',
          userSelect: 'none'
        }}>
          <AlertTriangle size={20} />
          Zone dangereuse
          <span style={{ marginLeft: 'auto', fontSize: '14px', opacity: 0.6 }}>▼ Cliquez pour afficher</span>
        </summary>
        <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{
        marginBottom: '16px',
        padding: '12px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '8px',
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#fb923c'
      }}>
        ⚠️ <strong>Attention :</strong> Ces actions sont <strong>irréversibles</strong>. Assurez-vous d'avoir une sauvegarde avant de continuer.
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        {/* Supprimer données utilisateur */}
        <button
          onClick={onDeleteUserData}
          className="btn btn-outline"
          style={{
            justifyContent: 'center',
            fontSize: '13px',
            padding: '12px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444'
          }}
        >
          <Trash2 size={16} />
          Supprimer mes données
        </button>

        {/* Supprimer toutes les données */}
        <button
          onClick={onDeleteAllData}
          className="btn btn-outline"
          style={{
            justifyContent: 'center',
            fontSize: '13px',
            padding: '12px 20px',
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            fontWeight: '600'
          }}
        >
          <Trash2 size={16} />
          TOUT supprimer (réinitialiser l'app)
        </button>
      </div>
        </div>
      </details>
    </div>
  );
}
