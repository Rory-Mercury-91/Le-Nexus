import EditAdulteGameModal from '../../components/modals/adulte-game/EditAdulteGameModal';
import { useAdulteGameDetail } from '../../hooks/details/useAdulteGameDetail';
import {
  AdulteGameBanner,
  AdulteGameHeader,
  AdulteGameInfoCard,
  AdulteGameParamsCard,
  AdulteGameTraductionCard
} from './components';

export default function AdulteGameDetail() {
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
    loadGame,
    navigate,
    ToastContainer,
    ConfirmDialog
  } = useAdulteGameDetail();

  // Préférences d'affichage - tout activé par défaut
  const displayPrefs = {
    main_info: true,
    user_params: true,
    translation: true
  };

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
        statut_perso={game.statut_perso}
        onStatusChange={handleStatusChange}
      />

      <div style={{ width: '100%', minHeight: '100vh', background: 'var(--background)' }}>
        {/* Espace pour compenser le header fixe */}
        <div style={{ height: '70px' }} />

        {/* Bannière - Image en pleine largeur */}
        <div style={{ padding: '0', width: '100%' }}>
          <AdulteGameBanner
            coverUrl={game.couverture_url}
            title={game.titre}
            gameId={game.id}
            onCoverUpdated={loadGame}
          />
        </div>

        {/* Contenu principal - Padding aligné avec MangaDetail */}
        <div style={{ padding: '20px 20px 80px', maxWidth: '1600px', margin: '0 auto' }}>
          {/* Deux colonnes : Informations principales | (Traduction + Paramètres) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}
          >
            {/* Colonne 1 : Informations principales */}
            {displayPrefs.main_info && (
              <AdulteGameInfoCard
                titre={game.titre}
                statut_jeu={game.statut_jeu}
                moteur={game.moteur}
                developpeur={game.developpeur}
                plateforme={game.plateforme}
                version={game.version}
                tags={game.tags}
                f95_thread_id={game.f95_thread_id}
                lien_f95={game.lien_f95}
                Lewdcorner_thread_id={game.Lewdcorner_thread_id}
                lien_lewdcorner={game.lien_lewdcorner}
              />
            )}

            {/* Colonne 2 : Traduction + Paramètres personnels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Ligne 1 : Traduction française */}
              {displayPrefs.translation && !!game.traduction_fr_disponible ? (
                <AdulteGameTraductionCard
                  version_traduite={game.version_traduite}
                  version_actuelle={game.version}
                  type_trad_fr={game.type_trad_fr}
                  traducteur={game.traducteur}
                  lien_traduction={game.lien_traduction}
                  traductions_multiples={game.traductions_multiples}
                />
              ) : displayPrefs.translation ? (
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                    Aucune traduction disponible
                  </div>
                </div>
              ) : null}

              {/* Ligne 2 : Paramètres personnels */}
              {displayPrefs.user_params && (
                <AdulteGameParamsCard
                  gameId={game.id}
                  chemin_executable={game.chemin_executable}
                  version_jouee={game.version_jouee}
                  derniere_session={game.derniere_session}
                  onExecutableChange={loadGame}
                />
              )}
            </div>
          </div>
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

      <ConfirmDialog />
    </>
  );
}
