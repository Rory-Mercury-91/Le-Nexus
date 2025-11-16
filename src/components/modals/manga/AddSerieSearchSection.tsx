import { ExternalLink, Loader, Search } from 'lucide-react';
import type { MangaDexResult } from '../../../types';

interface AddSerieSearchSectionProps {
  titre: string;
  setTitre: (value: string) => void;
  searchResults: MangaDexResult[];
  searching: boolean;
  onSearch: () => void;
  onSearchAmazon: () => void;
  onSelectManga: (manga: MangaDexResult) => void;
  onImportDirectly?: () => void;
  importingDirectly?: boolean;
  malId?: string;
}

/**
 * Section de recherche pour AddSerieModal
 */
export default function AddSerieSearchSection({
  titre,
  setTitre,
  searchResults,
  searching,
  onSearch,
  onSearchAmazon,
  onSelectManga,
  onImportDirectly,
  importingDirectly = false,
  malId = ''
}: AddSerieSearchSectionProps) {
  const getSourceBadgeColor = (source: string) => {
    const colors: Record<string, string> = {
      'MangaDex': '#ff6740',
      'AniList': '#02A9FF',
      'Kitsu': '#FC5B5B',
      'MyAnimeList': '#2E51A2',
      'MangaUpdates': '#E85D75'
    };
    return colors[source] || '#666';
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
        💡 Tapez un titre ou un ID MAL (ex: 85781) → Recherchez → Sélectionnez un résultat pour pré-remplir tous les champs disponibles
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Ex: One Piece, Naruto, ou ID MAL (85781)..."
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
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
          disabled={searching || !titre.trim()}
        >
          {searching ? <Loader size={20} className="loading" /> : <Search size={20} />}
          Rechercher
        </button>
        <button
          type="button"
          onClick={onSearchAmazon}
          className="btn btn-outline"
          disabled={!titre.trim()}
          title="Ouvre Amazon.fr dans votre navigateur"
        >
          <ExternalLink size={20} />
          Amazon.fr
        </button>
      </div>

      {/* Bouton import direct MAL (si ID MAL détecté) */}
      {(/^\d+$/.test(titre.trim()) || malId) && onImportDirectly && (
        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={onImportDirectly}
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
                🚀 Importer directement depuis MAL (sans formulaire)
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
            Tous les champs seront automatiquement remplis depuis Jikan
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
          {searchResults.map((manga) => (
            <div
              key={manga.id}
              onClick={() => onSelectManga(manga)}
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
              {manga.couverture && (
                <img
                  src={manga.couverture}
                  alt={manga.titre}
                  style={{
                    width: '60px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontWeight: '600', margin: 0 }}>{manga.titre}</h4>
                  {manga.source && (() => {
                    const source = manga.source || '';
                    return (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '600',
                        padding: '2px 5px',
                        borderRadius: '3px',
                        background: getSourceBadgeColor(source),
                        color: '#fff',
                        textTransform: 'uppercase'
                      }}>
                        {source === 'MyAnimeList' ? 'MAL' : source === 'MangaUpdates' ? 'MU' : source}
                      </span>
                    );
                  })()}
                </div>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {manga.description || 'Aucune description'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
