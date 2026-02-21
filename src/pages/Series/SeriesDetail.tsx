import { ArrowLeft, Check, ChevronDown, Copy, Edit, Image as ImageIcon, Layers, Lock, Play, Plus, Trash2 } from 'lucide-react';
import { Fragment, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import CreateSeasonModal from '../../components/modals/series/CreateSeasonModal';
import EditEpisodeModal from '../../components/modals/series/EditEpisodeModal';
import EditSeasonModal from '../../components/modals/series/EditSeasonModal';
import EditSeriesModal from '../../components/modals/series/EditSeriesModal';
import { useConfirm } from '../../hooks/common/useConfirm';
import { useToast } from '../../hooks/common/useToast';
import { useDetailPage } from '../../hooks/details/useDetailPage';
import { useItemActions } from '../../hooks/details/useItemActions';
import { useMediaGallery } from '../../hooks/details/useMediaGallery';
import { MovieImage, TvEpisode, TvShowDetail } from '../../types';
import { COMMON_STATUSES } from '../../utils/status';
import { formatAirDate, getTmdbImageUrl, getUniqueTmdbImages } from '../../utils/tmdb';
import { SeriesCover, SeriesInfoSection } from './components';
import SeriesProgressSection from './components/SeriesProgressSection';

const SERIES_STATUS_OPTIONS = COMMON_STATUSES.SERIES;
type SeriesStatus = (typeof SERIES_STATUS_OPTIONS)[number];

interface SeasonGroup {
  id: number;
  seasonNumber: number;
  title: string;
  poster?: string | null;
  synopsis?: string | null;
  airDate?: string | null;
  tmdbId?: number | null;
  isImported: boolean;
  episodes: TvEpisode[];
}

export default function SeriesDetail() {
  const { tmdbId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // États spécifiques aux épisodes (non factorisés car spécifiques à Series)
  const [markingEpisodeId, setMarkingEpisodeId] = useState<number | null>(null);
  const [markingAllEpisodes, setMarkingAllEpisodes] = useState(false);
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
  const [createSeasonOptions, setCreateSeasonOptions] = useState<{ defaultNumber: number; duplicateFrom?: number | null }>({
    defaultNumber: 1,
    duplicateFrom: null
  });
  const [editingSeason, setEditingSeason] = useState<SeasonGroup | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<SeasonGroup | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<TvEpisode | null>(null);
  const [episodeToDelete, setEpisodeToDelete] = useState<TvEpisode | null>(null);
  const [draggingEpisode, setDraggingEpisode] = useState<{ id: number; seasonNumber: number } | null>(null);
  const [dragOverEpisodeId, setDragOverEpisodeId] = useState<number | null>(null);
  const [restoringFromTmdb, setRestoringFromTmdb] = useState(false);

  // Mémoriser les fonctions pour éviter les re-renders en boucle
  const loadDetailApi = useCallback(async (id: number) => {
    const detail = await window.electronAPI.getTvShowDetail({ tmdbId: id });
    return detail;
  }, []);


  const normalizeData = useCallback((data: TvShowDetail) => ({
    ...data,
    genres: data.genres || [],
    mots_cles: data.mots_cles || [],
    seasons: data.seasons || [],
    episodes: data.episodes || []
  }), []);

  const isEventForCurrentItem = useCallback((event: CustomEvent, item: TvShowDetail | null, itemId: string | undefined) => {
    const { showId, tmdbId: eventTmdbId } = event.detail;
    const currentTmdbId = itemId ? Number(itemId) : null;
    return (
      (currentTmdbId && eventTmdbId && Number(currentTmdbId) === Number(eventTmdbId)) ||
      (item && (item.id === showId || (eventTmdbId && item.tmdb_id === eventTmdbId)))
    );
  }, []);

  const reloadAfterEvent = useCallback(async (event: CustomEvent, itemId: string | undefined) => {
    const { tmdbId: eventTmdbId } = event.detail;
    const targetTmdbId = eventTmdbId || (itemId ? Number(itemId) : null);
    if (targetTmdbId) {
      return await window.electronAPI.getTvShowDetail({ tmdbId: targetTmdbId });
    }
    return null;
  }, []);

  // Hook pour la page de détails (chargement, états, modales)
  const {
    item: show,
    setItem: setShow,
    loading,
    error,
    showEditModal,
    setShowEditModal,
    loadDetail: loadShow
  } = useDetailPage<TvShowDetail, Record<string, never>>({
    itemId: tmdbId,
    displayDefaults: {},
    loadDetailApi,
    normalizeData,
    statusEventName: 'series-status-changed',
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError: 'Identifiant TMDb manquant',
    notFoundError: 'Série introuvable dans votre collection'
  });

  // Hook pour les actions communes (favorite, status)
  const {
    updatingStatus,
    togglingFavorite,
    handleStatusChange,
    handleToggleFavorite
  } = useItemActions<TvShowDetail>({
    itemId: show?.id,
    item: show,
    updateItem: setShow,
    reloadItem: async () => {
      if (show?.tmdb_id) {
        const detail = await window.electronAPI.getTvShowDetail({ tmdbId: show.tmdb_id });
        if (detail) {
          setShow({
            ...detail,
            genres: detail.genres || [],
            mots_cles: detail.mots_cles || [],
            seasons: detail.seasons || [],
            episodes: detail.episodes || []
          });
        }
      }
    },
    setStatusApi: ({ itemId, statut }) => window.electronAPI.setTvShowStatus({ showId: itemId, statut }),
    toggleFavoriteApi: (itemId) => window.electronAPI.toggleTvFavorite(itemId),
    deleteApi: (itemId) => window.electronAPI.deleteTvShow(itemId),
    statusEventName: 'series-status-changed',
    getStatusEventData: (item) => ({
      showId: item.id,
      tmdbId: item.tmdb_id,
      statut: item.statut_visionnage
    }),
    redirectRoute: '/series',
    itemName: 'série',
    getItemTitle: (item) => item.titre,
    getCurrentStatus: (item) => item.statut_visionnage
  });

  // Suppression avec confirmation
  const handleDelete = useCallback(async () => {
    if (!show) return;

    const confirmed = await confirm({
      title: 'Supprimer la série',
      message: `Êtes-vous sûr de vouloir supprimer "${show.titre}" de votre collection ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.deleteTvShow(show.id);
      if (result?.success) {
        showToast({
          title: 'Série supprimée',
          message: `"${show.titre}" a été supprimée de votre collection.`,
          type: 'success'
        });
        navigate('/videos/series');
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de supprimer la série.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur suppression série:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de supprimer la série.',
        type: 'error'
      });
    }
  }, [show, confirm, showToast, navigate]);

  // Mémoriser les fonctions API pour la galerie média
  const getUserImagesApi = useCallback((id: number) => window.electronAPI.getTvShowUserImages?.(id), []);
  const getUserVideosApi = useCallback((id: number) => window.electronAPI.getTvShowUserVideos?.(id), []);
  const addImageUrlApi = useCallback((id: number, url: string) => window.electronAPI.addTvShowUserImageUrl?.(id, url), []);
  const addImageFileApi = useCallback((id: number, title?: string) => window.electronAPI.addTvShowUserImageFile?.(id, title), []);
  const deleteImageApi = useCallback((id: number, imageId: number) => window.electronAPI.deleteTvShowUserImage?.(id, imageId), []);
  const addVideoUrlApi = useCallback((id: number, url: string, title: string) => window.electronAPI.addTvShowUserVideoUrl?.(id, url, title), []);
  const addVideoFileApi = useCallback((id: number, title?: string, isReference?: boolean) => window.electronAPI.addTvShowUserVideoFile?.(id, title, isReference), []);
  const deleteVideoApi = useCallback((id: number, videoId: number | string) => {
    // Convertir videoId en string si nécessaire car les IDs sont stockés comme strings dans le JSON
    const videoIdStr = typeof videoId === 'string' ? videoId : videoId.toString();
    return window.electronAPI.deleteTvShowUserVideo?.(id, videoIdStr);
  }, []);

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
    itemId: show?.id,
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

  // Wrapper pour loadShow avec support du paramètre silent
  const loadShowWithSilent = useCallback(
    async (options: { silent?: boolean } = {}) => {
      await loadShow({ silent: options.silent });
    },
    [loadShow]
  );



  const groupedSeasons = useMemo<SeasonGroup[]>(() => {
    if (!show) return [];
    const seasonMap = new Map<number, SeasonGroup>();

    show.seasons?.forEach((season) => {
      const seasonWithTmdb = season as typeof season & { tmdb_id?: number | null };
      seasonMap.set(season.numero, {
        id: season.id,
        seasonNumber: season.numero,
        title: season.titre || `Saison ${season.numero}`,
        poster: season.poster_path,
        synopsis: season.synopsis,
        airDate: season.date_premiere,
        tmdbId: seasonWithTmdb.tmdb_id ?? null,
        isImported: Boolean(seasonWithTmdb.tmdb_id),
        episodes: []
      });
    });

    show.episodes?.forEach((episode) => {
      const group = seasonMap.get(episode.saison_numero);
      if (group) {
        group.episodes.push(episode);
      } else {
        seasonMap.set(episode.saison_numero, {
          id: episode.season_id || 0,
          seasonNumber: episode.saison_numero,
          title: `Saison ${episode.saison_numero}`,
          poster: undefined,
          synopsis: undefined,
          airDate: undefined,
          tmdbId: null,
          isImported: Boolean(episode.tmdb_id),
          episodes: [episode]
        });
      }
    });

    return Array.from(seasonMap.values()).sort((a, b) => a.seasonNumber - b.seasonNumber);
  }, [show]);

  const videos = useMemo(() => {
    const directResults = show?.videos?.results;
    const rawVideos = show?.donnees_brutes?.videos as { results?: Array<{ site: string; key: string; id: string; name?: string; type?: string }> } | undefined;
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
  }, [show, userVideos]);

  const backdrops = useMemo(() => {
    const directBackdrops = show?.images?.backdrops;
    const rawImages = show?.donnees_brutes?.images as { backdrops?: Array<{ file_path: string; iso_639_1?: string }> } | undefined;
    const list = directBackdrops || rawImages?.backdrops || [];
    return getUniqueTmdbImages(list as MovieImage[], 12);
  }, [show]);

  const recommendations = useMemo(() => {
    const rawRecommendations = show?.donnees_brutes?.recommendations as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string }> } | undefined;
    const rawSimilar = show?.donnees_brutes?.similar as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string }> } | undefined;
    const recs = rawRecommendations?.results || rawSimilar?.results || [];
    if (!Array.isArray(recs)) {
      return [];
    }
    return recs.slice(0, 12);
  }, [show]);

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
    const title = show?.titre || show?.titre_original || 'serie';
    const suffix = item.source === 'tmdb' ? 'tmdb' : 'user';
    return item.fileName || `${title}-${suffix}`;
  }, [show?.titre, show?.titre_original]);

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

  const showSeasonsSection = true;
  const hasSeasons = groupedSeasons.length > 0;
  const nextSeasonNumber = useMemo(() => {
    if (!show?.seasons?.length) {
      return 1;
    }
    const maxNumber = Math.max(...show.seasons.map((season) => season.numero || 0));
    return maxNumber + 1;
  }, [show?.seasons]);

  useEffect(() => {
    if (!showCreateSeasonModal) {
      setCreateSeasonOptions((prev) => ({ ...prev, defaultNumber: nextSeasonNumber }));
    }
  }, [nextSeasonNumber, showCreateSeasonModal]);

  const applySeasonEpisodeUpdate = useCallback((data?: { seasons?: any[]; episodes?: any[] }) => {
    if (!data) {
      return;
    }
    setShow((prev) => prev ? {
      ...prev,
      seasons: data.seasons || prev.seasons,
      episodes: data.episodes || prev.episodes
    } : prev);
  }, [setShow]);

  // Wrapper pour handleStatusChange avec événement series-progress-updated
  const handleStatusChangeWithProgress = useCallback(
    async (newStatus: SeriesStatus) => {
      await handleStatusChange(newStatus);
      if (show?.id) {
        window.dispatchEvent(
          new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
        );
        await loadShowWithSilent({ silent: true });
      }
    },
    [handleStatusChange, show?.id, loadShowWithSilent]
  );

  // Wrapper pour handleToggleFavorite avec événement series-progress-updated
  const handleToggleFavoriteWithProgress = useCallback(async () => {
    await handleToggleFavorite();
    if (show?.id) {
      window.dispatchEvent(
        new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
      );
      await loadShowWithSilent({ silent: true });
    }
  }, [handleToggleFavorite, show?.id, loadShowWithSilent]);


  // États et fonctions pour les vidéos d'épisodes
  const [episodeVideos, setEpisodeVideos] = useState<Record<number, Array<{ id: number; type: 'url' | 'file'; title?: string | null; url?: string; file_path?: string; file_name?: string; site?: string | null; video_key?: string | null; mime_type?: string }>>>({});
  const [episodeLoadingVideos, setEpisodeLoadingVideos] = useState<Record<number, boolean>>({});
  const [episodeAddingVideo, setEpisodeAddingVideo] = useState<Record<number, boolean>>({});
  const [episodeVideoToDelete, setEpisodeVideoToDelete] = useState<{ episodeId: number; videoId: number } | null>(null);
  const [showEpisodeVideoModal, setShowEpisodeVideoModal] = useState<{ episodeId: number } | null>(null);
  const [selectedEpisodeVideo, setSelectedEpisodeVideo] = useState<{ site: 'local'; videoUrl?: string; mimeType?: string; title?: string } | null>(null);

  const loadEpisodeVideos = useCallback(async (episodeId: number) => {
    if (!episodeId) return;
    try {
      setEpisodeLoadingVideos(prev => ({ ...prev, [episodeId]: true }));
      const result = await window.electronAPI.getTvEpisodeUserVideos?.(episodeId);
      if (result?.success && result.videos) {
        setEpisodeVideos(prev => ({ ...prev, [episodeId]: result.videos }));
      }
    } catch (error) {
      console.error(`Erreur lors du chargement des vidéos pour l'épisode ${episodeId}:`, error);
    } finally {
      setEpisodeLoadingVideos(prev => ({ ...prev, [episodeId]: false }));
    }
  }, []);

  const handleAddEpisodeVideo = useCallback((episodeId: number) => {
    setShowEpisodeVideoModal({ episodeId });
  }, []);

  const handleAddEpisodeVideoUrl = useCallback(async (episodeId: number, url: string, title: string) => {
    if (!episodeId || episodeAddingVideo[episodeId]) return;
    try {
      setEpisodeAddingVideo(prev => ({ ...prev, [episodeId]: true }));
      const result = await window.electronAPI.addTvEpisodeUserVideoUrl?.(episodeId, url, title);
      if (result?.success) {
        showToast({
          title: 'Vidéo ajoutée',
          message: 'La vidéo a été ajoutée à l\'épisode',
          type: 'success'
        });
        setShowEpisodeVideoModal(null);
        await loadEpisodeVideos(episodeId);
      } else if (!result?.canceled) {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible d\'ajouter la vidéo',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vidéo:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'ajouter la vidéo',
        type: 'error'
      });
    } finally {
      setEpisodeAddingVideo(prev => ({ ...prev, [episodeId]: false }));
    }
  }, [episodeAddingVideo, loadEpisodeVideos, showToast]);

  const handleAddEpisodeVideoFile = useCallback(async (episodeId: number, title?: string, isReference?: boolean) => {
    if (!episodeId || episodeAddingVideo[episodeId]) return;
    try {
      setEpisodeAddingVideo(prev => ({ ...prev, [episodeId]: true }));
      const result = await window.electronAPI.addTvEpisodeUserVideoFile?.(episodeId, title, isReference);
      if (result?.success) {
        showToast({
          title: 'Vidéo ajoutée',
          message: 'La vidéo a été ajoutée à l\'épisode',
          type: 'success'
        });
        setShowEpisodeVideoModal(null);
        await loadEpisodeVideos(episodeId);
      } else if (!result?.canceled) {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible d\'ajouter la vidéo',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vidéo:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'ajouter la vidéo',
        type: 'error'
      });
    } finally {
      setEpisodeAddingVideo(prev => ({ ...prev, [episodeId]: false }));
    }
  }, [episodeAddingVideo, loadEpisodeVideos, showToast]);

  const handleDeleteEpisodeVideoClick = useCallback((episodeId: number, videoId: number) => {
    setEpisodeVideoToDelete({ episodeId, videoId });
  }, []);

  const handleConfirmDeleteEpisodeVideo = useCallback(async () => {
    if (!episodeVideoToDelete) return;

    try {
      // Convertir videoId en string si nécessaire car les IDs sont stockés comme strings dans le JSON
      const videoIdStr = typeof episodeVideoToDelete.videoId === 'string'
        ? episodeVideoToDelete.videoId
        : episodeVideoToDelete.videoId.toString();
      const result = await window.electronAPI.deleteTvEpisodeUserVideo?.(episodeVideoToDelete.episodeId, videoIdStr);
      if (result?.success) {
        showToast({
          title: 'Vidéo supprimée',
          message: 'La vidéo a été supprimée',
          type: 'success'
        });
        await loadEpisodeVideos(episodeVideoToDelete.episodeId);
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de supprimer la vidéo',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la vidéo:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer la vidéo',
        type: 'error'
      });
    } finally {
      setEpisodeVideoToDelete(null);
    }
  }, [episodeVideoToDelete, loadEpisodeVideos, showToast]);

  const handlePlayEpisodeVideo = useCallback((video: { site?: string | null; video_key?: string | null; url?: string; mime_type?: string; title?: string | null }, event?: React.MouseEvent) => {
    if (!video.url) return;

    // Vérifier si le clic vient du bouton de suppression
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('button[type="button"]')?.querySelector('svg[data-lucide="trash-2"]')) {
        return;
      }
      // Vérifier aussi si le clic vient directement du bouton de suppression
      if (target.closest('button')?.getAttribute('data-action') === 'delete') {
        return;
      }
    }

    // Vérifier si c'est un fichier local (manga://) ou une URL de streaming (serveur local)
    const isLocalFile = video.url.startsWith('manga://');
    // Considérer comme URL de streaming n'importe quelle URL sur localhost (tient compte du port dynamique)
    const isStreamingUrl = video.url.startsWith('http://127.0.0.1') || video.url.startsWith('http://localhost');

    // Les vidéos locales et de streaming s'ouvrent dans le player intégré
    if ((isLocalFile || isStreamingUrl) && video.url) {
      setSelectedEpisodeVideo({
        site: 'local',
        videoUrl: video.url,
        mimeType: video.mime_type || undefined,
        title: video.title || undefined
      });
    } else if (video.url) {
      // Toutes les autres URLs (YouTube, Vimeo, etc.) s'ouvrent dans le navigateur
      window.electronAPI.openExternal?.(video.url);
    }
  }, []);

  // Charger les vidéos pour tous les épisodes quand ils sont chargés
  useEffect(() => {
    if (show?.episodes) {
      show.episodes.forEach((episode) => {
        if (!episodeVideos[episode.id] && !episodeLoadingVideos[episode.id]) {
          loadEpisodeVideos(episode.id);
        }
      });
    }
  }, [show?.episodes, episodeVideos, episodeLoadingVideos, loadEpisodeVideos]);


  const handleMarkEpisode = async (episode: TvEpisode) => {
    try {
      if (!show) {
        return;
      }
      const currentUser = await window.electronAPI.getCurrentUser();
      if (!currentUser) {
        showToast({
          title: 'Utilisateur requis',
          message: 'Sélectionnez un utilisateur avant de marquer un épisode.',
          type: 'warning'
        });
        return;
      }
      const users = await window.electronAPI.getAllUsers();
      const user = users.find((u: any) => u.name === currentUser);
      if (!user) {
        showToast({
          title: 'Utilisateur introuvable',
          message: 'Impossible d’identifier l’utilisateur courant.',
          type: 'error'
        });
        return;
      }
      const nextVu = !(episode.vu);
      setMarkingEpisodeId(episode.id);
      const result = await window.electronAPI.markTvEpisode({
        episodeId: episode.id,
        userId: user.id,
        vu: nextVu
      });

      setShow((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedEpisodes = prev.episodes.map((ep) =>
          ep.id === episode.id
            ? {
              ...ep,
              vu: nextVu,
              date_visionnage: nextVu ? result?.dateVisionnage ?? new Date().toISOString() : null
            }
            : ep
        );
        return {
          ...prev,
          episodes: updatedEpisodes,
          episodes_vus: typeof result?.episodesVus === 'number' ? result.episodesVus : prev.episodes_vus,
          saisons_vues: typeof result?.saisonsVues === 'number' ? result.saisonsVues : prev.saisons_vues
        };
      });

      window.dispatchEvent(
        new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
      );
      await loadShow({ silent: true });
      showToast({
        title: nextVu ? 'Épisode marqué' : 'Épisode remis en attente',
        message: nextVu
          ? `${episode.titre || `Épisode ${episode.episode_numero}`} est marqué comme vu.`
          : `${episode.titre || `Épisode ${episode.episode_numero}`} est de nouveau marqué comme non vu.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Erreur marquage épisode:', err);
      showToast({
        title: 'Erreur',
        message: err?.message || 'Impossible de mettre à jour l’épisode.',
        type: 'error'
      });
    } finally {
      setMarkingEpisodeId(null);
    }
  };

  const handleMarkAllEpisodes = useCallback(async () => {
    if (!show || markingAllEpisodes) {
      return;
    }

    const totalEpisodes = show.nb_episodes ?? show.episodes?.length ?? 0;
    if (totalEpisodes === 0) {
      showToast({
        title: 'Aucun épisode',
        message: 'Cette série ne contient aucun épisode à marquer.',
        type: 'info'
      });
      return;
    }

    try {
      setMarkingAllEpisodes(true);
      const result = await window.electronAPI.markAllTvEpisodes({ showId: show.id, vu: true });

      if (result?.success) {
        setShow((prev) => {
          if (!prev) {
            return prev;
          }
          const dateVisionnage = result.dateVisionnage || new Date().toISOString();
          const updatedEpisodes = prev.episodes.map((episode) => ({
            ...episode,
            vu: true,
            date_visionnage: episode.date_visionnage || dateVisionnage
          }));
          return {
            ...prev,
            episodes: updatedEpisodes,
            episodes_vus: typeof result.episodesVus === 'number' ? result.episodesVus : prev.episodes_vus,
            saisons_vues: typeof result.saisonsVues === 'number' ? result.saisonsVues : prev.saisons_vues,
            statut_visionnage: 'Terminé'
          };
        });

        window.dispatchEvent(
          new CustomEvent('series-progress-updated', { detail: { showId: show.id } })
        );
        await loadShow({ silent: true });
        showToast({
          title: 'Progression mise à jour',
          message: 'Tous les épisodes sont désormais marqués comme vus.',
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Erreur marquage complet série:', err);
      showToast({
        title: 'Erreur',
        message: err?.message || 'Impossible de marquer tous les épisodes comme vus.',
        type: 'error'
      });
    } finally {
      setMarkingAllEpisodes(false);
    }
  }, [show, markingAllEpisodes, loadShow, showToast]);

  const handleOpenCreateSeason = useCallback(() => {
    setCreateSeasonOptions({ defaultNumber: nextSeasonNumber, duplicateFrom: null });
    setShowCreateSeasonModal(true);
  }, [nextSeasonNumber]);

  const handleOpenDuplicateSeason = useCallback((season: SeasonGroup) => {
    setCreateSeasonOptions({ defaultNumber: season.seasonNumber + 1, duplicateFrom: season.id });
    setShowCreateSeasonModal(true);
  }, []);

  const handleSeasonDeleted = useCallback(async () => {
    if (!show || !seasonToDelete) {
      return;
    }
    try {
      const result = await window.electronAPI.deleteTvSeason?.(show.id, seasonToDelete.id);
      if (result?.success) {
        applySeasonEpisodeUpdate(result);
        showToast({
          title: 'Saison supprimée',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de supprimer la saison.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur deleteTvSeason:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de supprimer la saison.',
        type: 'error'
      });
    } finally {
      setSeasonToDelete(null);
    }
  }, [applySeasonEpisodeUpdate, seasonToDelete, show, showToast]);

  const handleEpisodeDeleted = useCallback(async () => {
    if (!show || !episodeToDelete) {
      return;
    }
    try {
      const result = await window.electronAPI.deleteTvEpisode?.(show.id, episodeToDelete.id);
      if (result?.success) {
        applySeasonEpisodeUpdate(result);
        showToast({
          title: 'Épisode supprimé',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de supprimer l\'épisode.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur deleteTvEpisode:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de supprimer l\'épisode.',
        type: 'error'
      });
    } finally {
      setEpisodeToDelete(null);
    }
  }, [applySeasonEpisodeUpdate, episodeToDelete, show, showToast]);

  const handleEpisodeDragStart = useCallback((episode: TvEpisode) => {
    setDraggingEpisode({ id: episode.id, seasonNumber: episode.saison_numero });
    setDragOverEpisodeId(null);
  }, []);

  const handleEpisodeDragEnd = useCallback(() => {
    setDraggingEpisode(null);
    setDragOverEpisodeId(null);
  }, []);

  const handleSeasonPosterUpload = useCallback(async (season: SeasonGroup, filePath: string) => {
    if (!show || !filePath || !window.electronAPI.saveCoverFromPath) {
      return;
    }
    try {
      const result = await window.electronAPI.saveCoverFromPath(
        filePath,
        show.titre || show.titre_original || 'Série TV',
        'serie',
        { mediaType: 'TV Season' }
      );
      if (result?.success && result.localPath) {
        const update = await window.electronAPI.updateTvSeason?.({
          showId: show.id,
          seasonId: season.id,
          posterPath: result.localPath
        });
        if (update?.success) {
          applySeasonEpisodeUpdate(update);
          showToast({
            title: 'Affiche mise à jour',
            type: 'success'
          });
        } else {
          showToast({
            title: 'Erreur',
            message: update?.error || 'Impossible de mettre à jour l\'affiche.',
            type: 'error'
          });
        }
      }
    } catch (error: any) {
      console.error('Erreur upload poster saison:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de mettre à jour l\'affiche.',
        type: 'error'
      });
    }
  }, [applySeasonEpisodeUpdate, show, showToast]);
  const handleEpisodeDragOver = useCallback((event: React.DragEvent, episode: TvEpisode) => {
    event.preventDefault();
    if (!draggingEpisode || draggingEpisode.id === episode.id || draggingEpisode.seasonNumber !== episode.saison_numero) {
      return;
    }
    setDragOverEpisodeId(episode.id);
  }, [draggingEpisode]);

  const handleEpisodeDrop = useCallback(async (event: React.DragEvent, targetEpisode: TvEpisode) => {
    event.preventDefault();
    if (!show || !draggingEpisode || draggingEpisode.id === targetEpisode.id) {
      handleEpisodeDragEnd();
      return;
    }
    if (draggingEpisode.seasonNumber !== targetEpisode.saison_numero) {
      handleEpisodeDragEnd();
      return;
    }

    const seasonNumber = targetEpisode.saison_numero;
    const seasonEpisodes = (show.episodes || [])
      .filter((ep) => ep.saison_numero === seasonNumber)
      .sort((a, b) => a.episode_numero - b.episode_numero);
    const draggedIndex = seasonEpisodes.findIndex((ep) => ep.id === draggingEpisode.id);
    const targetIndex = seasonEpisodes.findIndex((ep) => ep.id === targetEpisode.id);
    if (draggedIndex === -1 || targetIndex === -1) {
      handleEpisodeDragEnd();
      return;
    }

    const reordered = [...seasonEpisodes];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);
    const orderPayload = reordered.map((ep, index) => ({
      episodeId: ep.id,
      episodeNumber: index + 1
    }));

    setShow((prev) => {
      if (!prev) return prev;
      const updatedEpisodes = prev.episodes.map((ep) => {
        const newData = reordered.find((r) => r.id === ep.id);
        return newData ? { ...ep, episode_numero: newData.episode_numero } : ep;
      });
      return { ...prev, episodes: updatedEpisodes };
    });
    handleEpisodeDragEnd();

    try {
      const result = await window.electronAPI.reorderTvEpisodes?.({
        showId: show.id,
        seasonNumber,
        order: orderPayload
      });
      if (result?.success) {
        applySeasonEpisodeUpdate(result);
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de réordonner les épisodes.',
          type: 'error'
        });
        await loadShow({ silent: false });
      }
    } catch (error: any) {
      console.error('Erreur reorder episodes:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de réordonner les épisodes.',
        type: 'error'
      });
      await loadShow({ silent: false });
    }
  }, [applySeasonEpisodeUpdate, draggingEpisode, loadShow, show, showToast, handleEpisodeDragEnd]);

  const handleRestoreFromTmdb = useCallback(async () => {
    if (!show?.tmdb_id) {
      return;
    }
    setRestoringFromTmdb(true);
    try {
      await window.electronAPI.syncTvShowFromTmdb(show.tmdb_id, { autoTranslate: true, includeEpisodes: true });
      await loadShow({ silent: false });
      showToast({
        title: 'Données TMDb restaurées',
        message: 'Les informations de la série ont été réimportées.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Erreur restauration TMDb:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de restaurer les données TMDb.',
        type: 'error'
      });
    } finally {
      setRestoringFromTmdb(false);
    }
  }, [loadShow, show?.tmdb_id, showToast]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement de la série...</p>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{error || 'Série introuvable'}</p>
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
        backLabel="Retour aux séries"
        backTo={(location.state as { from?: string } | null)?.from || '/series'}
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
            {show.tmdb_id && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRestoreFromTmdb}
                disabled={restoringFromTmdb}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {restoringFromTmdb ? (
                  <>
                    <span className="loading" style={{ width: '16px', height: '16px' }} />
                    Restauration...
                  </>
                ) : (
                  <>
                    <Layers size={16} />
                    Restaurer depuis TMDb
                  </>
                )}
              </button>
            )}
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
          {/* En-tête de la série */}
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
              <SeriesCover
                show={show}
                onStatusChange={handleStatusChangeWithProgress}
                onToggleFavorite={handleToggleFavoriteWithProgress}
                updatingStatus={updatingStatus}
                togglingFavorite={togglingFavorite}
                onCoverUpdated={() => loadShow({ silent: false })}
              />

              <SeriesInfoSection
                show={show}
                shouldShow={() => true}
              />
            </div>
          </div>

          {/* Section Progression Utilisateur */}
          {show && (
            <SeriesProgressSection
              show={show}
              seasonsTotal={show.nb_saisons ?? groupedSeasons.length}
              onMarkAllEpisodes={handleMarkAllEpisodes}
              isMarkingAllEpisodes={markingAllEpisodes}
            />
          )}

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
                              console.log('🗑️ Clic sur bouton suppression, videoId:', videoId);
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

          {/* Section Recommandations TMDb */}
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
                        // Vérifier si la série est dans la collection
                        try {
                          const showDetail = await window.electronAPI.getTvShowDetail({ tmdbId: rec.id });
                          if (showDetail) {
                            // La série est dans la collection, naviguer vers sa page
                            navigate(`/series/${rec.id}`);
                          } else {
                            // La série n'est pas dans la collection, ouvrir le lien TMDb
                            window.electronAPI.openExternal?.(`https://www.themoviedb.org/tv/${rec.id}`);
                          }
                        } catch (error) {
                          console.error('Erreur lors de la vérification de la série:', error);
                          // En cas d'erreur, ouvrir le lien TMDb par défaut
                          window.electronAPI.openExternal?.(`https://www.themoviedb.org/tv/${rec.id}`);
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
                        fallbackIcon={<Layers size={48} />}
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

          {/* Section Saisons et Épisodes */}
          {showSeasonsSection && (
            <section
              style={{
                background: 'var(--surface)',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <h3 className="detail-section-title" style={{ margin: 0 }}>
                  Saisons & épisodes
                </h3>
                {show && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleOpenCreateSeason}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} />
                    Ajouter une saison
                  </button>
                )}
              </div>

              {hasSeasons ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {groupedSeasons.map((season) => (
                    <SeasonCard
                      key={season.seasonNumber}
                      season={season}
                      showEpisodes={true}
                      onEpisodeClick={handleMarkEpisode}
                      markingEpisodeId={markingEpisodeId}
                      onAddEpisodeVideo={handleAddEpisodeVideo}
                      episodeVideos={episodeVideos}
                      episodeLoadingVideos={episodeLoadingVideos}
                      onDeleteEpisodeVideo={handleDeleteEpisodeVideoClick}
                      onPlayEpisodeVideo={handlePlayEpisodeVideo}
                      onEditSeason={(payload) => setEditingSeason(payload)}
                      onDuplicateSeason={handleOpenDuplicateSeason}
                      onDeleteSeason={(payload) => setSeasonToDelete(payload)}
                      onEditEpisode={(episode) => setEditingEpisode(episode)}
                      onDeleteEpisode={(episode) => setEpisodeToDelete(episode)}
                      onEpisodeDragStart={handleEpisodeDragStart}
                      onEpisodeDragOver={handleEpisodeDragOver}
                      onEpisodeDrop={handleEpisodeDrop}
                      onEpisodeDragEnd={handleEpisodeDragEnd}
                      draggingEpisodeId={draggingEpisode?.id ?? null}
                      dragOverEpisodeId={dragOverEpisodeId}
                      onPosterUpload={season.isImported ? undefined : handleSeasonPosterUpload}
                      lockImported={true}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    border: '1px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <p style={{ margin: 0 }}>Aucune saison n’a encore été créée. Utilisez le bouton “Ajouter une saison” pour commencer.</p>
                </div>
              )}
            </section>
          )}
        </div>
        {showEditModal && show && (
          <EditSeriesModal
            show={show}
            onClose={() => setShowEditModal(false)}
            onSuccess={async () => {
              setShowEditModal(false);
              await loadShow({ silent: false });
            }}
          />
        )}
        <BackToTopButton />
        <BackToBottomButton />
      </div>

      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt="Image de la galerie"
          onClose={() => {
            setSelectedImage(null);
            setSelectedImageMeta(null);
          }}
          onSaveImage={selectedImageMeta ? () => handleSaveImageToDisk(selectedImageMeta.url, selectedImageMeta.fileName) : undefined}
        />
      )}

      {editingSeason && show && (
        <EditSeasonModal
          showId={show.id}
          season={{
            id: editingSeason.id,
            numero: editingSeason.seasonNumber,
            titre: editingSeason.title,
            synopsis: editingSeason.synopsis || null,
            date_premiere: editingSeason.airDate || null,
            date_derniere: undefined
          }}
          onClose={() => setEditingSeason(null)}
          onSaved={(data) => {
            applySeasonEpisodeUpdate(data);
            setEditingSeason(null);
          }}
        />
      )}

      {seasonToDelete && (
        <ConfirmModal
          title="Supprimer la saison"
          message={`Supprimer définitivement ${seasonToDelete.title} et tous ses épisodes ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
          onConfirm={handleSeasonDeleted}
          onCancel={() => setSeasonToDelete(null)}
        />
      )}

      {editingEpisode && show && (
        <EditEpisodeModal
          showId={show.id}
          episode={editingEpisode}
          onClose={() => setEditingEpisode(null)}
          onSaved={(data) => {
            applySeasonEpisodeUpdate(data);
            setEditingEpisode(null);
          }}
        />
      )}

      {episodeToDelete && (
        <ConfirmModal
          title="Supprimer l'épisode"
          message="Êtes-vous sûr de vouloir supprimer cet épisode ?"
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
          onConfirm={handleEpisodeDeleted}
          onCancel={() => setEpisodeToDelete(null)}
        />
      )}

      {selectedVideo && (
        <VideoModal
          videoUrl={selectedVideo.videoUrl}
          title={selectedVideo.title}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {showAddImageModal && show && (
        <AddImageModal
          onClose={() => setShowAddImageModal(false)}
          onAddUrl={handleAddImageUrl}
          onAddFile={handleAddImageFile}
        />
      )}

      {showAddVideoModal && show && (
        <AddVideoModal
          onClose={() => setShowAddVideoModal(false)}
          onAddUrl={handleAddVideoUrl}
          onAddFile={handleAddVideoFile}
        />
      )}

      {showCreateSeasonModal && show && (
        <CreateSeasonModal
          showId={show.id}
          existingSeasons={show.seasons || []}
          defaultSeasonNumber={createSeasonOptions.defaultNumber || nextSeasonNumber}
          initialDuplicateFromSeasonId={createSeasonOptions.duplicateFrom ?? undefined}
          onClose={() => setShowCreateSeasonModal(false)}
          onCreated={(data) => {
            applySeasonEpisodeUpdate(data);
            setShowCreateSeasonModal(false);
          }}
        />
      )}

      {imageToDelete && (
        <ConfirmModal
          title="Supprimer l'image"
          message={`Êtes-vous sûr de vouloir supprimer "${imageToDelete.fileName}" ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
          onConfirm={handleConfirmDeleteImage}
          onCancel={() => setImageToDelete(null)}
        />
      )}

      {videoToDelete !== null && videoToDelete !== undefined && (
        <ConfirmModal
          title="Supprimer la vidéo"
          message="Êtes-vous sûr de vouloir supprimer cette vidéo ?"
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
          onConfirm={handleConfirmDeleteVideo}
          onCancel={() => setVideoToDelete(null)}
        />
      )}

      {showEpisodeVideoModal && (
        <AddVideoModal
          onClose={() => setShowEpisodeVideoModal(null)}
          onAddUrl={(url, title) => handleAddEpisodeVideoUrl(showEpisodeVideoModal.episodeId, url, title)}
          onAddFile={(title, isReference) => handleAddEpisodeVideoFile(showEpisodeVideoModal.episodeId, title, isReference)}
        />
      )}

      {episodeVideoToDelete && (
        <ConfirmModal
          title="Supprimer la vidéo"
          message="Êtes-vous sûr de vouloir supprimer cette vidéo ?"
          confirmText="Supprimer"
          cancelText="Annuler"
          isDanger={true}
          onConfirm={handleConfirmDeleteEpisodeVideo}
          onCancel={() => setEpisodeVideoToDelete(null)}
        />
      )}

      {selectedEpisodeVideo && (
        <VideoModal
          videoUrl={selectedEpisodeVideo.videoUrl}
          title={selectedEpisodeVideo.title}
          onClose={() => setSelectedEpisodeVideo(null)}
        />
      )}

      <ConfirmDialog />
    </>
  );
}

function SeasonCard({
  season,
  showEpisodes,
  onEpisodeClick,
  markingEpisodeId,
  onAddEpisodeVideo,
  episodeVideos,
  episodeLoadingVideos,
  onDeleteEpisodeVideo,
  onPlayEpisodeVideo,
  onEditSeason,
  onDuplicateSeason,
  onDeleteSeason,
  onEditEpisode,
  onDeleteEpisode,
  onEpisodeDragStart,
  onEpisodeDragOver,
  onEpisodeDrop,
  onEpisodeDragEnd,
  draggingEpisodeId,
  dragOverEpisodeId,
  onPosterUpload,
  lockImported
}: {
  season: SeasonGroup;
  showEpisodes: boolean;
  onEpisodeClick: (episode: TvEpisode) => void;
  markingEpisodeId: number | null;
  onAddEpisodeVideo: (episodeId: number) => void;
  episodeVideos: Record<number, Array<{ id: number; type: 'url' | 'file'; title?: string | null; url?: string; file_path?: string; file_name?: string; site?: string | null; video_key?: string | null; mime_type?: string }>>;
  episodeLoadingVideos: Record<number, boolean>;
  onDeleteEpisodeVideo: (episodeId: number, videoId: number) => void;
  onPlayEpisodeVideo: (video: { site?: string | null; video_key?: string | null; url?: string; mime_type?: string; title?: string | null }) => void;
  onEditSeason: (season: SeasonGroup) => void;
  onDuplicateSeason: (season: SeasonGroup) => void;
  onDeleteSeason: (season: SeasonGroup) => void;
  onEditEpisode: (episode: TvEpisode) => void;
  onDeleteEpisode: (episode: TvEpisode) => void;
  onEpisodeDragStart: (episode: TvEpisode) => void;
  onEpisodeDragOver: (event: React.DragEvent, episode: TvEpisode) => void;
  onEpisodeDrop: (event: React.DragEvent, episode: TvEpisode) => void;
  onEpisodeDragEnd: () => void;
  draggingEpisodeId: number | null;
  dragOverEpisodeId: number | null;
  onPosterUpload?: (season: SeasonGroup, filePath: string) => void;
  lockImported: boolean;
}) {
  const resolvedPoster = useMemo(() => {
    if (!season.poster) {
      return null;
    }
    const value = season.poster;
    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('manga://') ||
      value.startsWith('data:')
    ) {
      return value;
    }
    if (/^[a-zA-Z]:\\/.test(value) || value.startsWith('\\\\')) {
      return `manga://${value.replace(/\\/g, '/')}`;
    }
    if (value.startsWith('/')) {
      return getTmdbImageUrl(value, 'w342');
    }
    return value;
  }, [season.poster]);
  const [expanded, setExpanded] = useState(showEpisodes && season.seasonNumber === 1);
  const toggleHint = showEpisodes
    ? expanded
      ? 'Cliquez pour masquer la liste des épisodes'
      : 'Cliquez pour afficher la liste des épisodes'
    : null;
  const actionButtonStyle = {
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    padding: '6px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px'
  } as const;
  const posterInputRef = useRef<HTMLInputElement>(null);
  const isSeasonLocked = lockImported && season.isImported;
  const canEditSeason = !isSeasonLocked;
  const canManagePoster = Boolean(onPosterUpload) && canEditSeason;

  const handlePosterFile = useCallback((file?: File) => {
    if (!file || !onPosterUpload || !canManagePoster) return;
    const path = (file as any)?.path;
    if (path) {
      onPosterUpload(season, path);
    }
  }, [canManagePoster, onPosterUpload, season]);

  const handlePosterInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handlePosterFile(file);
    event.target.value = '';
  }, [handlePosterFile]);

  const handlePosterDragOver = useCallback((event: React.DragEvent) => {
    if (!canManagePoster) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, [canManagePoster]);

  const handlePosterDrop = useCallback((event: React.DragEvent) => {
    if (!canManagePoster) return;
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    handlePosterFile(file);
  }, [canManagePoster, handlePosterFile]);

  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden'
      }}
    >
      <div
        role={showEpisodes ? 'button' : undefined}
        tabIndex={showEpisodes ? 0 : -1}
        onClick={() => {
          if (showEpisodes) {
            setExpanded((prev) => !prev);
          }
        }}
        onKeyDown={(event) => {
          if (!showEpisodes) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        style={{
          display: 'flex',
          width: '100%',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          padding: 0,
          cursor: showEpisodes ? 'pointer' : 'default'
        }}
      >
        <div style={{ display: 'flex', gap: '20px', padding: '20px', alignItems: 'center', flex: 1 }}>
          <div
            onDragOver={handlePosterDragOver}
            onDrop={handlePosterDrop}
            style={{
              width: '90px',
              height: '120px',
              borderRadius: '10px',
              border: resolvedPoster ? '1px solid var(--border)' : '1px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
              background: 'var(--surface)'
            }}
          >
            {resolvedPoster ? (
              <LazyImage
                src={resolvedPoster}
                alt={season.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                showError={false}
              />
            ) : (
              <span style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', padding: '6px' }}>
                Saison {season.seasonNumber}
              </span>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--text)'
                    }}
                  >
                    {season.title}
                  </h3>
                  {season.airDate && (
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {formatAirDate(season.airDate)}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      background: 'rgba(var(--primary-rgb), 0.1)',
                      borderRadius: '999px',
                      padding: '6px 10px',
                      border: '1px solid rgba(var(--primary-rgb), 0.2)'
                    }}
                  >
                    {season.episodes.length} épisode{season.episodes.length > 1 ? 's' : ''}
                  </span>
                  {isSeasonLocked && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        background: 'rgba(var(--warning-rgb, 234,179,8), 0.15)',
                        border: '1px solid rgba(var(--warning-rgb, 234,179,8), 0.3)',
                        borderRadius: '999px',
                        padding: '4px 8px'
                      }}
                      title="Section importée depuis TMDb (lecture seule)"
                    >
                      <Lock size={12} />
                      Import TMDb
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {canManagePoster && (
                      <>
                        <button
                          type="button"
                          style={actionButtonStyle}
                          onClick={(e) => {
                            e.stopPropagation();
                            posterInputRef.current?.click();
                          }}
                        >
                          <ImageIcon size={14} />
                          Image
                        </button>
                        <input
                          ref={posterInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handlePosterInputChange}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      style={{
                        ...actionButtonStyle,
                        opacity: canEditSeason ? 1 : 0.5,
                        cursor: canEditSeason ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!canEditSeason}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canEditSeason) return;
                        onEditSeason(season);
                      }}
                    >
                      <Edit size={14} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      style={actionButtonStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSeason(season);
                      }}
                    >
                      <Copy size={14} />
                      Dupliquer
                    </button>
                    <button
                      type="button"
                      style={{
                        ...actionButtonStyle,
                        borderColor: 'var(--danger)',
                        color: 'var(--danger)',
                        opacity: canEditSeason ? 1 : 0.5,
                        cursor: canEditSeason ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!canEditSeason}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canEditSeason) return;
                        onDeleteSeason(season);
                      }}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                  {showEpisodes && (
                    <ChevronDown
                      size={18}
                      style={{
                        color: 'var(--text-secondary)',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            {toggleHint && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}
              >
                {toggleHint}
              </span>
            )}

            {season.synopsis && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                {season.synopsis}
              </p>
            )}
          </div>
        </div>
      </div>

      {expanded && showEpisodes && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {season.episodes.map((episode) => {
            const isEpisodeSeen = Boolean(episode.vu);
            const isProcessing = markingEpisodeId === episode.id;
            const isEpisodeLocked = lockImported && Boolean(episode.tmdb_id);
            const canEditEpisode = !isEpisodeLocked;
            const canReorderEpisode = canEditEpisode;

            return (
              <Fragment key={episode.id}>
                <div
                  draggable={canReorderEpisode}
                  onDragStart={(e) => {
                    if (!canReorderEpisode) return;
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = 'move';
                    onEpisodeDragStart(episode);
                  }}
                  onDragOver={(e) => {
                    if (!canReorderEpisode) return;
                    onEpisodeDragOver(e, episode);
                  }}
                  onDrop={(e) => {
                    if (!canReorderEpisode) return;
                    onEpisodeDrop(e, episode);
                  }}
                  onDragEnd={onEpisodeDragEnd}
                  style={{
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '60px minmax(0, 1fr) auto',
                    gap: '16px',
                    alignItems: 'center',
                    borderLeft: draggingEpisodeId === episode.id ? '3px solid var(--primary)' : '3px solid transparent',
                    background: dragOverEpisodeId === episode.id ? 'rgba(var(--primary-rgb), 0.08)' : undefined
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(var(--primary-rgb), 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      fontWeight: 700
                    }}
                  >
                    S{episode.saison_numero.toString().padStart(2, '0')}
                    <br />
                    E{episode.episode_numero.toString().padStart(2, '0')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {episode.titre || `Épisode ${episode.episode_numero}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
                      {episode.date_diffusion && <span>{formatAirDate(episode.date_diffusion)}</span>}
                      {episode.duree && <span>{episode.duree} min</span>}
                      {episode.note_moyenne && <span>⭐ {episode.note_moyenne.toFixed(1)}</span>}
                      {isEpisodeLocked && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} />
                          Import TMDb
                        </span>
                      )}
                    </div>
                    {episode.synopsis && (
                      <p
                        style={{
                          margin: 0,
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          lineHeight: 1.6
                        }}
                      >
                        {episode.synopsis}
                      </p>
                    )}

                    {/* Section vidéos pour l'épisode */}
                    {(() => {
                      const videos = episodeVideos[episode.id] || [];
                      const isLoading = episodeLoadingVideos[episode.id];

                      // Charger les vidéos si pas encore chargées
                      if (expanded && !isLoading && videos.length === 0 && !episodeLoadingVideos.hasOwnProperty(episode.id)) {
                        // Déclencher le chargement via useEffect plutôt que dans le rendu
                      }

                      return (
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {isLoading && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px' }}>
                              Chargement des vidéos...
                            </div>
                          )}

                          {!isLoading && videos.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {videos.map((video) => (
                                <div
                                  key={video.id}
                                  style={{
                                    padding: '8px 12px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    position: 'relative'
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onPlayEpisodeVideo(video);
                                    }}
                                    style={{
                                      flex: 1,
                                      textAlign: 'left',
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--text)',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      padding: '0 24px 0 0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      minWidth: 0
                                    }}
                                  >
                                    <Play size={14} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {video.title || (video.site || 'Vidéo')}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onDeleteEpisodeVideo(episode.id, video.id);
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
                                      zIndex: 10
                                    }}
                                    title="Supprimer cette vidéo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => onEpisodeClick(episode)}
                      disabled={isProcessing}
                      style={{
                        justifySelf: 'flex-end',
                        background: isEpisodeSeen ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                        borderColor: isEpisodeSeen ? 'rgba(34, 197, 94, 0.5)' : undefined,
                        color: isEpisodeSeen ? '#22c55e' : 'var(--text)',
                        opacity: isProcessing ? 0.7 : 1,
                        minWidth: '140px'
                      }}
                    >
                      {isProcessing
                        ? 'Enregistrement...'
                        : isEpisodeSeen ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={14} />
                            Marquer non vu
                          </span>
                        ) : (
                          'Marquer vu'
                        )}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddEpisodeVideo(episode.id);
                      }}
                      style={{ minWidth: '160px' }}
                    >
                      <Play size={16} />
                      Ajouter une vidéo
                    </button>
                    <button
                      type="button"
                      style={{
                        ...actionButtonStyle,
                        opacity: canEditEpisode ? 1 : 0.5,
                        cursor: canEditEpisode ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!canEditEpisode}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canEditEpisode) return;
                        onEditEpisode(episode);
                      }}
                    >
                      <Edit size={14} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      style={{
                        ...actionButtonStyle,
                        borderColor: 'var(--danger)',
                        color: 'var(--danger)',
                        opacity: canEditEpisode ? 1 : 0.5,
                        cursor: canEditEpisode ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!canEditEpisode}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canEditEpisode) return;
                        onDeleteEpisode(episode);
                      }}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </div>
                <div style={{ height: '1px', background: 'var(--border)' }} />
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
