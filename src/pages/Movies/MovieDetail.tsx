import { ArrowLeft, Edit, Plus, Star, Trash2 } from 'lucide-react';
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CardCover, CardTitle } from '../../components/cards/common';
import { BackToBottomButton, BackToTopButton } from '../../components/collections';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import LazyImage from '../../components/common/LazyImage';
import SimpleCarousel from '../../components/common/SimpleCarousel';
import ConfirmModal from '../../components/modals/common/ConfirmModal';
import ImageModal from '../../components/modals/common/ImageModal';
import VideoModal from '../../components/modals/common/VideoModal';
import AddImageModal from '../../components/modals/movie/AddImageModal';
import AddVideoModal from '../../components/modals/movie/AddVideoModal';
import EditMovieModal from '../../components/modals/movie/EditMovieModal';
import { useConfirm } from '../../hooks/common/useConfirm';
import { useToast } from '../../hooks/common/useToast';
import { useDetailPage } from '../../hooks/details/useDetailPage';
import { useItemActions } from '../../hooks/details/useItemActions';
import { useMediaGallery } from '../../hooks/details/useMediaGallery';
import { MovieDetail as MovieDetailType, MovieImage } from '../../types';
import { getTmdbImageUrl, getUniqueTmdbImages } from '../../utils/tmdb';
import { MovieCover, MovieInfoSection } from './components';


