import { useEffect, useState } from 'react';
import Toggle from '../../common/Toggle';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';

type FieldKey = string;

interface Props {
  animeId: number;
  onClose: () => void;
  onSave?: () => void;
}

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: 'banner', label: 'Bannière Crunchyroll' },
  { key: 'couverture', label: 'Couverture & statut' },
  { key: 'statut_diffusion', label: 'Statut de diffusion' },
  { key: 'type', label: 'Type' },
  { key: 'demographie', label: 'Démographie' },
  { key: 'rating', label: 'Classification / Rating' },
  { key: 'titres_alternatifs', label: 'Titres alternatifs' },
  { key: 'description', label: 'Synopsis' },
  { key: 'genres', label: 'Genres' },
  { key: 'themes', label: 'Thèmes' },
  { key: 'source', label: 'Source' },
  { key: 'studios', label: 'Studios' },
  { key: 'producteurs', label: 'Producteurs' },
  { key: 'diffuseurs', label: 'Diffuseurs' },
  { key: 'date_debut', label: 'Date de début' },
  { key: 'date_fin', label: 'Date de fin' },
  { key: 'date_sortie_vf', label: 'Date de sortie VF' },
  { key: 'saison_diffusion', label: 'Saison de diffusion' },
  { key: 'mal_block', label: 'Bloc MyAnimeList' },
  { key: 'relations', label: 'Relations' },
  { key: 'liens_externes', label: 'Liens externes' },
  { key: 'liens_streaming', label: 'Liens de streaming' },
  { key: 'episodes', label: 'Liste des épisodes' },
  { key: 'badges', label: 'Badges (en cours, source import)' }
];

const getDefaultPrefs = (): Record<FieldKey, boolean> => {
  const defaults: Record<FieldKey, boolean> = {};
  FIELDS.forEach(({ key }) => {
    defaults[key] = true;
  });
  return defaults;
};

export default function CustomizeAnimeDisplayModal({ animeId, onClose, onSave }: Props) {
  const [prefs, setPrefs] = useState<Record<FieldKey, boolean>>(getDefaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const globalPrefs = await window.electronAPI.getAnimeDisplaySettings?.() || {};
        const localOverrides = await window.electronAPI.getAnimeDisplayOverrides?.(animeId) || {};
        const merged = { ...getDefaultPrefs(), ...globalPrefs, ...localOverrides };
        setPrefs(merged);
      } finally {
        setLoading(false);
      }
    })();
  }, [animeId]);

  useModalEscape(onClose, saving);

  const toggle = (key: FieldKey) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSelectAll = () => {
    const allSelected = getDefaultPrefs();
    FIELDS.forEach(({ key }) => {
      allSelected[key] = true;
    });
    setPrefs(allSelected);
  };

  const handleDeselectAll = () => {
    const noneSelected = getDefaultPrefs();
    FIELDS.forEach(({ key }) => {
      noneSelected[key] = false;
    });
    setPrefs(noneSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const globalPrefs = await window.electronAPI.getAnimeDisplaySettings?.() || {};
      const existingOverrides = await window.electronAPI.getAnimeDisplayOverrides?.(animeId) || {};

      const overridesToSave: Record<string, boolean> = {};
      const overridesToDelete: string[] = [];

      for (const key of FIELDS.map(f => f.key)) {
        const globalValue = globalPrefs[key] ?? true;
        const currentValue = prefs[key] ?? true;

        if (currentValue !== globalValue) {
          overridesToSave[key] = currentValue;
        } else if (key in existingOverrides) {
          overridesToDelete.push(key);
        }
      }

      if (Object.keys(overridesToSave).length > 0) {
        await window.electronAPI.saveAnimeDisplayOverrides?.(animeId, overridesToSave);
      }

      if (overridesToDelete.length > 0) {
        await window.electronAPI.deleteAnimeDisplayOverrides?.(animeId, overridesToDelete);
      }

      onSave?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Modal maxWidth="700px">
      <ModalHeader title="Personnaliser l'affichage de l'anime" onClose={onClose} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleSelectAll} className="btn btn-outline" style={{ fontSize: 13 }}>
          Tout sélectionner
        </button>
        <button onClick={handleDeselectAll} className="btn btn-outline" style={{ fontSize: 13 }}>
          Tout désélectionner
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {FIELDS.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 14,
              padding: '8px 10px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8
            }}
          >
            <span style={{ color: 'var(--text)' }}>{label}</span>
            <Toggle checked={!!prefs[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
        <button onClick={onClose} className="btn btn-outline">Annuler</button>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}
