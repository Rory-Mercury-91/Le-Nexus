import { useEffect, useState } from 'react';
import { useToast } from '../common/useToast';

export function useNautiljonSettings() {
  const [nautiljonAutoSyncEnabled, setNautiljonAutoSyncEnabled] = useState(false);
  const [nautiljonAutoSyncInterval, setNautiljonAutoSyncInterval] = useState(6);
  const [nautiljonAutoSyncIncludeTomes, setNautiljonAutoSyncIncludeTomes] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    loadNautiljonAutoSyncSettings();
  }, []);

  const loadNautiljonAutoSyncSettings = async () => {
    try {
      const settings = await window.electronAPI.nautiljonGetAutoSyncSettings();
      setNautiljonAutoSyncEnabled(settings.enabled);
      setNautiljonAutoSyncInterval(settings.intervalHours);
      setNautiljonAutoSyncIncludeTomes(settings.includeTomes || false);
    } catch (error) {
      console.error('Erreur chargement paramètres sync auto Nautiljon:', error);
    }
  };

  const handleNautiljonAutoSyncChange = async (enabled: boolean) => {
    const previousValue = nautiljonAutoSyncEnabled;
    setNautiljonAutoSyncEnabled(enabled);
    try {
      await window.electronAPI.nautiljonSetAutoSync(enabled, nautiljonAutoSyncInterval, nautiljonAutoSyncIncludeTomes);
      showToast({
        title: enabled ? '✅ Synchronisation activée' : '⏸️ Synchronisation désactivée',
        message: enabled ? `Synchronisation toutes les ${nautiljonAutoSyncInterval}h` : 'Les synchronisations automatiques sont désactivées',
        type: 'success'
      });
    } catch (error: any) {
      setNautiljonAutoSyncEnabled(previousValue);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible de modifier la synchronisation',
        type: 'error'
      });
    }
  };

  const handleNautiljonIntervalChange = async (intervalHours: number) => {
    const previousInterval = nautiljonAutoSyncInterval;
    setNautiljonAutoSyncInterval(intervalHours);
    try {
      await window.electronAPI.nautiljonSetAutoSync(nautiljonAutoSyncEnabled, intervalHours, nautiljonAutoSyncIncludeTomes);
      showToast({
        title: 'Intervalle modifié',
        message: `Synchronisation toutes les ${intervalHours}h`,
        type: 'success'
      });
    } catch (error: any) {
      setNautiljonAutoSyncInterval(previousInterval);
      const message = error?.message || 'Impossible de modifier l\'intervalle';
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

  const handleNautiljonIncludeTomesChange = async (includeTomes: boolean) => {
    const previousValue = nautiljonAutoSyncIncludeTomes;
    setNautiljonAutoSyncIncludeTomes(includeTomes);
    try {
      await window.electronAPI.nautiljonSetAutoSync(nautiljonAutoSyncEnabled, nautiljonAutoSyncInterval, includeTomes);
      showToast({
        title: includeTomes ? '✅ Tomes inclus' : '⏸️ Tomes exclus',
        message: includeTomes ? 'Les tomes seront mis à jour lors de la synchronisation' : 'Seules les informations seront mises à jour',
        type: 'success'
      });
    } catch (error: any) {
      setNautiljonAutoSyncIncludeTomes(previousValue);
      showToast({ title: 'Erreur', message: error.message || 'Impossible de modifier l\'intervalle', type: 'error' });
    }
  };

  return {
    nautiljonAutoSyncEnabled,
    nautiljonAutoSyncInterval,
    nautiljonAutoSyncIncludeTomes,
    handleNautiljonAutoSyncChange,
    handleNautiljonIntervalChange,
    handleNautiljonIncludeTomesChange
  };
}
