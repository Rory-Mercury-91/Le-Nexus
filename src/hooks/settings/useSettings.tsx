import { useEffect, useState } from 'react';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';
import { AnimeImportProgress, AnimeImportResult, ContentPreferences } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';
import { useAniListSettings } from './useAniListSettings';
import { useAppSettings } from './useAppSettings';
import { useDatabaseSettings } from './useDatabaseSettings';
import { useMalSettings } from './useMalSettings';
import { useNautiljonSettings } from './useNautiljonSettings';

interface UserData {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

const getDefaultSectionStates = () => ({
  'user-management': true,
  'tampermonkey': true,
  'appearance': true,
  'notifications': true,
  'integrations': true,
  'ai': true,
  'display-preferences': true,
  'database': true,
  'source-credits': true,
  'dev': false, // Reste fermé par défaut
  'danger-zone': false, // Reste fermé par défaut
  'integrations-mal': true,
  'integrations-anilist': true,
  'integrations-tmdb': true,
  'integrations-groq': true,
  'integrations-adulteGame': true,
  'database-backup-config': true,
  'database-backups-list': true
});

export function useSettings() {
  const defaultContentPrefs: ContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showVideos: true,
    showAdulteGame: true,
    showBooks: true
  };
  const [contentPrefs, setContentPrefs] = useState<ContentPreferences>({ ...defaultContentPrefs });
  const [loading, setLoading] = useState(true);
  const [importingAnimes, setImportingAnimes] = useState(false);
  const [animeImportResult] = useState<AnimeImportResult | null>(null);
  const [importStartTime, setImportStartTime] = useState<number>(0);
  const [importType, setImportType] = useState<'xml' | 'mal-sync'>('xml');

  // Utiliser le contexte global pour les progressions
  const { setAnimeProgress } = useGlobalProgress();
  const [users, setUsers] = useState<UserData[]>([]);
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({});
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>(getDefaultSectionStates);
  const [showMangaDisplayModal, setShowMangaDisplayModal] = useState(false);
  const [showAnimeDisplayModal, setShowAnimeDisplayModal] = useState(false);
  const [showMovieDisplayModal, setShowMovieDisplayModal] = useState(false);
  const [showSeriesDisplayModal, setShowSeriesDisplayModal] = useState(false);
  const [showBooksDisplayModal, setShowBooksDisplayModal] = useState(false);
  const [showAdulteGameDisplayModal, setShowAdulteGameDisplayModal] = useState(false);
  const [showRawgGameDisplayModal, setShowRawgGameDisplayModal] = useState(false);
  const [tmdbLanguage, setTmdbLanguage] = useState('fr-FR');
  const [tmdbRegion, setTmdbRegion] = useState('FR');
  const [tmdbAutoTranslate, setTmdbAutoTranslate] = useState<boolean>(true);
  const [globalSyncInterval, setGlobalSyncInterval] = useState<1 | 3 | 6 | 12 | 24>(6);
  const [globalSyncInitialized, setGlobalSyncInitialized] = useState(false);
  const [globalSyncUpdating, setGlobalSyncUpdating] = useState(false);

  // Hooks spécialisés
  const malSettings = useMalSettings();
  const anilistSettings = useAniListSettings();
  const nautiljonSettings = useNautiljonSettings();
  const appSettings = useAppSettings();
  const databaseSettings = useDatabaseSettings();

  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    loadSettings();
    loadContentPreferences();
    loadSectionStates();
    loadMediaSyncSettings();

    // Écouter les mises à jour de progression de l'import XML
    const unsubscribeXml = window.electronAPI.onAnimeImportProgress((progress: AnimeImportProgress) => {
      setAnimeProgress(progress);
    });

