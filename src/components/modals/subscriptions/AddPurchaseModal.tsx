import React, { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface AddPurchaseModalProps {
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  currentUserId: number | null;
  purchaseSites: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPurchaseModal({
  users,
  currentUserId,
  purchaseSites,
  onClose,
  onSuccess
}: AddPurchaseModalProps) {
  const { showToast, ToastContainer } = useToast();

  const [siteId, setSiteId] = useState<number | null>(null);
  const [siteName, setSiteName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [devise, setDevise] = useState<string>('EUR');
  const [creditsCount, setCreditsCount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(currentUserId ? [currentUserId] : []);
  const [saving, setSaving] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);

  const handleCreateSite = async () => {
    if (!siteName.trim()) {
      showToast({
        title: 'Erreur',
        message: 'Le nom du site est requis',
        type: 'error'
      });
      return;
    }

    setCreatingSite(true);
    try {
      const result = await window.electronAPI.purchaseSitesCreate(siteName.trim());
      if (result?.success && result.id) {
        setSiteId(result.id);
        setSiteName('');
        showToast({
          title: 'Succès',
          message: 'Site créé',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de créer le site',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur création site:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de créer le site',
        type: 'error'
      });
    } finally {
      setCreatingSite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purchaseDate) {
      showToast({
        title: 'Erreur',
        message: 'La date est requise',
        type: 'error'
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast({
        title: 'Erreur',
        message: 'Le montant doit être supérieur à 0',
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
      const result = await window.electronAPI.oneTimePurchasesCreate({
        site_id: siteId,
        site_name: siteId ? null : siteName.trim() || null,
        purchase_date: purchaseDate,
        amount: parseFloat(amount),
        devise: devise,
        credits_count: creditsCount ? parseInt(creditsCount) : null,
        notes: notes.trim() || null,
        proprietaires: proprietaireIds.filter(id => id !== currentUserId)
      });

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Achat créé',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de créer l\'achat',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur création achat:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de créer l\'achat',
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
        onClickOverlay={onClose}
        maxWidth="600px"
      >
        <div style={{ padding: '24px' }}>
          <ModalHeader
            title="Ajouter un achat ponctuel"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Site
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={siteId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSiteId(value ? parseInt(value) : null);
                    if (value) {
                      setSiteName('');
                    }
                  }}
                  className="select"
                  style={{ flex: 1 }}
                >
                  <option value="">Nouveau site...</option>
                  {purchaseSites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
                {!siteId && (
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="input"
                      placeholder="Nom du site..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateSite}
                      disabled={creatingSite || !siteName.trim()}
                      className="btn btn-outline"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {creatingSite ? 'Création...' : 'Créer'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Date d'achat <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Montant <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
                Nombre de crédits
              </label>
              <input
                type="number"
                value={creditsCount}
                onChange={(e) => setCreditsCount(e.target.value)}
                className="input"
                placeholder="Optionnel"
                min="0"
                step="1"
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
                {saving ? 'Création...' : 'Créer l\'achat'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
