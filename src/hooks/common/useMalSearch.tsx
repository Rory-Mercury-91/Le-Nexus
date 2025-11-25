import { useCallback, useState } from 'react';
import { useToast } from './useToast';

/**
 * Type générique pour un résultat de recherche MAL/Jikan
 */
export interface MalSearchResult {
  id: string;
  titre: string;
  description?: string;
  couverture?: string | null;
  source?: string;
  [key: string]: any;
}

/**
 * Configuration pour la recherche MAL/Jikan
 */
export interface MalSearchConfig<TResult extends MalSearchResult> {
  /** Type de média ('anime' ou 'manga') */
  mediaType: 'anime' | 'manga';
  /** Fonction pour rechercher par titre */
  searchApi: (query: string) => Promise<TResult[]>;
  /** Fonction pour rechercher directement par ID MAL via Jikan */
  searchByIdApi?: (malId: number) => Promise<TResult | null>;
  /** Fonction pour importer directement par ID MAL */
  importDirectlyApi: (malId: number, options?: any) => Promise<{
    success: boolean;
    requiresSelection?: boolean;
    candidates?: Array<{
      id: number;
      titre: string;
      [key: string]: any;
    }>;
    error?: string;
    [key: string]: any;
  }>;
  /** Options pour l'import direct */
  importOptions?: any;
  /** Message de succès pour l'import */
  importSuccessMessage?: string;
  /** Message d'erreur pour l'import */
  importErrorMessage?: string;
}

/**
 * Résultat du hook useMalSearch
 */
export interface UseMalSearchResult<TResult extends MalSearchResult> {
  /** Terme de recherche */
  searchTerm: string;
  /** Définir le terme de recherche */
  setSearchTerm: (value: string) => void;
  /** Résultats de recherche */
  searchResults: TResult[];
  /** En cours de recherche */
  searching: boolean;
  /** En cours d'import direct */
  importingDirectly: boolean;
  /** Lancer une recherche */
  handleSearch: () => Promise<void>;
  /** Sélectionner un résultat (pour pré-remplir le formulaire) */
  handleSelectResult: (result: TResult) => void;
  /** Importer directement par ID MAL */
  handleImportDirectly: (malId: number) => Promise<{
    success: boolean;
    requiresSelection?: boolean;
    candidates?: Array<any>;
  }>;
  /** Réinitialiser les résultats */
  clearResults: () => void;
}

/**
 * Hook générique pour la recherche et l'import MAL/Jikan
 * 
 * @example
 * ```tsx
 * const {
 *   searchTerm,
 *   setSearchTerm,
 *   searchResults,
 *   searching,
 *   importingDirectly,
 *   handleSearch,
 *   handleSelectResult,
 *   handleImportDirectly
 * } = useMalSearch({
 *   mediaType: 'anime',
 *   searchApi: (query) => window.electronAPI.searchAnime(query),
 *   searchByIdApi: async (malId) => {
 *     const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`);
 *     const json = await res.json();
 *     return json?.data ? { id: json.data.mal_id.toString(), titre: json.data.title, ... } : null;
 *   },
 *   importDirectlyApi: (id) => window.electronAPI.addAnimeByMalId(id, {}),
 *   importSuccessMessage: 'Anime importé avec succès',
 *   importErrorMessage: 'Erreur lors de l\'import'
 * });
 * ```
 */
export function useMalSearch<TResult extends MalSearchResult>(
  config: MalSearchConfig<TResult>
): UseMalSearchResult<TResult> {
  const {
    searchApi,
    searchByIdApi,
    importDirectlyApi,
    importOptions,
    importSuccessMessage = 'Élément importé avec succès',
    importErrorMessage = 'Erreur lors de l\'import'
  } = config;

  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingDirectly, setImportingDirectly] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const isNumericId = /^\d+$/.test(searchTerm.trim());

      if (isNumericId && searchByIdApi) {
        // Recherche directe par ID MAL via Jikan
        const malId = parseInt(searchTerm.trim(), 10);
        const result = await searchByIdApi(malId);
        if (result) {
          setSearchResults([result]);
        } else {
          setSearchResults([]);
        }
      } else {
        // Recherche par titre
        const results = await searchApi(searchTerm.trim());
        setSearchResults(results || []);
      }
    } catch (error: any) {
      console.error('Erreur recherche MAL/Jikan:', error);
      showToast({ title: 'Erreur lors de la recherche', type: 'error' });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchApi, searchByIdApi, showToast]);

  const handleImportDirectly = useCallback(async (malId: number): Promise<{
    success: boolean;
    requiresSelection?: boolean;
    candidates?: Array<any>;
  }> => {
    setImportingDirectly(true);
    try {
      const result = await importDirectlyApi(malId, importOptions);
      if (result.success) {
        showToast({ title: importSuccessMessage, type: 'success' });
        return { success: true };
      } else if (result.requiresSelection && result.candidates) {
        return {
          success: false,
          requiresSelection: true,
          candidates: result.candidates
        };
      } else {
        showToast({
          title: result.error || importErrorMessage,
          type: 'error'
        });
        return { success: false };
      }
    } catch (error: any) {
      console.error('Erreur import MAL:', error);
      showToast({
        title: error?.message || importErrorMessage,
        type: 'error'
      });
      return { success: false };
    } finally {
      setImportingDirectly(false);
    }
  }, [importDirectlyApi, importOptions, importSuccessMessage, importErrorMessage, showToast]);

  const handleSelectResult = useCallback((_result: TResult) => {
    // Cette fonction est utilisée pour pré-remplir le formulaire
    // Elle ne fait rien ici, c'est au composant parent de gérer le pré-remplissage
    setSearchResults([]);
    setSearchTerm('');
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    importingDirectly,
    handleSearch,
    handleSelectResult,
    handleImportDirectly,
    clearResults
  };
}
