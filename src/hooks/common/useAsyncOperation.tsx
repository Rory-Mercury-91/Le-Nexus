import { useState, useCallback } from 'react';
import { useToast } from './useToast';

interface AsyncOperationOptions<T> {
  /** Opération async à exécuter */
  operation: () => Promise<T>;
  /** Message de succès */
  successMessage?: string;
  /** Message d'erreur par défaut */
  errorMessage?: string;
  /** Callback appelé en cas de succès */
  onSuccess?: (result: T) => void;
  /** Callback appelé en cas d'erreur */
  onError?: (error: any) => void;
  /** Callback appelé après l'opération (succès ou erreur) */
  onFinally?: () => void;
  /** Extraire le message d'erreur depuis le résultat */
  extractError?: (result: T) => string | null;
  /** Vérifier si le résultat est un succès */
  checkSuccess?: (result: T) => boolean;
}

/**
 * Hook pour gérer les opérations async avec gestion d'erreurs automatique
 * Réduit la duplication de code pour les try/catch/showToast
 */
export function useAsyncOperation() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async <T,>(options: AsyncOperationOptions<T>): Promise<T | null> => {
    const {
      operation,
      successMessage,
      errorMessage = 'Erreur lors de l\'opération',
      onSuccess,
      onError,
      onFinally,
      extractError,
      checkSuccess
    } = options;

    setLoading(true);
    try {
      const result = await operation();

      // Vérifier si c'est un succès
      const isSuccess = checkSuccess 
        ? checkSuccess(result)
        : (result as any)?.success !== false;

      if (isSuccess) {
        if (successMessage) {
          showToast({ title: successMessage, type: 'success' });
        }
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } else {
        // Échec mais pas d'exception
        const errorMsg = extractError 
          ? extractError(result)
          : (result as any)?.error || errorMessage;
        
        showToast({ title: errorMsg || errorMessage, type: 'error' });
        if (onError) {
          onError(result);
        }
        return null;
      }
    } catch (error: any) {
      console.error('Erreur opération async:', error);
      const errorMsg = error?.message || errorMessage;
      showToast({ title: errorMsg, type: 'error' });
      if (onError) {
        onError(error);
      }
      return null;
    } finally {
      setLoading(false);
      if (onFinally) {
        onFinally();
      }
    }
  }, [showToast]);

  return {
    execute,
    loading
  };
}
