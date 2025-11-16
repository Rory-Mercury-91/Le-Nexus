import { useEffect, useState } from 'react';

interface UsePersistentStateOptions<T> {
  validator?: (value: unknown) => value is T;
  storage?: 'local' | 'session';
}

function getBrowserStorage(storageType: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return storageType === 'session' ? window.sessionStorage : window.localStorage;
  } catch (error) {
    console.warn(`[usePersistentState] Impossible d'accéder à ${storageType}Storage:`, error);
    return null;
  }
}

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: UsePersistentStateOptions<T>
) {
  const { validator, storage = 'local' } = options || {};

  const [value, setValue] = useState<T>(() => {
    const storageObject = getBrowserStorage(storage);

    if (!storageObject) {
      return initialValue;
    }

    try {
      const stored = storageObject.getItem(key);
      if (stored === null) {
        return initialValue;
      }

      const parsed = JSON.parse(stored);
      if (validator && !validator(parsed)) {
        return initialValue;
      }

      return parsed as T;
    } catch (error) {
      console.warn(`[usePersistentState] Impossible de lire la clé "${key}" depuis ${storage}Storage:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    const storageObject = getBrowserStorage(storage);
    if (!storageObject) {
      return;
    }

    try {
      storageObject.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[usePersistentState] Impossible d'enregistrer la clé "${key}" dans ${storage}Storage:`, error);
    }
  }, [key, value, storage]);

  return [value, setValue] as const;
}
