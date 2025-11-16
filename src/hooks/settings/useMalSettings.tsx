import { useEffect, useState } from 'react';
import { AnimeImportProgress } from '../../types';
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
  const [malSyncing, setMalSyncing] = useState(false);
  const [malStatusSyncing, setMalStatusSyncing] = useState(false);
  const [malAutoSyncEnabled, setMalAutoSyncEnabled] = useState(false);
  const [malAutoSyncInterval, setMalAutoSyncInterval] = useState(6);

  // Traduction des synopsis
  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{
    current: number;
    total: number;
    translated: number;
    skipped: number;
    currentAnime: string;
  } | null>(null);

  const [animeImportProgress, setAnimeImportProgress] = useState<AnimeImportProgress | null>(null);
  const [mangaImportProgress, setMangaImportProgress] = useState<AnimeImportProgress | null>(null);
  const [importStartTime, setImportStartTime] = useState<number>(0);
  const [stoppingAnimeEnrichment, setStoppingAnimeEnrichment] = useState(false);
  const [stoppingMangaEnrichment, setStoppingMangaEnrichment] = useState(false);

  // Paramètres d'enrichissement
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [imageSource, setImageSource] = useState<'mal' | 'anilist' | 'tmdb'>('anilist');

  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    loadMalStatus();
    loadMalAutoSyncSettings();
    loadEnrichmentSettings();

    // Écouter les mises à jour de progression MAL sync
    const unsubscribeMal = window.electronAPI.onMalSyncProgress?.((_event: any, progress: {
      type: 'anime' | 'manga';
      total: number;
      current: number;
      imported?: number;
      updated?: number;
      item: string;
      elapsedMs?: number;
      etaMs?: number;
      speed?: number;
    }) => {
      const progressData: AnimeImportProgress = {
        phase: 'anime',
        type: progress.type,
        total: progress.total,
        currentIndex: progress.current,
        imported: progress.imported || 0,
        updated: progress.updated || 0,
        skipped: 0,
        errors: 0,
        currentAnime: progress.item,
        elapsedMs: progress.elapsedMs || (importStartTime > 0 && importStartTime < Date.now() ? Date.now() - importStartTime : undefined),
        etaMs: progress.etaMs || undefined,
        speed: progress.speed || undefined
      };

      if (progress.type === 'manga') {
        setMangaImportProgress(progressData);
      } else {
        setAnimeImportProgress(progressData);
      }
    });

    const unsubscribeMalCompleted = window.electronAPI.onMalSyncCompleted?.((_event: any, result: {
      mangas?: { created?: number; updated?: number };
      animes?: { created?: number; updated?: number };
    }) => {
      // Mettre à jour les progressions finales
      if (result.mangas) {
        const mangasData = result.mangas;
        setMangaImportProgress((prev) => prev ? {
          ...prev,
          imported: mangasData.created || 0,
          updated: mangasData.updated || 0,
          phase: 'complete'
        } : null);
      }
      if (result.animes) {
        const animesData = result.animes;
        setAnimeImportProgress((prev) => prev ? {
          ...prev,
          imported: animesData.created || 0,
          updated: animesData.updated || 0,
          phase: 'complete'
        } : null);
      }

      // Fermer la bannière rapidement après la synchronisation
      // L'enrichissement se fera en arrière-plan avec des notifications
      setTimeout(() => {
        setMalSyncing(false);
        setAnimeImportProgress(null);
        setMangaImportProgress(null);
      }, 500); // 0.5 secondes pour voir les résultats finaux
    });

    // Écouter les événements d'enrichissement pour afficher la progression
    const unsubscribeAnimeEnrichment = window.electronAPI.onAnimeEnrichmentProgress?.((_event: any, progress: {
      current: number;
      total: number;
      item: string;
      elapsedMs?: number;
      etaMs?: number;
      speed?: number;
      processed?: number;
      enriched?: number;
      errors?: number;
    }) => {
      // Mettre à jour la progression d'enrichissement des animes
      const progressData: AnimeImportProgress = {
        phase: 'anime',
        type: 'anime-enrichment', // Type distinct pour l'enrichissement
        total: progress.total,
        currentIndex: progress.current,
        imported: progress.enriched || 0,
        updated: progress.processed || 0,
        skipped: 0,
        errors: progress.errors || 0,
        currentAnime: progress.item,
        elapsedMs: progress.elapsedMs,
        etaMs: progress.etaMs,
        speed: progress.speed
      };
      setAnimeImportProgress(progressData);
    });

    const unsubscribeAnimeEnrichmentComplete = window.electronAPI.onAnimeEnrichmentComplete?.((_event: any, stats: EnrichmentStats) => {
      setAnimeImportProgress(null);
      if (stats?.alreadyRunning) {
        return;
      }
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

    const unsubscribeMangaEnrichment = window.electronAPI.onMangaEnrichmentProgress?.((_event: any, progress: {
      current: number;
      total: number;
      item: string;
      elapsedMs?: number;
      etaMs?: number;
      speed?: number;
      processed?: number;
      enriched?: number;
      errors?: number;
    }) => {
      // Mettre à jour la progression d'enrichissement des mangas
      const progressData: AnimeImportProgress = {
        phase: 'manga',
        type: 'manga-enrichment', // Type distinct pour l'enrichissement
        total: progress.total,
        currentIndex: progress.current,
        imported: progress.enriched || 0,
        updated: progress.processed || 0,
        skipped: 0,
        errors: progress.errors || 0,
        currentAnime: progress.item,
        elapsedMs: progress.elapsedMs,
        etaMs: progress.etaMs,
        speed: progress.speed
      };
      setMangaImportProgress(progressData);
    });

    const unsubscribeMangaEnrichmentComplete = window.electronAPI.onMangaEnrichmentComplete?.((_event: any, stats: EnrichmentStats) => {
      setMangaImportProgress(null);
      if (stats?.alreadyRunning) {
        return;
      }
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

    // Listeners pour la traduction des synopsis
    const unsubscribeTranslationStarted = window.electronAPI.onMalTranslationStarted?.(() => {
      setTranslating(true);
      setTranslationProgress(null);
    });

    const unsubscribeTranslationProgress = window.electronAPI.onMalTranslationProgress?.((_event: any, progress: any) => {
      setTranslationProgress(progress);
    });

    const unsubscribeTranslationCompleted = window.electronAPI.onMalTranslationCompleted?.((_event: any, result: any) => {
      setTranslating(false);
      setTranslationProgress(null);
      showToast({
        title: '🎉 Traduction terminée !',
        message: `${result.translated}/${result.total} synopsis traduits en français`,
        type: 'success'
      });
    });

    const unsubscribeTranslationError = window.electronAPI.onMalTranslationError?.((_event: any, data: any) => {
      setTranslating(false);
      setTranslationProgress(null);
      showToast({
        title: 'Erreur de traduction',
        message: data.error || 'Une erreur est survenue',
        type: 'error'
      });
    });

    return () => {
      if (unsubscribeMal) unsubscribeMal();
      if (unsubscribeMalCompleted) unsubscribeMalCompleted();
      if (unsubscribeTranslationStarted) unsubscribeTranslationStarted();
      if (unsubscribeTranslationProgress) unsubscribeTranslationProgress();
      if (unsubscribeTranslationCompleted) unsubscribeTranslationCompleted();
      if (unsubscribeTranslationError) unsubscribeTranslationError();
      if (unsubscribeAnimeEnrichment) unsubscribeAnimeEnrichment();
      if (unsubscribeAnimeEnrichmentComplete) unsubscribeAnimeEnrichmentComplete();
      if (unsubscribeMangaEnrichment) unsubscribeMangaEnrichment();
      if (unsubscribeMangaEnrichmentComplete) unsubscribeMangaEnrichmentComplete();
    };
  }, [importStartTime, showToast]);

  const loadMalStatus = async () => {
    try {
      const status = await window.electronAPI.malGetStatus();
      setMalConnected(status.connected);
      setMalUser(status.user);
      setMalLastSync(status.lastSync);
      setMalLastStatusSync(status.lastStatusSync || null);
    } catch (error) {
      console.error('Erreur chargement statut MAL:', error);
    }
  };

  const loadMalAutoSyncSettings = async () => {
    try {
      const settings = await window.electronAPI.malGetAutoSyncSettings();
      setMalAutoSyncEnabled(settings.enabled);
      setMalAutoSyncInterval(settings.intervalHours);
    } catch (error) {
      console.error('Erreur chargement paramètres sync auto MAL:', error);
    }
  };

  const loadEnrichmentSettings = async () => {
    try {
      // Charger depuis la config anime (qui contient aussi imageSource)
      const animeConfig = (await window.electronAPI.getAnimeEnrichmentConfig?.()) as EnrichmentConfigData | undefined;
      if (animeConfig) {
        setAutoTranslate(Boolean(animeConfig.autoTranslate));
        const source = animeConfig.imageSource;
        if (source === 'mal' || source === 'anilist' || source === 'tmdb') {
          setImageSource(source);
        } else {
          setImageSource('anilist');
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres enrichissement:', error);
    }
  };

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
      const animeConfig = (await window.electronAPI.getAnimeEnrichmentConfig?.()) as EnrichmentConfigData | undefined;
      if (animeConfig) {
        await window.electronAPI.saveAnimeEnrichmentConfig?.({
          ...(animeConfig || {}),
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
      setMalSyncing(true);
      setAnimeImportProgress(null);
      setMangaImportProgress(null);
      setImportStartTime(Date.now());

      const result = await window.electronAPI.malSyncNow();

      // Note: setMalSyncing(false) est géré dans onMalSyncCompleted
      // pour permettre à l'overlay de se fermer automatiquement après affichage des résultats

      if (result && result.success) {
        const totalCreated = (result.mangas?.created || 0) + (result.animes?.created || 0);
        const totalUpdated = (result.mangas?.updated || 0) + (result.animes?.updated || 0);

        const elapsedTime = importStartTime > 0 ? Math.round((Date.now() - importStartTime) / 1000) : null;
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
        setAnimeImportProgress(null);
        setMangaImportProgress(null);
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
      setAnimeImportProgress(null);
      setMangaImportProgress(null);

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

  const handleStopAnimeEnrichment = async () => {
    if (stoppingAnimeEnrichment) return;
    setStoppingAnimeEnrichment(true);
    try {
      const result = await window.electronAPI.stopAnimeEnrichment?.();
      if (!result?.success) {
        showToast({
          title: 'Impossible d’arrêter',
          message: result?.error || 'Aucun enrichissement anime en cours',
          type: 'warning',
          duration: 4000
        });
      } else {
        showToast({
          title: '⏹️ Arrêt enrichissement anime',
          message: 'La file en cours va s’interrompre sous peu.',
          type: 'info',
          duration: 3500
        });
      }
    } catch (error: any) {
      console.error('Erreur arrêt enrichissement anime:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible d’arrêter l’enrichissement anime',
        type: 'error'
      });
    } finally {
      setStoppingAnimeEnrichment(false);
    }
  };

  const handleStopMangaEnrichment = async () => {
    if (stoppingMangaEnrichment) return;
    setStoppingMangaEnrichment(true);
    try {
      const result = await window.electronAPI.stopMangaEnrichment?.();
      if (!result?.success) {
        showToast({
          title: 'Impossible d’arrêter',
          message: result?.error || 'Aucun enrichissement manga en cours',
          type: 'warning',
          duration: 4000
        });
      } else {
        showToast({
          title: '⏹️ Arrêt enrichissement manga',
          message: 'La file en cours va s’interrompre sous peu.',
          type: 'info',
          duration: 3500
        });
      }
    } catch (error: any) {
      console.error('Erreur arrêt enrichissement manga:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible d’arrêter l’enrichissement manga',
        type: 'error'
      });
    } finally {
      setStoppingMangaEnrichment(false);
    }
  };

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
    animeImportProgress,
    mangaImportProgress,
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
    handleAutoTranslateChange,
    handleImageSourceChange,

    // UI
    confirm,
    ConfirmDialog,
    showToast,
    ToastContainer
  };
}
