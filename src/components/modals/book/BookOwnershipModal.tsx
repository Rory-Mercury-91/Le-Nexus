import { useState, useEffect } from 'react';
import { Book, UserData } from '../../../types';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';

interface BookOwnershipModalProps {
  book: Book;
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  currentUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookOwnershipModal({ book, users, currentUserId, onClose, onSuccess }: BookOwnershipModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [prix, setPrix] = useState<string>(book.prix_suggere?.toString() || '');
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(() => {
    // Pré-remplir avec les propriétaires existants ou l'utilisateur actuel
    if (book.proprietaires && book.proprietaires.length > 0) {
      return book.proprietaires.map(p => p.id);
    }
    return currentUserId ? [currentUserId] : [];
  });
  const [dateAchat, setDateAchat] = useState<string>('');
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
      const result = await window.electronAPI.booksMarkAsOwned?.({
        bookId: book.id,
        prix: parseFloat(prix),
        dateAchat: dateAchat || null,
        partageAvec: proprietaireIds.filter(id => id !== currentUserId)
      });

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Livre marqué comme possédé',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de marquer le livre comme possédé',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur marquage comme possédé:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de marquer le livre comme possédé',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {ToastContainer}
      <Modal
        title="Marquer comme possédé"
        onClose={onClose}
        size="medium"
      >
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
            {book.prix_suggere && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                💡 Prix suggéré : {book.prix_suggere.toFixed(2)} {book.devise || '€'}
              </p>
            )}
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
                💡 Le coût sera automatiquement divisé par {proprietaireIds.length} ({prix ? (parseFloat(prix) / proprietaireIds.length).toFixed(2) : '0.00'}€ par personne)
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Date d'achat (optionnel)
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
      </Modal>
    </>
  );
}