    return () => {
      unsubscribeXml();
    };
  }, []);

  const loadSettings = async () => {
    const usersData = await window.electronAPI.getAllUsers();
    setUsers(usersData);

    const avatars: Record<string, string | null> = {};
    for (const user of usersData) {
      const avatar = await window.electronAPI.getUserProfileImage(user.name);
      avatars[user.name] = avatar;
    }
    setUserAvatars(avatars);

    setLoading(false);
  };

  const loadContentPreferences = async () => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      if (currentUser) {
        const prefs = await window.electronAPI.getContentPreferences(currentUser);
        const mergedPrefs = { ...defaultContentPrefs, ...prefs };

        // Migration automatique : si showVideos n'existe pas, le calculer à partir des anciennes préférences
        if (mergedPrefs.showVideos === undefined) {
          mergedPrefs.showVideos = mergedPrefs.showAnimes || mergedPrefs.showMovies || mergedPrefs.showSeries;
          // Sauvegarder la migration
          if (mergedPrefs.showVideos !== undefined) {
            await window.electronAPI.setContentPreferences(currentUser, { showVideos: mergedPrefs.showVideos });
          }
        }

        setContentPrefs(mergedPrefs);
      } else {
        setContentPrefs({ ...defaultContentPrefs });
      }
    } catch (error) {
      console.error('Erreur chargement préférences de contenu:', error);
      setContentPrefs({ ...defaultContentPrefs });
    }
  };

  const loadSectionStates = async () => {
    try {
      const stored = localStorage.getItem('settings-section-states');
      const defaults = getDefaultSectionStates();
      if (stored) {
        const parsed = JSON.parse(stored);
        setSectionStates({ ...defaults, ...parsed });
      } else {
        setSectionStates(defaults);
      }
    } catch (error) {
      console.error('Erreur chargement états des sections:', error);
      setSectionStates(getDefaultSectionStates());
    }
  };

  const loadMediaSyncSettings = async () => {
    try {
      const syncSettings = await window.electronAPI.getMediaSyncSettings?.();
      if (syncSettings) {
        setTmdbLanguage(syncSettings.language || 'fr-FR');
        setTmdbRegion(syncSettings.region || 'FR');
        setTmdbAutoTranslate(syncSettings.autoTranslate ?? true);
      }
    } catch (error) {
      console.error('Erreur chargement préférences TMDb:', error);
    }
  };

  const updateSectionStates = (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
    setSectionStates(prev => {
      const newStates = updater(prev);
      localStorage.setItem('settings-section-states', JSON.stringify(newStates));
      return newStates;
    });
  };

  const toggleSection = (sectionId: string) => {
    updateSectionStates(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const setSectionState = (sectionId: string, isOpen: boolean) => {
    updateSectionStates(prev => ({
      ...prev,
      [sectionId]: isOpen
    }));
  };

  // ========== HANDLERS ==========

  const handleContentPrefChange = async (pref: keyof ContentPreferences, value: boolean) => {
    try {
      const newPrefs: ContentPreferences = { ...defaultContentPrefs, ...contentPrefs, [pref]: value };

      // Si on change showMangas, synchroniser showBooks avec la même valeur
      if (pref === 'showMangas') {
        newPrefs.showBooks = value;
      }

      // Si on change showVideos, synchroniser les 3 anciennes valeurs pour compatibilité
      if (pref === 'showVideos') {
        newPrefs.showAnimes = value;
        newPrefs.showMovies = value;
        newPrefs.showSeries = value;
      }

      setContentPrefs(newPrefs);

      const currentUser = await window.electronAPI.getCurrentUser();
      if (currentUser) {
        await window.electronAPI.setContentPreferences(currentUser, newPrefs);
      }
    } catch (error) {
      console.error('Erreur modification préférences de contenu:', error);
    }
  };

  const saveMediaSyncSettings = async (options: { language?: string; region?: string; autoTranslate?: boolean }) => {
    try {
      await window.electronAPI.saveMediaSyncSettings?.({
        language: options.language ?? tmdbLanguage,
        region: options.region ?? tmdbRegion,
        autoTranslate: options.autoTranslate ?? tmdbAutoTranslate
      });
    } catch (error) {
      console.error('Erreur sauvegarde préférences TMDb:', error);
    }
  };

  const handleTmdbLanguageChange = async (language: string) => {
    const sanitized = language.trim() || 'fr-FR';
    setTmdbLanguage(sanitized);
    await saveMediaSyncSettings({ language: sanitized });
  };

  const handleTmdbRegionChange = async (region: string) => {
    const sanitized = (region.trim().slice(0, 2) || 'FR').toUpperCase();
    setTmdbRegion(sanitized);
    await saveMediaSyncSettings({ region: sanitized });
  };

  const handleMalSyncNow = async () => {
    if (malSettings.malSyncing) return;

    try {
      setImportType('mal-sync');
      setImportingAnimes(true);
      setImportStartTime(Date.now());

      const result = await window.electronAPI.malSyncNow();

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
        await malSettings.loadMalStatus();
      } else if (result && result.requiresReconnect) {
        showToast({
          title: 'Session expirée',
          message: result.error || 'Votre session MyAnimeList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await malSettings.loadMalStatus();
      }
    } catch (error: any) {
      if (error.message && (error.message.includes('expiré') || error.message.includes('reconnecter') || error.message.includes('401'))) {
        showToast({
          title: 'Session expirée',
          message: error.message || 'Votre session MyAnimeList a expiré. Veuillez vous reconnecter.',
          type: 'error',
          duration: 5000
        });
        await malSettings.loadMalStatus();
      } else {
        showToast({
          title: 'Erreur de synchronisation',
          message: error.message || 'Impossible de synchroniser avec MyAnimeList',
          type: 'error'
        });
      }
    } finally {
      setImportingAnimes(false);
    }
  };

  // Extraire animeImportProgress et mangaImportProgress de malSettings pour éviter la duplication
  const {
    animeImportProgress: malAnimeImportProgress,
    mangaImportProgress: malMangaImportProgress,
    ConfirmDialog: MalConfirmDialog,
    malAutoSyncInterval,
    handleMalIntervalChange,
    ...restMalSettings
  } = malSettings;

  const {
    anilistAutoSyncInterval,
    handleAniListIntervalChange,
    ...restAnilistSettings
  } = anilistSettings;

  const {
    nautiljonAutoSyncInterval,
    handleNautiljonIntervalChange,
    ...restNautiljonSettings
  } = nautiljonSettings;

  useEffect(() => {
    const candidate = (malAutoSyncInterval ?? anilistAutoSyncInterval ?? nautiljonAutoSyncInterval) as 1 | 3 | 6 | 12 | 24 | undefined;
    if (!globalSyncInitialized && candidate) {
      setGlobalSyncInterval(candidate);
      setGlobalSyncInitialized(true);
      return;
    }

    if (globalSyncUpdating) {
      return;
    }

    const malInterval = malAutoSyncInterval as 1 | 3 | 6 | 12 | 24 | undefined;
    const anilistInterval = anilistAutoSyncInterval as 1 | 3 | 6 | 12 | 24 | undefined;
    const nautiljonInterval = nautiljonAutoSyncInterval as 1 | 3 | 6 | 12 | 24 | undefined;

    // Utiliser une fonction de mise à jour pour éviter la dépendance sur globalSyncInterval
    setGlobalSyncInterval((currentInterval) => {
      if (malInterval && anilistInterval && nautiljonInterval && malInterval === anilistInterval && anilistInterval === nautiljonInterval) {
        if (currentInterval !== malInterval) {
          return malInterval;
        }
        return currentInterval;
      }

      if (malInterval && anilistInterval && malInterval === anilistInterval) {
        if (currentInterval !== malInterval) {
          return malInterval;
        }
        return currentInterval;
      }

      if (malInterval && currentInterval !== malInterval) {
        return malInterval;
      }

      if (anilistInterval && currentInterval !== anilistInterval) {
        return anilistInterval;
      }

      if (nautiljonInterval && currentInterval !== nautiljonInterval) {
        return nautiljonInterval;
      }

      return currentInterval;
    });
  }, [globalSyncInitialized, globalSyncUpdating, malAutoSyncInterval, anilistAutoSyncInterval, nautiljonAutoSyncInterval]);

  return {
    // State local
    contentPrefs,
    loading,
    importingAnimes,
    animeImportResult,
    importType,
    users,
    userAvatars,
    sectionStates,
    showMangaDisplayModal,
    setShowMangaDisplayModal,
    showAnimeDisplayModal,
    setShowAnimeDisplayModal,
    showMovieDisplayModal,
    setShowMovieDisplayModal,
    showSeriesDisplayModal,
    setShowSeriesDisplayModal,
    showBooksDisplayModal,
    setShowBooksDisplayModal,
    showAdulteGameDisplayModal,
    setShowAdulteGameDisplayModal,
    showRawgGameDisplayModal,
    setShowRawgGameDisplayModal,
    tmdbLanguage,
    tmdbRegion,
    globalSyncInterval,
    globalSyncUpdating,

    // Hooks spécialisés (sans duplication)
    ...restMalSettings,
    ...restAnilistSettings,
    ...restNautiljonSettings,
    ...appSettings,
    ...databaseSettings, // Contient son propre confirm et ConfirmDialog
    malConfirmDialog: MalConfirmDialog,

    // Hooks UI (confirme depuis useSettings pour les autres utilisations)
    confirm: databaseSettings.confirm || confirm, // Utiliser celui de databaseSettings si disponible
    ConfirmDialog: databaseSettings.ConfirmDialog || ConfirmDialog, // Utiliser celui de databaseSettings si disponible
    showToast,
    ToastContainer,

    // Functions locales
    toggleSection,
    setSectionState,
    loadSettings,
    handleContentPrefChange,
    handleMalSyncNow,
    handleTmdbLanguageChange,
    handleTmdbRegionChange,
    handleGlobalSyncIntervalChange: async (interval: 1 | 3 | 6 | 12 | 24) => {
      const previousInterval = globalSyncInterval;
      setGlobalSyncInterval(interval);
      setGlobalSyncUpdating(true);
      try {
        await Promise.all([
          handleMalIntervalChange(interval),
          handleAniListIntervalChange(interval),
          handleNautiljonIntervalChange(interval)
        ]);
      } catch (error: any) {
        setGlobalSyncInterval(previousInterval);
        const alreadyHandled = typeof error === 'object' && error !== null && (error as any).__handled;
        if (!alreadyHandled) {
          showToast({
            title: 'Erreur',
            message: error?.message || 'Impossible de modifier la fréquence globale',
            type: 'error'
          });
        }
      } finally {
        setGlobalSyncUpdating(false);
      }
    },
  };
}
