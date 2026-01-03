import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimeImportProgress } from '../types';

export interface TranslationProgress {
  current: number;
  total: number;
  translated: number;
  skipped: number;
  currentAnime: string;
}

export interface AdulteGameUpdateProgress {
  phase: 'start' | 'sheet' | 'scraping' | 'complete' | 'error';
  total: number;
  current: number;
  message: string;
  gameTitle?: string;
  updated?: number;
  sheetSynced?: number;
  elapsedMs?: number;
  etaMs?: number;
  speed?: number;
}

export interface CloudSyncProgress {
  phase: 'start' | 'upload' | 'upload-covers' | 'download-db' | 'download-covers' | 'complete';
  current: number;
  total: number;
  percentage: number;
  message?: string;
  item?: string;
  results?: {
    upload?: boolean;
    downloadsCount?: number;
    coversDownloaded?: number;
  };
}

interface GlobalProgressState {
  // Synchronisation MAL
  malSyncing: boolean;
  animeProgress: AnimeImportProgress | null;
  mangaProgress: AnimeImportProgress | null;

  // Synchronisation AniList
  anilistSyncing: boolean;

  // Traduction
  translating: boolean;
  translationProgress: TranslationProgress | null;

  // Jeux adultes
  adulteGameUpdating: boolean;
  adulteGameProgress: AdulteGameUpdateProgress | null;

  // Synchronisation Cloud
  cloudSyncing: boolean;
  cloudSyncProgress: CloudSyncProgress | null;

  // Callbacks pour arrêter/pause/reprise les opérations
  onStopAnimeEnrichment?: () => void | Promise<void>;
  onStopMangaEnrichment?: () => void | Promise<void>;
  onPauseAnimeEnrichment?: () => void | Promise<void>;
  onResumeAnimeEnrichment?: () => void | Promise<void>;
  onPauseMangaEnrichment?: () => void | Promise<void>;
  onResumeMangaEnrichment?: () => void | Promise<void>;
  onStopAdulteGameUpdatesCheck?: () => void | Promise<void>;
  onPauseAdulteGameUpdatesCheck?: () => void | Promise<void>;
  onResumeAdulteGameUpdatesCheck?: () => void | Promise<void>;
  stoppingAnimeEnrichment?: boolean;
  stoppingMangaEnrichment?: boolean;
  pausedAnimeEnrichment?: boolean;
  pausedMangaEnrichment?: boolean;
  stoppingAdulteGameUpdatesCheck?: boolean;
  pausedAdulteGameUpdatesCheck?: boolean;
}

interface GlobalProgressContextType extends GlobalProgressState {
  setMalSyncing: (syncing: boolean) => void;
  setAnimeProgress: (progress: AnimeImportProgress | null | ((prev: AnimeImportProgress | null) => AnimeImportProgress | null)) => void;
  setMangaProgress: (progress: AnimeImportProgress | null | ((prev: AnimeImportProgress | null) => AnimeImportProgress | null)) => void;
  setAnilistSyncing: (syncing: boolean) => void;
  setTranslating: (translating: boolean) => void;
  setTranslationProgress: (progress: TranslationProgress | null) => void;
  setAdulteGameUpdating: (updating: boolean) => void;
  setAdulteGameProgress: (progress: AdulteGameUpdateProgress | null) => void;
  setCloudSyncing: (syncing: boolean) => void;
  setCloudSyncProgress: (progress: CloudSyncProgress | null) => void;
  isProgressCollapsed: boolean;
  setIsProgressCollapsed: (collapsed: boolean) => void;
  setStopCallbacks: (callbacks: {
    onStopAnimeEnrichment?: () => void | Promise<void>;
    onStopMangaEnrichment?: () => void | Promise<void>;
    onPauseAnimeEnrichment?: () => void | Promise<void>;
    onResumeAnimeEnrichment?: () => void | Promise<void>;
    onPauseMangaEnrichment?: () => void | Promise<void>;
    onResumeMangaEnrichment?: () => void | Promise<void>;
    onStopAdulteGameUpdatesCheck?: () => void | Promise<void>;
    onPauseAdulteGameUpdatesCheck?: () => void | Promise<void>;
    onResumeAdulteGameUpdatesCheck?: () => void | Promise<void>;
    stoppingAnimeEnrichment?: boolean;
    stoppingMangaEnrichment?: boolean;
    pausedAnimeEnrichment?: boolean;
    pausedMangaEnrichment?: boolean;
    stoppingAdulteGameUpdatesCheck?: boolean;
    pausedAdulteGameUpdatesCheck?: boolean;
  }) => void;
  setImportStartTime: (time: number) => void;
  hasActiveOperation: () => boolean;
}

