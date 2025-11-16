import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProtectedContent from '../../components/common/ProtectedContent';
import AnimeEditModal from '../../components/modals/anime/AnimeEditModal';
import CustomizeDisplayModal from '../../components/modals/anime/CustomizeDisplayModal';
import ConfirmModal from '../../components/modals/common/ConfirmModal';
import { useAnimeDetail } from '../../hooks/details/useAnimeDetail';
import { isSensitiveAnime } from '../../utils/anime-sensitivity';
import {
  AnimeBanner,
  AnimeCover,
  AnimeEpisodesGrid,
  AnimeExternalLinks,
  AnimeHeader,
  AnimeInfoCards,
  AnimeMalBlock,
  AnimeRelationsSection,
  AnimeStatusSection,
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
    isCrunchyroll,
    showDeleteModal,
    showEditModal,
    showCustomizeDisplay,
    showAddLinkForm,
    newLink,
    setShowDeleteModal,
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
    enriching,
    loadAnime,
    reloadDisplayPreferences,
    shouldShow,
    ToastContainer
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

        {/* Header fixe avec bouton retour et actions */}
        <div
          className="anime-detail-header"
          style={{
            position: 'fixed',
            top: 0,
            left: '260px',
            right: 0,
            zIndex: 1000,
            background: 'var(--background)',
            padding: '16px 30px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Link
            to="/animes"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              border: 'none',
              color: 'white',
              textDecoration: 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ArrowLeft size={18} />
            Retour aux animes
          </Link>

          {/* Boutons d'action */}
          {!loading && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowCustomizeDisplay(true)} className="btn btn-primary">
                ⚙️ Affichage
              </button>
              <button onClick={() => setShowEditModal(true)} className="btn btn-primary">
                <Edit size={18} />
                Modifier
              </button>
              <button
                onClick={handleEnrich}
                className="btn btn-primary"
                disabled={enriching}
              >
                {enriching ? '⏳ Enrichissement...' : '🚀 Enrichir'}
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
                <Trash2 size={18} />
                Supprimer
              </button>
            </div>
          )}
        </div>

        <div
          className="fade-in"
          style={{
            padding: '110px 40px 80px',
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
              maxWidth: '1400px',
              margin: '0 auto'
            }}
          >
            {isCrunchyroll && shouldShow('banner') && (
              <AnimeBanner coverUrl={anime.couverture_url} title={anime.titre} />
            )}

            <div
              className="card"
              style={{
                padding: 'clamp(20px, 3vw, 36px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(20px, 3vw, 36px)',
                  flexWrap: 'wrap',
                  width: '100%'
                }}
              >
                {!isCrunchyroll && shouldShow('couverture') && (
                  <AnimeCover
                    anime={anime}
                    episodesVus={episodesVus}
                    nbEpisodes={anime.nb_episodes}
                    onStatusChange={handleChangeStatutVisionnage}
                    onToggleFavorite={handleToggleFavorite}
                    shouldShow={shouldShow}
                  />
                )}

                <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <AnimeHeader anime={anime} shouldShow={shouldShow} />

                  {isCrunchyroll && shouldShow('couverture') && (
                    <AnimeStatusSection
                      anime={anime}
                      currentStatus={
                        anime.nb_episodes > 0 && episodesVus >= anime.nb_episodes
                          ? 'Terminé'
                          : (anime.statut_visionnage === 'En attente' ? 'En pause' : (anime.statut_visionnage as 'En cours' | 'Terminé' | 'Abandonné' | 'À regarder' | 'En pause') || 'En cours')
                      }
                      onStatusChange={handleChangeStatutVisionnage}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  )}

                  <AnimeInfoCards anime={anime} shouldShow={shouldShow} />
                </div>
              </div>

              <AnimeMalBlock anime={anime} shouldShow={shouldShow} />

              <AnimeRelationsSection anime={anime} shouldShow={shouldShow} />

              <AnimeExternalLinks anime={anime} liensExternes={liensExternes} shouldShow={shouldShow} />

              <AnimeStreamingLinks
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
                shouldShow={shouldShow}
              />
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

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <ConfirmModal
            title="Supprimer cet anime ?"
            message={`Êtes-vous sûr de vouloir supprimer "${anime.titre}" ? Cette action est irréversible.`}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}

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
          <CustomizeDisplayModal
            animeId={anime.id}
            onClose={() => setShowCustomizeDisplay(false)}
            onSave={reloadDisplayPreferences}
          />
        )}
      </>
    </ProtectedContent>
  );
}
