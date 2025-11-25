import { FileJson, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import type { AdulteGameJsonData } from '../../../types';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';

interface AddAdulteGameJsonModalProps {
  onClose: () => void;
  onFillForm: (data: AdulteGameJsonData) => void;
}

/**
 * Modale pour saisir du JSON et pré-remplir le formulaire
 */
export default function AddAdulteGameJsonModal({ onClose, onFillForm }: AddAdulteGameJsonModalProps) {
  const [jsonData, setJsonData] = useState('');
  const [jsonError, setJsonError] = useState('');
  const { showToast } = useToast();

  useModalEscape(onClose, false);

  const handleParseJson = () => {
    if (!jsonData.trim()) {
      setJsonError('Veuillez coller des données JSON');
      return;
    }

    try {
      const parsed = JSON.parse(jsonData);

      // Valider que c'est bien un objet avec au moins un nom ou un id
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Les données doivent être un objet JSON');
      }

      if (!parsed.name && !parsed.id) {
        throw new Error('Les données doivent contenir au moins "name" ou "id"');
      }

      // Appeler la fonction de pré-remplissage
      onFillForm(parsed);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'JSON invalide';
      setJsonError(errorMessage);
      showToast({
        title: 'Erreur',
        message: errorMessage,
        type: 'error'
      });
    }
  };

  return (
    <Modal maxWidth="600px" maxHeight="80vh" onClickOverlay={onClose}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileJson size={24} />
          Ajouter depuis JSON
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Contenu */}
      <div style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
        maxHeight: 'calc(80vh - 90px)'
      }}>
        <div style={{
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '8px', color: 'var(--text)' }}>
            Collez les données JSON depuis <strong>LC Extractor</strong> ou toute autre source.
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
            📥 Installer le script LC Extractor
          </button>
        </div>

        <div>
          <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
            Données JSON
          </label>
          <textarea
            value={jsonData}
            onChange={(e) => {
              setJsonData(e.target.value);
              setJsonError('');
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
              resize: 'vertical'
            }}
          />
        </div>

        {jsonError && (
          <div style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            color: 'var(--error)',
            fontSize: '14px'
          }}>
            ⚠️ {jsonError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Annuler
          </button>
          <button
            onClick={handleParseJson}
            disabled={!jsonData.trim()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileJson size={18} />
            Pré-remplir le formulaire
          </button>
        </div>
      </div>
    </Modal>
  );
}
