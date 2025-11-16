import { useState } from 'react';
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
}

export function useOnboarding(): UseOnboardingReturn {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [color, setColor] = useState('#8b5cf6');
  const [avatarFile, setAvatarFile] = useState<File | string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [baseDirectory, setBaseDirectory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Préférences de contenu
  const defaultContentPrefs: ContentPreferences = {
    showMangas: true,
    showAnimes: true,
    showMovies: true,
    showSeries: true,
    showAdulteGame: true
  };
  const [showMangas, setShowMangas] = useState(defaultContentPrefs.showMangas);
  const [showAnimes, setShowAnimes] = useState(defaultContentPrefs.showAnimes);
  const [showMovies, setShowMovies] = useState(defaultContentPrefs.showMovies);
  const [showSeries, setShowSeries] = useState(defaultContentPrefs.showSeries);
  const [showAdulteGame, setShowAdulteGame] = useState(defaultContentPrefs.showAdulteGame);

  // Mot de passe jeux adultes (optionnel)
  const [adulteGamePassword, setAdulteGamePassword] = useState('');
  const [adulteGamePasswordConfirm, setAdulteGamePasswordConfirm] = useState('');
  const [showAdulteGamePassword, setShowAdulteGamePassword] = useState(false);
  const [showAdulteGamePasswordConfirm, setShowAdulteGamePasswordConfirm] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) {
        setError('Veuillez saisir un nom');
        return;
      }
      setError('');
      setStep(3);
    } else if (step === 3) {
      // Valider qu'un emplacement a été sélectionné
      if (!baseDirectory) {
        setError('Veuillez sélectionner un emplacement pour la base de données');
        return;
      }
      setError('');
      setStep(4);
    } else if (step === 4) {
      // Valider qu'au moins un type de contenu est sélectionné
      if (!showMangas && !showAnimes && !showMovies && !showSeries && !showAdulteGame) {
        setError('Veuillez sélectionner au moins un type de contenu');
        return;
      }
      setError('');
      // Si jeux adultes est activé, proposer le mot de passe
      if (showAdulteGame) {
        setStep(5);
      } else {
        setStep(6);
      }
    } else if (step === 5) {
      // Valider le mot de passe jeux adultes si renseigné
      if (adulteGamePassword && adulteGamePassword !== adulteGamePasswordConfirm) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
      if (adulteGamePassword && adulteGamePassword.length < 4) {
        setError('Le mot de passe doit contenir au moins 4 caractères');
        return;
      }
      setError('');
      setStep(6);
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
      setAvatarFile(result.path as any); // On stocke le chemin au lieu du File
      // Utiliser le protocole manga:// pour afficher l'image
      setAvatarPreview(`manga://${encodeURIComponent(result.path)}`);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleComplete = async (onComplete: () => void) => {
    setLoading(true);
    setError('');

    try {
      // S'assurer qu'un emplacement a été sélectionné
      if (!baseDirectory) {
        setError('Veuillez sélectionner un emplacement pour la base de données');
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
      const userName = name.trim();
      await window.electronAPI.setCurrentUser(userName);

      // Sauvegarder les préférences de contenu
      await window.electronAPI.setContentPreferences(userName, {
        showMangas,
        showAnimes,
        showMovies,
        showSeries,
        showAdulteGame
      });

      // Définir le mot de passe jeux adultes maître si fourni
      if (adulteGamePassword) {
        try {
          await window.electronAPI.setAdulteGamePassword(adulteGamePassword);
        } catch (error) {
          console.error('Erreur lors de la définition du mot de passe maître jeux adultes:', error);
        }
      }

      // Compléter l'onboarding
      setTimeout(() => {
        onComplete();
      }, 500);
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
      adulteGamePassword,
      adulteGamePasswordConfirm
    },
    loading,
    error,
    showAdulteGamePassword,
    showAdulteGamePasswordConfirm,
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
    handleComplete
  };
}
