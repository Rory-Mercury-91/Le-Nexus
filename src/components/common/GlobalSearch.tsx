import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: number;
  type: 'manga' | 'anime' | 'avn';
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
      
      console.log(`🔍 Recherche: "${query}" => ${results.length} résultats`);
      
      setResults(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('❌ Erreur recherche globale:', error);
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
        navigate(`/serie/${result.id}`);
        break;
      case 'anime':
        navigate(`/anime/${result.id}`);
        break;
      case 'avn':
        navigate(`/avn/${result.id}`);
        break;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manga':
        return '📚';
      case 'anime':
        return '🎬';
      case 'avn':
        return '🎮';
      default:
        return '📄';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'manga':
        return 'MANGAS';
      case 'anime':
        return 'ANIMES';
      case 'avn':
        return 'AVN';
      default:
        return '';
    }
  };

  // Grouper les résultats par type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

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
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Search size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher dans toutes les collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: 'var(--text)',
              fontWeight: '500'
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <kbd style={{
              padding: '2px 6px',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>ESC</kbd>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Résultats */}
        <div
          ref={resultsContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {loading && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              Recherche en cours...
            </div>
          )}

          {!loading && searchTerm && results.length === 0 && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              Aucun résultat pour "{searchTerm}"
            </div>
          )}

          {!loading && searchTerm && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{getTypeIcon(type)}</span>
                    <span>{getTypeLabel(type)}</span>
                    <span style={{ marginLeft: 'auto' }}>({items.length})</span>
                  </div>
                  {items.map((result, index) => {
                    const globalIndex = results.indexOf(result);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelectResult(result)}
                        style={{
                          padding: '12px',
                          margin: '4px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--hover)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        {result.coverUrl ? (
                          <img
                            src={result.coverUrl.startsWith('http') 
                              ? result.coverUrl 
                              : `file://${result.coverUrl}`}
                            alt={result.title}
                            style={{
                              width: '40px',
                              height: '56px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '56px',
                            background: 'var(--background)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            flexShrink: 0
                          }}>
                            {getTypeIcon(result.type)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {result.title}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {result.subtitle}
                            {result.progress && ` • ${result.progress}`}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--primary)',
                            fontWeight: '600',
                            flexShrink: 0
                          }}>
                            ↵
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {!searchTerm && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔍</div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                Recherchez dans toutes vos collections
              </div>
              <div style={{ fontSize: '12px' }}>
                Mangas • Animes • AVN
              </div>
            </div>
          )}
        </div>

        {/* Footer avec aide */}
        {results.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{
                padding: '2px 4px',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>↑↓</kbd>
              <span>Naviguer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{
                padding: '2px 4px',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>↵</kbd>
              <span>Ouvrir</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{
                padding: '2px 4px',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                fontFamily: 'monospace'
              }}>ESC</kbd>
              <span>Fermer</span>
            </div>
          </div>
        )}
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
