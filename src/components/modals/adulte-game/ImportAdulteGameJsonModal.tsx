import { X } from 'lucide-react';
import { useState } from 'react';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';

interface ImportAdulteGameJsonModalProps {
  onClose: () => void;
  onImport: (data: any) => void;
}

export default function ImportAdulteGameJsonModal({ onClose, onImport }: ImportAdulteGameJsonModalProps) {
  const [jsonData, setJsonData] = useState('');
  const [error, setError] = useState('');

  // Désactiver le scroll du body quand la modale est ouverte
  useDisableBodyScroll(true);

  const handleImport = () => {
    try {
      // Parser le JSON
      const data = JSON.parse(jsonData);

      // Validation basique
      if (!data.name || !data.id) {
        setError('Données invalides : "name" et "id" sont requis');
        return;
      }

      // Appeler le callback avec les données parsées
      onImport(data);
      onClose();
    } catch (err) {
      setError('JSON invalide : ' + (err as Error).message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '32px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          <X size={24} />
        </button>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '24px',
          color: 'var(--text)'
        }}>
          Insérer les données du jeu
        </h2>

        {/* Instructions */}
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '8px' }}>
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
          Veuillez coller les données de <strong>LC Extractor</strong> ?
        </p>

        {/* Zone de texte JSON */}
        <textarea
          value={jsonData}
          onChange={(e) => {
            setJsonData(e.target.value);
            setError('');
          }}
          placeholder='{"id":2745,"domain":"LewdCorner","name":"Blackheart Hotel: Aftermath","version":"v1.0","status":"EN COURS","tags":"3dcg, anal sex, animated...","type":"RenPy","link":"https://lewdcorner.com/threads/2745","image":"https://..."}'
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '16px',
            borderRadius: '8px',
            border: error ? '2px solid var(--error)' : '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'monospace',
            resize: 'vertical',
            marginBottom: '16px'
          }}
        />

        {/* Message d'erreur */}
        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            color: 'var(--error)',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            className="btn btn-primary"
            disabled={!jsonData.trim()}
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
