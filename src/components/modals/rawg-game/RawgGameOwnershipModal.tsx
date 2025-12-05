import { useMemo, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import { RawgGameDetail } from '../../../hooks/details/useRawgGameDetail';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface RawgGameOwnershipModalProps {
  game: RawgGameDetail;
  owners: Array<{ id: number; user_id: number; prix: number; date_achat: string | null; platforms: string | null | string[]; user_name: string; user_color: string; user_emoji: string }>;
  users: Array<{ id: number; name: string; color: string; emoji: string }>;
  currentUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RawgGameOwnershipModal({
  game,
  owners,
  users,
  currentUserId,
  onClose,
  onSuccess
}: RawgGameOwnershipModalProps) {
  const { showToast, ToastContainer } = useToast();

  // Récupérer les propriétaires existants
  const getInitialProprietaires = (): number[] => {
    if (owners && owners.length > 0) {
      return owners.map(p => p.user_id);
    }
    return currentUserId ? [currentUserId] : [];
  };

  // Extraire les plateformes disponibles depuis les données RAWG
  const availablePlatforms = useMemo(() => {
    const platforms: Array<{ id: string; name: string }> = [];

    // Depuis rawgData.platforms
    if (game.rawgData?.platforms && Array.isArray(game.rawgData.platforms)) {
      game.rawgData.platforms.forEach((platform: any) => {
        const platformName = platform.platform?.name || platform.name;
        if (platformName && !platforms.find(p => p.name === platformName)) {
          platforms.push({ id: platformName, name: platformName });
        }
      });
    }

    // Depuis rawg_platforms (JSON string)
    if (game.rawg_platforms) {
      try {
        const parsed = JSON.parse(game.rawg_platforms);
        if (Array.isArray(parsed)) {
          parsed.forEach((platformName: string) => {
            if (platformName && !platforms.find(p => p.name === platformName)) {
              platforms.push({ id: platformName, name: platformName });
            }
          });
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    return platforms.sort((a, b) => a.name.localeCompare(b.name));
  }, [game.rawgData?.platforms, game.rawg_platforms]);

  // Récupérer les plateformes initiales depuis les propriétaires existants
  const getInitialPlatforms = (): string[] => {
    if (owners && owners.length > 0) {
      // Prendre les plateformes du premier propriétaire (tous les propriétaires partagent les mêmes plateformes)
      const firstOwner = owners[0];
      if (firstOwner.platforms) {
        try {
          if (typeof firstOwner.platforms === 'string') {
            return JSON.parse(firstOwner.platforms);
          }
          return Array.isArray(firstOwner.platforms) ? firstOwner.platforms : [];
        } catch {
          return [];
        }
      }
    }
    return [];
  };

  const [prix, setPrix] = useState<string>(() => {
    if (owners && owners.length > 0) {
      return owners.reduce((sum, owner) => sum + (owner.prix || 0), 0).toFixed(2);
    }
    return '';
  });
  const [proprietaireIds, setProprietaireIds] = useState<number[]>(getInitialProprietaires());
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(getInitialPlatforms());

  // Convertir les plateformes en options avec indices numériques
  const platformOptions = useMemo(() => {
    return availablePlatforms.map((platform, index) => ({
      id: index,
      name: platform.name,
      color: ''
    }));
  }, [availablePlatforms]);

  // Convertir les plateformes sélectionnées en indices
  const selectedPlatformIndices = useMemo(() => {
    return selectedPlatforms
      .map(platformName => availablePlatforms.findIndex(p => p.name === platformName))
      .filter(index => index !== -1);
  }, [selectedPlatforms, availablePlatforms]);

  // Handler pour mettre à jour les plateformes sélectionnées depuis les indices
  const handlePlatformChange = (indices: number[]) => {
    const platforms = indices.map(index => availablePlatforms[index]?.name).filter(Boolean) as string[];
    setSelectedPlatforms(platforms);
  };
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
      const result = await window.electronAPI.adulteGameMarkAsOwned?.({
        gameId: game.id,
        prix: parseFloat(prix),
        dateAchat: dateAchat || null,
        partageAvec: proprietaireIds.filter(id => id !== currentUserId),
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null
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

            {availablePlatforms.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Plateforme(s)
                </label>
                <MultiSelectDropdown
                  label=""
                  options={platformOptions}
                  selectedIds={selectedPlatformIndices}
                  onChange={handlePlatformChange}
                  placeholder="Sélectionnez une ou plusieurs plateformes..."
                />
              </div>
            )}

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
