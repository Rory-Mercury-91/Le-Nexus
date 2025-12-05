import { useCallback, useEffect, useState } from 'react';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

export function useAniListSettings() {
  const [anilistConnected, setAnilistConnected] = useState(false);
  const [anilistUser, setAnilistUser] = useState<any>(null);
  const [anilistLastSync, setAnilistLastSync] = useState<any>(null);
  const [anilistLastStatusSync, setAnilistLastStatusSync] = useState<any>(null);
  const [anilistStatusSyncing, setAnilistStatusSyncing] = useState(false);
  const [anilistAutoSyncEnabled, setAnilistAutoSyncEnabled] = useState(false);
  const [anilistAutoSyncInterval, setAnilistAutoSyncInterval] = useState(6);
  const [localImportStartTime, setLocalImportStartTime] = useState(0);

  // Utiliser le contexte global pour les progressions
  const {
    anilistSyncing,
    setAnilistSyncing,
    animeProgress,
    setAnimeProgress,
    mangaProgress,
    setMangaProgress,
    setImportStartTime: setGlobalImportStartTime
  } = useGlobalProgress();

  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  const loadAniListStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.anilistGetStatus();
      setAnilistConnected(status.connected);
      setAnilistUser(status.user);
      setAnilistLastSync(status.lastSync);
      setAnilistLastStatusSync(status.lastStatusSync || null);
    } catch (error) {
      console.error('Erreur chargement statut AniList:', error);
    }
  }, []);

  const loadAniListAutoSyncSettings = useCallback(async () => {
    try {
      const settings = await window.electronAPI.anilistGetAutoSyncSettings();
      setAnilistAutoSyncEnabled(settings.enabled);
      setAnilistAutoSyncInterval(settings.intervalHours);
    } catch (error) {
      console.error('Erreur chargement paramètres sync auto AniList:', error);
    }
  }, []);

  useEffect(() => {
    loadAniListStatus();
    loadAniListAutoSyncSettings();

    // Écouter les événements de progression AniList
    const unsubscribeAniListProgress = window.electronAPI.onAnilistSyncProgress?.((_event: any, progress: any) => {
      if (progress.type === 'anime') {
        setAnimeProgress({
          phase: 'anime',
          type: progress.type,
          total: progress.total,
          currentIndex: progress.current,
          imported: progress.imported || 0,
          updated: progress.updated || 0,
          errors: 0,
          skipped: 0,
          currentAnime: progress.item
        });
      } else if (progress.type === 'manga') {
        setMangaProgress({
          phase: 'manga',
          type: progress.type,
          total: progress.total,
          currentIndex: progress.current,
          imported: progress.imported || 0,
          updated: progress.updated || 0,
          errors: 0,
          skipped: 0,
          currentAnime: progress.item
        });
      }
    });

    // Écouter les événements de completion pour mettre à jour le statut AniList
    const unsubscribeAniListCompleted = window.electronAPI.onAnilistSyncCompleted?.((_event: any, _result: {
      mangas?: { created?: number; updated?: number };
      animes?: { created?: number; updated?: number };
    }) => {
      setAnilistSyncing(false);
      setAnimeProgress(null);
      setMangaProgress(null);
      loadAniListStatus();
    });

    const unsubscribeAniListError = window.electronAPI.onAnilistSyncError?.((_event: any, _data: any) => {
      setAnilistSyncing(false);
      setAnimeProgress(null);
      setMangaProgress(null);
    });

    return () => {
      if (unsubscribeAniListProgress) unsubscribeAniListProgress();
      if (unsubscribeAniListCompleted) unsubscribeAniListCompleted();
      if (unsubscribeAniListError) unsubscribeAniListError();
    };
  }, [loadAniListStatus, loadAniListAutoSyncSettings, setAnilistSyncing, setAnimeProgress, setMangaProgress]);

  const handleAnilistConnect = async () => {
    try {
      showToast({
        title: 'Connexion à AniList',
        message: 'Votre navigateur va s\'ouvrir pour autoriser l\'accès...',
        type: 'info'
      });

      const result = await window.electronAPI.anilistConnect();

      if (result.success) {
        showToast({
          title: 'Connecté !',
          message: `Bienvenue ${result.user?.name}`,
          type: 'success'
        });
        await loadAniListStatus();
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur de connexion',
        message: error.message || 'Impossible de se connecter à AniList',
        type: 'error'
      });
    }
  };

  const handleAnilistDisconnect = async () => {
    const confirmed = await confirm({
      title: 'Déconnexion AniList',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ? Les synchronisations automatiques seront désactivées.',
      confirmText: 'Déconnecter',
      cancelText: 'Annuler'
    });

    if (!confirmed) return;

    try {
      await window.electronAPI.anilistDisconnect();
      showToast({ title: 'Déconnecté', message: 'Vous êtes déconnecté d\'AniList', type: 'success' });
      await loadAniListStatus();
    } catch (error: any) {
      showToast({ title: 'Erreur', message: error.message || 'Impossible de se déconnecter', type: 'error' });
    }
  };

  const handleAnilistSyncNow = async () => {
    if (anilistSyncing) return;

    try {
      // Réinitialiser les progressions avant de démarrer une nouvelle synchronisation
      setAnimeProgress(null);
      setMangaProgress(null);
      const startTime = Date.now();
      setGlobalImportStartTime(startTime);
      setLocalImportStartTime(startTime);
      setAnilistSyncing(true);

      const result = await window.electronAPI.anilistSyncNow();

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
        await loadAniListStatus();
      } else if (result && result.requiresReconnect) {
        setAnilistSyncing(false);
        setAnimeProgress(null);
        setMangaProgress(null);
        showToast({
          title: 'Session expirée',
          message: result.error || 'Votre session AniList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadAniListStatus();
      }
    } catch (error: any) {
      setAnilistSyncing(false);
      setAnimeProgress(null);
      setMangaProgress(null);

      if (error.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401'))) {
        showToast({
          title: 'Session expirée',
          message: error.message || 'Votre session AniList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadAniListStatus();
      } else {
        showToast({
          title: 'Erreur de synchronisation',
          message: error.message || 'Impossible de synchroniser avec AniList',
          type: 'error'
        });
      }
    }
  };

  const handleAniListStatusSync = async () => {
    if (anilistStatusSyncing || anilistSyncing) return;
    if (!window.electronAPI.anilistSyncStatus) {
      showToast({
        title: 'Fonction indisponible',
        message: 'La synchronisation limitée aux statuts n\'est pas disponible.',
        type: 'error'
      });
      return;
    }

    try {
      setAnilistStatusSyncing(true);
      const result = await window.electronAPI.anilistSyncStatus();

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
        await loadAniListStatus();
      } else if (result && result.requiresReconnect) {
        showToast({
          title: 'Session expirée',
          message: result.error || 'Votre session AniList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadAniListStatus();
      }
    } catch (error: any) {
      if (error?.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401'))) {
        showToast({
          title: 'Session expirée',
          message: error.message || 'Votre session AniList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await loadAniListStatus();
      } else {
        showToast({
          title: 'Erreur de synchronisation',
          message: error?.message || 'Impossible de synchroniser les statuts',
          type: 'error'
        });
      }
    } finally {
      setAnilistStatusSyncing(false);
    }
  };

  const handleAnilistAutoSyncChange = async (enabled: boolean) => {
    const previousValue = anilistAutoSyncEnabled;
    setAnilistAutoSyncEnabled(enabled);
    try {
      await window.electronAPI.anilistSetAutoSync(enabled, anilistAutoSyncInterval);
      showToast({
        title: enabled ? 'Sync auto activée' : 'Sync auto désactivée',
        message: enabled ? `Synchronisation toutes les ${anilistAutoSyncInterval}h` : 'Les synchronisations automatiques sont désactivées',
        type: 'success'
      });
    } catch (error: any) {
      setAnilistAutoSyncEnabled(previousValue);
      showToast({ title: 'Erreur', message: error.message || 'Impossible de modifier les paramètres', type: 'error' });
    }
  };

  const handleAniListIntervalChange = async (intervalHours: number) => {
    const previousInterval = anilistAutoSyncInterval;
    setAnilistAutoSyncInterval(intervalHours);
    try {
      await window.electronAPI.anilistSetAutoSync(anilistAutoSyncEnabled, intervalHours);
    } catch (error: any) {
      setAnilistAutoSyncInterval(previousInterval);
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

  return {
    // State
    anilistConnected,
    anilistUser,
    anilistLastSync,
    anilistLastStatusSync,
    anilistSyncing,
    anilistStatusSyncing,
    anilistAutoSyncEnabled,
    anilistAutoSyncInterval,
    animeImportProgress: animeProgress,
    mangaImportProgress: mangaProgress,

    // Functions
    loadAniListStatus,
    handleAnilistConnect,
    handleAnilistDisconnect,
    handleAnilistSyncNow,
    handleAniListStatusSync,
    handleAnilistAutoSyncChange,
    handleAniListIntervalChange,

    // UI
    confirm,
    ConfirmDialog,
    showToast,
    ToastContainer
  };
}
