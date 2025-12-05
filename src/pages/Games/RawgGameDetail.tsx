import { ArrowLeft, Edit, Plus, Settings, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import LazyImage from '../../components/common/LazyImage';
import SimpleCarousel from '../../components/common/SimpleCarousel';
import DisplaySettingsModal, { DisplayFieldCategory } from '../../components/modals/common/DisplaySettingsModal';
import ImageModal from '../../components/modals/common/ImageModal';
import VideoModal from '../../components/modals/common/VideoModal';
import AddImageModal from '../../components/modals/movie/AddImageModal';
import AddVideoModal from '../../components/modals/movie/AddVideoModal';
import EditRawgGameModal from '../../components/modals/rawg-game/EditRawgGameModal';
import RawgGameOwnershipModal from '../../components/modals/rawg-game/RawgGameOwnershipModal';
import { useToast } from '../../hooks/common/useToast';
import { useMediaGallery } from '../../hooks/details/useMediaGallery';
import { useRawgGameDetail } from '../../hooks/details/useRawgGameDetail';
import { useAdulteGameLock } from '../../hooks/useAdulteGameLock';
import { shouldBlurByEsrbRating } from '../../utils/esrb-rating';
import { RawgGameBanner, RawgGameInfoSection } from './components';

const RAWG_GAME_DISPLAY_CATEGORIES: DisplayFieldCategory[] = [
  {
    title: 'Présentation',
    icon: '🎮',
    fields: [
      { key: 'banner', label: 'Bannière' },
      { key: 'description', label: 'Description' },
      { key: 'labels', label: 'Labels personnalisés' }
    ]
  },
  {
    title: 'Métadonnées',
    icon: '📊',
    fields: [
      { key: 'metadata', label: 'Informations principales' },
      { key: 'ratings', label: 'Notes et évaluations' },
      { key: 'platforms', label: 'Plateformes' },
      { key: 'genres', label: 'Genres' },
      { key: 'tags', label: 'Tags' },
      { key: 'developers', label: 'Développeurs' },
      { key: 'publishers', label: 'Éditeurs' }
    ]
  },
  {
    title: 'Achat et disponibilité',
    icon: '🛒',
    fields: [
      { key: 'stores', label: 'Boutiques' },
      { key: 'requirements', label: 'Exigences système' }
    ]
  },
  {
    title: 'Médias',
    icon: '🎞️',
    fields: [
      { key: 'screenshots', label: 'Captures d\'écran' },
      { key: 'movies', label: 'Vidéos' }
    ]
  },
  {
    title: 'Communauté',
    icon: '👥',
    fields: [
      { key: 'community', label: 'Statistiques communautaires' },
      { key: 'externalLinks', label: 'Liens externes' }
    ]
  }
];

const rawgGameDisplayDefaults: Record<string, boolean> = {
  banner: true,
  description: true,
  labels: true,
  metadata: true,
  ratings: true,
  platforms: true,
  genres: true,
  tags: true,
  developers: true,
  publishers: true,
  stores: true,
  requirements: true,
  screenshots: true,
  movies: true,
  community: true,
  externalLinks: true
};

export default function RawgGameDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isLocked, hasPassword } = useAdulteGameLock();

  const {
    game,
    loading,
    error,
    showEditModal,
    setShowEditModal,
    showDisplaySettingsModal,
    handleOpenDisplaySettings,
    handleCloseDisplaySettings,
    handleStatusChange,
    handleToggleFavorite,
    handleDelete,
    loadDetail,
    displayPrefs,
    updatingStatus,
    togglingFavorite,
    owners,
    costsByUser,
    totalPrix,
    users,
    profileImages,
    ToastContainer,
    ConfirmDialog
  } = useRawgGameDetail();

  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  const [selectedImageMeta, setSelectedImageMeta] = useState<{ url: string; fileName?: string } | null>(null);

  // Mémoriser les fonctions API pour la galerie média
  const getUserImagesApi = useCallback(async (id: number) => {
    const images = await window.electronAPI.getRawgGameUserImages(id);
    return {
      success: true,
      images: Array.isArray(images) ? images.map(img => ({
        id: img.id,
        file_path: img.file_path || '',
        file_name: img.file_name || '',
        url: img.url || ''
      })) : []
    };
  }, []);
  const getUserVideosApi = useCallback(async (id: number) => {
    const videos = await window.electronAPI.getRawgGameUserVideos(id);
    return {
      success: true,
      videos: Array.isArray(videos) ? videos : []
    };
  }, []);
  const addImageUrlApi = useCallback((id: number, url: string, title?: string) => window.electronAPI.addRawgGameUserImageUrl(id, url, title), []);
  const addImageFileApi = useCallback((id: number, title?: string) => window.electronAPI.addRawgGameUserImageFile(id, title), []);
  const deleteImageApi = useCallback((imageId: number) => {
    if (!game?.id) return Promise.resolve({ success: false, error: 'Jeu introuvable' });
    return window.electronAPI.deleteRawgGameUserImage(game.id, imageId);
  }, [game?.id]);
  const addVideoUrlApi = useCallback((id: number, url: string, title: string) => window.electronAPI.addRawgGameUserVideoUrl(id, url, title), []);
  const addVideoFileApi = useCallback((id: number, title?: string, isReference?: boolean) => window.electronAPI.addRawgGameUserVideoFile(id, title, isReference), []);
  const deleteVideoApi = useCallback((videoId: number) => {
    if (!game?.id) return Promise.resolve({ success: false, error: 'Jeu introuvable' });
    return window.electronAPI.deleteRawgGameUserVideo(game.id, videoId);
  }, [game?.id]);

  // Hook pour la galerie média (images/vidéos utilisateur)
  const {
    userImages,
    loadingUserImages,
    addingImage,
    showAddImageModal,
    setShowAddImageModal,
    selectedImage,
    setSelectedImage,
    imageToDelete,
    setImageToDelete,
    handleAddImageUrl,
    handleAddImageFile,
    handleDeleteUserImageClick,
    handleConfirmDeleteImage,
    userVideos,
    loadingUserVideos,
    addingVideo,
    showAddVideoModal,
    setShowAddVideoModal,
    selectedVideo,
    setSelectedVideo,
    videoToDelete,
    setVideoToDelete,
    handleAddVideoUrl,
    handleAddVideoFile,
    handleDeleteUserVideoClick,
    handleConfirmDeleteVideo
  } = useMediaGallery({
    itemId: game?.id,
    getUserImagesApi,
    getUserVideosApi,
    addImageUrlApi,
    addImageFileApi,
    deleteImageApi,
    addVideoUrlApi,
    addVideoFileApi,
    deleteVideoApi
  });

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImageMeta(null);
    }
  }, [selectedImage]);

  // Combiner les vidéos RAWG et utilisateur
  const allVideos = useMemo(() => {
    const rawgVideos = (game?.rawgData?.movies || []).map((movie: any) => ({
      id: `rawg-${movie.id}`,
      name: movie.name || 'Vidéo',
      url: movie.data?.max || movie.data?.['480'] || null,
      isUserVideo: false
    }));

    const userVideoList = Array.isArray(userVideos) ? userVideos.map(v => ({
      id: `user-${v.id}`,
      name: v.title || 'Vidéo utilisateur',
      url: v.url,
      file_path: v.file_path,
      isUserVideo: true,
      videoId: v.id
    })) : [];

    return [...rawgVideos, ...userVideoList];
  }, [game?.rawgData?.movies, userVideos]);

  // Déterminer si les images doivent être floutées (seulement si code maître défini ET actif ET rating ESRB nécessite floutage)
  const esrbRating = useMemo(() => {
    const esrb = game?.rawgData?.esrb_rating;
    if (!esrb) return null;
    if (typeof esrb === 'string') return esrb;
    return esrb.name || null;
  }, [game?.rawgData?.esrb_rating]);
  const shouldBlurImages = hasPassword && isLocked && shouldBlurByEsrbRating(esrbRating);

  // Combiner les screenshots RAWG et utilisateur
  const allScreenshots = useMemo(() => {
    const rawgScreenshots: Array<{ id: string; imageUrl: string; source: 'rawg' | 'user'; userImageId?: number; fileName?: string }> = [];

    // Screenshots RAWG
    if (game?.rawgData?.screenshots || game?.rawgData?.short_screenshots) {
      [
        ...(game.rawgData?.screenshots || []),
        ...(game.rawgData?.short_screenshots || [])
      ].forEach((screenshot: any, index: number) => {
        const imageUrl = typeof screenshot === 'string'
          ? screenshot
          : (screenshot.image || screenshot.url || screenshot);
        if (imageUrl) {
          rawgScreenshots.push({
            id: `rawg-${screenshot.id || index}`,
            imageUrl,
            source: 'rawg'
          });
        }
      });
    }

    // Images utilisateur
    userImages.forEach((userImage) => {
      rawgScreenshots.push({
        id: `user-${userImage.id}`,
        imageUrl: userImage.url,
        source: 'user',
        userImageId: userImage.id,
        fileName: userImage.file_name
      });
    });

    return rawgScreenshots;
  }, [game?.rawgData?.screenshots, game?.rawgData?.short_screenshots, userImages]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const currentUserName = await window.electronAPI.getCurrentUser?.();
        if (currentUserName && users.length > 0) {
          const user = users.find((u: { id: number; name: string }) => u.name === currentUserName);
          if (user) {
            setCurrentUser({ id: user.id, name: user.name });
          }
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur actuel:', error);
      }
    };
    loadCurrentUser();
  }, [users]);

  const handleMarkAsOwned = () => {
    if (!currentUser) {
      showToast({
        title: 'Erreur',
        message: 'Utilisateur non trouvé',
        type: 'error'
      });
      return;
    }
    if (users.length === 0) {
      showToast({
        title: 'Erreur',
        message: 'Aucun utilisateur disponible',
        type: 'error'
      });
      return;
    }
    setShowOwnershipModal(true);
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement du jeu...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{error || 'Jeu introuvable'}</p>
        <button
          className="btn btn-outline"
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <DetailPageHeader
        backLabel="Retour aux jeux vidéo"
        backTo={(location.state as { from?: string } | null)?.from || '/games/video'}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowEditModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Edit size={16} />
              Modifier
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleOpenDisplaySettings}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              Personnaliser l'affichage
            </button>
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
      <div className="fade-in" style={{ padding: '110px 0 80px', width: '100%', boxSizing: 'border-box' }}>
        {/* Bannière horizontale en haut */}
        {displayPrefs.banner && (
          <div style={{ width: '100%', marginBottom: '32px', padding: '0 20px' }}>
            <RawgGameBanner
              game={game}
              onCoverUpdated={() => loadDetail({ silent: false })}
            />
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            width: '100%',
            maxWidth: '100%',
            padding: '0 20px'
          }}
        >
          {/* En-tête du jeu avec infos */}
          <div
            className="card"
            style={{
              padding: 'clamp(16px, 2vw, 20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <RawgGameInfoSection
              game={game}
              shouldShow={(field) => displayPrefs[field as keyof typeof displayPrefs] ?? true}
              onStatusChange={handleStatusChange}
              onToggleFavorite={handleToggleFavorite}
              onLabelsChange={() => loadDetail({ silent: false })}
              onMarkAsOwned={handleMarkAsOwned}
              costsByUser={costsByUser}
              totalPrix={totalPrix}
              users={users}
              profileImages={profileImages}
              updatingStatus={updatingStatus}
              togglingFavorite={togglingFavorite}
            />
          </div>

          {/* Section Media : Screenshots et Vidéos */}
          {(displayPrefs.screenshots || displayPrefs.movies) && (
            <section
              style={{
                background: 'var(--surface)',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px'
              }}
            >
              <h3 className="detail-section-title">Media</h3>

              {/* Sous-section Vidéos */}
              {displayPrefs.movies && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="detail-subsection-title">Vidéos de gameplay</h4>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowAddVideoModal(true)}
                      disabled={addingVideo || loadingUserVideos}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        padding: '6px 12px',
                        opacity: (addingVideo || loadingUserVideos) ? 0.6 : 1,
                        cursor: (addingVideo || loadingUserVideos) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Plus size={16} />
                      {addingVideo ? 'Ajout en cours...' : 'Ajouter une vidéo'}
                    </button>
                  </div>

                  {/* Afficher les vidéos combinées */}
                  {allVideos.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {allVideos.map((video: any) => (
                        <div
                          key={video.id}
                          style={{
                            position: 'relative',
                            display: 'inline-block'
                          }}
                        >
                          <button
                            className="btn btn-outline"
                            onClick={() => {
                              if (video.isUserVideo && video.file_path && video.url) {
                                setSelectedVideo({
                                  site: 'local',
                                  videoUrl: video.url,
                                  mimeType: video.mime_type || undefined,
                                  title: video.name
                                });
                              } else if (video.url) {
                                window.electronAPI.openExternal?.(video.url);
                              }
                            }}
                            style={{
                              justifyContent: 'flex-start',
                              minWidth: '220px',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              position: 'relative'
                            }}
                          >
                            {video.name}
                          </button>
                          {video.isUserVideo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUserVideoClick(video.videoId);
                              }}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                width: '20px',
                                height: '20px'
                              }}
                              title="Supprimer cette vidéo"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      <p style={{ margin: 0 }}>Aucune vidéo disponible</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sous-section Screenshots */}
              {displayPrefs.screenshots && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="detail-subsection-title">Captures d'écran</h4>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowAddImageModal(true)}
                      disabled={addingImage || loadingUserImages}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        padding: '6px 12px',
                        opacity: addingImage || loadingUserImages ? 0.6 : 1,
                        cursor: addingImage || loadingUserImages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Plus size={16} />
                      {addingImage ? 'Ajout en cours...' : 'Ajouter une photo'}
                    </button>
                  </div>

                  {/* Afficher les screenshots combinés */}
                  {allScreenshots.length > 0 ? (
                    <SimpleCarousel cardWidth={320} gap={16}>
                      {allScreenshots.map((screenshot) => (
                        <div
                          key={screenshot.id}
                          style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            position: 'relative',
                            height: '180px',
                            width: '320px',
                            flexShrink: 0
                          }}
                          onClick={() => {
                            setSelectedImage(screenshot.imageUrl);
                            if (screenshot.source === 'user' && screenshot.fileName) {
                              setSelectedImageMeta({
                                url: screenshot.imageUrl,
                                fileName: screenshot.fileName
                              });
                            }
                          }}
                        >
                          <LazyImage
                            src={screenshot.imageUrl}
                            alt={screenshot.source === 'rawg' ? 'Screenshot RAWG' : (screenshot.fileName || 'Image utilisateur')}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              filter: shouldBlurImages ? 'blur(20px) brightness(0.3)' : 'none'
                            }}
                          />
                          {screenshot.source === 'user' && screenshot.userImageId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUserImageClick(screenshot.userImageId!, screenshot.fileName || 'Image utilisateur');
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0, 0, 0, 0.7)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                              }}
                              title="Supprimer cette image"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </SimpleCarousel>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                      <p style={{ margin: 0 }}>Aucune capture d'écran disponible</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* Modal image plein écran */}
      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt="Screenshot"
          onClose={() => setSelectedImage(null)}
        />
      )}

      {showDisplaySettingsModal && game && (
        <DisplaySettingsModal
          title="Personnaliser l'affichage"
          description="Les modifications locales surchargent les paramètres globaux pour ce jeu."
          fields={RAWG_GAME_DISPLAY_CATEGORIES}
          mode="global-local"
          itemId={game.id}
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getRawgGameDisplaySettings?.();
            return prefs || rawgGameDisplayDefaults;
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveRawgGameDisplaySettings(prefs);
            window.dispatchEvent(new CustomEvent('rawg-game-display-settings-updated'));
          }}
          loadLocalOverrides={async (itemId) => {
            const overrides = await window.electronAPI.getRawgGameDisplayOverrides(itemId);
            return overrides || {};
          }}
          saveLocalOverrides={async (itemId, overrides) => {
            await window.electronAPI.saveRawgGameDisplayOverrides(itemId, overrides);
            window.dispatchEvent(new CustomEvent('rawg-game-display-settings-updated'));
          }}
          deleteLocalOverrides={async (itemId, keys) => {
            await window.electronAPI.deleteRawgGameDisplayOverrides(itemId, keys);
            window.dispatchEvent(new CustomEvent('rawg-game-display-settings-updated'));
          }}
          onSave={() => {
            loadDetail({ silent: false });
            handleCloseDisplaySettings();
          }}
          onClose={handleCloseDisplaySettings}
          showToast={undefined}
        />
      )}

      {showEditModal && game && (
        <EditRawgGameModal
          game={game}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            setShowEditModal(false);
            await loadDetail({ silent: false });
          }}
        />
      )}

      {showOwnershipModal && game && (
        <>
          {users.length > 0 && currentUser ? (
            <RawgGameOwnershipModal
              game={game}
              owners={owners}
              users={users}
              currentUserId={currentUser.id}
              onClose={() => setShowOwnershipModal(false)}
              onSuccess={async () => {
                await loadDetail({ silent: false });
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

      {/* Modals pour images et vidéos */}
      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt="Image"
          onClose={() => {
            setSelectedImage(null);
            setSelectedImageMeta(null);
          }}
          onSaveImage={selectedImageMeta ? () => {
            if (selectedImageMeta.url && window.electronAPI.saveImageToDisk) {
              window.electronAPI.saveImageToDisk(selectedImageMeta.url, selectedImageMeta.fileName);
            }
          } : undefined}
        />
      )}

      {selectedVideo && (
        <VideoModal
          videoUrl={selectedVideo.videoUrl}
          title={selectedVideo.title}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {showAddVideoModal && (
        <AddVideoModal
          onClose={() => setShowAddVideoModal(false)}
          onAddUrl={handleAddVideoUrl}
          onAddFile={handleAddVideoFile}
          adding={addingVideo}
        />
      )}

      {showAddImageModal && (
        <AddImageModal
          onClose={() => setShowAddImageModal(false)}
          onAddUrl={handleAddImageUrl}
          onAddFile={handleAddImageFile}
          adding={addingImage}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {imageToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setImageToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: '18px',
              border: '1px solid var(--border)',
              padding: '24px',
              maxWidth: '400px',
              width: '100%'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>
              Supprimer l'image ?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)' }}>
              Êtes-vous sûr de vouloir supprimer "{imageToDelete.fileName}" ? Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setImageToDelete(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDeleteImage}
                style={{ background: 'var(--error)' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {videoToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setVideoToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: '18px',
              border: '1px solid var(--border)',
              padding: '24px',
              maxWidth: '400px',
              width: '100%'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>
              Supprimer la vidéo ?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)' }}>
              Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setVideoToDelete(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDeleteVideo}
                style={{ background: 'var(--error)' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
