interface OwnershipModalLoaderProps {
  onClose: () => void;
}

/**
 * Composant de chargement affiché pendant le chargement des utilisateurs
 * dans la modal de propriété
 */
export default function OwnershipModalLoader({ onClose }: OwnershipModalLoaderProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px'
      }}>
        <p>Chargement des utilisateurs...</p>
        <button
          onClick={onClose}
          className="btn btn-outline"
          style={{ marginTop: '12px' }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
