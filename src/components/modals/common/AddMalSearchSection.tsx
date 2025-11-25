import { Loader2, Search } from 'lucide-react';
import { FormEvent } from 'react';
import { MalSearchResult } from '../../../hooks/common/useMalSearch';

interface AddMalSearchSectionProps<T extends MalSearchResult> {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchResults: T[];
  searching: boolean;
  showResults: boolean;
  importing?: boolean;
  onSearch: (e: FormEvent) => void;
  onSelectResult: (result: T) => void;
  onImportFromMal?: (malId: number) => void;
  /** Type de média pour l'affichage */
  mediaType?: 'anime' | 'manga';
  /** Placeholder pour le champ de recherche */
  searchPlaceholder?: string;
  /** Fonction pour obtenir la couleur du badge source */
  getSourceBadgeColor?: (source: string) => string;
  /** Fonction pour obtenir le label du statut */
  getStatutLabel?: (statut: string) => string;
  /** Fonction pour obtenir la couleur du statut */
  getStatutColor?: (statut: string) => string;
}

/**
 * Composant générique pour la section de recherche MAL/Jikan
 * Utilisé par AddAnimeModal et AddSerieModal
 */
export default function AddMalSearchSection<T extends MalSearchResult>({
  searchTerm,
  setSearchTerm,
  searchResults,
  searching,
  showResults,
  importing = false,
  onSearch,
  onSelectResult,
  onImportFromMal,
  mediaType = 'anime',
  searchPlaceholder,
  getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'AniList': return '#02A9FF';
      case 'MyAnimeList': return '#2E51A2';
      default: return 'var(--primary)';
    }
  },
  getStatutLabel = (statut: string) => {
    const s = statut.toLowerCase();
    if (s === 'finished' || s === 'completed') return 'Terminé';
    if (s === 'releasing' || s === 'current') return 'En cours';
    if (s === 'not_yet_released' || s === 'upcoming') return 'À venir';
    if (s === 'cancelled') return 'Annulé';
    return statut;
  },
  getStatutColor = (statut: string) => {
    const s = statut.toLowerCase();
    if (s === 'finished' || s === 'completed') return '#10b981';
    if (s === 'releasing' || s === 'current') return '#3b82f6';
    if (s === 'not_yet_released' || s === 'upcoming') return '#94a3b8';
    if (s === 'cancelled') return '#ef4444';
    return '#8b5cf6';
  }
}: AddMalSearchSectionProps<T>) {
  const defaultPlaceholder = mediaType === 'anime' 
    ? 'Ex: Attack on Titan, Death Note...'
    : 'Ex: One Piece, Naruto, ou ID MAL (85781)...';

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
        💡 Tapez un titre → Recherchez → Sélectionnez un résultat pour pré-remplir → Modifiez si besoin
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder={searchPlaceholder || defaultPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch(e);
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
          {searching ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
          Rechercher
        </button>
      </div>

      {/* Résultats de recherche */}
      {showResults && (
        <div style={{
          marginTop: '16px',
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '8px',
          background: 'var(--surface)'
        }}>
          {searching ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Recherche en cours...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucun résultat trouvé
            </div>
          ) : (
            <div>
              {searchResults.map((result, index) => {
                const isMalResult = result.source === 'MyAnimeList';
                const malId = isMalResult ? parseInt(result.id, 10) : null;
                
                return (
                  <div
                    key={`${result.source}-${result.id}-${index}`}
                    style={{
                      padding: '16px',
                      borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      transition: 'background 0.2s',
                      display: 'flex',
                      gap: '16px',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      onClick={() => onSelectResult(result)}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '16px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {result.couverture && (
                        <img
                          src={result.couverture}
                          alt={result.titre}
                          style={{
                            width: '60px',
                            height: mediaType === 'anime' ? '85px' : '80px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <h4 style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {result.titre}
                          </h4>
                          {result.source && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: getSourceBadgeColor(result.source),
                              color: 'white',
                              fontWeight: '600',
                              flexShrink: 0
                            }}>
                              {result.source}
                            </span>
                          )}
                        </div>
                        {(result as any).titre_romaji && (result as any).titre_romaji !== result.titre && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: '0 0 6px 0'
                          }}>
                            {(result as any).titre_romaji}
                          </p>
                        )}
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}>
                          {(result as any).format && <span>📺 {(result as any).format}</span>}
                          {(result as any).episodes && <span>🎬 {(result as any).episodes} ép.</span>}
                          {(result as any).annee_debut && (
                            <span>
                              📅 {(result as any).annee_debut}
                              {(result as any).annee_fin && (result as any).annee_fin !== (result as any).annee_debut 
                                ? `-${(result as any).annee_fin}` 
                                : (result as any).annee_fin ? '' : '-?'}
                            </span>
                          )}
                          {(result as any).rating && <span>⭐ {(result as any).rating}</span>}
                          {(result as any).statut && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                              background: getStatutColor((result as any).statut),
                              color: 'white'
                            }}>
                              {getStatutLabel((result as any).statut)}
                            </span>
                          )}
                        </div>
                        {result.description && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginTop: '8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.5'
                          }}>
                            {result.description.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Bouton d'import direct MAL si disponible */}
                    {isMalResult && malId && onImportFromMal && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onImportFromMal(malId);
                          }}
                          className="btn"
                          style={{
                            background: '#2e51a2',
                            color: 'white',
                            border: 'none',
                            fontSize: '13px',
                            padding: '8px 16px',
                            flex: 1
                          }}
                          disabled={importing}
                        >
                          {importing ? (
                            <>
                              <Loader2 size={16} className="spin" />
                              Import depuis MAL...
                            </>
                          ) : (
                            <>
                              🚀 Importer directement depuis MyAnimeList
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectResult(result);
                          }}
                          className="btn btn-outline"
                          style={{
                            fontSize: '13px',
                            padding: '8px 16px'
                          }}
                        >
                          Pré-remplir le formulaire
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
