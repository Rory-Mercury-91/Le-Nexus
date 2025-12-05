import { Loader, Search } from 'lucide-react';

/**
 * Type pour un résultat de recherche RAWG
 */
export interface RawgSearchResultItem {
  rawgId?: number | null;
  name?: string;
  released?: string | null;
  backgroundImage?: string | null;
  rating?: number | null;
  metacritic?: number | null;
  platforms?: string[];
  genres?: string[];
  inLibrary?: boolean;
}

interface AddRawgSearchSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchResults: RawgSearchResultItem[];
  searching: boolean;
  onSearch: () => void;
  onSelectResult: (result: RawgSearchResultItem) => void;
  onImportDirectly?: (rawgId: number) => void;
  importingDirectly?: boolean;
}

/**
 * Composant pour la section de recherche RAWG
 */
export default function AddRawgSearchSection({
  searchTerm,
  setSearchTerm,
  searchResults,
  searching,
  onSearch,
  onSelectResult,
  onImportDirectly,
  importingDirectly = false
}: AddRawgSearchSectionProps) {
  const isNumericId = /^\d+$/.test(searchTerm.trim());

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
        Rechercher sur RAWG
      </label>
      <p style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        lineHeight: '1.4'
      }}>
        💡 Tapez un titre ou un ID RAWG (ex: 12345) → Recherchez → Sélectionnez un résultat pour pré-remplir les champs
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Ex: The Witcher 3 ou ID RAWG..."
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

      {/* Bouton import direct RAWG (si ID détecté) */}
      {isNumericId && onImportDirectly && (
        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => onImportDirectly(parseInt(searchTerm.trim(), 10))}
            className="btn btn-outline"
            disabled={importingDirectly}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {importingDirectly ? (
              <>
                <Loader size={16} className="loading" />
                Import en cours...
              </>
            ) : (
              <>
                <Search size={16} />
                Importer directement (ID: {searchTerm.trim()})
              </>
            )}
          </button>
        </div>
      )}

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <div style={{
          marginTop: '16px',
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          {searchResults.map((result) => (
            <div
              key={result.rawgId}
              onClick={() => onSelectResult(result)}
              style={{
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '8px',
                border: '1px solid var(--border)',
                background: result.inLibrary ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-light)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = result.inLibrary ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {result.backgroundImage && (
                <img
                  src={result.backgroundImage}
                  alt={result.name}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    flexShrink: 0
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>
                    {result.name}
                  </h4>
                  {result.inLibrary && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      fontWeight: '600'
                    }}>
                      Déjà dans la bibliothèque
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {result.released && <span>Sortie: {result.released}</span>}
                  {result.rating && (
                    <span style={{ marginLeft: '12px' }}>
                      ⭐ {result.rating.toFixed(1)}
                    </span>
                  )}
                  {result.metacritic && (
                    <span style={{ marginLeft: '12px' }}>
                      🎯 {result.metacritic}
                    </span>
                  )}
                </div>
                {result.platforms && result.platforms.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📱 {result.platforms.slice(0, 3).join(', ')}
                    {result.platforms.length > 3 && ` +${result.platforms.length - 3}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
