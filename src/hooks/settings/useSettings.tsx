import { useEffect, useState } from 'react';
import { AnimeImportProgress, AnimeImportResult, ContentPreferences } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';
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

interface NotificationConfig {
  enabled: boolean;
  checkAnimes: boolean;
  checkAdulteGame: boolean;
  notifyNautiljonSync: boolean;
  notifyMalSync: boolean;
  notifyEnrichment: boolean;
  notifyBackup: boolean;
  soundEnabled: boolean;
  checkOnStartup: boolean;
}

const defaultNotificationConfig: NotificationConfig = {
  enabled: false,
  checkAnimes: true,
  checkAdulteGame: true,
  notifyNautiljonSync: true,
  notifyMalSync: true,
  notifyEnrichment: true,
  notifyBackup: true,
  soundEnabled: true,
  checkOnStartup: false,
};

export function useSettings() {
  const defaultContentPrefs: ContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showAdulteGame: true
  };
  const [contentPrefs, setContentPrefs] = useState<ContentPreferences>({ ...defaultContentPrefs });
  const [loading, setLoading] = useState(true);
  const [importingAnimes, setImportingAnimes] = useState(false);
  const [animeImportResult] = useState<AnimeImportResult | null>(null);
  const [animeImportProgress, setAnimeImportProgress] = useState<AnimeImportProgress | null>(null);
  const [importStartTime, setImportStartTime] = useState<number>(0);
  const [importType, setImportType] = useState<'xml' | 'mal-sync'>('xml');
  const [users, setUsers] = useState<UserData[]>([]);
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>({});
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});
  const [showMangaDisplayModal, setShowMangaDisplayModal] = useState(false);
  const [showAnimeDisplayModal, setShowAnimeDisplayModal] = useState(false);
  const [showMovieDisplayModal, setShowMovieDisplayModal] = useState(false);
  const [showSeriesDisplayModal, setShowSeriesDisplayModal] = useState(false);
  const [showAdulteGameDisplayModal, setShowAdulteGameDisplayModal] = useState(false);
  const [tmdbLanguage, setTmdbLanguage] = useState('fr-FR');
  const [tmdbRegion, setTmdbRegion] = useState('FR');
  const [tmdbAutoTranslate, setTmdbAutoTranslate] = useState<boolean>(true);
  const [globalSyncInterval, setGlobalSyncInterval] = useState<1 | 3 | 6 | 12 | 24>(6);
  const [globalSyncInitialized, setGlobalSyncInitialized] = useState(false);
  const [globalSyncUpdating, setGlobalSyncUpdating] = useState(false);
  const [notifyEnrichment, setNotifyEnrichment] = useState<boolean>(defaultNotificationConfig.notifyEnrichment);

  // Hooks spécialisés
  const malSettings = useMalSettings();
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
    loadNotificationPreferences();

    // Écouter les mises à jour de progression de l'import XML
    const unsubscribeXml = window.electronAPI.onAnimeImportProgress((progress: AnimeImportProgress) => {
      setAnimeImportProgress(progress);
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
        setContentPrefs({ ...defaultContentPrefs, ...prefs });
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
      // Toutes les sections sont ouvertes par défaut
      const defaults = {
        'user-management': true,
        'tampermonkey': true,
        'appearance': true,
        'notifications': true,
        'integrations': true,
        'ai': true,
        'display-preferences': true,
        'database': true,
        'source-credits': true,
        'dev': true,
        'danger-zone': true,
        // Sections imbriquées dans IntegrationsSettings
        'integrations-mal': true,
        'integrations-tmdb': true,
        'integrations-groq': true,
        'integrations-adulteGame': true,
        // Sections collapsibles dans DatabaseSettings
        'database-backup-config': true,
        'database-backups-list': true
      };
      if (stored) {
        const parsed = JSON.parse(stored);
        // Fusionner avec les defaults pour s'assurer que toutes les nouvelles sections sont ouvertes par défaut
        setSectionStates({ ...defaults, ...parsed });
      } else {
        setSectionStates(defaults);
      }
    } catch (error) {
      console.error('Erreur chargement états des sections:', error);
      // En cas d'erreur, utiliser les defaults
      setSectionStates({
        'user-management': true,
        'tampermonkey': true,
        'appearance': true,
        'notifications': true,
        'integrations': true,
        'ai': true,
        'display-preferences': true,
        'database': true,
        'source-credits': true,
        'dev': true,
        'danger-zone': true,
        'integrations-mal': true,
        'integrations-tmdb': true,
        'integrations-groq': true,
        'integrations-adulteGame': true,
        'database-backup-config': true,
        'database-backups-list': true
      });
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const savedConfig = await window.electronAPI.getNotificationConfig();
      const mergedConfig: NotificationConfig = {
        ...defaultNotificationConfig,
        ...(savedConfig || {})
      };
      setNotifyEnrichment(Boolean(mergedConfig.notifyEnrichment));
    } catch (error) {
      console.error('Erreur chargement configuration notifications:', error);
      setNotifyEnrichment(defaultNotificationConfig.notifyEnrichment);
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

  const toggleSection = (sectionId: string) => {
    setSectionStates(prev => {
      const newStates = { ...prev, [sectionId]: !prev[sectionId] };
      localStorage.setItem('settings-section-states', JSON.stringify(newStates));
      return newStates;
    });
  };

  // ========== HANDLERS ==========

  const handleContentPrefChange = async (pref: keyof ContentPreferences, value: boolean) => {
    try {
      const newPrefs: ContentPreferences = { ...defaultContentPrefs, ...contentPrefs, [pref]: value };
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

  const handleNotifyEnrichmentChange = async (enabled: boolean) => {
    const previousValue = notifyEnrichment;
    setNotifyEnrichment(enabled);
    try {
      const latestConfig = await window.electronAPI.getNotificationConfig();
      const mergedConfig: NotificationConfig = {
        ...defaultNotificationConfig,
        ...(latestConfig || {}),
        notifyEnrichment: enabled
      };
      await window.electronAPI.saveNotificationConfig(mergedConfig);
      showToast({
        title: enabled ? 'Notification enrichissement activée' : 'Notification enrichissement désactivée',
        type: 'success',
        duration: 2000
      });
    } catch (error: any) {
      console.error('Erreur sauvegarde notification enrichissement:', error);
      setNotifyEnrichment(previousValue);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de mettre à jour la notification.',
        type: 'error'
      });
    }
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
    nautiljonAutoSyncInterval,
    handleNautiljonIntervalChange,
    ...restNautiljonSettings
  } = nautiljonSettings;

  useEffect(() => {
    const candidate = (malAutoSyncInterval ?? nautiljonAutoSyncInterval) as 1 | 3 | 6 | 12 | 24 | undefined;
    if (!globalSyncInitialized && candidate) {
      setGlobalSyncInterval(candidate);
      setGlobalSyncInitialized(true);
      return;
    }

    if (globalSyncUpdating) {
      return;
    }

    const malInterval = malAutoSyncInterval as 1 | 3 | 6 | 12 | 24 | undefined;
    const nautiljonInterval = nautiljonAutoSyncInterval as 1 | 3 | 6 | 12 | 24 | undefined;

    // Utiliser une fonction de mise à jour pour éviter la dépendance sur globalSyncInterval
    setGlobalSyncInterval((currentInterval) => {
      if (malInterval && nautiljonInterval && malInterval === nautiljonInterval) {
        if (currentInterval !== malInterval) {
          return malInterval;
        }
        return currentInterval;
      }

      if (malInterval && currentInterval !== malInterval) {
        return malInterval;
      }

      if (nautiljonInterval && currentInterval !== nautiljonInterval) {
        return nautiljonInterval;
      }

      return currentInterval;
    });
  }, [globalSyncInitialized, globalSyncUpdating, malAutoSyncInterval, nautiljonAutoSyncInterval]);

  return {
    // State local
    contentPrefs,
    loading,
    importingAnimes,
    animeImportResult,
    animeImportProgress: animeImportProgress || malAnimeImportProgress, // Préférer celui de XML, sinon celui de MAL
    mangaImportProgress: malMangaImportProgress,
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
    showAdulteGameDisplayModal,
    setShowAdulteGameDisplayModal,
    tmdbLanguage,
    tmdbRegion,
    globalSyncInterval,
    globalSyncUpdating,
    notifyEnrichment,

    // Hooks spécialisés (sans duplication)
    ...restMalSettings,
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
    handleNotifyEnrichmentChange,
  };
}
