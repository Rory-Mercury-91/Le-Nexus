import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomizeAdulteGameDisplayModal from '../../components/modals/adulte-game/CustomizeAdulteGameDisplayModal';
import { ADULTE_GAME_DISPLAY_DEFAULTS, AdulteGameFieldKey } from '../../components/modals/adulte-game/displayConfig';
import EditAdulteGameModal from '../../components/modals/adulte-game/EditAdulteGameModal';
import ConfirmModal from '../../components/modals/common/ConfirmModal';
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
  const [showDisplayModal, setShowDisplayModal] = useState(false);
  const [globalDisplayPrefs, setGlobalDisplayPrefs] = useState<Record<AdulteGameFieldKey, boolean>>({ ...ADULTE_GAME_DISPLAY_DEFAULTS });
  const [localDisplayOverrides, setLocalDisplayOverrides] = useState<Record<AdulteGameFieldKey, boolean>>({} as Record<AdulteGameFieldKey, boolean>);

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
    showDeleteConfirm,
    showEditModal,
    setShowDeleteConfirm,
    setShowEditModal,
    handleCheckUpdate,
    handlePlay,
    handleLaunchVersion,
    handleEdit,
    handleDelete,
    handleStatusChange,
    handleNotesChange,
    loadGame,
    navigate,
    ToastContainer
  } = useAdulteGameDetail();

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

  const loadGlobalDisplayPrefs = useCallback(async () => {
    try {
      const prefs = await window.electronAPI.getAdulteGameDisplaySettings?.();
      if (prefs) {
        setGlobalDisplayPrefs({ ...ADULTE_GAME_DISPLAY_DEFAULTS, ...prefs });
      } else {
        setGlobalDisplayPrefs({ ...ADULTE_GAME_DISPLAY_DEFAULTS });
      }
    } catch (error) {
      console.error('Erreur chargement préférences globales jeux adultes:', error);
    }
  }, []);

  const loadLocalDisplayOverrides = useCallback(async (id: number) => {
    try {
      const overrides = await window.electronAPI.getAdulteGameDisplayOverrides?.(id) || {};
      setLocalDisplayOverrides(overrides as Record<AdulteGameFieldKey, boolean>);
    } catch (error) {
      console.error('Erreur chargement préférences locales jeu adulte:', error);
      setLocalDisplayOverrides({} as Record<AdulteGameFieldKey, boolean>);
    }
  }, []);

  useEffect(() => {
    loadGlobalDisplayPrefs();
  }, [loadGlobalDisplayPrefs]);

  useEffect(() => {
    if (game?.id) {
      loadLocalDisplayOverrides(game.id);
    }
  }, [game?.id, loadLocalDisplayOverrides]);

  useEffect(() => {
    const handler = () => loadGlobalDisplayPrefs();
    window.addEventListener('adulte-game-display-settings-updated', handler);
    return () => window.removeEventListener('adulte-game-display-settings-updated', handler);
  }, [loadGlobalDisplayPrefs]);

  const displayPrefs = useMemo(() => {
    const computed: Record<AdulteGameFieldKey, boolean> = { ...ADULTE_GAME_DISPLAY_DEFAULTS };
    (Object.keys(computed) as AdulteGameFieldKey[]).forEach((key) => {
      const globalValue = globalDisplayPrefs[key] ?? ADULTE_GAME_DISPLAY_DEFAULTS[key];
      computed[key] = localDisplayOverrides[key] ?? globalValue;
    });
    return computed;
  }, [globalDisplayPrefs, localDisplayOverrides]);

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
        onPlay={handlePlay}
        onPlayVersion={handleLaunchVersion}
        availableVersions={availableVersions}
        onEdit={handleEdit}
        onDelete={() => setShowDeleteConfirm(true)}
        isUpdating={isUpdating}
        canPlay={canPlay}
        onCustomizeDisplay={() => setShowDisplayModal(true)}
      />

      <div style={{ width: '100%', minHeight: '100vh', background: 'var(--background)' }}>
        {/* Espace pour compenser le header fixe */}
        <div style={{ height: '70px' }} />

        {/* Bannière */}
        <AdulteGameBanner
          coverUrl={game.couverture_url}
          title={game.titre}
          gameId={game.id}
          onCoverUpdated={loadGame}
        />

        {/* Contenu principal */}
        <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto' }}>
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

      {showDeleteConfirm && (
        <ConfirmModal
          title="Supprimer le jeu"
          message={`Êtes-vous sûr de vouloir supprimer "${game.titre}" ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            handleDelete();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showDisplayModal && (
        <CustomizeAdulteGameDisplayModal
          gameId={game.id}
          onClose={() => setShowDisplayModal(false)}
          onSave={() => {
            loadGlobalDisplayPrefs();
            loadLocalDisplayOverrides(game.id);
          }}
        />
      )}
    </>
  );
}
