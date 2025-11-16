import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalSearchFooter from './GlobalSearchFooter';
import GlobalSearchInput from './GlobalSearchInput';
import GlobalSearchResults from './GlobalSearchResults';
import { rememberScrollTarget } from '../../hooks/common/useScrollRestoration';

interface SearchResult {
  id: number;
  type: 'manga' | 'anime' | 'adulte-game';
  title: string;
  subtitle?: string;
  progress?: string;
  coverUrl?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
}

export default function GlobalSearch({ isOpen, onClose, currentUser }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input quand modal s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchTerm('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Recherche avec debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      await performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      // Recherche via l'API unifiée backend
      const results = await window.electronAPI.globalSearch(query, currentUser);

      setResults(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Erreur lors de la recherche globale:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll automatique vers l'élément sélectionné
  useEffect(() => {
    if (resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
    onClose();

    switch (result.type) {
      case 'manga':
        rememberScrollTarget('collection.mangas.scroll', result.id);
        navigate(`/serie/${result.id}`);
        break;
      case 'anime':
        rememberScrollTarget('collection.animes.scroll', result.id);
        navigate(`/animes/${result.id}`);
        break;
      case 'adulte-game':
        rememberScrollTarget('collection.adulteGames.scroll', result.id);
        navigate(`/adulte-game/${result.id}`);
        break;
    }
  };


  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 20px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '70vh',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border)',
          animation: 'slideDown 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de recherche */}
        <GlobalSearchInput
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          inputRef={inputRef}
          onClose={onClose}
        />

        {/* Résultats */}
        <GlobalSearchResults
          results={results}
          selectedIndex={selectedIndex}
          loading={loading}
          searchTerm={searchTerm}
          onSelectResult={handleSelectResult}
          onSelectIndex={setSelectedIndex}
          resultsContainerRef={resultsContainerRef}
        />

        {/* Footer avec aide */}
        <GlobalSearchFooter resultsCount={results.length} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
