import { useEffect, useState } from 'react';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { AnimeImportProgress, AnimeImportResult } from '../../types';
import AISettings from './sections/AISettings';
import AppearanceSettings from './sections/AppearanceSettings';
import AVNSettings from './sections/AVNSettings';
import DangerZone from './sections/DangerZone';
import DatabaseSettings from './sections/DatabaseSettings';
import MALSettings from './sections/MALSettings';
import UserManagement from './sections/UserManagement';

interface UserData {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

export default function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [contentPrefs, setContentPrefs] = useState({ showMangas: true, showAnimes: true, showAvn: true });
  
  // MyAnimeList Sync
  const [malConnected, setMalConnected] = useState(false);
  const [malUser, setMalUser] = useState<any>(null);
  const [malLastSync, setMalLastSync] = useState<any>(null);
  const [malSyncing, setMalSyncing] = useState(false);
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
  const [baseDirectory, setBaseDirectory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importingAnimes, setImportingAnimes] = useState(false);
  const [animeImportResult, setAnimeImportResult] = useState<AnimeImportResult | null>(null);
  const [animeImportProgress, setAnimeImportProgress] = useState<AnimeImportProgress | null>(null);
  const [importStartTime, setImportStartTime] = useState<number>(0);
  const [importType, setImportType] = useState<'xml' | 'mal-sync'>('xml');
  const [users, setUsers] = useState<UserData[]>([]);
  const [userAvatars, setUserAvatars] = useState<Record<number, string | null>>({});
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    loadSettings();
    loadTheme();
    loadAutoLaunch();
    loadGroqApiKey();
    loadMalStatus();
    loadMalAutoSyncSettings();
    loadContentPreferences();
    
    // Écouter les mises à jour de progression de l'import XML
    const unsubscribeXml = window.electronAPI.onAnimeImportProgress((progress) => {
      setAnimeImportProgress(progress);
    });
    
