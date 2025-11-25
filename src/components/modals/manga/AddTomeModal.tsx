import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tome, User } from '../../../types';
import CoverImage from '../../common/CoverImage';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';

interface AddTomeModalProps {
  serieId: number;
  serieTitre: string;
  mediaType?: string | null;
  typeVolume?: string | null;
  lastTome?: Tome | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTomeModal({ serieId, serieTitre, mediaType, typeVolume, lastTome, onClose, onSuccess }: AddTomeModalProps) {
  const [numero, setNumero] = useState('');
  const [prix, setPrix] = useState('');
  const [proprietaireIds, setProprietaireIds] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dateSortie, setDateSortie] = useState('');
  const [dateAchat, setDateAchat] = useState('');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [typeTome, setTypeTome] = useState<string>('Standard');
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Charger la liste des utilisateurs
  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      try {
        const [allUsers, currentUserName] = await Promise.all([
          window.electronAPI.getAllUsers(),
          window.electronAPI.getCurrentUser()
        ]);

        if (!isMounted) return;

        setUsers(allUsers);

        if (proprietaireIds.length === 0 && allUsers.length > 0) {
          const currentUser = allUsers.find(u => u.name === currentUserName);
          if (currentUser) {
            setProprietaireIds([currentUser.id]);
          } else {
            setProprietaireIds([allUsers[0].id]);
          }
        }
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [proprietaireIds.length]);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, saving);

  // Pré-remplir avec les valeurs du dernier tome
  useEffect(() => {
    if (lastTome) {
      setNumero(String(lastTome.numero + 1)); // Incrémenter le numéro
      setPrix(String(lastTome.prix)); // Garder le même prix
      // Garder les mêmes propriétaires
      if (lastTome.proprietaireIds && lastTome.proprietaireIds.length > 0) {
        setProprietaireIds(lastTome.proprietaireIds);
      }
      setDateSortie(''); // Ne pas reprendre la date de sortie
      setDateAchat(lastTome.date_achat || ''); // Garder la même date d'achat
      setCouvertureUrl(''); // Ne pas reprendre la couverture
      setTypeTome(lastTome.type_tome || 'Standard'); // Garder le même type
    }
  }, [lastTome]);

  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && !couvertureUrl.includes('://') && !couvertureUrl.startsWith('data:')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }

    const result = await window.electronAPI.uploadCustomCover(serieTitre, 'tome', {
      mediaType,
      typeVolume
    });
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      // Supprimer l'ancienne image locale si elle existe
      if (couvertureUrl && !couvertureUrl.includes('://') && !couvertureUrl.startsWith('data:')) {
        await window.electronAPI.deleteCoverImage(couvertureUrl);
      }

      // Convertir le File en Uint8Array pour l'envoyer au processus principal
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const result = await window.electronAPI.saveCoverFromBuffer(buffer, imageFile.name, serieTitre, 'tome', {
        mediaType,
        typeVolume
      });
      if (result.success && result.localPath) {
        setCouvertureUrl(result.localPath);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numero || !prix) {
      return;
    }

    setSaving(true);
    try {
      await window.electronAPI.createTome({
        serie_id: serieId,
        numero: Number(numero),
        prix: Number(prix),
        proprietaireIds,
        date_sortie: dateSortie || null,
        date_achat: dateAchat || null,
        couverture_url: couvertureUrl || null,
        type_tome: typeTome || 'Standard'
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur création tome:', error);
      // Assuming showToast is defined elsewhere or will be added.
      // For now, we'll just log the error.
      // showToast({ title: 'Erreur', message: error?.message || 'Impossible de créer le tome', type: 'error' });
    }
  };

  return (
    <Modal maxWidth="800px">
      <ModalHeader title="Ajouter un tome" onClose={onClose} />

      {lastTome && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid var(--primary)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>💡</span>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text)'
          }}>
            Valeurs pré-remplies depuis le tome {lastTome.numero}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Colonne gauche - Image */}
          <div style={{
            width: '160px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div
              style={{
                width: '100%',
                height: '220px',
                borderRadius: '8px',
                border: dragging
                  ? '3px dashed var(--primary)'
                  : (couvertureUrl ? '2px solid var(--border)' : '2px dashed var(--border)'),
                overflow: 'hidden',
                position: 'relative',
                background: dragging ? 'var(--primary)22' : 'transparent',
                transition: 'border-color 0.2s, background 0.2s'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {dragging ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  gap: '8px'
                }}>
                  📥
                  <div>Déposer l'image</div>
                </div>
              ) : couvertureUrl ? (
                <CoverImage
                  src={couvertureUrl}
                  alt={`Tome ${numero}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  textAlign: 'center',
                  padding: '20px',
                  gap: '8px'
                }}>
                  <Upload size={32} style={{ opacity: 0.5 }} />
                  <div>Glissez une image ici</div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleUploadImage}
              className="btn btn-outline"
              style={{ width: '100%', fontSize: '13px', padding: '8px' }}
            >
              <Upload size={14} />
              Image
            </button>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px' }}>
                URL (optionnel)
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={couvertureUrl}
                onChange={(e) => setCouvertureUrl(e.target.value)}
                className="input"
                style={{ fontSize: '11px', padding: '6px' }}
              />
            </div>
          </div>

          {/* Colonne droite - Formulaire */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Numéro du tome *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Prix (€) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="6.95"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Type de tome
              </label>
              <select
                value={typeTome}
                onChange={(e) => setTypeTome(e.target.value)}
                className="select"
                style={{ width: '100%', fontWeight: 600 }}
              >
                <option value="Standard">Standard</option>
                <option value="Collector">Collector</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Intégrale">Intégrale</option>
                <option value="Coffret">Coffret</option>
                <option value="Numérique">Numérique</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <MultiSelectDropdown
                label="Propriétaire(s)"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Date de sortie VF
                </label>
                <input
                  type="date"
                  value={dateSortie}
                  onChange={(e) => setDateSortie(e.target.value)}
                  className="input"
                />
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
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
            {saving ? (
              <>
                <div className="loading" />
                Enregistrement...
              </>
            ) : (
              'Ajouter'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
