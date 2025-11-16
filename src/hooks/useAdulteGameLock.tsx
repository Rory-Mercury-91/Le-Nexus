import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface AdulteGameLockContextType {
  isLocked: boolean;
  hasPassword: boolean;
  unlock: () => void;
  lock: () => void;
  checkPassword: () => Promise<void>;
}

const AdulteGameLockContext = createContext<AdulteGameLockContextType | undefined>(undefined);

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes en millisecondes

interface AdulteGameLockProviderProps {
  children: ReactNode;
}

export function AdulteGameLockProvider({ children }: AdulteGameLockProviderProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Vérifier si un mot de passe est défini au chargement
  useEffect(() => {
    checkPassword();
  }, []);

  const checkPassword = async () => {
    try {
      // Vérifier si un mot de passe maître est défini sur cette machine
      const result = await window.electronAPI.hasAdulteGamePassword();

      setHasPassword(result.hasPassword);

      // Si pas de mot de passe, déverrouiller automatiquement
      if (!result.hasPassword) {
        setIsLocked(false);
      } else {
        // Si pas de mot de passe, déverrouiller automatiquement
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Erreur vérification mot de passe jeux adultes:', error);
      // En cas d'erreur, déverrouiller par défaut
      setHasPassword(false);
      setIsLocked(false);
    }
  };

  const resetTimeout = () => {
    // Effacer le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Ne créer un nouveau timeout que si un mot de passe est défini
    if (hasPassword && !isLocked) {
      timeoutRef.current = setTimeout(() => {
        setIsLocked(true);
      }, TIMEOUT_DURATION);
    }
  };

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    resetTimeout();
  };

  // Écouter l'activité utilisateur
  useEffect(() => {
    if (!hasPassword || isLocked) {
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Initialiser le timeout
    resetTimeout();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hasPassword, isLocked]);

  const unlock = () => {
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    resetTimeout();
  };

  const lock = () => {
    setIsLocked(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const value = {
    isLocked,
    hasPassword,
    unlock,
    lock,
    checkPassword
  };

  return (
    <AdulteGameLockContext.Provider value={value}>
      {children}
    </AdulteGameLockContext.Provider>
  );
}

export function useAdulteGameLock() {
  const context = useContext(AdulteGameLockContext);
  if (context === undefined) {
    throw new Error('useAdulteGameLock doit être utilisé dans un AdulteGameLockProvider');
  }
  return context;
}

// Alias pour compatibilité
