import { useCallback, useEffect, useState } from 'react';
import AdulteGameOwnershipModal from '../../components/modals/adulte-game/AdulteGameOwnershipModal';
import { ADULTE_GAME_DISPLAY_CATEGORIES, ADULTE_GAME_DISPLAY_DEFAULTS } from '../../components/modals/adulte-game/displayConfig';
import EditAdulteGameModal from '../../components/modals/adulte-game/EditAdulteGameModal';
import DisplaySettingsModal, { DisplayFieldCategory } from '../../components/modals/common/DisplaySettingsModal';
import { useToast } from '../../hooks/common/useToast';
import { useAdulteGameDetail } from '../../hooks/details/useAdulteGameDetail';
import {
  AdulteGameBanner,
  AdulteGameHeader,
  AdulteGameInfoCard,
  AdulteGameLabelsCard,
  AdulteGameParamsCard,
  AdulteGameTagsCard,
  AdulteGameTraductionCard
} from './components';

export default function AdulteGameDetail() {
  const { showToast } = useToast();
  const [tagPreferences, setTagPreferences] = useState<Record<string, 'liked' | 'disliked' | 'neutral'>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadTagPreferences();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userName = localStorage.getItem('currentUser');
      if (userName) {
        const users = await window.electronAPI.getAllUsers();
        const user = users.find((u: { name: string; id: number }) => u.name === userName);
        if (user) {
          setCurrentUserId(user.id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const loadTagPreferences = async () => {
    if (!currentUserId) return;
    try {
      const preferences = await window.electronAPI.getAdulteGameTagPreferences(currentUserId);
      setTagPreferences(preferences);
    } catch (error) {
      console.error('Erreur chargement préférences tags:', error);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadTagPreferences();
    }
  }, [currentUserId]);

  const handleTagPreferenceToggle = async (tag: string) => {
    if (!currentUserId) {
      return;
    }

    try {
      const result = await window.electronAPI.toggleAdulteGameTagPreference(currentUserId, tag);

      // Mettre à jour l'état local immédiatement
      const newPreference = result.preference;
      setTagPreferences(prev => ({
        ...prev,
        [tag]: newPreference
      }));

      // Feedback visuel
      const messages: Record<'liked' | 'disliked' | 'neutral', string> = {
        liked: 'Tag ajouté aux favoris',
        disliked: 'Tag marqué comme non apprécié',
        neutral: 'Préférence du tag réinitialisée'
      };

      showToast({
        title: messages[newPreference as 'liked' | 'disliked' | 'neutral'],
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur toggle préférence tag:', error);
    }
  };

  const {
    game,
    loading,
    availableVersions,
    canPlay,
    isUpdating,
    showEditModal,
    setShowEditModal,
    handleCheckUpdate,
    handleForceCheckUpdate,
    handlePlay,
    handleLaunchVersion,
    handleEdit,
    handleDelete,
    handleStatusChange,
    handleNotesChange,
    loadGame,
    navigate,
    ToastContainer,
    ConfirmDialog,
    owners,
    users,
    currentUser,
    profileImages,
    costsByUser,
    totalPrix,
    loadOwners
  } = useAdulteGameDetail();

  // Gestion des préférences d'affichage
  const [displayPrefs, setDisplayPrefs] = useState<Record<string, boolean>>(ADULTE_GAME_DISPLAY_DEFAULTS);
  const [showDisplaySettingsModal, setShowDisplaySettingsModal] = useState(false);

  const refreshDisplayPrefs = useCallback(async () => {
    try {
      const defaults = { ...ADULTE_GAME_DISPLAY_DEFAULTS };
      const globalPrefs = await window.electronAPI.getAdulteGameDisplaySettings?.() || {};

      if (game?.id) {
        const localOverrides = await window.electronAPI.getAdulteGameDisplayOverrides?.(game.id) || {};
        setDisplayPrefs({ ...defaults, ...globalPrefs, ...localOverrides });
      } else {
        setDisplayPrefs({ ...defaults, ...globalPrefs });
      }
    } catch (err) {
      console.error('Erreur chargement préférences:', err);
      setDisplayPrefs(ADULTE_GAME_DISPLAY_DEFAULTS);
    }
  }, [game?.id]);

  useEffect(() => {
    if (game?.id) {
      refreshDisplayPrefs();
    }
  }, [game?.id, refreshDisplayPrefs]);

  const handleOpenDisplaySettings = useCallback(() => {
    setShowDisplaySettingsModal(true);
  }, []);

  const handleCloseDisplaySettings = useCallback(async () => {
    setShowDisplaySettingsModal(false);
    await refreshDisplayPrefs();
  }, [refreshDisplayPrefs]);

  const handleLabelsUpdated = useCallback(() => {
    if (!game?.id) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('adulte-game-labels-updated', {
        detail: { gameId: game.id }
      })
    );
  }, [game?.id]);

  // Écouter les changements de display settings
  useEffect(() => {
    const handler = () => {
      refreshDisplayPrefs();
    };
    window.addEventListener('adulte-game-display-settings-updated', handler);
    return () => window.removeEventListener('adulte-game-display-settings-updated', handler);
  }, [refreshDisplayPrefs]);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '16px',
          color: 'var(--text-secondary)'
        }}
      >
        Chargement...
      </div>
    );
  }

  // Not found state
  if (!game) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px'
        }}
      >
        <p style={{ fontSize: '18px', color: 'var(--text)' }}>
          Jeu non trouvé
        </p>
        <button
          onClick={() => navigate('/adulte-game')}
          className="btn btn-primary"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}

      {/* Header fixe avec bouton retour et actions */}
      <AdulteGameHeader
        onBack={() => navigate('/adulte-game')}
        onCheckUpdate={handleCheckUpdate}
        onForceCheckUpdate={handleForceCheckUpdate}
        onPlay={handlePlay}
        onPlayVersion={handleLaunchVersion}
        availableVersions={availableVersions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isUpdating={isUpdating}
        canPlay={canPlay}
        onCustomizeDisplay={handleOpenDisplaySettings}
      />

      <div style={{ width: '100%', minHeight: '100vh', background: 'var(--background)' }}>
        {/* Espace pour compenser le header fixe */}
        <div style={{ height: '70px' }} />

        {/* Bannière */}
        <div style={{ padding: '40px 20px 0', maxWidth: '1600px', margin: '0 auto' }}>
          <AdulteGameBanner
            coverUrl={game.couverture_url}
            title={game.titre}
            gameId={game.id}
            onCoverUpdated={loadGame}
          />
        </div>

        {/* Contenu principal - Padding aligné avec MangaDetail */}
        <div style={{ padding: '20px 20px 80px', maxWidth: '1600px', margin: '0 auto' }}>
          {/* Ligne 1 : Informations principales + Paramètres personnels */}
          {(displayPrefs.main_info || displayPrefs.user_params) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${[displayPrefs.main_info, displayPrefs.user_params].filter(Boolean).length || 1}, 1fr)`,
                gap: '20px',
                marginBottom: '20px'
              }}
            >
              {displayPrefs.main_info && (
                <AdulteGameInfoCard
                  titre={game.titre}
                  statut_jeu={game.statut_jeu}
                  moteur={game.moteur}
                  developpeur={game.developpeur}
                  plateforme={game.plateforme}
                  version={game.version}
                  version_jouee={game.version_jouee}
                  derniere_session={game.derniere_session}
                  f95_thread_id={game.f95_thread_id}
                  lien_f95={game.lien_f95}
                />
              )}

              {displayPrefs.user_params && (
                <AdulteGameParamsCard
                  gameId={game.id}
                  statut_perso={game.statut_perso}
                  notes_privees={game.notes_privees}
                  chemin_executable={game.chemin_executable}
                  onStatusChange={handleStatusChange}
                  onNotesChange={handleNotesChange}
                  onExecutableChange={loadGame}
                  costsByUser={costsByUser}
                  totalPrix={totalPrix}
                  profileImages={profileImages}
                  onMarkAsOwned={() => setShowOwnershipModal(true)}
                />
              )}
            </div>
          )}

          {/* Ligne 2 : Traduction française | Tags | Labels personnalisés */}
          {(() => {
            const showTranslation = displayPrefs.translation && !!game.traduction_fr_disponible;
            const showTags = displayPrefs.tags;
            const showLabels = displayPrefs.labels;
            const visibleBlocks = [showTranslation, showTags, showLabels].filter(Boolean).length;

            if (!visibleBlocks) {
              return (
                <div
                  style={{
                    border: '1px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '18px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '13px'
                  }}
                >
                  Toutes les cartes de cette section sont masquées par vos préférences d'affichage.
                </div>
              );
            }

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${visibleBlocks}, 1fr)`,
                  gap: '20px'
                }}
              >
                {showTranslation && (
                  <AdulteGameTraductionCard
                    version_traduite={game.version_traduite}
                    version_actuelle={game.version}
                    type_trad_fr={game.type_trad_fr}
                    traducteur={game.traducteur}
                    lien_traduction={game.lien_traduction}
                    traductions_multiples={game.traductions_multiples}
                  />
                )}

                {showTags && (
                  <AdulteGameTagsCard
                    tags={game.tags}
                    tagPreferences={tagPreferences}
                    onTagPreferenceToggle={handleTagPreferenceToggle}
                  />
                )}

                {showLabels && (
                  <AdulteGameLabelsCard gameId={game.id} onLabelsChange={handleLabelsUpdated} />
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditAdulteGameModal
          game={game}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadGame();
          }}
        />
      )}

      {showDisplaySettingsModal && game && (
        <DisplaySettingsModal
          title="Affichage du jeu"
          description="Les modifications locales surchargent les paramètres globaux pour ce jeu."
          fields={ADULTE_GAME_DISPLAY_CATEGORIES as DisplayFieldCategory[]}
          mode="global-local"
          itemId={game.id}
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getAdulteGameDisplaySettings?.();
            return prefs || ADULTE_GAME_DISPLAY_DEFAULTS;
          }}
          loadLocalOverrides={async (itemId) => {
            const overrides = await window.electronAPI.getAdulteGameDisplayOverrides?.(itemId);
            return overrides || {};
          }}
          saveLocalOverrides={async (itemId, overrides) => {
            await window.electronAPI.saveAdulteGameDisplayOverrides?.(itemId, overrides);
          }}
          deleteLocalOverrides={async (itemId, keys) => {
            await window.electronAPI.deleteAdulteGameDisplayOverrides?.(itemId, keys);
          }}
          onSave={() => {
            handleCloseDisplaySettings();
          }}
          onClose={handleCloseDisplaySettings}
          showToast={showToast}
        />
      )}

      {showOwnershipModal && game && (
        <>
          {users.length > 0 && currentUser ? (
            <AdulteGameOwnershipModal
              game={game}
              owners={owners}
              users={users}
              currentUserId={currentUser.id}
              onClose={() => setShowOwnershipModal(false)}
              onSuccess={async () => {
                await loadOwners();
                setShowOwnershipModal(false);
                // Déclencher un événement pour recharger les propriétaires
                window.dispatchEvent(new CustomEvent('adulte-game-ownership-updated', {
                  detail: { gameId: game.id }
                }));
              }}
            />
          ) : null}
        </>
      )}

      <ConfirmDialog />
    </>
  );
}