export default function MovieDetail() {
  const { tmdbId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // Mémoriser les fonctions pour éviter les re-renders en boucle
  const loadDetailApi = useCallback(async (id: number) => {
    const detail = await window.electronAPI.getMovieDetail({ tmdbId: id });
    return detail;
  }, []);


  const normalizeData = useCallback((data: MovieDetailType) => ({
    ...data,
    genres: data.genres || [],
    langues_parlees: data.langues_parlees || [],
    compagnies: data.compagnies || []
  }), []);

  const isEventForCurrentItem = useCallback((event: CustomEvent, item: MovieDetailType | null, itemId: string | undefined) => {
    const { movieId, tmdbId: eventTmdbId } = event.detail;
    const currentTmdbId = itemId ? Number(itemId) : null;
    return (
      (currentTmdbId && eventTmdbId && Number(currentTmdbId) === Number(eventTmdbId)) ||
      (item && (item.id === movieId || (eventTmdbId && item.tmdb_id === eventTmdbId)))
    );
  }, []);

  const reloadAfterEvent = useCallback(async (event: CustomEvent, itemId: string | undefined) => {
    const { tmdbId: eventTmdbId } = event.detail;
    const targetTmdbId = eventTmdbId || (itemId ? Number(itemId) : null);
    if (targetTmdbId) {
      return await window.electronAPI.getMovieDetail({ tmdbId: targetTmdbId });
    }
    return null;
  }, []);

  // Hook pour la page de détails (chargement, états, modales)
  const {
    item: movie,
    setItem: setMovie,
    loading,
    error,
    showEditModal,
    setShowEditModal,
    loadDetail
  } = useDetailPage<MovieDetailType, Record<string, never>>({
    itemId: tmdbId,
    displayDefaults: {},
    loadDetailApi,
    normalizeData,
    statusEventName: 'movie-status-changed',
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError: 'Identifiant TMDb manquant',
    notFoundError: 'Film introuvable dans votre collection'
  });

  // Hook pour les actions communes (favorite, status)
  const {
    updatingStatus,
    togglingFavorite,
    handleStatusChange,
    handleToggleFavorite
  } = useItemActions<MovieDetailType>({
    itemId: movie?.id,
    item: movie,
    updateItem: setMovie,
    reloadItem: async () => {
      if (movie?.tmdb_id) {
        const detail = await window.electronAPI.getMovieDetail({ tmdbId: movie.tmdb_id });
        if (detail) {
          setMovie({
            ...detail,
            genres: detail.genres || [],
            langues_parlees: detail.langues_parlees || [],
            compagnies: detail.compagnies || []
          });
        }
      }
    },
    setStatusApi: ({ itemId, statut }) => window.electronAPI.setMovieStatus({ movieId: itemId, statut }),
    toggleFavoriteApi: (itemId) => window.electronAPI.toggleMovieFavorite(itemId),
    deleteApi: (itemId) => window.electronAPI.deleteMovie(itemId),
    statusEventName: 'movie-status-changed',
    getStatusEventData: (item) => ({
      movieId: item.id,
      tmdbId: item.tmdb_id,
      statut: item.statut_visionnage
    }),
    redirectRoute: '/movies',
    itemName: 'film',
    getItemTitle: (item) => item.titre,
    getCurrentStatus: (item) => item.statut_visionnage
  });

  // Mémoriser les fonctions API pour la galerie média
  const getUserImagesApi = useCallback((id: number) => window.electronAPI.getMovieUserImages?.(id), []);
  const getUserVideosApi = useCallback((id: number) => window.electronAPI.getMovieUserVideos?.(id), []);
  const addImageUrlApi = useCallback((id: number, url: string) => window.electronAPI.addMovieUserImageUrl?.(id, url), []);
  const addImageFileApi = useCallback((id: number, title?: string) => window.electronAPI.addMovieUserImageFile?.(id, title), []);
  const deleteImageApi = useCallback((imageId: number) => {
    if (!movie?.id) return Promise.resolve({ success: false, error: 'Film introuvable' });
    return window.electronAPI.deleteMovieUserImage?.(movie.id, imageId);
  }, [movie?.id]);
  const addVideoUrlApi = useCallback((id: number, url: string, title: string) => window.electronAPI.addMovieUserVideoUrl?.(id, url, title), []);
  const addVideoFileApi = useCallback((id: number, title?: string, isReference?: boolean) => window.electronAPI.addMovieUserVideoFile?.(id, title, isReference), []);
  const deleteVideoApi = useCallback((_itemId: number, videoId: number | string) => {
    if (!movie?.id) return Promise.resolve({ success: false, error: 'Film introuvable' });
    // Convertir videoId en string si nécessaire car les IDs sont stockés comme strings dans le JSON
    const videoIdStr = typeof videoId === 'string' ? videoId : videoId.toString();
    return window.electronAPI.deleteMovieUserVideo?.(movie.id, videoIdStr);
  }, [movie?.id]);

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
    itemId: movie?.id,
    getUserImagesApi,
    getUserVideosApi,
    addImageUrlApi,
    addImageFileApi,
    deleteImageApi,
    addVideoUrlApi,
    addVideoFileApi,
    deleteVideoApi
  });
  const [selectedImageMeta, setSelectedImageMeta] = useState<{ url: string; fileName?: string } | null>(null);


  useEffect(() => {
    if (!selectedImage) {
      setSelectedImageMeta(null);
    }
  }, [selectedImage]);

  // Suppression avec confirmation
  const handleDelete = useCallback(async () => {
    if (!movie) return;

    const confirmed = await confirm({
      title: 'Supprimer le film',
      message: `Êtes-vous sûr de vouloir supprimer "${movie.titre}" de votre collection ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.deleteMovie(movie.id);
      if (result?.success) {
        showToast({
          title: 'Film supprimé',
          message: `"${movie.titre}" a été supprimé de votre collection.`,
          type: 'success'
        });
        navigate('/videos/movies');
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de supprimer le film.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur suppression film:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de supprimer le film.',
        type: 'error'
      });
    }
  }, [movie, confirm, showToast, navigate]);



  const videos = useMemo(() => {
    const directResults = movie?.videos?.results;
    const rawVideos = movie?.donnees_brutes?.videos as { results?: Array<{ site: string; key: string; id: string; name?: string; type?: string }> } | undefined;
    const tmdbList = directResults || rawVideos?.results || [];
    if (!Array.isArray(tmdbList)) {
      return [];
    }
    const tmdbVideos = tmdbList.filter((video) => video.site === 'YouTube' || video.site === 'Vimeo').map(v => ({ ...v, isUserVideo: false }));
    const userVideoList = userVideos.map(v => ({
      id: `user-${v.id}`,
      site: v.site || 'Other',
      key: v.video_key || '',
      name: v.title || undefined,
      type: v.type === 'file' ? 'Fichier local' : undefined,
      url: v.url,
      file_path: v.file_path,
      file_name: v.file_name,
      isUserVideo: true,
      videoId: v.id
    }));
    return [...tmdbVideos, ...userVideoList];
  }, [movie, userVideos]);

  const backdrops = useMemo(() => {
    const directBackdrops = movie?.images?.backdrops;
    const rawImages = movie?.donnees_brutes?.images as { backdrops?: Array<{ file_path: string; iso_639_1?: string }> } | undefined;
    const list = directBackdrops || rawImages?.backdrops || [];
    return getUniqueTmdbImages(list as MovieImage[], 12);
  }, [movie]);

  type GalleryItem = {
    key: string;
    thumbnailUrl: string;
    fullUrl: string;
    source: 'tmdb' | 'user';
    userImageId?: number;
    fileName?: string;
  };

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const tmdbItems: GalleryItem[] = [];
    for (const image of backdrops) {
      const thumbnailUrl = getTmdbImageUrl(image.file_path, 'w342');
      const fullUrl = getTmdbImageUrl(image.file_path, 'original');
      if (thumbnailUrl && fullUrl) {
        tmdbItems.push({
          key: `tmdb-${image.file_path}`,
          thumbnailUrl,
          fullUrl,
          source: 'tmdb' as const
        });
      }
    }

    const userItems = userImages.map((userImage) => ({
      key: `user-${userImage.id}`,
      thumbnailUrl: userImage.url,
      fullUrl: userImage.url,
      source: 'user' as const,
      userImageId: userImage.id,
      fileName: userImage.file_name
    }));

    return [...tmdbItems, ...userItems];
  }, [backdrops, userImages]);

  const getGalleryFileName = useCallback((item: GalleryItem) => {
    const title = movie?.titre || movie?.titre_original || 'film';
    const suffix = item.source === 'tmdb' ? 'tmdb' : 'user';
    return item.fileName || `${title}-${suffix}`;
  }, [movie?.titre, movie?.titre_original]);

  const handleSaveImageToDisk = useCallback(async (url: string, fileName?: string) => {
    if (!url || !window.electronAPI.saveImageToDisk) {
      window.electronAPI.openExternal?.(url);
      return;
    }

    try {
      const result = await window.electronAPI.saveImageToDisk(url, fileName);
      if (result?.success) {
        showToast({
          title: 'Image enregistrée',
          type: 'success',
          duration: 2000
        });
      } else if (!result?.canceled) {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible d\'enregistrer l\'image',
          type: 'error'
        });
        window.electronAPI.openExternal?.(url);
      }
    } catch (error) {
      console.error('Erreur save-image-to-disk:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'enregistrer l\'image',
        type: 'error'
      });
      window.electronAPI.openExternal?.(url);
    }
  }, [showToast]);

  const handleGalleryImageContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, item: GalleryItem) => {
    event.preventDefault();
    handleSaveImageToDisk(item.fullUrl, getGalleryFileName(item));
  }, [getGalleryFileName, handleSaveImageToDisk]);

  const recommendations = useMemo(() => {
    const rawRecommendations = movie?.donnees_brutes?.recommendations as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string }> } | undefined;
    const rawSimilar = movie?.donnees_brutes?.similar as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string }> } | undefined;
    const recs = rawRecommendations?.results || rawSimilar?.results || [];
    if (!Array.isArray(recs)) {
      return [];
    }
    return recs.slice(0, 8).filter((item) => item && item.id);
  }, [movie]);


  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement du film...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{error || 'Film introuvable'}</p>
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
        backLabel="Retour aux films"
        backTo={(location.state as { from?: string } | null)?.from || '/movies'}
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
      <div className="fade-in" style={{ padding: '110px 20px 80px', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            width: '100%',
            maxWidth: '100%'
          }}
        >
          {/* En-tête du film */}
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
                gap: 'clamp(12px, 1.5vw, 20px)',
                flexWrap: 'wrap',
                width: '100%'
              }}
            >
              <MovieCover
                movie={movie}
                onStatusChange={handleStatusChange}
                onToggleFavorite={handleToggleFavorite}
                updatingStatus={updatingStatus}
                togglingFavorite={togglingFavorite}
                onCoverUpdated={() => loadDetail({ silent: false })}
              />

              <MovieInfoSection
                movie={movie}
                shouldShow={() => true}
              />
            </div>
          </div>

          {/* Section Media : Vidéos et Galerie */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className="detail-subsection-title">Bandes-annonces & vidéos</h4>
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
              {videos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {videos.map((video) => {
                    const isUserVideo = (video as any).isUserVideo;
                    const videoId = (video as any).videoId;
                    const isLocalFile = (video as any).file_path;
                    return (
                      <div
                        key={video.id}
                        style={{
                          position: 'relative',
                          display: 'inline-block'
                        }}
                        onClick={(e) => {
                          // Empêcher le clic sur le div de déclencher d'autres actions si c'est sur le bouton de suppression
                          const target = e.target as HTMLElement;
                          if (target.closest('button[title="Supprimer cette vidéo"]')) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        <button
                          className="btn btn-outline"
                          onClick={(e) => {
                            // Ne pas déclencher si le clic vient du bouton de suppression
                            const target = e.target as HTMLElement;
                            const deleteButton = target.closest('button[title="Supprimer cette vidéo"]');
                            if (deleteButton) {
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }

                            // Seules les vidéos locales s'ouvrent dans le player intégré
                            if (isLocalFile && (video as any).url) {
                              setSelectedVideo({
                                site: 'local',
                                videoUrl: (video as any).url,
                                mimeType: (video as any).mime_type || undefined,
                                title: (video as any).title || video.name || video.type || undefined
                              });
                            } else if ((video as any).url) {
                              // Toutes les URLs (YouTube, Vimeo, autres) s'ouvrent dans le navigateur
                              window.electronAPI.openExternal?.((video as any).url);
                            } else if (video.site === 'YouTube' && video.key) {
                              // YouTube : construire l'URL et ouvrir dans le navigateur
                              window.electronAPI.openExternal?.(`https://www.youtube.com/watch?v=${video.key}`);
                            } else if (video.site === 'Vimeo' && video.key) {
                              // Vimeo : construire l'URL et ouvrir dans le navigateur
                              window.electronAPI.openExternal?.(`https://vimeo.com/${video.key}`);
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
                          {video.name || video.type || 'Vidéo'}
                        </button>
                        {isUserVideo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              handleDeleteUserVideoClick(videoId);
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
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
                              height: '20px',
                              zIndex: 1000,
                              pointerEvents: 'auto'
                            }}
                            title="Supprimer cette vidéo"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {videos.length === 0 && !loadingUserVideos && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}>Aucune vidéo disponible</p>
                </div>
              )}
            </div>

            {/* Sous-section Galerie */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className="detail-subsection-title">Galerie</h4>
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
              {galleryItems.length > 0 && (
                <SimpleCarousel cardWidth={240} gap={16}>
                  {galleryItems.map((item) => (
                    <div
                      key={item.key}
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        cursor: 'zoom-in',
                        position: 'relative',
                        height: '140px'
                      }}
                      onClick={() => {
                        if (item.fullUrl) {
                          setSelectedImage(item.fullUrl);
                          setSelectedImageMeta({
                            url: item.fullUrl,
                            fileName: getGalleryFileName(item)
                          });
                        }
                      }}
                      onContextMenu={(event) => handleGalleryImageContextMenu(event, item)}
                    >
                      <LazyImage
                        src={item.thumbnailUrl}
                        alt={item.source === 'tmdb' ? 'Backdrop TMDb' : (item.fileName || 'Image utilisateur')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        fileName={item.fileName}
                        showError={item.source === 'user'}
                      />
                      {item.source === 'user' && item.userImageId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUserImageClick(item.userImageId!, item.fileName || 'Image utilisateur');
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
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </SimpleCarousel>
              )}
              {galleryItems.length === 0 && !loadingUserImages && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}>Aucune image disponible</p>
                </div>
              )}
              {loadingUserImages && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}>Chargement des images...</p>
                </div>
              )}
            </div>
          </section>

          {recommendations.length > 0 && (
            <section
              style={{
                background: 'var(--surface)',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <h3 className="detail-section-title">Recommandations TMDb</h3>
              <SimpleCarousel cardWidth={160} gap={12}>
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="card"
                    style={{
                      padding: 0,
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={async () => {
                      if (rec.id) {
                        // Vérifier si le film est dans la collection
                        try {
                          const movieDetail = await window.electronAPI.getMovieDetail({ tmdbId: rec.id });
                          if (movieDetail) {
                            // Le film est dans la collection, naviguer vers sa page
                            navigate(`/movies/${rec.id}`);
                          } else {
                            // Le film n'est pas dans la collection, ouvrir le lien TMDb
                            window.electronAPI.openExternal?.(`https://www.themoviedb.org/movie/${rec.id}`);
                          }
                        } catch (error) {
                          console.error('Erreur lors de la vérification du film:', error);
                          // En cas d'erreur, ouvrir le lien TMDb par défaut
                          window.electronAPI.openExternal?.(`https://www.themoviedb.org/movie/${rec.id}`);
                        }
                      }
                    }}
                  >
                    <div style={{
                      width: '100%',
                      aspectRatio: '2/3',
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'var(--surface)'
                    }}>
                      <CardCover
                        src={rec.poster_path ? getTmdbImageUrl(rec.poster_path, 'w342') : undefined}
                        alt={rec.title || rec.name || ''}
                        fallbackIcon={<Star size={48} />}
                        objectFit="cover"
                      />
                    </div>
                    <div style={{
                      padding: '10px 12px 6px 12px',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <CardTitle title={rec.title || rec.name || ''}>
                        {rec.title || rec.name}
                      </CardTitle>
                    </div>
                  </div>
                ))}
              </SimpleCarousel>
            </section>
          )}
        </div>
      </div>
      {showEditModal && movie && (
        <EditMovieModal
          movie={movie}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            setShowEditModal(false);
            const detail = await window.electronAPI.getMovieDetail({ movieId: movie.id });
            if (detail) {
              setMovie({
                ...detail,
                genres: detail.genres || [],
                langues_parlees: detail.langues_parlees || [],
                compagnies: detail.compagnies || []
              });
            }
          }}
        />
      )}
      <BackToTopButton />
      <BackToBottomButton />

      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt="Galerie"
          onClose={() => {
            setSelectedImage(null);
            setSelectedImageMeta(null);
          }}
          onSaveImage={selectedImageMeta ? () => handleSaveImageToDisk(selectedImageMeta.url, selectedImageMeta.fileName) : undefined}
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

      {imageToDelete && (
        <ConfirmModal
          title="Supprimer l'image"
          message={`Êtes-vous sûr de vouloir supprimer l'image "${imageToDelete.fileName}" ?`}
          onConfirm={handleConfirmDeleteImage}
          onCancel={() => setImageToDelete(null)}
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
        />
      )}

      {videoToDelete !== null && videoToDelete !== undefined && (
        <ConfirmModal
          title="Supprimer la vidéo"
          message="Êtes-vous sûr de vouloir supprimer cette vidéo ?"
          onConfirm={handleConfirmDeleteVideo}
          onCancel={() => setVideoToDelete(null)}
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
        />
      )}

      <ConfirmDialog />
    </>
  );
}
