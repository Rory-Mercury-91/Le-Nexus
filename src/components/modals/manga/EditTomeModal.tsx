import { Check, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tome, User } from '../../../types';
import CoverImage from '../../common/CoverImage';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';

interface EditTomeModalProps {
  tome: Tome;
  serieTitre: string;
  mediaType?: string | null;
  typeVolume?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTomeModal({ tome, serieTitre, mediaType, typeVolume, onClose, onSuccess }: EditTomeModalProps) {
  const { showToast, ToastContainer } = useToast();
  
  // Valeurs initiales
  const initialValues = {
    numero: tome.numero.toString(),
    prix: tome.prix.toString(),
    proprietaireIds: tome.proprietaireIds || [],
    dateSortie: tome.date_sortie || '',
    dateAchat: tome.date_achat || '',
    couvertureUrl: tome.couverture_url || '',
    typeTome: (tome.type_tome || 'Standard') as 'Standard' | 'Collector' | 'Deluxe' | 'Intégrale' | 'Coffret' | 'Numérique' | 'Autre'
  };
  
  const [numero, setNumero] = useState(initialValues.numero);
  const [prix, setPrix] = useState(initialValues.prix);
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(initialValues.proprietaireIds);
  const [users, setUsers] = useState<User[]>([]);
  const [dateSortie, setDateSortie] = useState(initialValues.dateSortie);
  const [dateAchat, setDateAchat] = useState(initialValues.dateAchat);
  const [couvertureUrl, setCouvertureUrl] = useState(initialValues.couvertureUrl);
  const [typeTome, setTypeTome] = useState<'Standard' | 'Collector' | 'Deluxe' | 'Intégrale' | 'Coffret' | 'Numérique' | 'Autre'>(initialValues.typeTome);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  
  // Tracker les champs modifiés (pour afficher l'icône ✅)
  const [, setChangedFields] = useState<Set<string>>(new Set());
  // Tracker les champs validés par l'utilisateur (icône ✅ cliquée)
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());
  
