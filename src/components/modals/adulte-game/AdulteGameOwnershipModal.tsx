import React, { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import { AdulteGame } from '../../../types';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface AdulteGameOwnershipModalProps {
  game: AdulteGame;
  owners: Array<{ id: number; user_id: number; prix: number; date_achat: string | null; user_name: string; user_color: string; user_emoji: string }>;
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  currentUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdulteGameOwnershipModal({
  game,
  owners,
  users,
  currentUserId,
  onClose,
  onSuccess
}: AdulteGameOwnershipModalProps) {
  const { showToast, ToastContainer } = useToast();

  // Récupérer les propriétaires existants
  const getInitialProprietaires = (): number[] => {
    if (owners && owners.length > 0) {
      return owners.map(p => p.user_id);
    }
    return currentUserId ? [currentUserId] : [];
  };

  const [prix, setPrix] = useState<string>(() => {
    if (owners && owners.length > 0) {
      return owners.reduce((sum, owner) => sum + (owner.prix || 0), 0).toFixed(2);
    }
    return '';
  });
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(getInitialProprietaires());
  const [dateAchat, setDateAchat] = useState<string>(() => {
    if (owners && owners.length > 0) {
      const firstDate = owners[0].date_achat;
      if (firstDate && owners.every(o => o.date_achat === firstDate)) {
        return firstDate.split('T')[0];
      }
    }
    return '';
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (proprietaireIds.length === 0) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez sélectionner au moins un propriétaire',
        type: 'error'
      });
      return;
    }

    if (!prix || parseFloat(prix) <= 0) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez entrer un prix valide',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.adulteGameMarkAsOwned({
        gameId: game.id,
        prix: parseFloat(prix),
        dateAchat: dateAchat || null,
        partageAvec: proprietaireIds.filter(id => id !== currentUserId),
        platforms: null // Pas de plateformes pour les jeux adultes
      });

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Jeu marqué comme possédé',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de marquer le jeu comme possédé',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur marquage comme possédé:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de marquer le jeu comme possédé',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const prixParPersonne = proprietaireIds.length > 0 && prix ? parseFloat(prix) / proprietaireIds.length : 0;

  return (
    <>
      {ToastContainer}
      <Modal
        onClickOverlay={onClose}
        maxWidth="600px"
      >
        <div style={{ padding: '24px' }}>
          <ModalHeader
            title="Marquer comme possédé"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Prix <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="number"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="input"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Propriétaire(s) <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <MultiSelectDropdown
                label=""
                required
                options={users.map(u => ({ id: u.id, name: u.name, color: u.color }))}
                selectedIds={proprietaireIds}
                onChange={setProprietaireIds}
                placeholder="Sélectionnez un ou plusieurs propriétaires..."
              />
              {proprietaireIds.length > 1 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}>
                  💡 Le coût sera automatiquement divisé par {proprietaireIds.length} ({prixParPersonne.toFixed(2)}€ par personne)
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Date d'achat
              </label>
              <input
                type="date"
                value={dateAchat}
                onChange={(e) => setDateAchat(e.target.value)}
                className="input"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Marquer comme possédé'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
