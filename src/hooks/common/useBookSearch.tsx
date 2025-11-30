import { useCallback, useState } from 'react';
import { useToast } from './useToast';

/**
 * Résultat de recherche de livre depuis une API externe
 */
export interface BookSearchResult {
  source: 'google_books' | 'open_library' | 'bnf';
  googleBooksId?: string | null;
  openLibraryId?: string | null;
  bnfId?: string | null;
  title: string;
  originalTitle?: string | null;
  subtitle?: string | null;
  authors: string[];
  mainAuthor: string;
  publisher?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  language?: string | null;
  description?: string | null;
  categories?: string[];
  isbn10?: string | null;
  isbn13?: string | null;
  coverUrl?: string | null;
  previewLink?: string | null;
  infoLink?: string | null;
  averageRating?: number | null;
  ratingsCount?: number;
  inLibrary: boolean;
}

/**
 * Configuration pour la recherche de livres
 */
export interface BookSearchConfig {
  /** Message de succès pour l'import */
  importSuccessMessage?: string;
  /** Message d'erreur pour l'import */
  importErrorMessage?: string;
}

/**
 * Résultat du hook useBookSearch
 */
export interface BookSearchResultHook {
  /** Terme de recherche */
  searchTerm: string;
  /** Définir le terme de recherche */
  setSearchTerm: (value: string) => void;
  /** Résultats de recherche */
  searchResults: BookSearchResult[];
  /** En cours de recherche */
  searching: boolean;
  /** En cours d'import direct */
  importingDirectly: boolean;
  /** Lancer une recherche */
  handleSearch: () => Promise<void>;
  /** Sélectionner un résultat (pour pré-remplir le formulaire) */
  handleSelectResult: (result: BookSearchResult) => void;
  /** Importer directement par ID */
  handleImportDirectly: (bookId: string, source: 'google_books' | 'open_library' | 'bnf') => Promise<boolean>;
  /** Réinitialiser les résultats */
  clearResults: () => void;
}

/**
 * Hook pour la recherche et l'import de livres depuis Google Books et Open Library
 */
export function useBookSearch(
  config: BookSearchConfig = {}
): BookSearchResultHook {
  const {
    importSuccessMessage = 'Livre importé avec succès',
    importErrorMessage = 'Erreur lors de l\'import'
  } = config;

  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingDirectly, setImportingDirectly] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      // Recherche sur toutes les sources (Google Books en priorité, puis Open Library)
      const response = await window.electronAPI.booksSearch?.({ query: searchTerm.trim(), source: 'all' });
      if (response?.results) {
        setSearchResults(response.results);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('Erreur recherche livres:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de rechercher des livres',
        type: 'error'
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, showToast]);

  const handleImportDirectly = useCallback(async (bookId: string, source: 'google_books' | 'open_library' | 'bnf'): Promise<boolean> => {
    if (!bookId) return false;

    setImportingDirectly(true);
    try {
      let result;
      if (source === 'google_books') {
        result = await window.electronAPI.booksImportFromGoogle?.(bookId);
      } else if (source === 'open_library') {
        result = await window.electronAPI.booksImportFromOpenLibrary?.(bookId);
      } else {
        result = await window.electronAPI.booksImportFromBnf?.(bookId);
      }

      if (result?.success) {
        if (result.alreadyExists) {
          showToast({
            title: 'Livre déjà présent',
            message: 'Ce livre est déjà dans votre collection',
            type: 'info'
          });
        } else {
          showToast({
            title: importSuccessMessage,
            type: 'success'
          });
        }
        return true;
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || importErrorMessage,
          type: 'error'
        });
        return false;
      }
    } catch (error: any) {
      console.error('Erreur import livre:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || importErrorMessage,
        type: 'error'
      });
      return false;
    } finally {
      setImportingDirectly(false);
    }
  }, [showToast, importSuccessMessage, importErrorMessage]);

  const handleSelectResult = useCallback((_result: BookSearchResult) => {
    // Cette fonction peut être utilisée pour pré-remplir un formulaire
    // Pour l'instant, on ne fait rien de spécial
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
