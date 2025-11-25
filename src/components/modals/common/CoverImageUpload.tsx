import { Upload } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import CoverImage from '../../common/CoverImage';

interface CoverImageUploadProps {
  /** URL actuelle de l'image */
  imageUrl: string;
  /** Callback quand l'image change */
  onImageChange: (url: string) => void;
  /** Type de média (pour le nom du fichier) */
  mediaType: 'serie' | 'tome' | 'anime' | 'adulte-game' | string;
  /** Titre de l'item (pour le nom du fichier) */
  itemTitle?: string;
  /** Label pour le placeholder */
  placeholderLabel?: string;
  /** Utiliser le path direct (Electron) au lieu de convertir en buffer (pour AdulteGame) */
  useDirectPath?: boolean;
  /** Fonction personnalisée pour sélectionner l'image (optionnel) */
  onSelectImage?: () => Promise<{ success: boolean; path?: string; error?: string }>;
}

/**
 * Composant générique pour l'upload d'image de couverture avec drag & drop
 * Utilisé par AddMovieModal, AddSeriesModal, etc.
 */
export default function CoverImageUpload({
  imageUrl,
  onImageChange,
  mediaType,
  itemTitle = 'Item',
  placeholderLabel = 'Glissez une image ici',
  useDirectPath = false,
  onSelectImage
}: CoverImageUploadProps) {
  const { showToast } = useToast();
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      await handleImageUpload(imageFile);
    }
  };

  const handleUploadImage = async () => {
    try {
      if (onSelectImage) {
        const result = await onSelectImage();
        if (result.success && result.path) {
          onImageChange(result.path);
          showToast({ title: 'Image sélectionnée', type: 'success' });
        } else if (result.error) {
          showToast({ title: 'Erreur', message: result.error, type: 'error' });
        }
      } else {
        // Fallback par défaut
        const result = await window.electronAPI.selectAdulteGameCoverImage();
        if (result.success && result.path) {
          onImageChange(result.path);
        }
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      showToast({ title: 'Erreur', message: 'Erreur lors de la sélection de l\'image', type: 'error' });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      if (useDirectPath) {
        // Mode path direct (Electron) - utilisé par AdulteGame
        interface FileWithPath extends File {
          path?: string;
        }
        const fileWithPath = file as FileWithPath;
        const filePath = fileWithPath.path;

        if (filePath) {
          onImageChange(filePath);
          showToast({ title: 'Image ajoutée', type: 'success' });
        } else {
          showToast({ title: 'Erreur', message: 'Chemin du fichier non disponible', type: 'error' });
        }
      } else {
        // Mode buffer (par défaut) - utilisé par Movie/Series
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await window.electronAPI.saveCoverFromBuffer(
          buffer,
          file.name,
          itemTitle,
          mediaType as 'serie' | 'tome' | 'anime' | 'adulte-game'
        );

        if (result.success && result.localPath) {
          onImageChange(result.localPath);
          showToast({ title: 'Image ajoutée', type: 'success' });
        }
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      showToast({ title: 'Erreur lors de l\'upload de l\'image', type: 'error' });
    }
  };

  return (
    <div style={{ width: '200px', flexShrink: 0 }}>
      <div
        style={{
          width: '100%',
          height: '280px',
          borderRadius: '8px',
          border: dragging
            ? '2px solid var(--primary)'
            : imageUrl
              ? '2px solid var(--border)'
              : '2px dashed var(--border)',
          overflow: 'hidden',
          background: dragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          transition: 'all 0.2s',
          position: 'relative',
          cursor: 'pointer'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <CoverImage
            src={imageUrl}
            alt="Affiche"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px',
            gap: '8px'
          }}>
            <Upload size={24} style={{ opacity: 0.5 }} />
            <div>{placeholderLabel}</div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleUploadImage}
        className="btn btn-outline"
        style={{ width: '100%', fontSize: '14px', marginTop: '12px' }}
      >
        <Upload size={16} />
        Choisir une image
      </button>
      <div style={{ marginTop: '12px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
          URL image (optionnel)
        </label>
        <input
          type="text"
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => onImageChange(e.target.value)}
          className="input"
          style={{ fontSize: '12px', padding: '8px' }}
        />
      </div>
    </div>
  );
}
