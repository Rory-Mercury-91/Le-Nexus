import { useEffect } from 'react';

/**
 * Hook pour écouter et afficher les logs du backend dans la console DevTools
 * Les logs sont affichés uniquement si le mode verbose est activé
 */
export function useBackendLogger() {
  useEffect(() => {
    // Écouter les logs du backend
    const unsubscribe = window.electronAPI.onBackendLog?.((logData) => {
      if (!logData) return;

      // Gérer les logs en buffer (envoyés au démarrage si le mode verbose était déjà activé)
      if (logData.type === 'buffer' && Array.isArray(logData.logs)) {
        console.group('📦 Logs backend (buffer)');
        logData.logs.forEach((log: any) => {
          const level = log.level || 'log';
          const args = log.args || [];
          const timestamp = log.timestamp ? `[${new Date(log.timestamp).toLocaleTimeString()}] ` : '';
          
          // Afficher avec le bon niveau
          const consoleMethod = (console as any)[level] || console.log;
          consoleMethod(`${timestamp}[BACKEND]`, ...args);
        });
        console.groupEnd();
        return;
      }

      // Gérer les logs individuels
      if (logData.type === 'log') {
        const level = logData.level || 'log';
        const args = logData.args || [];
        const timestamp = logData.timestamp ? `[${new Date(logData.timestamp).toLocaleTimeString()}] ` : '';
        
        // Afficher avec le bon niveau et préfixe [BACKEND]
        const consoleMethod = (console as any)[level] || console.log;
        consoleMethod(`${timestamp}[BACKEND]`, ...args);
      }
    });

    // Nettoyer l'écouteur à la destruction du composant
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
}
