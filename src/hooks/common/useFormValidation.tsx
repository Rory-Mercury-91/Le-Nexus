import { useCallback } from 'react';
import { useToast } from './useToast';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox';
  required?: boolean;
  step?: string;
  [key: string]: any;
}

export interface FormValidationOptions {
  /** Fonction pour normaliser des valeurs spéciales (ex: chemins d'image) */
  normalizeValue?: (field: FormField, value: any) => any;
  /** Fonction pour préserver certaines valeurs (ex: genres) */
  preserveValues?: (formData: Record<string, any>) => Record<string, any>;
}

/**
 * Hook pour valider et normaliser les données de formulaire
 * Utilisé par EditItemModal, AddTmdbItemModal, AddMalItemModal, etc.
 */
export function useFormValidation() {
  const { showToast } = useToast();

  /**
   * Valide que tous les champs requis sont remplis
   * @returns true si valide, false sinon (et affiche un toast d'erreur)
   */
  const validateRequiredFields = useCallback((
    formData: Record<string, any>,
    formFields: FormField[]
  ): boolean => {
    const requiredFields = formFields.filter(f => f.required);
    
    for (const field of requiredFields) {
      const value = formData[field.key];
      if (!value || (typeof value === 'string' && !value.trim())) {
        showToast({ 
          title: `Le champ "${field.label}" est obligatoire`, 
          type: 'error' 
        });
        return false;
      }
    }
    
    return true;
  }, [showToast]);

  /**
   * Normalise les données du formulaire pour l'API
   * - Convertit les nombres (int ou float selon step)
   * - Trim les strings
   * - Gère les valeurs null/undefined
   * - Applique les normalisations personnalisées
   */
  const normalizeFormData = useCallback((
    formData: Record<string, any>,
    formFields: FormField[],
    options: FormValidationOptions = {}
  ): Record<string, any> => {
    const { normalizeValue, preserveValues } = options;
    const submitData: Record<string, any> = {};

    formFields.forEach(field => {
      const value = formData[field.key];
      
      // Si valeur vide, null ou undefined
      if (value === '' || value === null || value === undefined) {
        submitData[field.key] = null;
        return;
      }

      // Normalisation personnalisée (prioritaire)
      if (normalizeValue) {
        const normalized = normalizeValue(field, value);
        if (normalized !== undefined) {
          submitData[field.key] = normalized;
          return;
        }
      }

      // Normalisation par type
      if (field.type === 'number') {
        submitData[field.key] = field.step === '0.001' 
          ? parseFloat(String(value))
          : parseInt(String(value), 10);
      } else if (field.type === 'text' || field.type === 'textarea') {
        submitData[field.key] = String(value).trim() || null;
      } else {
        submitData[field.key] = value || null;
      }
    });

    // Préserver certaines valeurs (ex: genres)
    if (preserveValues) {
      const preserved = preserveValues(formData);
      Object.assign(submitData, preserved);
    }

    return submitData;
  }, []);

  /**
   * Valide et normalise les données en une seule opération
   * @returns Les données normalisées si valide, null sinon
   */
  const validateAndNormalize = useCallback((
    formData: Record<string, any>,
    formFields: FormField[],
    options: FormValidationOptions = {}
  ): Record<string, any> | null => {
    if (!validateRequiredFields(formData, formFields)) {
      return null;
    }
    
    return normalizeFormData(formData, formFields, options);
  }, [validateRequiredFields, normalizeFormData]);

  return {
    validateRequiredFields,
    normalizeFormData,
    validateAndNormalize
  };
}