const GlobalProgressContext = createContext<GlobalProgressContextType | undefined>(undefined);

export function GlobalProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalProgressState>({
    malSyncing: false,
    animeProgress: null,
    mangaProgress: null,
    anilistSyncing: false,
    translating: false,
    translationProgress: null,
    adulteGameUpdating: false,
    adulteGameProgress: null,
    cloudSyncing: false,
    cloudSyncProgress: null
  });

  // État pour le collapse du header de progression
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);

  // Référence pour stocker le temps de début de synchronisation MAL
  const importStartTimeRef = useRef<number>(0);

  // Références pour stocker les timeouts de fermeture automatique
  const animeCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mangaCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mihonImportTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setMalSyncing = useCallback((syncing: boolean) => {
    setState(prev => ({ ...prev, malSyncing: syncing }));
  }, []);

  const setAnilistSyncing = useCallback((syncing: boolean) => {
    setState(prev => ({ ...prev, anilistSyncing: syncing }));
  }, []);

  const setAnimeProgress = useCallback((progress: AnimeImportProgress | null | ((prev: AnimeImportProgress | null) => AnimeImportProgress | null)) => {
    setState(prev => ({
      ...prev,
      animeProgress: typeof progress === 'function' ? progress(prev.animeProgress) : progress
    }));
  }, []);

  const setMangaProgress = useCallback((progress: AnimeImportProgress | null | ((prev: AnimeImportProgress | null) => AnimeImportProgress | null)) => {
    setState(prev => ({
      ...prev,
      mangaProgress: typeof progress === 'function' ? progress(prev.mangaProgress) : progress
    }));
  }, []);

  const setTranslating = useCallback((translating: boolean) => {
    setState(prev => ({ ...prev, translating }));
  }, []);

  const setTranslationProgress = useCallback((progress: TranslationProgress | null) => {
    setState(prev => ({ ...prev, translationProgress: progress }));
  }, []);

  const setAdulteGameUpdating = useCallback((updating: boolean) => {
    setState(prev => ({ ...prev, adulteGameUpdating: updating }));
  }, []);

  const setCloudSyncing = useCallback((syncing: boolean) => {
    setState(prev => ({ ...prev, cloudSyncing: syncing }));
  }, []);

  const setCloudSyncProgress = useCallback((progress: CloudSyncProgress | null) => {
    setState(prev => ({ ...prev, cloudSyncProgress: progress }));
  }, []);

  const setAdulteGameProgress = useCallback((progress: AdulteGameUpdateProgress | null) => {
    setState(prev => ({ ...prev, adulteGameProgress: progress }));
  }, []);

  const setStopCallbacks = useCallback((callbacks: {
    onStopAnimeEnrichment?: () => void | Promise<void>;
    onStopMangaEnrichment?: () => void | Promise<void>;
    onPauseAnimeEnrichment?: () => void | Promise<void>;
    onResumeAnimeEnrichment?: () => void | Promise<void>;
    onPauseMangaEnrichment?: () => void | Promise<void>;
    onResumeMangaEnrichment?: () => void | Promise<void>;
    onStopAdulteGameUpdatesCheck?: () => void | Promise<void>;
    onPauseAdulteGameUpdatesCheck?: () => void | Promise<void>;
    onResumeAdulteGameUpdatesCheck?: () => void | Promise<void>;
    stoppingAnimeEnrichment?: boolean;
    stoppingMangaEnrichment?: boolean;
    pausedAnimeEnrichment?: boolean;
    pausedMangaEnrichment?: boolean;
    stoppingAdulteGameUpdatesCheck?: boolean;
    pausedAdulteGameUpdatesCheck?: boolean;
  }) => {
    setState(prev => ({ ...prev, ...callbacks }));
  }, []);

  const hasActiveOperation = useCallback(() => {
    return state.malSyncing ||
      state.anilistSyncing ||
      state.animeProgress !== null ||
      state.mangaProgress !== null ||
      state.translating ||
      state.adulteGameUpdating ||
      state.cloudSyncing ||
      state.cloudSyncProgress !== null;
  }, [state.malSyncing, state.anilistSyncing, state.animeProgress, state.mangaProgress, state.translating, state.adulteGameUpdating, state.cloudSyncing, state.cloudSyncProgress]);

  // Fonction pour définir le temps de début de synchronisation MAL
  const setImportStartTime = useCallback((time: number) => {
    importStartTimeRef.current = time;
  }, []);

  // États locaux pour pause/stop des vérifications de mises à jour jeux adultes
  const [stoppingAdulteGameUpdatesCheck, setStoppingAdulteGameUpdatesCheck] = useState(false);
  const [pausedAdulteGameUpdatesCheck, setPausedAdulteGameUpdatesCheck] = useState(false);

  // Handlers pour pause/resume/stop des vérifications de mises à jour jeux adultes
  const handleStopAdulteGameUpdatesCheck = useCallback(async () => {
    if (stoppingAdulteGameUpdatesCheck) return;
    setStoppingAdulteGameUpdatesCheck(true);
    try {
      const result = await window.electronAPI.stopAdulteGameUpdatesCheck?.();
      if (!result?.success) {
        console.warn('Impossible d\'arrêter la vérification:', result?.error);
      }
    } catch (error) {
      console.error('Erreur arrêt vérification MAJ jeux adultes:', error);
    } finally {
      setStoppingAdulteGameUpdatesCheck(false);
    }
  }, [stoppingAdulteGameUpdatesCheck]);

  const handlePauseAdulteGameUpdatesCheck = useCallback(async () => {
    try {
      const result = await window.electronAPI.pauseAdulteGameUpdatesCheck?.();
      if (result?.success) {
        setPausedAdulteGameUpdatesCheck(true);
      }
    } catch (error) {
      console.error('Erreur pause vérification MAJ jeux adultes:', error);
    }
  }, []);

  const handleResumeAdulteGameUpdatesCheck = useCallback(async () => {
    try {
      const result = await window.electronAPI.resumeAdulteGameUpdatesCheck?.();
      if (result?.success) {
        setPausedAdulteGameUpdatesCheck(false);
      }
    } catch (error) {
      console.error('Erreur reprise vérification MAJ jeux adultes:', error);
    }
  }, []);

  // Nettoyer la progression Mihon après un délai si elle est terminée
  const resetMihonImportTimeout = useCallback(() => {
    if (mihonImportTimeoutRef.current) {
      clearTimeout(mihonImportTimeoutRef.current);
    }
    mihonImportTimeoutRef.current = setTimeout(() => {
      setMangaProgress((prev) => {
        if (prev?.type === 'mihon-import') {
          return null;
        }
        return prev;
      });
    }, 5000);
  }, [setMangaProgress]);

  // Écouter les événements de progression MAL sync
  useEffect(() => {
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
        elapsedMs: progress.elapsedMs || (importStartTimeRef.current > 0 && importStartTimeRef.current < Date.now() ? Date.now() - importStartTimeRef.current : undefined),
        etaMs: progress.etaMs || undefined,
        speed: progress.speed || undefined
      };

      if (progress.type === 'manga') {
        setMangaProgress(progressData);
        if (mangaCloseTimeoutRef.current) {
          clearTimeout(mangaCloseTimeoutRef.current);
          mangaCloseTimeoutRef.current = null;
        }
      } else {
        setAnimeProgress(progressData);
        if (animeCloseTimeoutRef.current) {
          clearTimeout(animeCloseTimeoutRef.current);
          animeCloseTimeoutRef.current = null;
        }
      }
    });

    const unsubscribeMalCompleted = window.electronAPI.onMalSyncCompleted?.((_event: any, result: {
      mangas?: { created?: number; updated?: number };
      animes?: { created?: number; updated?: number };
    }) => {
      if (result.mangas) {
        const mangasData = result.mangas;
        setMangaProgress((prev) => {
          if (prev) {
            return {
              ...prev,
              imported: mangasData.created || 0,
              updated: mangasData.updated || 0,
              phase: 'complete'
            };
          }
          return prev;
        });
      }
      if (result.animes) {
        const animesData = result.animes;
        setAnimeProgress((prev) => {
          if (prev) {
            return {
              ...prev,
              imported: animesData.created || 0,
              updated: animesData.updated || 0,
              phase: 'complete'
            };
          }
          return prev;
        });
      }

      setMalSyncing(false);

      // Programmer la fermeture automatique des progressions si aucun enrichissement ne démarre
      if (animeCloseTimeoutRef.current) {
        clearTimeout(animeCloseTimeoutRef.current);
        animeCloseTimeoutRef.current = null;
      }
      if (mangaCloseTimeoutRef.current) {
        clearTimeout(mangaCloseTimeoutRef.current);
        mangaCloseTimeoutRef.current = null;
      }

      const animeProgressSnapshot = state.animeProgress;
      const mangaProgressSnapshot = state.mangaProgress;
      const animeProgressId = animeProgressSnapshot ? `${animeProgressSnapshot.currentIndex}_${animeProgressSnapshot.total}_${animeProgressSnapshot.type}` : null;
      const mangaProgressId = mangaProgressSnapshot ? `${mangaProgressSnapshot.currentIndex}_${mangaProgressSnapshot.total}_${mangaProgressSnapshot.type}` : null;

      animeCloseTimeoutRef.current = setTimeout(() => {
        setAnimeProgress((prev) => {
          if (prev &&
            !prev.type?.includes('enrichment') &&
            prev.phase === 'complete') {
            const currentId = `${prev.currentIndex}_${prev.total}_${prev.type}`;
            if (currentId === animeProgressId) {
              return null;
            }
          }
          return prev;
        });
      }, 3000);

      mangaCloseTimeoutRef.current = setTimeout(() => {
        setMangaProgress((prev) => {
          if (prev &&
            !prev.type?.includes('enrichment') &&
            prev.phase === 'complete') {
            const currentId = `${prev.currentIndex}_${prev.total}_${prev.type}`;
            if (currentId === mangaProgressId) {
              return null;
            }
          }
          return prev;
        });
      }, 3000);
    });

    // Écouter les événements de progression AniList sync
    const unsubscribeAnilist = window.electronAPI.onAnilistSyncProgress?.((_event: any, progress: {
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
        elapsedMs: progress.elapsedMs || (importStartTimeRef.current > 0 && importStartTimeRef.current < Date.now() ? Date.now() - importStartTimeRef.current : undefined),
        etaMs: progress.etaMs || undefined,
        speed: progress.speed || undefined
      };

      if (progress.type === 'manga') {
        setMangaProgress(progressData);
        if (mangaCloseTimeoutRef.current) {
          clearTimeout(mangaCloseTimeoutRef.current);
          mangaCloseTimeoutRef.current = null;
        }
      } else {
        setAnimeProgress(progressData);
        if (animeCloseTimeoutRef.current) {
          clearTimeout(animeCloseTimeoutRef.current);
          animeCloseTimeoutRef.current = null;
        }
      }
    });

    const unsubscribeAnilistCompleted = window.electronAPI.onAnilistSyncCompleted?.((_event: any, result: {
      mangas?: { created?: number; updated?: number };
      animes?: { created?: number; updated?: number };
    }) => {
      if (result.mangas) {
        const mangasData = result.mangas;
        setMangaProgress((prev) => {
          if (prev) {
            return {
              ...prev,
              imported: mangasData.created || 0,
              updated: mangasData.updated || 0,
              phase: 'complete'
            };
          }
          return prev;
        });
      }
      if (result.animes) {
        const animesData = result.animes;
        setAnimeProgress((prev) => {
          if (prev) {
            return {
              ...prev,
              imported: animesData.created || 0,
              updated: animesData.updated || 0,
              phase: 'complete'
            };
          }
          return prev;
        });
      }

      setAnilistSyncing(false);

      // Programmer la fermeture automatique des progressions si aucun enrichissement ne démarre
      if (animeCloseTimeoutRef.current) {
        clearTimeout(animeCloseTimeoutRef.current);
        animeCloseTimeoutRef.current = null;
      }
      if (mangaCloseTimeoutRef.current) {
        clearTimeout(mangaCloseTimeoutRef.current);
        mangaCloseTimeoutRef.current = null;
      }

      const animeProgressSnapshot = state.animeProgress;
      const mangaProgressSnapshot = state.mangaProgress;
      const animeProgressId = animeProgressSnapshot ? `${animeProgressSnapshot.currentIndex}_${animeProgressSnapshot.total}_${animeProgressSnapshot.type}` : null;
      const mangaProgressId = mangaProgressSnapshot ? `${mangaProgressSnapshot.currentIndex}_${mangaProgressSnapshot.total}_${mangaProgressSnapshot.type}` : null;

      animeCloseTimeoutRef.current = setTimeout(() => {
        setAnimeProgress((prev) => {
          if (prev) {
            const currentId = `${prev.currentIndex}_${prev.total}_${prev.type}`;
            if (currentId === animeProgressId) {
              return null;
            }
          }
          return prev;
        });
      }, 5000);

      mangaCloseTimeoutRef.current = setTimeout(() => {
        setMangaProgress((prev) => {
          if (prev) {
            const currentId = `${prev.currentIndex}_${prev.total}_${prev.type}`;
            if (currentId === mangaProgressId) {
              return null;
            }
          }
          return prev;
        });
      }, 5000);
    });

    const unsubscribeAnilistError = window.electronAPI.onAnilistSyncError?.((_event: any, _data: any) => {
      setAnilistSyncing(false);
      setAnimeProgress(null);
      setMangaProgress(null);
    });

    // Écouter les événements d'enrichissement
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
      const progressData: AnimeImportProgress = {
        phase: 'anime',
        type: 'anime-enrichment',
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
      setAnimeProgress(progressData);
      if (animeCloseTimeoutRef.current) {
        clearTimeout(animeCloseTimeoutRef.current);
        animeCloseTimeoutRef.current = null;
      }
    });

    const unsubscribeAnimeEnrichmentComplete = window.electronAPI.onAnimeEnrichmentComplete?.((_event: any, _stats: any) => {
      setAnimeProgress(null);
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
      const progressData: AnimeImportProgress = {
        phase: 'manga',
        type: 'manga-enrichment',
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
      setMangaProgress(progressData);
      if (mangaCloseTimeoutRef.current) {
        clearTimeout(mangaCloseTimeoutRef.current);
        mangaCloseTimeoutRef.current = null;
      }
    });

    const unsubscribeMangaEnrichmentComplete = window.electronAPI.onMangaEnrichmentComplete?.((_event: any, _stats: any) => {
      setMangaProgress(null);
    });

    // Écouter les événements d'import Mihon
    const unsubscribeMihonImport = window.electronAPI.onMihonImportProgress?.((_event: any, progress: {
      step?: string;
      message?: string;
      progress?: number;
      total?: number;
      current?: number;
      imported?: number;
      updated?: number;
      errors?: number;
      item?: string;
      elapsedMs?: number;
      etaMs?: number;
      speed?: number;
    }) => {
      if (progress.step === 'importing' && progress.total) {
        const progressData: AnimeImportProgress = {
          phase: 'manga',
          type: 'mihon-import',
          total: progress.total,
          currentIndex: progress.current || 0,
          imported: progress.imported || 0,
          updated: progress.updated || 0,
          skipped: 0,
          errors: progress.errors || 0,
          currentAnime: progress.item || progress.message || '',
          elapsedMs: progress.elapsedMs,
          etaMs: progress.etaMs,
          speed: progress.speed
        };
        setMangaProgress(progressData);
        if (mangaCloseTimeoutRef.current) {
          clearTimeout(mangaCloseTimeoutRef.current);
          mangaCloseTimeoutRef.current = null;
        }
        resetMihonImportTimeout();
      } else if (progress.step === 'decoding') {
        // Pendant le décodage, afficher un message simple
        const progressData: AnimeImportProgress = {
          phase: 'manga',
          type: 'mihon-import',
          total: 1,
          currentIndex: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
          currentAnime: progress.message || 'Décodage du backup...',
          elapsedMs: 0,
          etaMs: undefined,
          speed: undefined
        };
        setMangaProgress(progressData);
        resetMihonImportTimeout();
      } else if (progress.step === 'complete') {
        // Import terminé, marquer comme complet
        setMangaProgress((prev) => {
          if (prev?.type === 'mihon-import') {
            return {
              ...prev,
              phase: 'complete',
              currentIndex: progress.current || prev.currentIndex,
              imported: progress.imported || prev.imported,
              updated: progress.updated || prev.updated,
              errors: progress.errors || prev.errors,
              elapsedMs: progress.elapsedMs || prev.elapsedMs
            };
          }
          return prev;
        });
        // Nettoyer après 3 secondes
        setTimeout(() => {
          setMangaProgress((prev) => {
            if (prev?.type === 'mihon-import') {
              return null;
            }
            return prev;
          });
        }, 3000);
      }
    });

    // Écouter les événements de traduction
    const unsubscribeTranslationStarted = window.electronAPI.onMalTranslationStarted?.(() => {
      setTranslating(true);
      setTranslationProgress(null);
    });

    const unsubscribeTranslationProgress = window.electronAPI.onMalTranslationProgress?.((_event: any, progress: any) => {
      setTranslationProgress(progress);
    });

    const unsubscribeTranslationCompleted = window.electronAPI.onMalTranslationCompleted?.((_event: any, _result: any) => {
      setTranslating(false);
      setTranslationProgress(null);
    });

    const unsubscribeTranslationError = window.electronAPI.onMalTranslationError?.((_event: any, _data: any) => {
      setTranslating(false);
      setTranslationProgress(null);
    });

    // Écouter les événements de progression des jeux adultes
    const unsubscribeAdulteGame = window.electronAPI.onAdulteGameUpdatesProgress?.((progress: AdulteGameUpdateProgress) => {
      setAdulteGameProgress(progress);

      if (progress.phase === 'complete' || progress.phase === 'error') {
        setPausedAdulteGameUpdatesCheck(false); // Réinitialiser l'état de pause quand terminé
        setTimeout(() => {
          setAdulteGameUpdating(false);
          setAdulteGameProgress(null);
        }, 3000);
      } else if (progress.phase === 'start' || progress.phase === 'sheet' || progress.phase === 'scraping') {
        setAdulteGameUpdating(true);
      }
    });

    return () => {
      if (animeCloseTimeoutRef.current) clearTimeout(animeCloseTimeoutRef.current);
      if (mangaCloseTimeoutRef.current) clearTimeout(mangaCloseTimeoutRef.current);
      if (unsubscribeMal) unsubscribeMal();
      if (unsubscribeMalCompleted) unsubscribeMalCompleted();
      if (unsubscribeAnilist) unsubscribeAnilist();
      if (unsubscribeAnilistCompleted) unsubscribeAnilistCompleted();
      if (unsubscribeAnilistError) unsubscribeAnilistError();
      if (unsubscribeAnimeEnrichment) unsubscribeAnimeEnrichment();
      if (unsubscribeAnimeEnrichmentComplete) unsubscribeAnimeEnrichmentComplete();
      if (unsubscribeMangaEnrichment) unsubscribeMangaEnrichment();
      if (unsubscribeMangaEnrichmentComplete) unsubscribeMangaEnrichmentComplete();
      if (unsubscribeMihonImport) unsubscribeMihonImport();
      if (mihonImportTimeoutRef.current) clearTimeout(mihonImportTimeoutRef.current);
      if (unsubscribeTranslationStarted) unsubscribeTranslationStarted();
      if (unsubscribeTranslationProgress) unsubscribeTranslationProgress();
      if (unsubscribeTranslationCompleted) unsubscribeTranslationCompleted();
      if (unsubscribeTranslationError) unsubscribeTranslationError();
      if (unsubscribeAdulteGame) unsubscribeAdulteGame();
    };
  }, [setAnimeProgress, setMangaProgress, setMalSyncing, setAnilistSyncing, setTranslating, setTranslationProgress, setAdulteGameProgress, setAdulteGameUpdating, state, resetMihonImportTimeout]);

  // Écouter les événements de progression Cloud Sync
  useEffect(() => {
    if (!window.electronAPI.onCloudSyncProgress) {
      return;
    }

    const unsubscribeCloudSync = window.electronAPI.onCloudSyncProgress((_event: unknown, progress: {
      phase: 'start' | 'upload' | 'upload-covers' | 'download-db' | 'download-covers' | 'complete';
      current: number;
      total: number;
      percentage: number;
      message?: string;
      item?: string;
      results?: {
        upload?: boolean;
        downloadsCount?: number;
        coversDownloaded?: number;
      };
    }) => {
      if (!progress) {
        return;
      }

      const progressData: CloudSyncProgress = {
        phase: progress.phase,
        current: progress.current,
        total: progress.total,
        percentage: progress.percentage,
        message: progress.message,
        item: progress.item,
        results: progress.results
      };

      setCloudSyncProgress(progressData);

      if (progress.phase === 'start') {
        setCloudSyncing(true);
      } else if (progress.phase === 'complete') {
        setCloudSyncing(false);
        // Fermer automatiquement après 3 secondes
        setTimeout(() => {
          setCloudSyncProgress(null);
        }, 3000);
      }
    });

    return () => {
      if (unsubscribeCloudSync) {
        unsubscribeCloudSync();
      }
    };
  }, [setCloudSyncProgress, setCloudSyncing]);

  // Enregistrer les callbacks pour les vérifications de mises à jour jeux adultes (en dehors du useEffect principal pour éviter les boucles)
  useEffect(() => {
    setStopCallbacks({
      onStopAdulteGameUpdatesCheck: handleStopAdulteGameUpdatesCheck,
      onPauseAdulteGameUpdatesCheck: handlePauseAdulteGameUpdatesCheck,
      onResumeAdulteGameUpdatesCheck: handleResumeAdulteGameUpdatesCheck,
      stoppingAdulteGameUpdatesCheck: stoppingAdulteGameUpdatesCheck,
      pausedAdulteGameUpdatesCheck: pausedAdulteGameUpdatesCheck
    });
  }, [setStopCallbacks, handleStopAdulteGameUpdatesCheck, handlePauseAdulteGameUpdatesCheck, handleResumeAdulteGameUpdatesCheck, stoppingAdulteGameUpdatesCheck, pausedAdulteGameUpdatesCheck]);

  const value: GlobalProgressContextType = {
    ...state,
    onStopAdulteGameUpdatesCheck: handleStopAdulteGameUpdatesCheck,
    onPauseAdulteGameUpdatesCheck: handlePauseAdulteGameUpdatesCheck,
    onResumeAdulteGameUpdatesCheck: handleResumeAdulteGameUpdatesCheck,
    stoppingAdulteGameUpdatesCheck,
    pausedAdulteGameUpdatesCheck,
    isProgressCollapsed,
    setIsProgressCollapsed,
    setMalSyncing,
    setAnilistSyncing,
    setAnimeProgress,
    setMangaProgress,
    setTranslating,
    setTranslationProgress,
    setAdulteGameUpdating,
    setAdulteGameProgress,
    setCloudSyncing,
    setCloudSyncProgress,
    setStopCallbacks,
    setImportStartTime,
    hasActiveOperation
  };

  return (
    <GlobalProgressContext.Provider value={value}>
      {children}
    </GlobalProgressContext.Provider>
  );
}

export function useGlobalProgress() {
  const context = useContext(GlobalProgressContext);
  if (context === undefined) {
    throw new Error('useGlobalProgress must be used within a GlobalProgressProvider');
  }
  return context;
}
