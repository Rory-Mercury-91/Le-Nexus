import { useEffect, useState } from 'react';
import type { ContentPreferences } from '../types';

export interface OnboardingData {
  name: string;
  emoji: string;
  color: string;
  avatarFile: File | string | null;
  avatarPreview: string | null;
  baseDirectory: string | null;
  showMangas: boolean;
  showAnimes: boolean;
  showMovies: boolean;
  showSeries: boolean;
  showAdulteGame: boolean;
  showBooks: boolean;
  adulteGamePassword: string;
  adulteGamePasswordConfirm: string;
}

interface UseOnboardingReturn {
  step: number;
  data: OnboardingData;
  loading: boolean;
  error: string;
  showAdulteGamePassword: boolean;
  showAdulteGamePasswordConfirm: boolean;
  hasExistingDatabases: boolean;
  existingUsers: Array<{ name: string; emoji: string; color: string; avatar_path: string | null }>;
  autoConnectUser: string | null;
  setStep: (step: number) => void;
  setName: (name: string) => void;
  setEmoji: (emoji: string) => void;
  setColor: (color: string) => void;
  setAvatarFile: (file: File | string | null) => void;
  setAvatarPreview: (preview: string | null) => void;
  setBaseDirectory: (dir: string | null) => void;
  setShowMangas: (show: boolean) => void;
  setShowAnimes: (show: boolean) => void;
  setShowMovies: (show: boolean) => void;
  setShowSeries: (show: boolean) => void;
  setShowAdulteGame: (show: boolean) => void;
  setAdulteGamePassword: (password: string) => void;
  setAdulteGamePasswordConfirm: (password: string) => void;
  setShowAdulteGamePassword: (show: boolean) => void;
  setShowAdulteGamePasswordConfirm: (show: boolean) => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  handleNext: () => void;
  handleBack: () => void;
  handleChooseDirectory: () => Promise<void>;
  handleAvatarSelect: () => Promise<void>;
  handleRemoveAvatar: () => void;
  handleComplete: (onComplete: () => void) => Promise<void>;
  handleSelectExistingUser: (userName: string, onComplete: () => void) => Promise<void>;
  handleCreateNewProfile: () => void;
}

