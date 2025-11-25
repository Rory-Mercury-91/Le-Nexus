import { useState } from 'react';
import { useToast } from './useToast';

interface UseTranslationOptions {
  /** Texte à traduire */
  text: string;
  /** Fonction de callback pour mettre à jour le texte traduit */
  onTranslated: (translatedText: string) => void;
  /** Message d'erreur si le texte est trop court */
  minLength?: number;
  /** Message d'erreur personnalisé */
  errorMessage?: string;
  /** Vérifier si le texte est déjà traduit */
  checkAlreadyTranslated?: (text: string) => boolean;
}

/**
 * Hook pour gérer la traduction de texte
 * Utilisé dans les modales Edit pour traduire description/background
 */
export function useTranslation() {
  const { showToast } = useToast();
  const [translating, setTranslating] = useState(false);

  const translate = async (options: UseTranslationOptions) => {
    const {
      text,
      onTranslated,
      minLength = 10,
      errorMessage,
      checkAlreadyTranslated
    } = options;

    if (!text || text.trim().length < minLength) {
      showToast({
        title: errorMessage || 'Texte trop court pour être traduit',
        type: 'error'
      });
      return;
    }

    if (checkAlreadyTranslated && checkAlreadyTranslated(text)) {
      showToast({
        title: 'Ce texte semble déjà traduit',
        type: 'error'
      });
      return;
    }

    setTranslating(true);
    try {
      const result = await window.electronAPI.translateText(text, 'fr');
      if (result.success && result.text) {
        onTranslated(result.text);
        showToast({
          title: 'Texte traduit avec succès',
          type: 'success'
        });
      } else {
        showToast({
          title: `Erreur de traduction: ${result.error || 'Clé API manquante'}`,
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur traduction:', error);
      showToast({
        title: error?.message || 'Erreur lors de la traduction',
        type: 'error'
      });
    } finally {
      setTranslating(false);
    }
  };

  return {
    translate,
    translating
  };
}
