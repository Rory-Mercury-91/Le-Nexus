import React, { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface AddSubscriptionModalProps {
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  currentUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubscriptionModal({
  users,
  currentUserId,
  onClose,
  onSuccess
}: AddSubscriptionModalProps) {
  const { showToast, ToastContainer } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<'Mensuel' | 'Trimestriel' | 'Annuel' | 'Autre'>('Mensuel');
  const [price, setPrice] = useState<string>('');
  const [devise, setDevise] = useState<string>('EUR');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'yearly' | 'other'>('monthly');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(currentUserId ? [currentUserId] : []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast({
        title: 'Erreur',
        message: 'Le nom est requis',
        type: 'error'
      });
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      showToast({
        title: 'Erreur',
        message: 'Le prix doit être supérieur à 0',
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

    setSaving(true);
    try {
      const result = await window.electronAPI.subscriptionsCreate({
        name: name.trim(),
        type,
        price: parseFloat(price),
        devise: devise,
        frequency,
        start_date: startDate,
        notes: notes.trim() || null,
        proprietaires: proprietaireIds.filter(id => id !== currentUserId)
      });

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Abonnement créé',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de créer l\'abonnement',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur création abonnement:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de créer l\'abonnement',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (newType: 'Mensuel' | 'Trimestriel' | 'Annuel' | 'Autre') => {
    setType(newType);
    const frequencyMap: Record<string, 'monthly' | 'quarterly' | 'yearly' | 'other'> = {
      'Mensuel': 'monthly',
      'Trimestriel': 'quarterly',
      'Annuel': 'yearly',
      'Autre': 'other'
    };
    setFrequency(frequencyMap[newType]);
  };

  return (
    <>
      {ToastContainer}
      <Modal
        onClickOverlay={onClose}
        maxWidth="600px"
      >
        <div style={{ padding: '24px' }}>
          <ModalHeader
            title="Ajouter un abonnement"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Nom <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Ex: Netflix, Spotify, Amazon Prime..."
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Type <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as any)}
                className="select"
                required
              >
                <option value="Mensuel">Mensuel</option>
                <option value="Trimestriel">Trimestriel</option>
                <option value="Annuel">Annuel</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Prix <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Devise
                </label>
                <select
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  className="select"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF</option>
                  <option value="CAD">CAD</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Date de début <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
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
                  💡 Le coût sera automatiquement divisé par {proprietaireIds.length}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={3}
                placeholder="Notes optionnelles..."
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
                {saving ? 'Création...' : 'Créer l\'abonnement'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
