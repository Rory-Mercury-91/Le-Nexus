import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface EditSeasonModalProps {
  showId: number;
  season: {
    id: number;
    numero: number;
    titre?: string | null;
    synopsis?: string | null;
    date_premiere?: string | null;
    date_derniere?: string | null;
  };
  onClose: () => void;
  onSaved: (payload: { seasons: any[]; episodes: any[] }) => void;
}

export default function EditSeasonModal({ showId, season, onClose, onSaved }: EditSeasonModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [title, setTitle] = useState(season.titre || `Saison ${season.numero}`);
  const [synopsis, setSynopsis] = useState(season.synopsis || '');
  const [datePremiere, setDatePremiere] = useState(season.date_premiere || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await window.electronAPI.updateTvSeason?.({
        showId,
        seasonId: season.id,
        title,
        synopsis,
        datePremiere: datePremiere || null
      });
      if (result?.success) {
        showToast({
          title: 'Saison mise à jour',
          type: 'success'
        });
        onSaved({ seasons: result.seasons || [], episodes: result.episodes || [] });
        onClose();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de mettre à jour la saison.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur updateTvSeason:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de mettre à jour la saison.',
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
        <ModalHeader title={`Modifier Saison ${season.numero}`} onClose={onClose} />
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
                  placeholder="Ex: Saison 1"
                />
              </div>
              <div>
                <label style={labelStyle}>Première diffusion</label>
                <input
                  type="date"
                  className="input"
                  value={datePremiere}
                  onChange={(e) => setDatePremiere(e.target.value)}
                />
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
                  placeholder="Description de la saison..."
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
