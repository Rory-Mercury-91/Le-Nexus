import { AlertCircle, Image as ImageIcon, Video } from 'lucide-react';

interface MediaErrorDisplayProps {
  type: 'image' | 'video';
  error?: string;
  fileName?: string;
  style?: React.CSSProperties;
}

/**
 * Composant pour afficher les erreurs de chargement de médias avec des messages explicites
 */
export default function MediaErrorDisplay({ 
  type, 
  error, 
  fileName,
  style 
}: MediaErrorDisplayProps) {
  const getErrorMessage = () => {
    if (error) {
      // Messages d'erreur spécifiques
      if (error.includes('not found') || error.includes('introuvable')) {
        return 'Fichier introuvable. Le fichier a peut-être été déplacé ou supprimé.';
      }
      if (error.includes('format') || error.includes('extension')) {
        const supportedFormats = type === 'image' 
          ? 'JPG, PNG, GIF, WebP'
          : 'MP4, WebM, OGG, MOV, AVI, MKV';
        return `Format non supporté. Formats supportés : ${supportedFormats}`;
      }
      if (error.includes('CORS') || error.includes('cross-origin')) {
        return 'Impossible de charger ce média depuis cette source (CORS).';
      }
      if (error.includes('403') || error.includes('Forbidden')) {
        return 'Accès refusé à ce média.';
      }
      if (error.includes('404')) {
        return 'Média introuvable.';
      }
      if (error.includes('153')) {
        return 'Erreur YouTube (153). La vidéo ne peut pas être chargée. Veuillez essayer d\'ouvrir la vidéo dans votre navigateur.';
      }
      if ((error.includes('4') && error.includes('YouTube')) || error.includes('Erreur 4 YouTube')) {
        return 'Erreur YouTube (4). La vidéo ne peut pas être chargée. Veuillez essayer d\'ouvrir la vidéo dans votre navigateur.';
      }
      return error;
    }

    // Messages par défaut
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext && !isSupportedExtension(ext, type)) {
        const supportedFormats = type === 'image' 
          ? 'JPG, PNG, GIF, WebP'
          : 'MP4, WebM, OGG, MOV, AVI, MKV';
        return `Extension .${ext.toUpperCase()} non supportée. Formats supportés : ${supportedFormats}`;
      }
    }

    return type === 'image' 
      ? 'Impossible de charger cette image.'
      : 'Impossible de charger cette vidéo.';
  };

  const isSupportedExtension = (ext: string, mediaType: 'image' | 'video'): boolean => {
    if (mediaType === 'image') {
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
    } else {
      return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'].includes(ext);
    }
  };

  const Icon = type === 'image' ? ImageIcon : Video;
  const message = getErrorMessage();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
        background: 'var(--surface-light)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        minHeight: '200px',
        ...style
      }}
    >
      <AlertCircle 
        size={32} 
        style={{ 
          color: 'var(--error)',
          opacity: 0.7
        }} 
      />
      <Icon 
        size={24} 
        style={{ 
          color: 'var(--text-secondary)',
          opacity: 0.5
        }} 
      />
      <div style={{ fontSize: '13px', lineHeight: '1.5', maxWidth: '300px' }}>
        <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text)' }}>
          Erreur de chargement
        </strong>
        {message}
        {fileName && (
          <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.7, wordBreak: 'break-all' }}>
            Fichier : {fileName}
          </div>
        )}
      </div>
    </div>
  );
}
