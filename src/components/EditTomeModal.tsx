import { Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tome, User } from '../types';
import CoverImage from './CoverImage';
import MultiSelectDropdown from './MultiSelectDropdown';

interface EditTomeModalProps {
  tome: Tome;
  serieTitre: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTomeModal({ tome, serieTitre, onClose, onSuccess }: EditTomeModalProps) {
  const [numero, setNumero] = useState(tome.numero.toString());
  const [prix, setPrix] = useState(tome.prix.toString());
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(tome.proprietaireIds || []);
  const [users, setUsers] = useState<User[]>([]);
  const [dateSortie, setDateSortie] = useState(tome.date_sortie || '');
  const [dateAchat, setDateAchat] = useState(tome.date_achat || '');
  const [couvertureUrl, setCouvertureUrl] = useState(tome.couverture_url || '');
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Charger la liste des utilisateurs
  useEffect(() => {
    window.electronAPI.getAllUsers().then(setUsers);
  }, []);

  // Fermer le modal avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }
    
    const result = await window.electronAPI.uploadCustomCover(serieTitre, 'tome');
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
      if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
        await window.electronAPI.deleteCoverImage(couvertureUrl);
      }
      
      const result = await window.electronAPI.saveCoverFromPath(imageFile.path, serieTitre, 'tome');
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
      await window.electronAPI.updateTome(tome.id, {
        numero: Number(numero),
        prix: Number(prix),
        proprietaireIds,
        date_sortie: dateSortie || null,
        date_achat: dateAchat || null,
        couverture_url: couvertureUrl || null
      });
      
      console.log('Tome mis à jour avec couverture:', couvertureUrl);
      
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la modification du tome:', error);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Modifier le tome</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

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
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