export function useOnboarding(initialStep: number = 1, initialBaseDirectory: string | null = null): UseOnboardingReturn {
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [color, setColor] = useState('#8b5cf6');
  const [avatarFile, setAvatarFile] = useState<File | string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [baseDirectory, setBaseDirectory] = useState<string | null>(initialBaseDirectory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingDatabases, setHasExistingDatabases] = useState(false);
  const [existingUsers, setExistingUsers] = useState<Array<{ name: string; emoji: string; color: string; avatar_path: string | null }>>([]);
  const [autoConnectUser, setAutoConnectUser] = useState<string | null>(null);

  // Préférences de contenu
  const defaultContentPrefs: ContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showVideos: true,
    showAdulteGame: true,
    showBooks: true
  };
  const [showMangas, setShowMangas] = useState(defaultContentPrefs.showMangas);
  const [showAnimes, setShowAnimes] = useState(defaultContentPrefs.showAnimes);
  const [showMovies, setShowMovies] = useState(defaultContentPrefs.showMovies);
  const [showSeries, setShowSeries] = useState(defaultContentPrefs.showSeries);
  const [showAdulteGame, setShowAdulteGame] = useState(defaultContentPrefs.showAdulteGame);
  // showBooks est synchronisé avec showMangas, donc on utilise showMangas comme valeur
  const showBooks = showMangas;

  // Mot de passe jeux adultes
  const [adulteGamePassword, setAdulteGamePassword] = useState('');
  const [adulteGamePasswordConfirm, setAdulteGamePasswordConfirm] = useState('');
  const [showAdulteGamePassword, setShowAdulteGamePassword] = useState(false);
  const [showAdulteGamePasswordConfirm, setShowAdulteGamePasswordConfirm] = useState(false);

  // Si on démarre directement à l'étape 3, configurer le baseDirectory
  useEffect(() => {
    if (step === 3 && baseDirectory && !loading) {
      // Configurer l'emplacement si ce n'est pas déjà fait
      window.electronAPI.setBaseDirectory(baseDirectory).catch(error => {
        console.error('Erreur lors de la configuration de l\'emplacement:', error);
      });
    }
  }, [step, baseDirectory, loading]);

  // Vérifier les bases existantes quand un emplacement est sélectionné
  useEffect(() => {
    const checkDatabases = async () => {
      if (!baseDirectory) {
        setHasExistingDatabases(false);
        setExistingUsers([]);
        return;
      }

      try {
        // Configurer l'emplacement temporairement pour vérifier les bases
        // Il faut d'abord configurer l'emplacement pour que getAllUsers puisse fonctionner
        await window.electronAPI.setBaseDirectory(baseDirectory);

        // Attendre un peu pour que l'emplacement soit bien configuré
        await new Promise(resolve => setTimeout(resolve, 300));

        const checkResult = await window.electronAPI.checkDatabasesInLocation(baseDirectory);
        if (checkResult.success && checkResult.hasDatabases) {
          setHasExistingDatabases(true);
          // Charger les utilisateurs depuis les bases trouvées
          const users = await window.electronAPI.getAllUsers();
          setExistingUsers(users || []);

          // Si une seule base de données, marquer pour connexion automatique
          if (users && users.length === 1 && step === 2) {
            const singleUser = users[0].name;
            setAutoConnectUser(singleUser);
          } else {
            setAutoConnectUser(null);
          }
        } else {
          setHasExistingDatabases(false);
          setExistingUsers([]);
          // Si aucune base n'existe et qu'on est à l'étape 2, passer automatiquement à l'étape 3
          // Utiliser setTimeout pour éviter les mises à jour d'état pendant le rendu
          setTimeout(() => {
            if (step === 2) {
              setStep(3);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des bases:', error);
        setHasExistingDatabases(false);
        setExistingUsers([]);
        // En cas d'erreur, permettre quand même de continuer
        setTimeout(() => {
          if (step === 2) {
            setStep(3);
          }
        }, 100);
      }
    };

    checkDatabases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDirectory]);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Si des bases existent, on reste à l'étape 2 pour afficher le sélecteur
      // Sinon, on passe directement à l'étape 3
      if (!baseDirectory) {
        setError('Veuillez sélectionner un emplacement pour la base de données');
        return;
      }
      // Si des bases existent, on reste à l'étape 2 pour afficher le sélecteur utilisateur
      // Le sélecteur gérera la sélection ou la création d'un nouveau profil
      if (hasExistingDatabases && existingUsers.length > 0) {
        // Rester à l'étape 2 pour afficher le sélecteur utilisateur
        setError('');
        return;
      }
      // Pas de bases existantes, passer à l'étape 3 pour créer un nouveau profil
      setError('');
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleChooseDirectory = async () => {
    try {
      const result = await window.electronAPI.chooseBaseDirectory();
      if (result.success && result.path) {
        setBaseDirectory(result.path);
        setError('');
      } else {
        setError(result.error || 'Erreur lors de la sélection du répertoire');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du répertoire:', error);
      setError('Une erreur est survenue lors de la sélection du répertoire');
    }
  };

  const handleAvatarSelect = async () => {
    const result = await window.electronAPI.chooseAvatarFile();
    if (result.success && result.path) {
      setAvatarFile(result.path as any);
      setAvatarPreview(`manga://${encodeURIComponent(result.path)}`);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSelectExistingUser = async (userName: string, onComplete: () => void) => {
    setLoading(true);
    setError('');

    try {
      if (!baseDirectory) {
        setError('Aucun emplacement sélectionné');
        setLoading(false);
        return;
      }

      // Configurer l'emplacement
      const setDirectoryResult = await window.electronAPI.setBaseDirectory(baseDirectory);
      if (!setDirectoryResult.success) {
        setError(setDirectoryResult.error || 'Erreur lors de la définition de l\'emplacement');
        setLoading(false);
        return;
      }

      // Sélectionner l'utilisateur existant
      await window.electronAPI.setCurrentUser(userName);

      // Sauvegarder dans localStorage pour que App.tsx le détecte
      localStorage.setItem('currentUser', userName);

      // Compléter l'onboarding (sans rechargement, onComplete gère la transition)
      setTimeout(() => {
        onComplete();
      }, 300);
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'utilisateur:', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  const handleCreateNewProfile = () => {
    // Passer à l'étape 3 pour créer un nouveau profil
    setStep(3);
    setError('');
  };

  const handleComplete = async (onComplete: () => void) => {
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!name.trim()) {
        setError('Veuillez saisir un nom');
        setLoading(false);
        return;
      }

      if (!baseDirectory) {
        setError('Veuillez sélectionner un emplacement pour la base de données');
        setLoading(false);
        return;
      }

      // Calculer showVideos à partir des 3 options (pour la migration)
      const showVideos = showAnimes || showMovies || showSeries;
      if (!showMangas && !showVideos && !showAdulteGame) {
        setError('Veuillez sélectionner au moins un type de contenu');
        setLoading(false);
        return;
      }

      if (adulteGamePassword && adulteGamePassword !== adulteGamePasswordConfirm) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      if (adulteGamePassword && adulteGamePassword.length < 4) {
        setError('Le mot de passe doit contenir au moins 4 caractères');
        setLoading(false);
        return;
      }

      // Définir l'emplacement de la base de données
      const setDirectoryResult = await window.electronAPI.setBaseDirectory(baseDirectory);
      if (!setDirectoryResult.success) {
        setError(setDirectoryResult.error || 'Erreur lors de la définition de l\'emplacement');
        setLoading(false);
        return;
      }

      // Créer l'utilisateur dans la DB actuelle
      const result = await window.electronAPI.createUser({
        name: name.trim(),
        emoji,
        color,
      });

      if (!result.success || !result.user) {
        setError(result.error || 'Erreur lors de la création de l\'utilisateur');
        setLoading(false);
        return;
      }

      // Si un avatar a été sélectionné, le copier
      if (avatarFile && result.user.id) {
        await window.electronAPI.setUserAvatarFromPath(result.user.id, avatarFile as any, result.user.name);
      }

      // Définir l'utilisateur actuel
      // Utiliser result.user.name pour garantir la correspondance exacte avec la base de données
      const userName = result.user.name;

      // Sauvegarder dans localStorage AVANT d'appeler setCurrentUser
      localStorage.setItem('currentUser', userName);

      await window.electronAPI.setCurrentUser(userName);

      // Sauvegarder les préférences de contenu
      // Synchroniser showBooks avec showMangas
      await window.electronAPI.setContentPreferences(userName, {
        showMangas,
        showAnimes,
        showMovies,
        showSeries,
        showVideos,
        showAdulteGame,
        showBooks: showMangas // Synchroniser avec showMangas
      });

      // Définir le mot de passe jeux adultes maître si fourni
      if (adulteGamePassword) {
        try {
          await window.electronAPI.setAdulteGamePassword(adulteGamePassword);
        } catch (error) {
          console.error('Erreur lors de la définition du mot de passe maître jeux adultes:', error);
        }
      }

      // Marquer que l'onboarding est terminé et qu'un utilisateur a été créé
      // Cela permettra à App.tsx de charger directement l'utilisateur
      setLoading(false);

      // Compléter l'onboarding
      // onComplete va vérifier localStorage.getItem('currentUser') et charger l'utilisateur
      onComplete();
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return {
    step,
    data: {
      name,
      emoji,
      color,
      avatarFile,
      avatarPreview,
      baseDirectory,
      showMangas,
      showAnimes,
      showMovies,
      showSeries,
      showAdulteGame,
      showBooks,
      adulteGamePassword,
      adulteGamePasswordConfirm
    },
    loading,
    error,
    showAdulteGamePassword,
    showAdulteGamePasswordConfirm,
    hasExistingDatabases,
    existingUsers,
    autoConnectUser,
    setStep,
    setName,
    setEmoji,
    setColor,
    setAvatarFile,
    setAvatarPreview,
    setBaseDirectory,
    setShowMangas,
    setShowAnimes,
    setShowMovies,
    setShowSeries,
    setShowAdulteGame,
    setAdulteGamePassword,
    setAdulteGamePasswordConfirm,
    setShowAdulteGamePassword,
    setShowAdulteGamePasswordConfirm,
    setError,
    setLoading,
    handleNext,
    handleBack,
    handleChooseDirectory,
    handleAvatarSelect,
    handleRemoveAvatar,
    handleComplete,
    handleSelectExistingUser,
    handleCreateNewProfile
  };
}
