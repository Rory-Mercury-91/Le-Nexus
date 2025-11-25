import { Loader, Search } from 'lucide-react';
import { getTmdbImageUrl } from '../../../utils/tmdb';

/**
 * Type générique pour un résultat de recherche TMDb
 */
export interface TmdbSearchResultItem {
  tmdbId?: number | null;
  title?: string;
  originalTitle?: string | null;
  overview?: string;
  posterPath?: string | null;
  voteAverage?: number | null;
  inLibrary?: boolean;
  /** Date de sortie (pour films) */
  releaseDate?: string | null;
  /** Date de première diffusion (pour séries) */
  firstAirDate?: string | null;
}

interface AddTmdbSearchSectionProps<T extends TmdbSearchResultItem> {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchResults: T[];
  searching: boolean;
  onSearch: () => void;
  onSelectResult: (result: T) => void;
  onImportDirectly?: (tmdbId: number) => void;
  importingDirectly?: boolean;
  /** Placeholder pour le champ de recherche */
  searchPlaceholder?: string;
  /** Exemple d'ID TMDb pour l'aide */
  exampleId?: string;
}

/**
 * Composant générique pour la section de recherche TMDb
 * Utilisé par AddMovieModal et AddSeriesModal
 */
export default function AddTmdbSearchSection<T extends TmdbSearchResultItem>({
  searchTerm,
  setSearchTerm,
  searchResults,
  searching,
  onSearch,
  onSelectResult,
  onImportDirectly,
  importingDirectly = false,
  searchPlaceholder = 'Ex: Titre ou ID TMDb...',
  exampleId = '123'
}: AddTmdbSearchSectionProps<T>) {
  const isNumericId = /^\d+$/.test(searchTerm.trim());

  const getDate = (item: T) => {
    return (item as any).releaseDate || (item as any).firstAirDate || null;
  };

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
        💡 Tapez un titre ou un ID TMDb (ex: {exampleId}) → Recherchez → Sélectionnez un résultat pour pré-remplir tous les champs disponibles
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

      {/* Bouton import direct TMDb (si ID TMDb détecté) */}
      {isNumericId && onImportDirectly && (
        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => onImportDirectly(parseInt(searchTerm.trim(), 10))}
            className="btn btn-primary"
            disabled={importingDirectly || searching}
            style={{ width: '100%' }}
          >
            {importingDirectly ? (
              <>
                <Loader size={16} className="loading" />
                Import en cours...
              </>
            ) : (
              <>
                🚀 Importer directement depuis TMDb (sans formulaire)
              </>
            )}
          </button>
          <p style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '6px',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Tous les champs seront automatiquement remplis depuis TMDb
          </p>
        </div>
      )}

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
          {searchResults.map((item) => (
            <div
              key={item.tmdbId}
              onClick={() => onSelectResult(item)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
                transition: 'background 0.2s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {item.posterPath && (
                <img
                  src={getTmdbImageUrl(item.posterPath, 'w92') || ''}
                  alt={item.title || ''}
                  style={{
                    width: '60px',
                    height: '90px',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontWeight: '600', margin: 0 }}>{item.title}</h4>
                  {item.originalTitle && item.originalTitle !== item.title && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic'
                    }}>
                      ({item.originalTitle})
                    </span>
                  )}
                  {item.inLibrary && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '600',
                      padding: '2px 5px',
                      borderRadius: '3px',
                      background: '#22c55e',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}>
                      Déjà dans la collection
                    </span>
                  )}
                </div>
                {getDate(item) && (
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    margin: '4px 0'
                  }}>
                    📅 {getDate(item)}
                  </p>
                )}
                {item.overview && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {item.overview}
                  </p>
                )}
                {item.voteAverage !== null && item.voteAverage !== undefined && (
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px'
                  }}>
                    ⭐ {item.voteAverage.toFixed(1)}/10
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