    // Écouter les mises à jour de progression MAL sync
    const unsubscribeMal = window.electronAPI.onMalSyncProgress?.((_event, progress) => {
      setAnimeImportProgress({
        phase: 'anime',
        total: progress.total,
        currentIndex: progress.current,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        currentAnime: progress.item,
        elapsedMs: Date.now() - importStartTime,
        etaMs: undefined,
        speed: undefined
      });
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
      unsubscribeXml();
      if (unsubscribeMal) unsubscribeMal();
      if (unsubscribeTranslationStarted) unsubscribeTranslationStarted();
      if (unsubscribeTranslationProgress) unsubscribeTranslationProgress();
      if (unsubscribeTranslationCompleted) unsubscribeTranslationCompleted();
      if (unsubscribeTranslationError) unsubscribeTranslationError();
    };
  }, [importStartTime]);

  const loadSettings = async () => {
    const baseDir = await window.electronAPI.getBaseDirectory();
    setBaseDirectory(baseDir || 'Non configuré');
    
    const usersData = await window.electronAPI.getAllUsers();
    setUsers(usersData);
    
    const avatars: Record<number, string | null> = {};
    for (const user of usersData) {
      const avatar = await window.electronAPI.getUserAvatar(user.id);
      avatars[user.id] = avatar;
    }
    setUserAvatars(avatars);
    
    setLoading(false);
  };

  const loadTheme = async () => {
    try {
      const savedTheme = await window.electronAPI.getTheme();
      if (savedTheme) {
        setTheme(savedTheme as 'dark' | 'light');
      }
    } catch (error) {
      console.error('Erreur chargement thème:', error);
    }
  };

  const loadAutoLaunch = async () => {
    try {
      const enabled = await window.electronAPI.getAutoLaunch();
      setAutoLaunch(enabled);
    } catch (error) {
      console.error('Erreur chargement auto-launch:', error);
    }
  };

  const loadGroqApiKey = async () => {
    try {
      const apiKey = await window.electronAPI.getGroqApiKey();
      setGroqApiKey(apiKey || '');
    } catch (error) {
      console.error('Erreur chargement clé API Groq:', error);
    }
  };
  
  const loadContentPreferences = async () => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      if (currentUser) {
        const prefs = await window.electronAPI.getContentPreferences(currentUser);
        setContentPrefs(prefs);
      }
    } catch (error) {
      console.error('Erreur chargement préférences de contenu:', error);
    }
  };

  const loadMalStatus = async () => {
    try {
      const status = await window.electronAPI.malGetStatus();
      setMalConnected(status.connected);
      setMalUser(status.user);
      setMalLastSync(status.lastSync);
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

  // ========== HANDLERS ==========

  const handleThemeChange = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await window.electronAPI.setTheme(newTheme);
  };

  const handleAutoLaunchChange = async (enabled: boolean) => {
    try {
      const result = await window.electronAPI.setAutoLaunch(enabled);
      if (result.success) {
        setAutoLaunch(enabled);
        if (result.message) {
          showToast({ title: result.message, message: '', type: 'info' });
        } else {
          showToast({
            title: enabled ? 'Démarrage automatique activé' : 'Démarrage automatique désactivé',
            message: '',
            type: 'success'
          });
        }
      } else {
        showToast({ title: result.error || 'Erreur lors de la modification', message: '', type: 'error' });
      }
    } catch (error) {
      showToast({ title: 'Erreur lors de la modification', message: '', type: 'error' });
    }
  };

  const handleContentPrefChange = async (pref: 'showMangas' | 'showAnimes' | 'showAvn', value: boolean) => {
    try {
      const newPrefs = { ...contentPrefs, [pref]: value };
      setContentPrefs(newPrefs);
      
      const currentUser = await window.electronAPI.getCurrentUser();
      if (currentUser) {
        await window.electronAPI.setContentPreferences(currentUser, newPrefs);
      }
    } catch (error) {
      console.error('Erreur modification préférences de contenu:', error);
    }
  };

  const handleGroqApiKeyChange = async (newApiKey: string) => {
    try {
      await window.electronAPI.setGroqApiKey(newApiKey);
      setGroqApiKey(newApiKey);
      showToast({
        title: newApiKey ? 'Clé API Groq enregistrée' : 'Clé API Groq supprimée',
        message: '',
        type: 'success'
      });
    } catch (error) {
      showToast({ title: 'Erreur lors de la sauvegarde', message: '', type: 'error' });
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
      setImportType('mal-sync');
      setImportingAnimes(true);
      setAnimeImportProgress(null);
      setImportStartTime(Date.now());

      const result = await window.electronAPI.malSyncNow();

      if (result.success) {
        const totalCreated = (result.manga?.created || 0) + (result.anime?.created || 0);
        const totalUpdated = (result.manga?.updated || 0) + (result.anime?.updated || 0);
        
        showToast({
          title: 'Synchronisation réussie !',
          message: `✅ ${totalCreated} créés | ${totalUpdated} mis à jour | ⏱️ ${result.duration}s`,
          type: 'success'
        });
        await loadMalStatus();
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur de synchronisation',
        message: error.message || 'Impossible de synchroniser avec MyAnimeList',
        type: 'error'
      });
    } finally {
      setMalSyncing(false);
      setImportingAnimes(false);
      setAnimeImportProgress(null);
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
    try {
      await window.electronAPI.malSetAutoSync(enabled, malAutoSyncInterval);
      setMalAutoSyncEnabled(enabled);
      showToast({
        title: enabled ? 'Sync auto activée' : 'Sync auto désactivée',
        message: enabled ? `Synchronisation toutes les ${malAutoSyncInterval}h` : 'Les synchronisations automatiques sont désactivées',
        type: 'success'
      });
    } catch (error: any) {
      showToast({ title: 'Erreur', message: error.message || 'Impossible de modifier les paramètres', type: 'error' });
    }
  };

  const handleMalIntervalChange = async (intervalHours: number) => {
    try {
      await window.electronAPI.malSetAutoSync(malAutoSyncEnabled, intervalHours);
      setMalAutoSyncInterval(intervalHours);
      showToast({
        title: 'Intervalle modifié',
        message: `Synchronisation toutes les ${intervalHours}h`,
        type: 'success'
      });
    } catch (error: any) {
      showToast({ title: 'Erreur', message: error.message || 'Impossible de modifier l\'intervalle', type: 'error' });
    }
  };

  const handleImportAnimeXml = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImportingAnimes(true);
      setImportType('xml');
      setAnimeImportResult(null);
      setAnimeImportProgress(null);
      setImportStartTime(Date.now());

      try {
        const text = await file.text();
        const result = await window.electronAPI.importAnimeXml(text);
        setAnimeImportResult(result);
        setAnimeImportProgress(null);
        
        setTimeout(() => setAnimeImportResult(null), 30000);
      } catch (error) {
        setAnimeImportResult({
          total: 0,
          imported: 0,
          updated: 0,
          errors: [{ error: 'Erreur lors de la lecture du fichier XML' }]
        });
        setAnimeImportProgress(null);
      } finally {
        setImportingAnimes(false);
      }
    };

    input.click();
  };

  const handleChangeBaseDirectory = async () => {
    const result = await window.electronAPI.changeBaseDirectory();
    if (result.success && result.path) {
      setBaseDirectory(result.path);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      if (result.message) {
        showToast({ title: 'Emplacement modifié', message: result.message, type: 'info' });
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await window.electronAPI.exportDatabase();
      if (result.success) {
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await window.electronAPI.importDatabase();
      if (result.success) {
        setShowImportSuccess(true);
        setTimeout(() => {
          setShowImportSuccess(false);
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteUserData = async () => {
    const confirmed = await confirm({
      title: 'Supprimer les données utilisateur',
      message: 'Cette action supprimera TOUTES les données de lecture de l\'utilisateur actuel (tomes lus, épisodes vus, etc.). Les séries et tomes ne seront PAS supprimés. Cette action est irréversible !',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        const currentUser = await window.electronAPI.getCurrentUser();
        await window.electronAPI.deleteUserData(currentUser);
        showToast({
          title: 'Données supprimées',
          message: 'Redémarrez l\'application pour voir les changements',
          type: 'success'
        });
      } catch (error) {
        showToast({ title: 'Erreur', message: 'Erreur lors de la suppression des données utilisateur', type: 'error' });
      }
    }
  };

  const handleDeleteAllData = async () => {
    const confirmed = await confirm({
      title: '⚠️ DANGER : Supprimer TOUTES les données',
      message: 'Cette action supprimera DÉFINITIVEMENT:\n\n• Toutes les séries (mangas et animes)\n• Tous les tomes\n• Toutes les données de lecture de TOUS les utilisateurs\n• Toutes les images de couvertures\n\nCette action est IRRÉVERSIBLE !\n\nL\'application se fermera automatiquement.',
      confirmText: 'Je comprends, TOUT supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        await window.electronAPI.deleteAllData();
        showToast({ title: 'Suppression en cours...', message: 'L\'application va redémarrer', type: 'info' });
        setTimeout(() => {
          window.electronAPI.quitApp({ shouldRelaunch: true });
        }, 2000);
      } catch (error) {
        showToast({ title: 'Erreur', message: 'Erreur lors de la suppression des données', type: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px' }} className="fade-in">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }} className="fade-in">
      <ConfirmDialog />
      <ToastContainer />
      
      <div className="container">
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '32px' }}>
          ⚙️ Paramètres
        </h1>

        {/* Gestion des utilisateurs */}
        <UserManagement
          users={users}
          userAvatars={userAvatars}
          onUsersChange={loadSettings}
          showToast={showToast}
          confirm={confirm}
        />

        {/* Apparence et comportement */}
        <AppearanceSettings
          theme={theme}
          autoLaunch={autoLaunch}
          contentPrefs={contentPrefs}
          onThemeChange={handleThemeChange}
          onAutoLaunchChange={handleAutoLaunchChange}
          onContentPrefChange={handleContentPrefChange}
        />

        {/* Section Intelligence Artificielle */}
        <AISettings
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
        />

        {/* Import & Synchronisation MyAnimeList */}
        <MALSettings
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malSyncing={malSyncing}
          malAutoSyncEnabled={malAutoSyncEnabled}
          malAutoSyncInterval={malAutoSyncInterval}
          translating={translating}
          translationProgress={translationProgress}
          importingAnimes={importingAnimes}
          animeImportProgress={animeImportProgress}
          importType={importType}
          animeImportResult={animeImportResult}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          onMalTranslateSynopsis={handleMalTranslateSynopsis}
          onMalAutoSyncChange={handleMalAutoSyncChange}
          onMalIntervalChange={handleMalIntervalChange}
          onImportAnimeXml={handleImportAnimeXml}
        />

        {/* AVN - Vérification automatique */}
        <AVNSettings />

        {/* Emplacement de la base de données */}
        <DatabaseSettings
          baseDirectory={baseDirectory}
          exporting={exporting}
          importing={importing}
          showSuccess={showSuccess}
          showExportSuccess={showExportSuccess}
          showImportSuccess={showImportSuccess}
          onChangeBaseDirectory={handleChangeBaseDirectory}
          onExport={handleExport}
          onImport={handleImport}
        />

        {/* Section Danger Zone */}
        <DangerZone
          onDeleteUserData={handleDeleteUserData}
          onDeleteAllData={handleDeleteAllData}
        />
      </div>
    </div>
  );
}
