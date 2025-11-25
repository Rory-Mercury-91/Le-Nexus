import { Loader2, Search } from 'lucide-react';
import { FormEvent } from 'react';
import type { AnimeSearchResult } from '../../../types';

interface AddAnimeSearchSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: AnimeSearchResult[];
  searching: boolean;
  showResults: boolean;
  importing?: boolean;
  onSearch: (e: FormEvent) => void;
  onSelectResult: (result: AnimeSearchResult) => void;
  onImportFromMal?: (malId: number) => void;
}

/**
 * Section de recherche d'anime pour AddAnimeModal
 */
export default function AddAnimeSearchSection({
  searchTerm,
  setSearchTerm,
  searchResults,
  searching,
  showResults,
  importing = false,
  onSearch,
  onSelectResult,
  onImportFromMal
}: AddAnimeSearchSectionProps) {
  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'AniList': return '#02A9FF';
      case 'MyAnimeList': return '#2E51A2';
      default: return 'var(--primary)';
    }
  };

  const getStatutColor = (statut: string) => {
    const s = statut.toLowerCase();
    if (s === 'finished' || s === 'completed') return '#10b981'; // Vert
    if (s === 'releasing' || s === 'current') return '#3b82f6'; // Bleu
    if (s === 'not_yet_released' || s === 'upcoming') return '#94a3b8'; // Gris
    if (s === 'cancelled') return '#ef4444'; // Rouge
    return '#8b5cf6'; // Violet par défaut
  };

  const getStatutLabel = (statut: string) => {
    const s = statut.toLowerCase();
    if (s === 'finished' || s === 'completed') return 'Terminé';
    if (s === 'releasing' || s === 'current') return 'En cours';
    if (s === 'not_yet_released' || s === 'upcoming') return 'À venir';
    if (s === 'cancelled') return 'Annulé';
    return statut;
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
        💡 Tapez un titre → Recherchez → Sélectionnez un résultat pour pré-remplir → Modifiez si besoin
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Ex: Attack on Titan, Death Note..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch(e as any);
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
                            height: '85px',
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
                        </div>
                        {result.titre_romaji && result.titre_romaji !== result.titre && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: '0 0 6px 0'
                          }}>
                            {result.titre_romaji}
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
                          {result.format && <span>📺 {result.format}</span>}
                          {result.episodes && <span>🎬 {result.episodes} ép.</span>}
                          {result.annee_debut && (
                            <span>
                              📅 {result.annee_debut}
                              {result.annee_fin && result.annee_fin !== result.annee_debut 
                                ? `-${result.annee_fin}` 
                                : result.annee_fin ? '' : '-?'}
                            </span>
                          )}
                          {result.rating && <span>⭐ {result.rating}</span>}
                          {result.statut && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                              background: getStatutColor(result.statut),
                              color: 'white'
                            }}>
                              {getStatutLabel(result.statut)}
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
