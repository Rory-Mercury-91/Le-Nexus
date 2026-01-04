import { useCallback, useEffect, useState } from 'react';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

type EnrichmentConfigData = {
  autoTranslate?: boolean;
  imageSource?: 'mal' | 'anilist' | 'tmdb';
  fields?: Record<string, boolean>;
  [key: string]: unknown;
};

export function useMalSettings() {
  const [malConnected, setMalConnected] = useState(false);
  const [malUser, setMalUser] = useState<any>(null);
  const [malLastSync, setMalLastSync] = useState<any>(null);
  const [malLastStatusSync, setMalLastStatusSync] = useState<any>(null);
  const [malStatusSyncing, setMalStatusSyncing] = useState(false);
  const [malAutoSyncEnabled, setMalAutoSyncEnabled] = useState(false);
  const [malAutoSyncInterval, setMalAutoSyncInterval] = useState(6);
  const [localImportStartTime, setLocalImportStartTime] = useState(0);

  // Utiliser le contexte global pour les progressions
  const {
    malSyncing,
    setMalSyncing,
    animeProgress,
    setAnimeProgress,
    mangaProgress,
    setMangaProgress,
    translating,
    setTranslating,
    translationProgress,
    setTranslationProgress,
    stoppingAnimeEnrichment,
    stoppingMangaEnrichment,
    setStopCallbacks,
    setImportStartTime: setGlobalImportStartTime
  } = useGlobalProgress();

  // Paramètres d'enrichissement
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [imageSource, setImageSource] = useState<'mal' | 'anilist' | 'tmdb'>('anilist');
  const [pausedAnimeEnrichment, setPausedAnimeEnrichment] = useState(false);
  const [pausedMangaEnrichment, setPausedMangaEnrichment] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  const loadMalStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.malGetStatus();
      setMalConnected(status.connected);
      setMalUser(status.user);
      setMalLastSync(status.lastSync);
      setMalLastStatusSync(status.lastStatusSync || null);
    } catch (error) {
      console.error('Erreur chargement statut MAL:', error);
    }
  }, []);

  const loadMalAutoSyncSettings = useCallback(async () => {
    try {
      const settings = await window.electronAPI.malGetAutoSyncSettings();
      setMalAutoSyncEnabled(settings.enabled);
      setMalAutoSyncInterval(settings.intervalHours);
    } catch (error) {
      console.error('Erreur chargement paramètres sync auto MAL:', error);
    }
  }, []);

  const loadEnrichmentSettings = useCallback(async () => {
    try {
      // Charger depuis la config anime (qui contient aussi imageSource)
      const animeConfig = (await window.electronAPI.getAnimeEnrichmentConfig?.()) as EnrichmentConfigData | undefined;
      const mangaConfig = (await window.electronAPI.getMangaEnrichmentConfig?.()) as EnrichmentConfigData | undefined;
      
      if (animeConfig) {
        setAutoTranslate(Boolean(animeConfig.autoTranslate));
        const source = animeConfig.imageSource || mangaConfig?.imageSource;
        if (source === 'mal' || source === 'anilist' || source === 'tmdb') {
          setImageSource(source);
        } else {
          setImageSource('anilist');
        }
      } else if (mangaConfig) {
        // Fallback sur mangaConfig si animeConfig n'existe pas
        setAutoTranslate(Boolean(mangaConfig.autoTranslate));
        const source = mangaConfig.imageSource;
        if (source === 'mal' || source === 'anilist' || source === 'tmdb') {
          setImageSource(source);
        } else {
          setImageSource('anilist');
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres enrichissement:', error);
    }
  }, []);

  const handleStopAnimeEnrichment = useCallback(async () => {
    if (stoppingAnimeEnrichment) return;
    setStopCallbacks({ stoppingAnimeEnrichment: true });
    try {
      const result = await window.electronAPI.stopAnimeEnrichment?.();
      if (!result?.success) {
        showToast({
          title: "Impossible d'arrêter",
          message: result?.error || 'Aucun enrichissement anime en cours',
          type: 'warning',
          duration: 4000
        });
      } else {
        showToast({
          title: '⏹️ Arrêt enrichissement anime',
          message: "La file en cours va s'interrompre sous peu.",
          type: 'info',
          duration: 3500
        });
      }
    } catch (error: any) {
      console.error('Erreur arrêt enrichissement anime:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || "Impossible d'arrêter l'enrichissement anime",
        type: 'error'
      });
    } finally {
      setStopCallbacks({ stoppingAnimeEnrichment: false });
    }
  }, [stoppingAnimeEnrichment, setStopCallbacks, showToast]);

  const handleStopMangaEnrichment = useCallback(async () => {
    if (stoppingMangaEnrichment) return;
    setStopCallbacks({ stoppingMangaEnrichment: true });
    try {
      const result = await window.electronAPI.stopMangaEnrichment?.();
      if (!result?.success) {
        showToast({
          title: "Impossible d'arrêter",
          message: result?.error || 'Aucun enrichissement manga en cours',
          type: 'warning',
          duration: 4000
        });
      } else {
        showToast({
          title: '⏹️ Arrêt enrichissement manga',
          message: "La file en cours va s'interrompre sous peu.",
          type: 'info',
          duration: 3500
        });
      }
    } catch (error: any) {
      console.error('Erreur arrêt enrichissement manga:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || "Impossible d'arrêter l'enrichissement manga",
        type: 'error'
      });
    } finally {
      setStopCallbacks({ stoppingMangaEnrichment: false });
    }
  }, [stoppingMangaEnrichment, setStopCallbacks, showToast]);

  const handlePauseAnimeEnrichment = useCallback(async () => {
    try {
      const result = await window.electronAPI.pauseAnimeEnrichment?.();
      if (!result?.success) {
        showToast({
          title: "Impossible de mettre en pause",
          message: result?.error || 'Aucun enrichissement anime en cours',
          type: 'warning',
          duration: 3000
        });
      } else {
        setPausedAnimeEnrichment(true);
      }
    } catch (error: any) {
      console.error('Erreur pause enrichissement anime:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || "Impossible de mettre en pause l'enrichissement anime",
        type: 'error'
      });
    }
  }, [showToast]);

  const handleResumeAnimeEnrichment = useCallback(async () => {
    try {
      const result = await window.electronAPI.resumeAnimeEnrichment?.();
      if (!result?.success) {
        showToast({
          title: "Impossible de reprendre",
          message: result?.error || 'Aucun enrichissement anime en pause',
          type: 'warning',
          duration: 3000
        });
      } else {
        setPausedAnimeEnrichment(false);
      }
    } catch (error: any) {
      console.error('Erreur reprise enrichissement anime:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || "Impossible de reprendre l'enrichissement anime",
        type: 'error'
      });
    }
  }, [showToast]);

  const handlePauseMangaEnrichment = useCallback(async () => {
    try {
      const result = await window.electronAPI.pauseMangaEnrichment?.();
      if (!result?.success) {
        showToast({
          title: "Impossible de mettre en pause",
          message: result?.error || 'Aucun enrichissement manga en cours',
          type: 'warning',
          duration: 3000
        });
      } else {
        setPausedMangaEnrichment(true);
      }
    } catch (error: any) {
      console.error('Erreur pause enrichissement manga:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || "Impossible de mettre en pause l'enrichissement manga",
        type: 'error'
      });
    }
  }, [showToast]);

  const handleResumeMangaEnrichment = useCallback(async () => {
    try {
      const result = await window.electronAPI.resumeMangaEnrichment?.();
      if (!result?.success) {
        showToast({
          title: "Impossible de reprendre",
          message: result?.error || 'Aucun enrichissement manga en pause',
          type: 'warning',
          duration: 3000
        });
      } else {
        setPausedMangaEnrichment(false);
      }
    } catch (error: any) {
      console.error('Erreur reprise enrichissement manga:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || "Impossible de reprendre l'enrichissement manga",
        type: 'error'
      });
    }
  }, [showToast]);

  useEffect(() => {
    loadMalStatus();
    loadMalAutoSyncSettings();
    loadEnrichmentSettings();

    // Écouter les événements de completion pour mettre à jour le statut MAL
    const unsubscribeMalCompleted = window.electronAPI.onMalSyncCompleted?.((_event: any, _result: {
      mangas?: { created?: number; updated?: number };
      animes?: { created?: number; updated?: number };
    }) => {
      // Mettre à jour le statut MAL après la synchronisation
      loadMalStatus();
    });

    // Écouter les événements d'enrichissement pour afficher les toasts
    const unsubscribeAnimeEnrichmentComplete = window.electronAPI.onAnimeEnrichmentComplete?.((_event: any, stats: EnrichmentStats) => {
      if (stats?.alreadyRunning) {
        return;
      }
      setPausedAnimeEnrichment(false); // Réinitialiser l'état de pause quand terminé
      if (stats?.cancelled) {
        showToast({
          title: '⏹️ Enrichissement anime interrompu',
          message: `${stats.enriched} anime(s) traités avant l\'arrêt${stats.errors > 0 ? ` • ${stats.errors} erreur(s)` : ''}`,
          type: 'info',
          duration: 4000
        });
        return;
      }
      if (stats.enriched > 0 || stats.errors > 0) {
        showToast({
          title: '✅ Enrichissement des animes terminé',
          message: `${stats.enriched} animes enrichis${stats.errors > 0 ? `, ${stats.errors} erreurs` : ''}`,
          type: stats.errors > 0 ? 'warning' : 'success',
          duration: 4000
        });
      }
    });

    const unsubscribeMangaEnrichmentComplete = window.electronAPI.onMangaEnrichmentComplete?.((_event: any, stats: EnrichmentStats) => {
      if (stats?.alreadyRunning) {
        return;
      }
      setPausedMangaEnrichment(false); // Réinitialiser l'état de pause quand terminé
      if (stats?.cancelled) {
        showToast({
          title: '⏹️ Enrichissement manga interrompu',
          message: `${stats.enriched} manga(s) traités avant l\'arrêt${stats.errors > 0 ? ` • ${stats.errors} erreur(s)` : ''}`,
          type: 'info',
          duration: 4000
        });
        return;
      }
      if (stats.enriched > 0 || stats.errors > 0) {
        showToast({
          title: '✅ Enrichissement des mangas terminé',
          message: `${stats.enriched} mangas enrichis${stats.errors > 0 ? `, ${stats.errors} erreurs` : ''}`,
          type: stats.errors > 0 ? 'warning' : 'success',
          duration: 4000
        });
      }
    });

    // Listeners pour la traduction des synopsis (pour les toasts)
    const unsubscribeTranslationCompleted = window.electronAPI.onMalTranslationCompleted?.((_event: any, result: any) => {
      showToast({
        title: '🎉 Traduction terminée !',
        message: `${result.translated}/${result.total} synopsis traduits en français`,
        type: 'success'
      });
    });

    const unsubscribeTranslationError = window.electronAPI.onMalTranslationError?.((_event: any, data: any) => {
      showToast({
        title: 'Erreur de traduction',
        message: data.error || 'Une erreur est survenue',
        type: 'error'
      });
    });

    // Enregistrer les callbacks d'arrêt/pause/reprise dans le contexte global
    setStopCallbacks({
      onStopAnimeEnrichment: handleStopAnimeEnrichment,
      onStopMangaEnrichment: handleStopMangaEnrichment,
      onPauseAnimeEnrichment: handlePauseAnimeEnrichment,
      onResumeAnimeEnrichment: handleResumeAnimeEnrichment,
      onPauseMangaEnrichment: handlePauseMangaEnrichment,
      onResumeMangaEnrichment: handleResumeMangaEnrichment,
      stoppingAnimeEnrichment: stoppingAnimeEnrichment,
      stoppingMangaEnrichment: stoppingMangaEnrichment,
      pausedAnimeEnrichment: pausedAnimeEnrichment,
      pausedMangaEnrichment: pausedMangaEnrichment
    });

    return () => {
      if (unsubscribeMalCompleted) unsubscribeMalCompleted();
      if (unsubscribeTranslationCompleted) unsubscribeTranslationCompleted();
      if (unsubscribeTranslationError) unsubscribeTranslationError();
      if (unsubscribeAnimeEnrichmentComplete) unsubscribeAnimeEnrichmentComplete();
      if (unsubscribeMangaEnrichmentComplete) unsubscribeMangaEnrichmentComplete();
    };
  }, [showToast, setStopCallbacks, stoppingAnimeEnrichment, stoppingMangaEnrichment, pausedAnimeEnrichment, pausedMangaEnrichment, loadMalStatus, loadMalAutoSyncSettings, loadEnrichmentSettings, handleStopAnimeEnrichment, handleStopMangaEnrichment, handlePauseAnimeEnrichment, handleResumeAnimeEnrichment, handlePauseMangaEnrichment, handleResumeMangaEnrichment]);

  const handleAutoTranslateChange = async (enabled: boolean) => {
    setAutoTranslate(enabled);
    try {
      // Mettre à jour les deux configs (anime et manga)
      const animeConfig = (await window.electronAPI.getAnimeEnrichmentConfig?.()) as EnrichmentConfigData | undefined;
      const mangaConfig = (await window.electronAPI.getMangaEnrichmentConfig?.()) as EnrichmentConfigData | undefined;

      if (animeConfig) {
        await window.electronAPI.saveAnimeEnrichmentConfig?.({
          ...(animeConfig || {}),
          autoTranslate: enabled
        });
      }

      if (mangaConfig) {
        await window.electronAPI.saveMangaEnrichmentConfig?.({
          ...(mangaConfig || {}),
          autoTranslate: enabled
        });
      }
    } catch (error) {
      console.error('Erreur sauvegarde traduction automatique:', error);
    }
  };

  const handleImageSourceChange = async (source: 'mal' | 'anilist' | 'tmdb') => {
    setImageSource(source);
    try {
      // Mettre à jour les deux configs (anime et manga)
      const animeConfig = (await window.electronAPI.getAnimeEnrichmentConfig?.()) as EnrichmentConfigData | undefined;
      const mangaConfig = (await window.electronAPI.getMangaEnrichmentConfig?.()) as EnrichmentConfigData | undefined;

      if (animeConfig) {
        await window.electronAPI.saveAnimeEnrichmentConfig?.({
          ...(animeConfig || {}),
          imageSource: source
        });
      }

      if (mangaConfig) {
        await window.electronAPI.saveMangaEnrichmentConfig?.({
          ...(mangaConfig || {}),
          imageSource: source
        });
      }
    } catch (error) {
      console.error('Erreur sauvegarde source image:', error);
    }
  };

  const handleMalConnect = async () => {
    try {
      showToast({
        title: 'Connexion à MyAnimeList',
        message: 'Votre navigateur va s\'ouvrir pour autoriser l\'accès...',
        type: 'info'
      });

      const result = await window.electronAPI.malConnect();

      if (result.success) {
        showToast({
          title: 'Connecté !',
          message: `Bienvenue ${result.user?.name}`,
          type: 'success'
        });
        await loadMalStatus();
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur de connexion',
        message: error.message || 'Impossible de se connecter à MyAnimeList',
        type: 'error'
      });
    }
  };

  const handleMalDisconnect = async () => {
    const confirmed = await confirm({
      title: 'Déconnexion MyAnimeList',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ? Les synchronisations automatiques seront désactivées.',
      confirmText: 'Déconnecter',
      cancelText: 'Annuler'
    });

    if (!confirmed) return;

    try {
      await window.electronAPI.malDisconnect();
      showToast({ title: 'Déconnecté', message: 'Vous êtes déconnecté de MyAnimeList', type: 'success' });
      await loadMalStatus();
    } catch (error: any) {
      showToast({ title: 'Erreur', message: error.message || 'Impossible de se déconnecter', type: 'error' });
    }
  };

  const handleMalSyncNow = async () => {
    if (malSyncing) return;

    try {
      // Réinitialiser les progressions avant de démarrer une nouvelle synchronisation
      setAnimeProgress(null);
      setMangaProgress(null);
      // Utiliser setImportStartTime du contexte global
      const startTime = Date.now();
      setGlobalImportStartTime(startTime);
      setLocalImportStartTime(startTime);
      // Mettre malSyncing à true IMMÉDIATEMENT pour que le footer s'affiche
      setMalSyncing(true);

      const result = await window.electronAPI.malSyncNow();

      // Note: setMalSyncing(false) est géré dans onMalSyncCompleted
      // pour permettre à l'overlay de se fermer automatiquement après affichage des résultats

      if (result && result.success) {
        const totalCreated = (result.mangas?.created || 0) + (result.animes?.created || 0);
        const totalUpdated = (result.mangas?.updated || 0) + (result.animes?.updated || 0);

        const elapsedTime = localImportStartTime > 0 ? Math.round((Date.now() - localImportStartTime) / 1000) : null;
        const durationText = elapsedTime ? ` | ⏱️ ${elapsedTime}s` : '';

        showToast({
          title: 'Synchronisation réussie !',
          message: `✅ ${totalCreated} créés | ${totalUpdated} mis à jour${durationText}`,
          type: 'success'
        });
        await loadMalStatus();
      } else if (result && result.requiresReconnect) {
        // Si erreur de session, fermer immédiatement l'overlay
        setMalSyncing(false);
        setAnimeProgress(null);
        setMangaProgress(null);
        showToast({
          title: 'Session expirée',
          message: result.error || 'Votre session MyAnimeList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadMalStatus();
      }
    } catch (error: any) {
      // En cas d'erreur, fermer immédiatement l'overlay
      setMalSyncing(false);
      setAnimeProgress(null);
      setMangaProgress(null);

      if (error.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401'))) {
        showToast({
          title: 'Session expirée',
          message: error.message || 'Votre session MyAnimeList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadMalStatus();
      } else {
        showToast({
          title: 'Erreur de synchronisation',
          message: error.message || 'Impossible de synchroniser avec MyAnimeList',
          type: 'error'
        });
      }
    }
  };

  const handleMalStatusSync = async () => {
    if (malStatusSyncing || malSyncing) return;
    if (!window.electronAPI.malSyncStatus) {
      showToast({
        title: 'Fonction indisponible',
        message: 'La synchronisation limitée aux statuts n’est pas disponible.',
        type: 'error'
      });
      return;
    }

    try {
      setMalStatusSyncing(true);
      const result = await window.electronAPI.malSyncStatus();

      if (result && result.success) {
        const mangasUpdated = result.mangas?.updated ?? 0;
        const animesUpdated = result.animes?.updated ?? 0;
        const missingMangas = result.mangas?.missing ?? 0;
        const missingAnimes = result.animes?.missing ?? 0;

        const parts = [];
        if (mangasUpdated > 0) {
          parts.push(`📚 ${mangasUpdated} manga(s)`);
        }
        if (animesUpdated > 0) {
          parts.push(`🎬 ${animesUpdated} anime(s)`);
        }
        if (parts.length === 0) {
          parts.push('Aucune progression mise à jour');
        }

        const missingDetails = [];
        if (missingMangas > 0) {
          missingDetails.push(`${missingMangas} manga(s) absents de la base`);
        }
        if (missingAnimes > 0) {
          missingDetails.push(`${missingAnimes} anime(s) absents de la base`);
        }

        showToast({
          title: 'Statuts synchronisés',
          message: `${parts.join(' | ')}${missingDetails.length ? ` • ${missingDetails.join(' | ')}` : ''}`,
          type: 'success'
        });
        await loadMalStatus();
      } else if (result && result.requiresReconnect) {
        showToast({
          title: 'Session expirée',
          message: result.error || 'Votre session MyAnimeList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadMalStatus();
      }
    } catch (error: any) {
      if (error?.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401'))) {
        showToast({
          title: 'Session expirée',
          message: error.message || 'Votre session MyAnimeList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadMalStatus();
      } else {
        showToast({
          title: 'Erreur de synchronisation',
          message: error?.message || 'Impossible de synchroniser les statuts',
          type: 'error'
        });
      }
    } finally {
      setMalStatusSyncing(false);
    }
  };

  const handleMalTranslateSynopsis = async () => {
    if (translating) return;

    try {
      setTranslating(true);
      setTranslationProgress(null);

      const result = await window.electronAPI.malTranslateSynopsis();

      if (result.translated !== undefined) {
        showToast({
          title: 'Traduction terminée !',
          message: `✅ ${result.translated} synopsis traduits | ⏭️ ${result.skipped} ignorés`,
          type: 'success'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur de traduction',
        message: error.message || 'Impossible de traduire les synopsis',
        type: 'error'
      });
    } finally {
      setTranslating(false);
      setTranslationProgress(null);
    }
  };

  const handleMalAutoSyncChange = async (enabled: boolean) => {
    const previousValue = malAutoSyncEnabled;
    setMalAutoSyncEnabled(enabled);
    try {
      await window.electronAPI.malSetAutoSync(enabled, malAutoSyncInterval);
      showToast({
        title: enabled ? 'Sync auto activée' : 'Sync auto désactivée',
        message: enabled ? `Synchronisation toutes les ${malAutoSyncInterval}h` : 'Les synchronisations automatiques sont désactivées',
        type: 'success'
      });
    } catch (error: any) {
      setMalAutoSyncEnabled(previousValue);
      showToast({ title: 'Erreur', message: error.message || 'Impossible de modifier les paramètres', type: 'error' });
    }
  };

  const handleMalIntervalChange = async (intervalHours: number) => {
    const previousInterval = malAutoSyncInterval;
    setMalAutoSyncInterval(intervalHours);
    try {
      await window.electronAPI.malSetAutoSync(malAutoSyncEnabled, intervalHours);
    } catch (error: any) {
      setMalAutoSyncInterval(previousInterval);
      const message = error?.message || 'Impossible de modifier la fréquence';
      showToast({
        title: 'Erreur',
        message,
        type: 'error'
      });
      const normalizedError = error instanceof Error ? error : new Error(message);
      (normalizedError as any).__handled = true;
      throw normalizedError;
    }
  };

  // Enregistrer les callbacks dans le contexte global
  useEffect(() => {
    setStopCallbacks({
      onStopAnimeEnrichment: handleStopAnimeEnrichment,
      onStopMangaEnrichment: handleStopMangaEnrichment
    });
  }, [setStopCallbacks]);

  return {
    // State
    malConnected,
    malUser,
    malLastSync,
    malLastStatusSync,
    malSyncing,
    malStatusSyncing,
    malAutoSyncEnabled,
    malAutoSyncInterval,
    translating,
    translationProgress,
    animeImportProgress: animeProgress,
    mangaImportProgress: mangaProgress,
    stoppingAnimeEnrichment,
    stoppingMangaEnrichment,
    autoTranslate,
    imageSource,

    // Functions
    loadMalStatus,
    handleMalConnect,
    handleMalDisconnect,
    handleMalSyncNow,
    handleMalStatusSync,
    handleMalTranslateSynopsis,
    handleMalAutoSyncChange,
    handleMalIntervalChange,
    handleStopAnimeEnrichment,
    handleStopMangaEnrichment,
    handlePauseAnimeEnrichment,
    handleResumeAnimeEnrichment,
    handlePauseMangaEnrichment,
    handleResumeMangaEnrichment,
    handleAutoTranslateChange,
    handleImageSourceChange,

    // UI
    confirm,
    ConfirmDialog,
    showToast,
    ToastContainer
  };
}
