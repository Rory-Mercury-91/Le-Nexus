import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface ExistingSeason {
  id: number;
  numero: number;
  titre?: string | null;
  synopsis?: string | null;
  nb_episodes?: number | null;
}

interface CreateSeasonModalProps {
  showId: number;
  existingSeasons: ExistingSeason[];
  defaultSeasonNumber: number;
  initialDuplicateFromSeasonId?: number | null;
  onClose: () => void;
  onCreated: (data: { seasons: any[]; episodes: any[] }) => void;
}

export default function CreateSeasonModal({
  showId,
  existingSeasons,
  defaultSeasonNumber,
  initialDuplicateFromSeasonId = null,
  onClose,
  onCreated
}: CreateSeasonModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [seasonNumber, setSeasonNumber] = useState(defaultSeasonNumber);
  const [title, setTitle] = useState(`Saison ${defaultSeasonNumber}`);
  const [synopsis, setSynopsis] = useState('');
  const [episodeCount, setEpisodeCount] = useState(10);
  const [defaultEpisodeDuration, setDefaultEpisodeDuration] = useState<number | ''>('');
  const [duplicateFromSeasonId, setDuplicateFromSeasonId] = useState<number | ''>(
    initialDuplicateFromSeasonId ? initialDuplicateFromSeasonId : ''
  );
  const [saving, setSaving] = useState(false);

  const isDuplicating = Boolean(duplicateFromSeasonId);

  const duplicateOptions = useMemo(
    () =>
      existingSeasons
        .slice()
        .sort((a, b) => a.numero - b.numero)
        .map((season) => ({
          value: season.id,
          label: `Saison ${season.numero}${season.titre ? ` — ${season.titre}` : ''}`
        })),
    [existingSeasons]
  );

  useEffect(() => {
    const season = typeof duplicateFromSeasonId === 'number'
      ? existingSeasons.find((s) => s.id === duplicateFromSeasonId)
      : null;

    if (season) {
      setEpisodeCount(season.nb_episodes || 0);
      if (!synopsis && season.synopsis) {
        setSynopsis(season.synopsis);
      }
      if (!title || title.startsWith('Saison ')) {
        setTitle(`Saison ${seasonNumber}`);
      }
    }
  }, [duplicateFromSeasonId, existingSeasons, seasonNumber, synopsis, title]);

  useEffect(() => {
    if (initialDuplicateFromSeasonId) {
      setDuplicateFromSeasonId(initialDuplicateFromSeasonId);
    }
  }, [initialDuplicateFromSeasonId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!seasonNumber || seasonNumber < 0) {
      showToast({ title: 'Numéro de saison invalide', type: 'error' });
      return;
    }

    if (!isDuplicating && (!episodeCount || episodeCount <= 0)) {
      showToast({ title: 'Nombre d’épisodes requis', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        showId,
        seasonNumber,
        title: title?.trim() || null,
        synopsis: synopsis?.trim() || null,
        episodeCount: isDuplicating ? undefined : episodeCount,
        defaultEpisodeDuration: defaultEpisodeDuration || null,
        duplicateFromSeasonId: isDuplicating ? Number(duplicateFromSeasonId) : null
      };

      const result = await window.electronAPI.createTvSeason?.(payload);
      if (result?.success) {
        showToast({
          title: 'Saison créée',
          message: 'La nouvelle saison et ses épisodes ont été ajoutés.',
          type: 'success'
        });
        onCreated({ seasons: result.seasons || [], episodes: result.episodes || [] });
        onClose();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de créer la saison.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur createTvSeason:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de créer la saison.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 500 };

  return (
    <>
      <Modal maxWidth="620px">
        <ModalHeader title="Créer une saison" onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Numéro de saison *</label>
              <input
                type="number"
                className="input"
                min={0}
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(parseInt(e.target.value, 10) || 0)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Nombre d'épisodes *</label>
              <input
                type="number"
                className="input"
                min={1}
                value={episodeCount}
                onChange={(e) => setEpisodeCount(parseInt(e.target.value, 10) || 0)}
                disabled={isDuplicating}
                required={!isDuplicating}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Titre de la saison</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Saison 1"
              />
            </div>
            <div>
              <label style={labelStyle}>Durée par défaut (minutes)</label>
              <input
                type="number"
                className="input"
                min={0}
                value={defaultEpisodeDuration}
                onChange={(e) => setDefaultEpisodeDuration(e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="Ex: 24"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Dupliquer depuis</label>
            <select
              className="select"
              value={duplicateFromSeasonId}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : '';
                setDuplicateFromSeasonId(value);
              }}
            >
              <option value="">-- Aucune duplication --</option>
              {duplicateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isDuplicating && (
              <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Les épisodes (titres, synopsis, durée) de la saison choisie seront copiés. Le nombre d'épisodes correspondra à la saison source.
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Synopsis</label>
            <textarea
              className="input"
              rows={4}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Description de la saison..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Création...' : 'Créer la saison'}
            </button>
          </div>
        </form>
      </Modal>
      {ToastContainer}
    </>
  );
}
