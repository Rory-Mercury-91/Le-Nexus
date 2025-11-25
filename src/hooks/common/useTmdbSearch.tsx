import { useCallback, useState } from 'react';
import { useToast } from './useToast';

/**
 * Configuration pour la recherche TMDb
 */
export interface TmdbSearchConfig<TResult> {
  /** Fonction pour rechercher par titre */
  searchApi: (query: string, page?: number) => Promise<{ results?: TResult[] } | null>;
  /** Fonction pour importer directement par ID */
  importDirectlyApi: (tmdbId: number, options?: any) => Promise<{ id?: number | null;[key: string]: any } | null>;
  /** Options pour l'import direct */
  importOptions?: any;
  /** Message de succès pour l'import */
  importSuccessMessage?: string;
  /** Message d'erreur pour l'import */
  importErrorMessage?: string;
}

/**
 * Résultat du hook useTmdbSearch
 */
export interface TmdbSearchResult<TResult> {
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
  /** Importer directement par ID */
  handleImportDirectly: (tmdbId: number) => Promise<boolean>;
  /** Réinitialiser les résultats */
  clearResults: () => void;
}

/**
 * Hook générique pour la recherche et l'import TMDb
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
 * } = useTmdbSearch({
 *   searchApi: (query) => window.electronAPI.searchTmdbMovies(query, 1),
 *   importDirectlyApi: (id) => window.electronAPI.syncMovieFromTmdb(id, { autoTranslate: true }),
 *   importSuccessMessage: 'Film importé avec succès',
 *   importErrorMessage: 'Erreur lors de l\'import'
 * });
 * ```
 */
export function useTmdbSearch<TResult extends { tmdbId?: number | null }>(
  config: TmdbSearchConfig<TResult>
): TmdbSearchResult<TResult> {
  const {
    searchApi,
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

      if (isNumericId) {
        // Import direct par ID
        const tmdbId = parseInt(searchTerm.trim(), 10);
        await handleImportDirectly(tmdbId);
      } else {
        // Recherche par titre
        const response = await searchApi(searchTerm.trim(), 1);
        if (response?.results) {
          setSearchResults(response.results);
        } else {
          setSearchResults([]);
        }
      }
    } catch (error: any) {
      console.error('Erreur recherche TMDb:', error);
      showToast({ title: 'Erreur lors de la recherche', type: 'error' });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchApi, showToast]);

  const handleImportDirectly = useCallback(async (tmdbId: number): Promise<boolean> => {
    setImportingDirectly(true);
    try {
      const result = await importDirectlyApi(tmdbId, importOptions);
      if (result?.id) {
        showToast({ title: importSuccessMessage, type: 'success' });
        return true;
      } else {
        showToast({ title: 'Erreur lors de l\'import', type: 'error' });
        return false;
      }
    } catch (error: any) {
      console.error('Erreur import TMDb:', error);
      showToast({
        title: error?.message || importErrorMessage,
        type: 'error'
      });
      return false;
    } finally {
      setImportingDirectly(false);
    }
  }, [importDirectlyApi, importOptions, importSuccessMessage, importErrorMessage, showToast]);

  const handleSelectResult = useCallback((_result: TResult) => {
    // Cette fonction est utilisée pour pré-remplir le formulaire
    // Elle ne fait rien ici, c'est au composant parent de gérer le pré-remplissage
    setSearchResults([]);
    showToast({ title: 'Champs pré-remplis depuis TMDb', type: 'success' });
  }, [showToast]);

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
