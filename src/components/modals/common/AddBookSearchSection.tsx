import { BookOpen, Loader, Search } from 'lucide-react';
import { BookSearchResult } from '../../../hooks/common/useBookSearch';

interface AddBookSearchSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchResults: BookSearchResult[];
  searching: boolean;
  onSearch: () => void;
  onSelectResult: (result: BookSearchResult) => void;
  onImportDirectly?: (bookId: string, source: 'google_books' | 'open_library' | 'bnf') => void;
  importingDirectly?: boolean;
  searchPlaceholder?: string;
}

export default function AddBookSearchSection({
  searchTerm,
  setSearchTerm,
  searchResults,
  searching,
  onSearch,
  onSelectResult,
  onImportDirectly,
  importingDirectly = false,
  searchPlaceholder = 'Ex: Titre, auteur, ISBN...'
}: AddBookSearchSectionProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
        Rechercher et pré-remplir les informations
      </label>
      <p style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        lineHeight: '1.4'
      }}>
        💡 Tapez un titre, un auteur ou un ISBN → Recherchez → Sélectionnez un résultat pour pré-remplir tous les champs disponibles
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch();
            }
          }}
          className="input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={onSearch}
          className="btn btn-primary"
          disabled={searching || !searchTerm.trim()}
        >
          {searching ? <Loader size={20} className="loading" /> : <Search size={20} />}
          Rechercher
        </button>
      </div>

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <div style={{
          marginTop: '12px',
          background: 'var(--surface-light)',
          borderRadius: '8px',
          padding: '12px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {searchResults.map((item, index) => (
            <div
              key={`${item.source}-${item.googleBooksId || item.openLibraryId || item.bnfId || index}`}
              onClick={() => onSelectResult(item)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--border)',
                marginBottom: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* Image de couverture */}
              <div style={{
                width: '60px',
                height: '90px',
                borderRadius: '4px',
                overflow: 'hidden',
                background: 'var(--surface)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <BookOpen size={24} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>

              {/* Informations */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.title}
                  {item.inLibrary && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--primary)',
                      color: 'white',
                      fontWeight: '500'
                    }}>
                      Déjà dans la collection
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    fontStyle: 'italic'
                  }}>
                    {item.subtitle}
                  </div>
                )}
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  {item.authors.length > 0 ? item.authors.join(', ') : item.mainAuthor || 'Auteur inconnu'}
                </div>
                {item.publisher && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    {item.publisher}
                    {item.publishedDate && ` • ${new Date(item.publishedDate).getFullYear()}`}
                  </div>
                )}
                {item.isbn13 && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px'
                  }}>
                    ISBN: {item.isbn13}
                  </div>
                )}
              </div>

              {/* Bouton import direct */}
              {onImportDirectly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const bookId = item.googleBooksId || item.openLibraryId || item.bnfId;
                    const source = item.source;
                    if (bookId) {
                      onImportDirectly(bookId, source);
                    }
                  }}
                  className="btn btn-primary"
                  disabled={importingDirectly}
                  style={{
                    alignSelf: 'flex-start',
                    flexShrink: 0,
                    fontSize: '12px',
                    padding: '6px 12px'
                  }}
                >
                  {importingDirectly ? (
                    <>
                      <Loader size={14} className="loading" />
                      Import...
                    </>
                  ) : (
                    '🚀 Importer'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
