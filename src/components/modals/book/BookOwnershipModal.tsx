import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import { Book, Serie, Tome } from '../../../types';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

type OwnershipItem =
  | { type: 'book'; book: Book }
  | { type: 'serie'; serie: Serie; tomes: Tome[] };

interface BookOwnershipModalProps {
  item: OwnershipItem;
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  currentUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookOwnershipModal({
  item,
  users,
  currentUserId,
  onClose,
  onSuccess
}: BookOwnershipModalProps) {
  const { showToast, ToastContainer } = useToast();

  // Calculer le prix initial selon le type
  const getInitialPrix = (): string => {
    if (item.type === 'book') {
      return item.book.prix_suggere?.toString() || '';
    } else {
      const totalPrixTomes = item.tomes.reduce((sum, tome) => sum + (tome.prix || 0), 0);
      return totalPrixTomes > 0 ? totalPrixTomes.toFixed(2) : '';
    }
  };

  // Récupérer les propriétaires existants selon le type
  const getInitialProprietaires = (): number[] => {
    if (item.type === 'book') {
      if (item.book.proprietaires && item.book.proprietaires.length > 0) {
        return item.book.proprietaires.map(p => p.id);
      }
    } else {
      if (item.tomes.length > 0 && item.tomes[0].proprietaires && item.tomes[0].proprietaires.length > 0) {
        const firstTomeOwners = item.tomes[0].proprietaires.map(p => p.id);
        // Vérifier si tous les tomes ont les mêmes propriétaires
        const allSameOwners = item.tomes.every(tome => {
          const tomeOwnerIds = (tome.proprietaires || []).map(p => p.id).sort();
          const firstOwnerIds = firstTomeOwners.sort();
          return tomeOwnerIds.length === firstOwnerIds.length &&
            tomeOwnerIds.every((id, idx) => id === firstOwnerIds[idx]);
        });
        if (allSameOwners) {
          return firstTomeOwners;
        }
      }
    }
    return currentUserId ? [currentUserId] : [];
  };

  const [prix, setPrix] = useState<string>(getInitialPrix());
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(getInitialProprietaires());
  const [dateAchat, setDateAchat] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation spécifique pour les séries
    if (item.type === 'serie' && item.tomes.length === 0) {
      showToast({
        title: 'Erreur',
        message: 'Aucun tome disponible. Veuillez d\'abord ajouter des tomes à la série.',
        type: 'error'
      });
      return;
    }

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
        message: item.type === 'serie' ? 'Veuillez entrer un prix total valide' : 'Veuillez entrer un prix valide',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      let result: any = null;

      if (item.type === 'book') {
        result = await window.electronAPI.booksMarkAsOwned?.({
          bookId: item.book.id,
          prix: parseFloat(prix),
          dateAchat: dateAchat || null,
          partageAvec: proprietaireIds.filter(id => id !== currentUserId)
        });
      } else {
        result = await window.electronAPI.serieMarkAsOwned?.({
          serieId: item.serie.id,
          prixTotal: parseFloat(prix),
          dateAchat: dateAchat || null,
          partageAvec: proprietaireIds.filter(id => id !== currentUserId)
        });
      }

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: item.type === 'book' ? 'Livre marqué comme possédé' : 'Série marquée comme possédée',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || (item.type === 'book'
            ? 'Impossible de marquer le livre comme possédé'
            : 'Impossible de marquer la série comme possédée'),
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur marquage comme possédé:', error);
      showToast({
        title: 'Erreur',
        message: item.type === 'book'
          ? 'Impossible de marquer le livre comme possédé'
          : 'Impossible de marquer la série comme possédée',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const prixParPersonne = proprietaireIds.length > 0 && prix ? parseFloat(prix) / proprietaireIds.length : 0;
  const prixParTome = item.type === 'serie' && item.tomes.length > 0 && prix ? parseFloat(prix) / item.tomes.length : 0;
  const totalPrixTomes = item.type === 'serie' ? item.tomes.reduce((sum, tome) => sum + (tome.prix || 0), 0) : 0;

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
                {item.type === 'serie' ? 'Prix total de la série' : 'Prix'} <span style={{ color: 'var(--error)' }}>*</span>
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
              {item.type === 'book' && item.book.prix_suggere && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  💡 Prix suggéré : {item.book.prix_suggere.toFixed(2)} {item.book.devise || '€'}
                </p>
              )}
              {item.type === 'serie' && totalPrixTomes > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  💡 Prix total des {item.tomes.length} tome{item.tomes.length > 1 ? 's' : ''} : {totalPrixTomes.toFixed(2)}€
                </p>
              )}
              {item.type === 'serie' && item.tomes.length > 0 && prix && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  💡 Prix par tome : {prixParTome.toFixed(2)}€
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
                  💡 Le coût {item.type === 'serie' ? 'total ' : ''}sera automatiquement divisé par {proprietaireIds.length} ({prixParPersonne.toFixed(2)}€ par personne)
                </div>
              )}
              {item.type === 'serie' && item.tomes.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}>
                  📚 Tous les {item.tomes.length} tome{item.tomes.length > 1 ? 's' : ''} seront marqués comme possédés
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
                disabled={saving || (item.type === 'serie' && item.tomes.length === 0)}
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
