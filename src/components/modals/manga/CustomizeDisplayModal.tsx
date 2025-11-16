import { useEffect, useState } from 'react';
import Toggle from '../../common/Toggle';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';

type FieldKey = string;

interface Props {
  mangaId: number;
  onClose: () => void;
  onSave?: () => void;
}

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: 'couverture', label: 'Couverture' },
  { key: 'annee_publication', label: 'Année VO' },
  { key: 'annee_vf', label: 'Année VF' },
  { key: 'nb_volumes', label: 'Nb volumes VO' },
  { key: 'nb_volumes_vf', label: 'Nb volumes VF' },
  { key: 'nb_chapitres', label: 'Nb chapitres VO' },
  { key: 'nb_chapitres_vf', label: 'Nb chapitres VF' },
  { key: 'statut_publication', label: 'Statut VO' },
  { key: 'statut_publication_vf', label: 'Statut VF' },
  { key: 'genres', label: 'Genres' },
  { key: 'themes', label: 'Thèmes' },
  { key: 'media_type', label: 'Type de média' },
  { key: 'demographie', label: 'Démographie' },
  { key: 'editeur', label: 'Éditeur VF' },
  { key: 'editeur_vo', label: 'Éditeur VO' },
  { key: 'serialization', label: 'Prépublication' },
  { key: 'auteurs', label: 'Auteurs' },
  { key: 'titres_alternatifs', label: 'Titres alternatifs' },
  { key: 'description', label: 'Synopsis' },
  { key: 'langue_originale', label: 'Pays/Origine' },
  { key: 'type_volume', label: 'Type de volume' },
  { key: 'date_debut', label: 'Date début (publication)' },
  { key: 'date_fin', label: 'Date fin (publication)' },
  { key: 'mal_block', label: 'Bloc d\'informations MAL' },
  { key: 'section_costs', label: 'Section coûts et propriétaires' },
  { key: 'section_progression', label: 'Section progression lecture' },
  { key: 'section_chapitres', label: 'Section gestion des chapitres' },
  { key: 'section_tomes', label: 'Section liste des tomes' }
];

// Initialiser toutes les préférences à true par défaut
const getDefaultPrefs = (): Record<FieldKey, boolean> => {
  const defaults: Record<FieldKey, boolean> = {};
  FIELDS.forEach(({ key }) => {
    defaults[key] = true;
  });
  return defaults;
};

export default function CustomizeDisplayModal({ mangaId, onClose, onSave }: Props) {
  const [prefs, setPrefs] = useState<Record<FieldKey, boolean>>(getDefaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1. Charger les paramètres globaux (base)
        const globalPrefs = await window.electronAPI.getMangaDisplaySettings?.() || {};
        
        // 2. Charger les overrides locaux (spécifiques à ce manga)
        const localOverrides = await window.electronAPI.getMangaDisplayOverrides?.(mangaId) || {};
        
        // 3. Fusionner : valeurs par défaut (true) -> globales -> locales (les locales prévalent)
        const merged = { ...getDefaultPrefs(), ...globalPrefs, ...localOverrides };
        setPrefs(merged);
      } finally {
        setLoading(false);
      }
    })();
  }, [mangaId]);

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
      // Charger les paramètres globaux pour comparer
      const globalPrefs = await window.electronAPI.getMangaDisplaySettings?.() || {};
      
      // Charger les overrides existants pour savoir lesquels supprimer
      const existingOverrides = await window.electronAPI.getMangaDisplayOverrides?.(mangaId) || {};
      
      // Créer un objet avec seulement les overrides qui diffèrent des paramètres globaux
      const overridesToSave: Record<string, boolean> = {};
      const overridesToDelete: string[] = [];
      
      for (const key of FIELDS.map(f => f.key)) {
        const globalValue = globalPrefs[key] ?? true; // Valeur par défaut si non définie
        const currentValue = prefs[key] ?? true;
        
        // Si la valeur actuelle diffère de la valeur globale, c'est un override à sauvegarder
        if (currentValue !== globalValue) {
          overridesToSave[key] = currentValue;
        } else if (key in existingOverrides) {
          // Si la valeur actuelle correspond à la valeur globale mais qu'un override existe, le supprimer
          overridesToDelete.push(key);
        }
      }
      
      // Sauvegarder les nouveaux overrides
      if (Object.keys(overridesToSave).length > 0) {
        await window.electronAPI.saveMangaDisplayOverrides?.(mangaId, overridesToSave);
      }
      
      // Supprimer les overrides qui ne sont plus nécessaires
      if (overridesToDelete.length > 0) {
        await window.electronAPI.deleteMangaDisplayOverrides?.(mangaId, overridesToDelete);
      }
      
      if (onSave) {
        onSave();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Modal maxWidth="700px">
      <ModalHeader title="Personnaliser l'affichage" onClose={onClose} />
        
        {/* Boutons Tout sélectionner / Tout désélectionner */}
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
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
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
