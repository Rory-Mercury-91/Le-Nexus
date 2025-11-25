import { useEffect, useState } from 'react';
import { useToast } from '../common/useToast';

export function useAppSettings() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [autoDownloadCovers, setAutoDownloadCovers] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [baseDirectory, setBaseDirectory] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadTheme();
    loadAutoLaunch();
    loadAutoDownloadCovers();
    loadGroqApiKey();
    loadBaseDirectory();
  }, []);

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

  const loadAutoDownloadCovers = async () => {
    try {
      if (window.electronAPI.getAutoDownloadCovers) {
        const enabled = await window.electronAPI.getAutoDownloadCovers();
        setAutoDownloadCovers(enabled);
      }
    } catch (error) {
      console.error('Erreur chargement auto-download covers:', error);
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

  const loadBaseDirectory = async () => {
    const baseDir = await window.electronAPI.getBaseDirectory();
    setBaseDirectory(baseDir || 'Non configuré');
  };

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

  const handleAutoDownloadCoversChange = async (enabled: boolean) => {
    try {
      if (window.electronAPI.setAutoDownloadCovers) {
        await window.electronAPI.setAutoDownloadCovers(enabled);
      }
      setAutoDownloadCovers(enabled);
      showToast({
        title: enabled ? 'Téléchargement automatique activé' : 'Téléchargement automatique désactivé',
        message: enabled ? 'Les couvertures seront téléchargées localement lors des imports' : '',
        type: 'success'
      });
    } catch (error) {
      showToast({ title: 'Erreur lors de la modification', message: '', type: 'error' });
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

  return {
    theme,
    autoLaunch,
    autoDownloadCovers,
    groqApiKey,
    baseDirectory,
    showSuccess,
    handleThemeChange,
    handleAutoLaunchChange,
    handleAutoDownloadCoversChange,
    handleGroqApiKeyChange,
    handleChangeBaseDirectory
  };
}
