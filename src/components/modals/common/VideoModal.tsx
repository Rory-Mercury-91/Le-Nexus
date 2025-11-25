import { ExternalLink, Languages, Maximize2, Minimize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';
import MediaErrorDisplay from '../../common/MediaErrorDisplay';

interface VideoModalProps {
  videoUrl?: string;
  title?: string;
  onClose: () => void;
}

interface AudioTrack {
  index: number; // Index global du stream dans le fichier
  audioIndex?: number; // Index dans la liste des pistes audio uniquement (0, 1, 2...)
  language: string;
  title: string;
  codec: string;
}

interface SubtitleTrack {
  index: number;
  language: string;
  title: string;
  codec: string;
}

export default function VideoModal({ videoUrl, title, onClose }: VideoModalProps) {
  // Ne gérer que les vidéos locales (fichiers)
  useDisableBodyScroll(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCursorHidden, setIsCursorHidden] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // États pour les pistes audio et sous-titre
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | null>(null);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<number | null>(null);
  const [showTrackSelector, setShowTrackSelector] = useState(false);

  // Générer une clé unique pour cette vidéo
  const getVideoStorageKey = (): string | null => {
    if (videoUrl) {
      // Pour les vidéos locales, utiliser l'URL complète comme clé
      // Si c'est une URL de streaming, extraire le chemin du fichier
      if (videoUrl.startsWith('http://127.0.0.1:')) {
        try {
          const url = new URL(videoUrl);
          const fileParam = url.searchParams.get('file');
          if (fileParam) {
            return `video_position_${encodeURIComponent(fileParam)}`;
          }
        } catch (e) {
          console.error('Erreur parsing URL pour clé de stockage:', e);
        }
      }
      return `video_position_${encodeURIComponent(videoUrl)}`;
    }
    return null;
  };

  // Sauvegarder la position de lecture
  const saveVideoPosition = (currentTime: number) => {
    const storageKey = getVideoStorageKey();
    if (!storageKey) return;

    try {
      // Sauvegarder seulement si la vidéo a été lue plus de 5 secondes
      if (currentTime > 5) {
        localStorage.setItem(storageKey, JSON.stringify({
          position: currentTime,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.warn('Impossible de sauvegarder la position de la vidéo:', error);
    }
  };

  // Charger la position de lecture sauvegardée
  const loadVideoPosition = (): number | null => {
    const storageKey = getVideoStorageKey();
    if (!storageKey) return null;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Vérifier que la sauvegarde n'est pas trop ancienne (max 30 jours)
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
        if (Date.now() - data.timestamp < maxAge) {
          return data.position || null;
        } else {
          // Supprimer les anciennes sauvegardes
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Impossible de charger la position de la vidéo:', error);
    }
    return null;
  };

  // Surveiller l'état du plein écran Electron
  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const result = await window.electronAPI.isFullscreen?.();
        if (result?.success) {
          const wasFullscreen = isFullscreen;
          setIsFullscreen(result.isFullScreen || false);

          // Réinitialiser l'overlay et le curseur si on sort du plein écran
          if (wasFullscreen && !result.isFullScreen) {
            setShowFullscreenOverlay(false);
            setIsCursorHidden(false);
            if (overlayTimeoutRef.current) {
              clearTimeout(overlayTimeoutRef.current);
              overlayTimeoutRef.current = null;
            }
            if (cursorTimeoutRef.current) {
              clearTimeout(cursorTimeoutRef.current);
              cursorTimeoutRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Erreur vérification plein écran:', error);
      }
    };

    // Vérifier au démarrage
    checkFullscreen();

    // Vérifier périodiquement l'état du plein écran (toutes les 500ms)
    const interval = setInterval(checkFullscreen, 500);

    return () => {
      clearInterval(interval);
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    // Si la vidéo change, réinitialiser l'erreur et les pistes
    setVideoError(null);
    setAudioTracks([]);
    setSubtitleTracks([]);
    setSelectedAudioTrack(null);
    setSelectedSubtitleTrack(null);
    setShowTrackSelector(false);

    // Charger les pistes si c'est un fichier MKV/AVI en streaming
    if (videoUrl && videoUrl.startsWith('http://127.0.0.1:')) {
      loadVideoTracks();
    }
  }, [videoUrl]);

  // Fonction pour charger les pistes audio et sous-titre
  const loadVideoTracks = async () => {
    if (!videoUrl || !videoUrl.startsWith('http://127.0.0.1:')) return;

    try {
      // Extraire le chemin du fichier depuis l'URL de streaming
      const url = new URL(videoUrl);
      const fileParam = url.searchParams.get('file');
      if (!fileParam) return;

      const filePath = decodeURIComponent(fileParam);

      const result = await window.electronAPI.getVideoTracks?.(filePath);

      if (result?.success && result.tracks) {
        setAudioTracks(result.tracks.audio || []);
        setSubtitleTracks(result.tracks.subtitles || []);

        // Si plusieurs pistes audio disponibles, afficher le sélecteur
        if ((result.tracks.audio?.length || 0) > 1) {
          setShowTrackSelector(true);
          // Sélectionner la première piste par défaut (index 0 dans la liste, mais index réel dans FFmpeg)
          if (result.tracks.audio && result.tracks.audio.length > 0) {
            setSelectedAudioTrack(result.tracks.audio[0].index);
          }
        }

        // Extraire la piste audio actuelle depuis l'URL si elle existe
        const currentAudioTrack = url.searchParams.get('audioTrack');
        if (currentAudioTrack !== null && result.tracks.audio) {
          const trackIndex = parseInt(currentAudioTrack, 10);
          const trackExists = result.tracks.audio.some(t => t.index === trackIndex);
          if (trackExists) {
            setSelectedAudioTrack(trackIndex);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement des pistes vidéo:', error);
    }
  };

  // Fonction pour mettre à jour l'URL de streaming avec les pistes sélectionnées
  const updateVideoUrlWithTracks = (audioTrack: number | null, subtitleTrack: number | null) => {
    if (!videoUrl || !videoUrl.startsWith('http://127.0.0.1:') || !videoRef.current) return;

    try {
      const url = new URL(videoUrl);

      // Sauvegarder la position actuelle
      const currentTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;

      // Mettre à jour les paramètres de piste
      if (audioTrack !== null) {
        url.searchParams.set('audioTrack', audioTrack.toString());
      } else {
        url.searchParams.delete('audioTrack');
      }

      if (subtitleTrack !== null) {
        url.searchParams.set('subtitleTrack', subtitleTrack.toString());
      } else {
        url.searchParams.delete('subtitleTrack');
      }

      // Reprendre à la position actuelle si > 0
      if (currentTime > 0) {
        url.searchParams.set('start', currentTime.toFixed(2));
      }

      // Recharger la vidéo avec la nouvelle URL
      const newUrl = url.toString();
      videoRef.current.src = newUrl;
      videoRef.current.load();

      // Reprendre la lecture si elle était en cours
      if (wasPlaying) {
        videoRef.current.play().catch(err => {
          console.error('Erreur lecture après changement de piste:', err);
        });
      }
    } catch (error) {
      console.error('Erreur mise à jour URL avec pistes:', error);
    }
  };

  // Gérer le changement de piste audio
  const handleAudioTrackChange = (trackIndex: number | null) => {
    setSelectedAudioTrack(trackIndex);
    updateVideoUrlWithTracks(trackIndex, selectedSubtitleTrack);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          // Si on est en plein écran, sortir du plein écran
          window.electronAPI.toggleFullscreen?.();
        } else {
          // Sinon, fermer le modal
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isFullscreen]);

  // Gérer la vidéo locale
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const video = videoRef.current;

      // Charger la position sauvegardée si disponible
      const savedPosition = loadVideoPosition();

      // Si c'est un MKV en streaming et qu'on a une position sauvegardée, modifier l'URL
      if (savedPosition && videoUrl.startsWith('http://127.0.0.1:')) {
        try {
          const url = new URL(videoUrl);
          const fileParam = url.searchParams.get('file');
          if (fileParam && !url.searchParams.has('start')) {
            // Ajouter le paramètre start à l'URL pour reprendre à la position sauvegardée
            url.searchParams.set('start', savedPosition.toFixed(2));
            video.src = url.toString();
            console.log(`⏪ Reprise de la vidéo MKV à ${savedPosition.toFixed(2)}s`);
          }
        } catch (e) {
          console.error('Erreur modification URL pour reprise:', e);
        }
      }

      // Attendre que la vidéo soit chargée avant de définir la position (pour les non-streaming)
      const handleLoadedData = () => {
        if (savedPosition && videoUrl && !videoUrl.startsWith('http://127.0.0.1:')) {
          // Pour les vidéos non-streaming, définir directement la position
          video.currentTime = savedPosition;
          console.log(`⏪ Reprise de la vidéo à ${savedPosition.toFixed(2)}s`);
        }

        // Démarrer la lecture
        video.play().catch((error) => {
          console.error('Erreur lecture vidéo locale:', error);
          setVideoError(`Impossible de lire la vidéo : ${error.message || 'Format non supporté ou fichier corrompu'}`);
        });
      };

      video.addEventListener('loadeddata', handleLoadedData, { once: true });

      // Si la vidéo est déjà chargée, déclencher immédiatement
      if (video.readyState >= 2) {
        handleLoadedData();
      }

      // Sauvegarder la position toutes les 10 secondes pendant la lecture
      const handleTimeUpdate = () => {
        if (video.currentTime > 5 && Math.floor(video.currentTime) % 10 === 0) {
          saveVideoPosition(video.currentTime);
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);

      // Sauvegarder la position avant la fermeture
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadeddata', handleLoadedData);
        if (video.currentTime > 5) {
          saveVideoPosition(video.currentTime);
        }
      };
    }
  }, [videoUrl]);

  if (!videoUrl) {
    return null;
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isFullscreen ? '#000' : 'rgba(0, 0, 0, 0.9)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '20px',
        cursor: isFullscreen && isCursorHidden ? 'none' : (isFullscreen ? 'default' : 'pointer'),
        transition: 'background-color 0.3s'
      }}
    >
      {!isFullscreen && (
        <>
          {/* Menu de sélection des pistes audio et sous-titre */}
          {showTrackSelector && audioTracks.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                zIndex: 10001,
                minWidth: '200px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Languages size={16} color="white" />
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Pistes disponibles</span>
              </div>

              {/* Sélection piste audio */}
              {audioTracks.length > 1 && (
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                    Audio :
                  </label>
                  <select
                    value={selectedAudioTrack ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleAudioTrackChange(value ? parseInt(value, 10) : null);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {audioTracks.map((track) => (
                      <option key={track.index} value={track.index}>
                        {track.title} ({track.language.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Note sur les sous-titres */}
              {subtitleTracks.length > 0 && (
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontStyle: 'italic' }}>
                  {subtitleTracks.length} piste(s) sous-titre disponible(s)
                  <br />
                  (non supportées en streaming MP4)
                </div>
              )}
            </div>
          )}

          {/* Bouton ouvrir avec lecteur externe (pour fichiers MKV si le streaming échoue) */}
          {videoUrl && (videoUrl.toLowerCase().includes('.mkv') || videoUrl.startsWith('http://127.0.0.1:')) && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (videoUrl) {
                  // Si c'est une URL de streaming, extraire le chemin du fichier
                  let filePath = videoUrl;
                  if (videoUrl.startsWith('http://127.0.0.1:')) {
                    try {
                      const url = new URL(videoUrl);
                      const fileParam = url.searchParams.get('file');
                      if (fileParam) {
                        filePath = decodeURIComponent(fileParam);
                      }
                    } catch (err) {
                      console.error('Erreur parsing URL streaming:', err);
                    }
                  }

                  // Ouvrir avec le lecteur externe
                  const result = await window.electronAPI.openPath?.(filePath);
                  if (result?.success) {
                    console.log('✅ Fichier ouvert avec lecteur externe');
                  } else {
                    console.error('❌ Erreur ouverture fichier externe:', result?.error);
                  }
                }
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '80px',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                zIndex: 10001,
                fontSize: '13px',
                fontWeight: 600
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)';
              }}
              aria-label="Ouvrir avec lecteur externe"
              title="Ouvrir avec lecteur externe (recommandé pour MKV)"
            >
              <ExternalLink size={16} />
              <span>Externe</span>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              zIndex: 10001
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </>
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100vh' : 'auto',
          maxWidth: isFullscreen ? '100%' : '90vw',
          maxHeight: isFullscreen ? '100%' : '90vh',
          aspectRatio: isFullscreen ? 'auto' : '16/9',
          position: isFullscreen ? 'fixed' : 'relative',
          top: isFullscreen ? 0 : 'auto',
          left: isFullscreen ? 0 : 'auto',
          cursor: 'default',
          transition: 'all 0.3s'
        }}
      >
        {!isFullscreen && title && (
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: 0,
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              zIndex: 10002
            }}
          >
            {title}
          </div>
        )}
        {videoError ? (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10003,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '24px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <MediaErrorDisplay
              type="video"
              error={videoError}
              fileName={title || videoUrl?.split('/').pop()}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              cursor: isFullscreen && isCursorHidden ? 'none' : 'default'
            }}
            onMouseMove={(e) => {
              // Afficher l'overlay seulement en plein écran
              if (isFullscreen) {
                e.stopPropagation();

                // Réafficher le curseur et l'overlay
                setIsCursorHidden(false);
                setShowFullscreenOverlay(true);

                // Réinitialiser le timer pour l'overlay
                if (overlayTimeoutRef.current) {
                  clearTimeout(overlayTimeoutRef.current);
                }

                // Réinitialiser le timer pour le curseur
                if (cursorTimeoutRef.current) {
                  clearTimeout(cursorTimeoutRef.current);
                }

                // Masquer l'overlay après 3 secondes d'inactivité
                overlayTimeoutRef.current = setTimeout(() => {
                  setShowFullscreenOverlay(false);
                }, 3000);

                // Masquer le curseur après 2 secondes d'inactivité (après l'overlay)
                cursorTimeoutRef.current = setTimeout(() => {
                  setIsCursorHidden(true);
                }, 2000);
              }
            }}
            onMouseLeave={() => {
              // Masquer immédiatement quand la souris quitte la zone
              if (isFullscreen) {
                if (overlayTimeoutRef.current) {
                  clearTimeout(overlayTimeoutRef.current);
                  overlayTimeoutRef.current = null;
                }
                if (cursorTimeoutRef.current) {
                  clearTimeout(cursorTimeoutRef.current);
                  cursorTimeoutRef.current = null;
                }
                setShowFullscreenOverlay(false);
                setIsCursorHidden(false);
              }
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              onClick={(e) => {
                // Permettre le clic normal pour les contrôles, mais empêcher la fermeture du modal
                e.stopPropagation();
              }}
              onSeeked={(e) => {
                // Gérer le seeking pour les fichiers MKV en streaming (quand la recherche est terminée)
                const video = e.currentTarget;
                const currentTime = video.currentTime;

                // Si c'est une URL de streaming (MKV), reconstruire l'URL avec la position de départ
                if (videoUrl && videoUrl.startsWith('http://127.0.0.1:')) {
                  try {
                    const url = new URL(videoUrl);
                    const fileParam = url.searchParams.get('file');
                    const existingStart = url.searchParams.get('start');
                    const existingStartTime = existingStart ? parseFloat(existingStart) : 0;

                    // Ne mettre à jour que si la position a vraiment changé (éviter les mises à jour inutiles)
                    if (fileParam && Math.abs(currentTime - existingStartTime) > 2) {
                      // Si on cherche une position, mettre à jour l'URL avec le paramètre start
                      const newUrl = new URL(videoUrl);
                      newUrl.searchParams.set('start', currentTime.toFixed(2));

                      console.log(`⏩ [Streaming] Seeking à ${currentTime.toFixed(2)}s`);

                      // Sauvegarder la position pour éviter de perdre la progression
                      const wasPlaying = !video.paused;

                      // Charger la nouvelle URL
                      video.src = newUrl.toString();
                      video.load(); // Recharger la vidéo

                      // Attendre que la vidéo soit chargée avant de reprendre la lecture
                      video.addEventListener('loadeddata', () => {
                        video.currentTime = 0; // Commencer depuis le début de la nouvelle position
                        if (wasPlaying) {
                          video.play().catch(err => {
                            console.error('Erreur lecture après seeking:', err);
                          });
                        }
                      }, { once: true });
                    }
                  } catch (err) {
                    console.error('Erreur parsing URL streaming pour seeking:', err);
                  }
                }
              }}
              onError={(e) => {
                const video = e.currentTarget;
                const error = video.error;
                let errorMessage = 'Impossible de charger la vidéo.';

                if (error) {
                  switch (error.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                      errorMessage = 'Chargement de la vidéo interrompu.';
                      break;
                    case MediaError.MEDIA_ERR_NETWORK:
                      errorMessage = 'Erreur réseau lors du chargement de la vidéo.';
                      break;
                    case MediaError.MEDIA_ERR_DECODE:
                      errorMessage = 'Format vidéo non supporté ou fichier corrompu. Formats supportés : MP4, WebM, OGG, MOV, AVI, MKV';
                      break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                      errorMessage = 'Format vidéo non supporté. Formats supportés : MP4, WebM, OGG, MOV, AVI, MKV';
                      break;
                    default:
                      errorMessage = `Erreur lors du chargement de la vidéo (code ${error.code}).`;
                  }
                }

                setVideoError(errorMessage);
                console.error('Erreur vidéo:', error);
              }}
              style={{
                width: isFullscreen ? '100vw' : '100%',
                height: isFullscreen ? '100vh' : '100%',
                borderRadius: isFullscreen ? '0' : '8px',
                outline: 'none',
                objectFit: isFullscreen ? 'contain' : 'cover',
                transition: 'border-radius 0.3s, width 0.3s, height 0.3s'
              }}
            >
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
            {/* Overlay informatif en plein écran */}
            {isFullscreen && showFullscreenOverlay && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.85)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10005,
                  pointerEvents: 'none',
                  transition: 'opacity 0.3s ease-in-out',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                }}
              >
                <span>Appuyez sur <kbd style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 700
                }}>Échap</kbd> pour quitter le plein écran</span>
              </div>
            )}
            {/* Bouton plein écran personnalisé */}
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const result = await window.electronAPI.toggleFullscreen?.();
                  if (result?.success) {
                    setIsFullscreen(result.isFullScreen || false);
                  }
                } catch (error) {
                  console.error('Erreur toggle plein écran:', error);
                }
              }}
              style={{
                position: 'absolute',
                bottom: '60px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10003,
                transition: 'background 0.2s, opacity 0.3s',
                minWidth: '36px',
                minHeight: '36px',
                opacity: isFullscreen ? 0 : 1,
                pointerEvents: isFullscreen ? 'none' : 'auto'
              }}
              onMouseEnter={(e) => {
                if (!isFullscreen) {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isFullscreen) {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                }
              }}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
