import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../common/useToast';

export interface MediaGalleryConfig {
  /** ID de l'item */
  itemId: number | null | undefined;
  /** API pour récupérer les images utilisateur */
  getUserImagesApi?: (itemId: number) => Promise<{ success: boolean; images?: Array<{ id: number; file_path: string; file_name: string; url: string }> }>;
  /** API pour récupérer les vidéos utilisateur */
  getUserVideosApi?: (itemId: number) => Promise<{ success: boolean; videos?: Array<{ id: number; type: 'url' | 'file'; title?: string | null; url?: string; file_path?: string; file_name?: string; site?: string | null; video_key?: string | null }> }>;
  /** API pour ajouter une image par URL */
  addImageUrlApi?: (itemId: number, url: string) => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  /** API pour ajouter une image par fichier */
  addImageFileApi?: (itemId: number, title?: string) => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  /** API pour supprimer une image */
  deleteImageApi?: (itemId: number, imageId: number) => Promise<{ success: boolean; error?: string }>;
  /** API pour ajouter une vidéo par URL */
  addVideoUrlApi?: (itemId: number, url: string, title: string) => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  /** API pour ajouter une vidéo par fichier */
  addVideoFileApi?: (itemId: number, title?: string, isReference?: boolean) => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  /** API pour supprimer une vidéo */
  deleteVideoApi?: (itemId: number, videoId: number) => Promise<{ success: boolean; error?: string }>;
}

export interface UserImage {
  id: number;
  file_path: string;
  file_name: string;
  url: string;
}

export interface UserVideo {
  id: number;
  type: 'url' | 'file';
  title?: string | null;
  url?: string;
  file_path?: string;
  file_name?: string;
  site?: string | null;
  video_key?: string | null;
}

