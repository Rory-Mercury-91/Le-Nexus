import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../common/useToast';

export function useTraductionSettings() {
  const [traductionAutoSyncEnabled, setTraductionAutoSyncEnabled] = useState(false);
  const [traductionAutoSyncInterval, setTraductionAutoSyncInterval] = useState(6);
  const { showToast } = useToast();

  // Charger les paramètres de synchronisation automatique
  const loadTraductionAutoSyncSettings = useCallback(async () => {
    try {
      // Vérifier que la fonction existe avant de l'appeler
      if (!window.electronAPI?.traductionGetAutoSyncSettings) {
        console.warn('traductionGetAutoSyncSettings non disponible');
        return;
      }
      const settings = await window.electronAPI.traductionGetAutoSyncSettings();
      setTraductionAutoSyncEnabled(settings.enabled);
      setTraductionAutoSyncInterval(settings.intervalHours);
    } catch (error) {
      console.error('Erreur chargement paramètres sync auto traductions:', error);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    loadTraductionAutoSyncSettings();
  }, [loadTraductionAutoSyncSettings]);

  // Modifier l'intervalle de synchronisation (appelé par le système global)
  const handleTraductionIntervalChange = async (intervalHours: number) => {
    const previousInterval = traductionAutoSyncInterval;
    setTraductionAutoSyncInterval(intervalHours);
    try {
      // Vérifier que la fonction existe avant de l'appeler
      if (!window.electronAPI?.traductionSetAutoSyncInterval) {
        console.warn('traductionSetAutoSyncInterval non disponible');
        return;
      }
      await window.electronAPI.traductionSetAutoSyncInterval(intervalHours);
    } catch (error: any) {
      setTraductionAutoSyncInterval(previousInterval);
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
    traductionAutoSyncEnabled,
    traductionAutoSyncInterval,
    handleTraductionIntervalChange,
    loadTraductionAutoSyncSettings
  };
}
