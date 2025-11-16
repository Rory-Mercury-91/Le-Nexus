import { useEffect, useState } from 'react';
import Toggle from '../../common/Toggle';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';
import { ADULTE_GAME_DISPLAY_DEFAULTS, ADULTE_GAME_DISPLAY_FIELDS, AdulteGameFieldKey } from './displayConfig';

interface CustomizeAdulteGameDisplayModalProps {
  gameId: number;
  onClose: () => void;
  onSave?: () => void;
}

const getDefaultPrefs = (): Record<AdulteGameFieldKey, boolean> => ({ ...ADULTE_GAME_DISPLAY_DEFAULTS });

export default function CustomizeAdulteGameDisplayModal({ gameId, onClose, onSave }: CustomizeAdulteGameDisplayModalProps) {
  const [prefs, setPrefs] = useState<Record<AdulteGameFieldKey, boolean>>(getDefaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useModalEscape(onClose, saving);

  useEffect(() => {
    (async () => {
      try {
        const globalPrefs = await window.electronAPI.getAdulteGameDisplaySettings?.() || {};
        const overrides = await window.electronAPI.getAdulteGameDisplayOverrides?.(gameId) || {};
        const merged = { ...getDefaultPrefs(), ...globalPrefs, ...overrides } as Record<AdulteGameFieldKey, boolean>;
        setPrefs(merged);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  const toggle = (key: AdulteGameFieldKey) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSelectAll = () => {
    const all = getDefaultPrefs();
    ADULTE_GAME_DISPLAY_FIELDS.forEach(({ key }) => {
      all[key] = true;
    });
    setPrefs(all);
  };

  const handleDeselectAll = () => {
    const none = getDefaultPrefs();
    ADULTE_GAME_DISPLAY_FIELDS.forEach(({ key }) => {
      none[key] = false;
    });
    setPrefs(none);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const globalPrefs = await window.electronAPI.getAdulteGameDisplaySettings?.() || {};
      const existingOverrides = await window.electronAPI.getAdulteGameDisplayOverrides?.(gameId) || {};

      const overridesToSave: Record<string, boolean> = {};
      const overridesToDelete: string[] = [];

      ADULTE_GAME_DISPLAY_FIELDS.forEach(({ key }) => {
        const globalValue = globalPrefs[key] ?? ADULTE_GAME_DISPLAY_DEFAULTS[key];
        const currentValue = prefs[key] ?? ADULTE_GAME_DISPLAY_DEFAULTS[key];

        if (currentValue !== globalValue) {
          overridesToSave[key] = currentValue;
        } else if (key in existingOverrides) {
          overridesToDelete.push(key);
        }
      });

      if (Object.keys(overridesToSave).length > 0) {
        await window.electronAPI.saveAdulteGameDisplayOverrides?.(gameId, overridesToSave);
      }

      if (overridesToDelete.length > 0) {
        await window.electronAPI.deleteAdulteGameDisplayOverrides?.(gameId, overridesToDelete);
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde préférences locales jeu adulte:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Modal maxWidth="640px">
      <ModalHeader title="Affichage du jeu" onClose={onClose} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleSelectAll} className="btn btn-outline" style={{ fontSize: 13 }}>
          Tout afficher
        </button>
        <button onClick={handleDeselectAll} className="btn btn-outline" style={{ fontSize: 13 }}>
          Tout masquer
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {ADULTE_GAME_DISPLAY_FIELDS.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-light)'
            }}
          >
            <span style={{ color: 'var(--text)', fontSize: 14 }}>{label}</span>
            <Toggle checked={!!prefs[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
        <button onClick={onClose} className="btn btn-outline" disabled={saving}>
          Annuler
        </button>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </div>
    </Modal>
  );
}
