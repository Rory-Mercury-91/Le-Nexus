interface SearchResult {
  id: number;
  type: 'manga' | 'anime' | 'adulte-game';
  title: string;
  subtitle?: string;
  progress?: string;
  coverUrl?: string;
}

interface GlobalSearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  loading: boolean;
  searchTerm: string;
  onSelectResult: (result: SearchResult) => void;
  onSelectIndex: (index: number) => void;
  resultsContainerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Affichage des résultats pour GlobalSearch
 */
export default function GlobalSearchResults({
  results,
  selectedIndex,
  loading,
  searchTerm,
  onSelectResult,
  onSelectIndex,
  resultsContainerRef
}: GlobalSearchResultsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manga':
        return '📚';
      case 'anime':
        return '🎬';
      case 'adulte-game':
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
      case 'adulte-game':
        return 'JEUX ADULTE';
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

  return (
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
              {items.map((result) => {
                const globalIndex = results.indexOf(result);
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => onSelectResult(result)}
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
                    onMouseEnter={() => onSelectIndex(globalIndex)}
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
            Lectures • Animes • Jeux adultes
          </div>
        </div>
      )}
    </div>
  );
}