  // Fonction pour vérifier si un champ a changé
  const isFieldChanged = (fieldKey: string): boolean => {
    const currentValue = {
      numero,
      prix,
      proprietaireIds: JSON.stringify([...proprietaireIds].sort()),
      dateSortie,
      dateAchat,
      couvertureUrl,
      typeTome
    }[fieldKey];
    
    const initialValue = {
      numero: initialValues.numero,
      prix: initialValues.prix,
      proprietaireIds: JSON.stringify([...initialValues.proprietaireIds].sort()),
      dateSortie: initialValues.dateSortie,
      dateAchat: initialValues.dateAchat,
      couvertureUrl: initialValues.couvertureUrl,
      typeTome: initialValues.typeTome
    }[fieldKey];
    
    // Normaliser pour la comparaison
    const normalize = (val: any): string | null => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed || null;
      }
      return String(val);
    };
    
    return normalize(currentValue) !== normalize(initialValue);
  };
  
  // Fonction pour valider/invalider un champ
  const toggleFieldValidation = (fieldKey: string) => {
    setValidatedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  };
  
  // Composant pour l'icône de validation
  const ValidationIcon = ({ fieldKey }: { fieldKey: string }) => {
    const hasChanged = isFieldChanged(fieldKey);
    const isValidated = validatedFields.has(fieldKey);
    
    // Si le champ est validé, TOUJOURS afficher l'icône verte (même si modifié à nouveau)
    // Sinon, afficher l'icône jaune seulement si le champ a changé
    if (!isValidated && !hasChanged) return null;
    
    // Si validé, l'icône est toujours verte, peu importe si le champ a changé à nouveau
    const iconColor = isValidated ? '#22c55e' : '#eab308';
    const iconBackground = isValidated ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)';
    const iconBorder = isValidated ? 'rgba(34, 197, 94, 0.5)' : 'rgba(234, 179, 8, 0.5)';
    
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFieldValidation(fieldKey);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          background: iconBackground,
          border: `1px solid ${iconBorder}`,
          borderRadius: '4px',
          cursor: 'pointer',
          marginLeft: '8px',
          transition: 'all 0.2s ease'
        }}
        title={isValidated ? 'Champ validé (sera sauvegardé) - Cliquer pour invalider' : 'Cliquer pour valider ce champ'}
      >
        <Check 
          size={16} 
          style={{ 
            color: iconColor,
            opacity: isValidated ? 1 : 0.7
          }} 
        />
      </button>
    );
  };

  // Charger la liste des utilisateurs
  useEffect(() => {
    window.electronAPI.getAllUsers().then(setUsers);
  }, []);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, saving);

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
      setChangedFields(prev => new Set(prev).add('couvertureUrl'));
      setValidatedFields(prev => new Set(prev).add('couvertureUrl')); // Auto-valider l'upload
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

      // Convertir le fichier en Uint8Array pour l'envoyer au backend
      const arrayBuffer = await imageFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const result = await window.electronAPI.saveCoverFromBuffer(
        uint8Array,
        imageFile.name,
        serieTitre,
        'tome',
        {
          mediaType,
          typeVolume
        }
      );

      if (result.success && result.localPath) {
        setCouvertureUrl(result.localPath);
        setChangedFields(prev => new Set(prev).add('couvertureUrl'));
        setValidatedFields(prev => new Set(prev).add('couvertureUrl')); // Auto-valider l'upload
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier les champs requis
    if (!numero || !prix) {
      showToast({ title: 'Erreur', message: 'Le numéro et le prix sont obligatoires', type: 'error' });
      return;
    }

    // Si des champs sont validés, n'envoyer que ceux-là
    // Sinon, envoyer tous les champs (comportement par défaut pour compatibilité)
    const updateData: Record<string, any> = {};
    
    if (validatedFields.size > 0) {
      // Normaliser UNIQUEMENT les champs validés par l'utilisateur
      for (const fieldKey of validatedFields) {
        if (fieldKey === 'numero') {
          const num = Number(numero);
          if (isNaN(num) || num <= 0) continue;
          updateData.numero = num;
        } else if (fieldKey === 'prix') {
          const p = Number(prix);
          if (isNaN(p) || p < 0) continue;
          updateData.prix = p;
        } else if (fieldKey === 'proprietaireIds') {
          updateData.proprietaireIds = proprietaireIds;
        } else if (fieldKey === 'dateSortie') {
          updateData.date_sortie = dateSortie || null;
        } else if (fieldKey === 'dateAchat') {
          updateData.date_achat = dateAchat || null;
        } else if (fieldKey === 'couvertureUrl') {
          updateData.couverture_url = couvertureUrl || null;
        } else if (fieldKey === 'typeTome') {
          updateData.type_tome = typeTome || 'Standard';
        }
      }
      
      // Toujours inclure les champs requis même s'ils ne sont pas validés
      if (!updateData.numero) {
        const num = Number(numero);
        if (!isNaN(num) && num > 0) updateData.numero = num;
      }
      if (!updateData.prix) {
        const p = Number(prix);
        if (!isNaN(p) && p >= 0) updateData.prix = p;
      }
    } else {
      // Comportement par défaut : envoyer tous les champs
      updateData.numero = Number(numero);
      updateData.prix = Number(prix);
      updateData.proprietaireIds = proprietaireIds;
      updateData.date_sortie = dateSortie || null;
      updateData.date_achat = dateAchat || null;
      updateData.couverture_url = couvertureUrl || null;
      updateData.type_tome = typeTome || 'Standard';
    }

    setSaving(true);
    try {
      await window.electronAPI.updateTome(tome.id, updateData);
      
      showToast({ title: 'Tome modifié avec succès', type: 'success' });
      // Réinitialiser les champs validés après une sauvegarde réussie
      setValidatedFields(new Set());
      setChangedFields(new Set());
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (error: any) {
      console.error('Erreur update tome:', error);
      showToast({ title: 'Erreur', message: error?.message || 'Impossible de mettre à jour le tome', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal maxWidth="800px">
      <ModalHeader title="Modifier le tome" onClose={onClose} />

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
                onChange={(e) => {
                  setCouvertureUrl(e.target.value);
                  setTimeout(() => {
                    if (isFieldChanged('couvertureUrl')) {
                      setChangedFields(prev => new Set(prev).add('couvertureUrl'));
                    } else {
                      setChangedFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('couvertureUrl');
                        return newSet;
                      });
                    }
                  }, 0);
                }}
                className="input"
                style={{ fontSize: '11px', padding: '6px' }}
              />
            </div>
          </div>

          {/* Colonne droite - Formulaire */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '600' }}>
                  <span>
                    Numéro du tome <span style={{ color: 'var(--error)' }}>*</span>
                  </span>
                  <ValidationIcon fieldKey="numero" />
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={numero}
                  onChange={(e) => {
                    setNumero(e.target.value);
                    setTimeout(() => {
                      if (isFieldChanged('numero')) {
                        setChangedFields(prev => new Set(prev).add('numero'));
                      } else {
                        setChangedFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete('numero');
                          return newSet;
                        });
                      }
                    }, 0);
                  }}
                  className="input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '600' }}>
                  <span>
                    Prix (€) <span style={{ color: 'var(--error)' }}>*</span>
                  </span>
                  <ValidationIcon fieldKey="prix" />
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="6.95"
                  value={prix}
                  onChange={(e) => {
                    setPrix(e.target.value);
                    setTimeout(() => {
                      if (isFieldChanged('prix')) {
                        setChangedFields(prev => new Set(prev).add('prix'));
                      } else {
                        setChangedFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete('prix');
                          return newSet;
                        });
                      }
                    }, 0);
                  }}
                  className="input"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '600' }}>
                <span>Type de tome</span>
                <ValidationIcon fieldKey="typeTome" />
              </label>
              <select
                value={typeTome}
                onChange={(e) => {
                  const value = e.target.value as 'Standard' | 'Collector' | 'Deluxe' | 'Intégrale' | 'Coffret' | 'Numérique' | 'Autre';
                  setTypeTome(value);
                  setTimeout(() => {
                    if (isFieldChanged('typeTome')) {
                      setChangedFields(prev => new Set(prev).add('typeTome'));
                    } else {
                      setChangedFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('typeTome');
                        return newSet;
                      });
                    }
                  }, 0);
                }}
                className="select"
                style={{ width: '100%' }}
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
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '600', marginRight: '8px' }}>
                  Propriétaire(s) <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <ValidationIcon fieldKey="proprietaireIds" />
              </div>
              <MultiSelectDropdown
                label=""
                required
                options={users.map(u => ({ id: u.id, name: u.name, color: u.color }))}
                selectedIds={proprietaireIds}
                onChange={(ids) => {
                  setProprietaireIds(ids);
                  setTimeout(() => {
                    if (isFieldChanged('proprietaireIds')) {
                      setChangedFields(prev => new Set(prev).add('proprietaireIds'));
                    } else {
                      setChangedFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete('proprietaireIds');
                        return newSet;
                      });
                    }
                  }, 0);
                }}
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
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '600' }}>
                  <span>Date de sortie VF</span>
                  <ValidationIcon fieldKey="dateSortie" />
                </label>
                <input
                  type="date"
                  value={dateSortie}
                  onChange={(e) => {
                    setDateSortie(e.target.value);
                    setTimeout(() => {
                      if (isFieldChanged('dateSortie')) {
                        setChangedFields(prev => new Set(prev).add('dateSortie'));
                      } else {
                        setChangedFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete('dateSortie');
                          return newSet;
                        });
                      }
                    }, 0);
                  }}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '600' }}>
                  <span>Date d'achat</span>
                  <ValidationIcon fieldKey="dateAchat" />
                </label>
                <input
                  type="date"
                  value={dateAchat}
                  onChange={(e) => {
                    setDateAchat(e.target.value);
                    setTimeout(() => {
                      if (isFieldChanged('dateAchat')) {
                        setChangedFields(prev => new Set(prev).add('dateAchat'));
                      } else {
                        setChangedFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete('dateAchat');
                          return newSet;
                        });
                      }
                    }, 0);
                  }}
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
      {ToastContainer}
    </Modal>
  );
}
