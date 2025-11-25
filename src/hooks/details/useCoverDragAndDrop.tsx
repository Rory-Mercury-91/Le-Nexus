import { useCallback, useState } from 'react';

export interface CoverDragAndDropOptions {
  /**
   * Type de média (movie, series, anime, manga, adulte-game, tome)
   */
  mediaType: string;

  /**
   * Titre de l'item (pour le nom du fichier)
   */
  title: string;

  /**
   * ID de l'item (pour la mise à jour)
   */
  itemId: number | string;

  /**
   * URL actuelle de la couverture (pour supprimer l'ancienne si locale)
   */
  currentCoverUrl?: string | null;

  /**
   * Options supplémentaires pour saveCoverFromPath
   */
  saveOptions?: {
    mediaType?: string;
    typeVolume?: string;
    [key: string]: any;
  };

  /**
   * Fonction pour mettre à jour la couverture dans la base de données
   */
  updateCoverApi: (itemId: number | string, coverUrl: string) => Promise<void>;

  /**
   * Callback appelé après la mise à jour réussie
   */
  onCoverUpdated?: () => void;

  /**
   * Callback pour afficher des erreurs
   */
  onError?: (error: string) => void;
}

/**
 * Hook générique pour gérer le drag & drop de couvertures dans les pages de détails.
 * Utilisé par MovieCover, SeriesCover, AnimeCover, MangaCover, AdulteGameBanner, etc.
 */
export function useCoverDragAndDrop(options: CoverDragAndDropOptions) {
  const {
    mediaType,
    title,
    itemId,
    currentCoverUrl,
    saveOptions = {},
    updateCoverApi,
    onCoverUpdated,
    onError
  } = options;

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    try {
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));

      if (!imageFile) {
        onError?.('Veuillez déposer une image');
        return;
      }

      // Supprimer l'ancienne image locale si elle existe
      if (currentCoverUrl && currentCoverUrl.startsWith('covers/')) {
        try {
          await window.electronAPI.deleteCoverImage(currentCoverUrl);
        } catch (err) {
          console.warn('Erreur suppression ancienne image:', err);
          // Continuer même si la suppression échoue
        }
      }

      // Sauvegarder la nouvelle image
      const filePath = (imageFile as any).path;

      if (!filePath) {
        // Si pas de path (navigateur web), utiliser saveCoverFromBuffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await window.electronAPI.saveCoverFromBuffer(
          buffer,
          imageFile.name,
          title,
          mediaType as 'serie' | 'tome' | 'anime' | 'adulte-game',
          saveOptions
        );

        if (result.success && result.localPath) {
          await updateCoverApi(itemId, result.localPath);
          onCoverUpdated?.();
        } else {
          onError?.(result.error || 'Erreur lors de la sauvegarde de l\'image');
        }
        return;
      }

      // Utiliser saveCoverFromPath (Electron)
      const result = await window.electronAPI.saveCoverFromPath(
        filePath,
        title,
        mediaType as 'serie' | 'tome' | 'anime' | 'adulte-game',
        saveOptions
      );

      if (result.success && result.localPath) {
        await updateCoverApi(itemId, result.localPath);
        onCoverUpdated?.();
      } else {
        onError?.(result.error || 'Erreur lors de la sauvegarde de l\'image');
      }
    } catch (error: any) {
      console.error('Erreur lors du drop:', error);
      onError?.(error.message || 'Erreur lors du traitement de l\'image');
    }
  }, [mediaType, title, itemId, currentCoverUrl, saveOptions, updateCoverApi, onCoverUpdated, onError]);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
