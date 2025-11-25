import { Edit, Settings, Trash2 } from 'lucide-react';
import ProtectedContent from '../../components/common/ProtectedContent';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import EnrichmentButton from '../../components/common/EnrichmentButton';
import AnimeEditModal from '../../components/modals/anime/AnimeEditModal';
import DisplaySettingsModal from '../../components/modals/common/DisplaySettingsModal';
import { useAnimeDetail } from '../../hooks/details/useAnimeDetail';
import { ANIME_DISPLAY_FIELD_CATEGORIES } from '../../utils/anime-display-fields';
import { isSensitiveAnime } from '../../utils/anime-sensitivity';
import {
  AnimeCover,
  AnimeEpisodesGrid,
  AnimeExternalLinks,
  AnimeInfoSection,
  AnimeStreamingLinks
} from './components';

export default function AnimeDetail() {
  const {
    anime,
    episodes,
    loading,
    streamingLinks,
    liensExternes,
    episodesVus,
    showEditModal,
    showCustomizeDisplay,
    showAddLinkForm,
    newLink,
    setShowEditModal,
    setShowCustomizeDisplay,
    setShowAddLinkForm,
    setNewLink,
    handleDelete,
    handleAddLink,
    handleDeleteLink,
    handleToggleEpisode,
    handleMarquerToutVu,
    handleChangeStatutVisionnage,
    handleToggleFavorite,
    handleEnrich,
    handleForceEnrich,
    enriching,
    loadAnime,
    reloadDisplayPreferences,
    shouldShow,
    ToastContainer,
    ConfirmDialog
  } = useAnimeDetail();

  // Vérifier si l'anime est sensible
  const isSensitive = anime ? isSensitiveAnime(anime.rating) : false;

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
          Chargement de l'anime...
        </p>
      </div>
    );
  }

  if (!anime) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Anime non trouvé</p>
      </div>
    );
  }

  return (
    <ProtectedContent
      isSensitive={isSensitive}
      additionalContent={ToastContainer}
    >
      <>
        {ToastContainer}
        <DetailPageHeader
          backLabel="Retour aux animes"
          backTo="/animes"
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCustomizeDisplay(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Settings size={16} />
                Personnaliser l'affichage
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowEditModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Edit size={16} />
                Modifier
              </button>
              <EnrichmentButton
                onEnrich={handleEnrich}
                onForceEnrich={handleForceEnrich}
                enriching={enriching}
                buttonLabel="🚀 Enrichir"
                forceButtonLabel="🔄 Force vérification"
              />
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          }
        />
        <div
          className="fade-in"
          style={{
            padding: '110px 20px 80px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            {/* En-tête de l'anime */}
            <div
              className="card"
              style={{
                padding: 'clamp(16px, 2vw, 20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(17px, 1.5vw, 25px)',
                  flexWrap: 'wrap',
                  width: '100%'
                }}
              >
                {shouldShow('couverture') && (
                  <AnimeCover
                    anime={anime}
                    episodesVus={episodesVus}
                    nbEpisodes={anime.nb_episodes}
                    onStatusChange={handleChangeStatutVisionnage}
                    onToggleFavorite={handleToggleFavorite}
                    shouldShow={shouldShow}
                    onCoverUpdated={() => loadAnime()}
                    onLabelsChange={() => {
                      loadAnime();
                      // Déclencher un événement pour mettre à jour la liste
                      window.dispatchEvent(new CustomEvent('anime-labels-updated', {
                        detail: { animeId: anime.id }
                      }));
                    }}
                    streamingLinks={streamingLinks}
                    showAddLinkForm={showAddLinkForm}
                    newLink={newLink}
                    onShowAddForm={() => setShowAddLinkForm(true)}
                    onHideAddForm={() => {
                      setShowAddLinkForm(false);
                      setNewLink({ platform: '', url: '', language: 'fr' });
                    }}
                    onLinkChange={setNewLink}
                    onAddLink={handleAddLink}
                    onDeleteLink={handleDeleteLink}
                  />
                )}

                {/* Informations */}
                <AnimeInfoSection anime={anime} shouldShow={shouldShow} />
              </div>

              <AnimeExternalLinks anime={anime} liensExternes={liensExternes} shouldShow={shouldShow} />
            </div>

            <AnimeEpisodesGrid
              episodes={episodes}
              episodesVus={episodesVus}
              nbEpisodes={anime.nb_episodes}
              duree={anime.duree ? (typeof anime.duree === 'string' ? parseInt(anime.duree, 10) || null : anime.duree) : null}
              onToggleEpisode={handleToggleEpisode}
              onMarquerToutVu={handleMarquerToutVu}
              shouldShow={shouldShow}
            />
          </div>
        </div>

        {/* Modal d'édition */}
        {showEditModal && anime && (
          <AnimeEditModal
            anime={anime}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              setShowEditModal(false);
              loadAnime();
            }}
          />
        )}

        {showCustomizeDisplay && anime && (
          <DisplaySettingsModal
            title="Personnaliser l'affichage de l'anime"
            description="Les modifications locales surchargent les paramètres globaux pour cet anime"
            fields={ANIME_DISPLAY_FIELD_CATEGORIES}
            mode="global-local"
            itemId={anime.id}
            loadGlobalPrefs={async () => {
              const prefs = await window.electronAPI.getAnimeDisplaySettings?.();
              return prefs || {};
            }}
            loadLocalOverrides={async (itemId) => {
              const overrides = await window.electronAPI.getAnimeDisplayOverrides?.(itemId);
              return overrides || {};
            }}
            saveLocalOverrides={async (itemId, overrides) => {
              await window.electronAPI.saveAnimeDisplayOverrides?.(itemId, overrides);
            }}
            deleteLocalOverrides={async (itemId, keys) => {
              await window.electronAPI.deleteAnimeDisplayOverrides?.(itemId, keys);
            }}
            onSave={() => {
              reloadDisplayPreferences();
            }}
            onClose={() => setShowCustomizeDisplay(false)}
          />
        )}

        <ConfirmDialog />
      </>
    </ProtectedContent>
  );
}
