import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface EditEpisodeModalProps {
  showId: number;
  episode: {
    id: number;
    saison_numero: number;
    episode_numero: number;
    titre?: string | null;
    synopsis?: string | null;
    date_diffusion?: string | null;
    duree?: number | null;
  };
  onClose: () => void;
  onSaved: (payload: { seasons: any[]; episodes: any[] }) => void;
}

export default function EditEpisodeModal({ showId, episode, onClose, onSaved }: EditEpisodeModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [title, setTitle] = useState(episode.titre || `Épisode ${episode.episode_numero}`);
  const [synopsis, setSynopsis] = useState(episode.synopsis || '');
  const [dateDiffusion, setDateDiffusion] = useState(episode.date_diffusion || '');
  const [duration, setDuration] = useState<number | ''>(episode.duree || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await window.electronAPI.updateTvEpisode?.({
        showId,
        episodeId: episode.id,
        title,
        synopsis,
        dateDiffusion: dateDiffusion || null,
        duree: duration || null
      });
      if (result?.success) {
        showToast({
          title: 'Épisode mis à jour',
          type: 'success'
        });
        onSaved({ seasons: result.seasons || [], episodes: result.episodes || [] });
        onClose();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de mettre à jour l\'épisode.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur updateTvEpisode:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de mettre à jour l\'épisode.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 500 };

  return (
    <>
      <Modal maxWidth="800px">
        <ModalHeader
          title={`S${episode.saison_numero.toString().padStart(2, '0')}E${episode.episode_numero.toString().padStart(2, '0')}`}
          onClose={onClose}
        />
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Colonne gauche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Titre</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l'épisode"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Date de diffusion</label>
                  <input
                    type="date"
                    className="input"
                    value={dateDiffusion}
                    onChange={(e) => setDateDiffusion(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Durée (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="Ex: 24"
                  />
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Synopsis</label>
                <textarea
                  className="input"
                  rows={6}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Résumé de l'épisode..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
      {ToastContainer}
    </>
  );
}
