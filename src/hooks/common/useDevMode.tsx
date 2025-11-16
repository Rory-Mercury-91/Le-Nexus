import { useEffect, useState } from 'react';

export function useDevMode() {
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevMode();
    
    // Écouter les changements du mode dev
    const interval = setInterval(() => {
      loadDevMode();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDevMode = async () => {
    try {
      const enabled = await window.electronAPI.getDevMode?.();
      setDevMode(enabled || false);
    } catch (error) {
      console.error('Erreur chargement mode dev:', error);
      setDevMode(false);
    } finally {
      setLoading(false);
    }
  };

  return { devMode, loading };
}