export function useMediaGallery(config: MediaGalleryConfig) {
  const {
    itemId,
    getUserImagesApi,
    getUserVideosApi,
    addImageUrlApi,
    addImageFileApi,
    deleteImageApi,
    addVideoUrlApi,
    addVideoFileApi,
    deleteVideoApi
  } = config;

  const { showToast } = useToast();

  // États images
  const [userImages, setUserImages] = useState<UserImage[]>([]);
  const [loadingUserImages, setLoadingUserImages] = useState(false);
  const [addingImage, setAddingImage] = useState(false);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{ id: number; fileName: string } | null>(null);

  // États vidéos
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [loadingUserVideos, setLoadingUserVideos] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ site: 'local'; videoUrl?: string; mimeType?: string; title?: string } | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<number | null>(null);

  // Charger les images
  const loadUserImages = useCallback(async () => {
    if (!itemId || !getUserImagesApi) return;
    try {
      setLoadingUserImages(true);
      const result = await getUserImagesApi(itemId);
      if (result?.success && result.images) {
        setUserImages(result.images);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des images utilisateur:', error);
    } finally {
      setLoadingUserImages(false);
    }
  }, [itemId, getUserImagesApi]);

  // Charger les vidéos
  const loadUserVideos = useCallback(async () => {
    if (!itemId || !getUserVideosApi) return;
    try {
      setLoadingUserVideos(true);
      const result = await getUserVideosApi(itemId);
      if (result?.success && result.videos) {
        setUserVideos(result.videos);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des vidéos utilisateur:', error);
    } finally {
      setLoadingUserVideos(false);
    }
  }, [itemId, getUserVideosApi]);

  // Charger automatiquement au montage et quand itemId change
  useEffect(() => {
    if (itemId) {
      loadUserImages();
      loadUserVideos();
    }
  }, [itemId, loadUserImages, loadUserVideos]);

  // Ajouter image par URL
  const handleAddImageUrl = useCallback(async (url: string) => {
    if (!itemId || !addImageUrlApi || addingImage) return;
    try {
      setAddingImage(true);
      const result = await addImageUrlApi(itemId, url);
      if (result?.success) {
        showToast({
          title: 'Image ajoutée',
          message: 'L\'image a été ajoutée à la galerie',
          type: 'success'
        });
        setShowAddImageModal(false);
        await loadUserImages();
      } else if (!result?.canceled) {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible d\'ajouter l\'image',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'image:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'ajouter l\'image',
        type: 'error'
      });
    } finally {
      setAddingImage(false);
    }
  }, [itemId, addImageUrlApi, addingImage, loadUserImages, showToast]);

  // Ajouter image par fichier
  const handleAddImageFile = useCallback(async (title?: string) => {
    if (!itemId || !addImageFileApi || addingImage) return;
    try {
      setAddingImage(true);
      const result = await addImageFileApi(itemId, title);
      if (result?.success) {
        showToast({
          title: 'Image ajoutée',
          message: 'L\'image a été ajoutée à la galerie',
          type: 'success'
        });
        setShowAddImageModal(false);
        await loadUserImages();
      } else if (!result?.canceled) {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible d\'ajouter l\'image',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'image:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'ajouter l\'image',
        type: 'error'
      });
    } finally {
      setAddingImage(false);
    }
  }, [itemId, addImageFileApi, addingImage, loadUserImages, showToast]);

  // Supprimer image
  const handleDeleteUserImageClick = useCallback((imageId: number, fileName: string) => {
    setImageToDelete({ id: imageId, fileName });
  }, []);

  const handleConfirmDeleteImage = useCallback(async () => {
    if (!imageToDelete || !deleteImageApi || !itemId) return;
    
    try {
      const result = await deleteImageApi(itemId, imageToDelete.id);
      if (result?.success) {
        showToast({
          title: 'Image supprimée',
          message: 'L\'image a été supprimée de la galerie',
          type: 'success'
        });
        await loadUserImages();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de supprimer l\'image',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer l\'image',
        type: 'error'
      });
    } finally {
      setImageToDelete(null);
    }
  }, [imageToDelete, deleteImageApi, itemId, loadUserImages, showToast]);

  // Ajouter vidéo par URL
  const handleAddVideoUrl = useCallback(async (url: string, title: string) => {
    if (!itemId || !addVideoUrlApi || addingVideo) return;
    try {
      setAddingVideo(true);
      const result = await addVideoUrlApi(itemId, url, title);
      if (result?.success) {
        showToast({
          title: 'Vidéo ajoutée',
          message: 'La vidéo a été ajoutée',
          type: 'success'
        });
        setShowAddVideoModal(false);
        await loadUserVideos();
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
      setAddingVideo(false);
    }
  }, [itemId, addVideoUrlApi, addingVideo, loadUserVideos, showToast]);

  // Ajouter vidéo par fichier
  const handleAddVideoFile = useCallback(async (title?: string, isReference?: boolean) => {
    if (!itemId || !addVideoFileApi || addingVideo) return;
    try {
      setAddingVideo(true);
      const result = await addVideoFileApi(itemId, title, isReference);
      if (result?.success) {
        showToast({
          title: 'Vidéo ajoutée',
          message: 'La vidéo a été ajoutée',
          type: 'success'
        });
        setShowAddVideoModal(false);
        await loadUserVideos();
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
      setAddingVideo(false);
    }
  }, [itemId, addVideoFileApi, addingVideo, loadUserVideos, showToast]);

  // Supprimer vidéo
  const handleDeleteUserVideoClick = useCallback((videoId: number) => {
    setVideoToDelete(videoId);
  }, []);

  const handleConfirmDeleteVideo = useCallback(async () => {
    if (!videoToDelete || !deleteVideoApi || !itemId) return;
    
    try {
      const result = await deleteVideoApi(itemId, videoToDelete);
      if (result?.success) {
        showToast({
          title: 'Vidéo supprimée',
          message: 'La vidéo a été supprimée',
          type: 'success'
        });
        await loadUserVideos();
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
      setVideoToDelete(null);
    }
  }, [videoToDelete, deleteVideoApi, itemId, loadUserVideos, showToast]);

  return {
    // Images
    userImages,
    loadingUserImages,
    addingImage,
    showAddImageModal,
    setShowAddImageModal,
    selectedImage,
    setSelectedImage,
    imageToDelete,
    setImageToDelete,
    loadUserImages,
    handleAddImageUrl,
    handleAddImageFile,
    handleDeleteUserImageClick,
    handleConfirmDeleteImage,
    // Vidéos
    userVideos,
    loadingUserVideos,
    addingVideo,
    showAddVideoModal,
    setShowAddVideoModal,
    selectedVideo,
    setSelectedVideo,
    videoToDelete,
    setVideoToDelete,
    loadUserVideos,
    handleAddVideoUrl,
    handleAddVideoFile,
    handleDeleteUserVideoClick,
    handleConfirmDeleteVideo
  };
}
