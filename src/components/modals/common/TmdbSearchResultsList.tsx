import { RefreshCw } from 'lucide-react';
import Pagination from '../../collections/Pagination';

export interface TmdbSearchResultItem {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  overview?: string | null;
  posterUrl?: string | null;
  score?: number | null;
  inLibrary: boolean;
  tmdbUrl: string;
}

interface TmdbSearchResultsListProps {
  query: string;
  hasSearched: boolean;
  loading: boolean;
  error?: string | null;
  results: TmdbSearchResultItem[];
  totalResults: number;
  page: number;
  totalPages: number;
  accentColor?: string;
  importLabel?: string;
  emptyNotice?: string;
  onPageChange: (page: number) => void;
  onImport: (tmdbId: number) => void;
}

export default function TmdbSearchResultsList({
  query,
  hasSearched,
  loading,
  error,
  results,
  totalResults,
  page,
  totalPages,
  accentColor = '#6366f1',
  importLabel = 'Importer',
  emptyNotice = 'Saisis un titre ou un identifiant TMDb pour afficher des suggestions.',
  onPageChange,
  onImport
}: TmdbSearchResultsListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.12)',
            color: '#ef4444',
            fontSize: '13px'
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Recherche TMDb en cours…
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {totalResults} résultat{totalResults > 1 ? 's' : ''} • Page {page} / {Math.max(totalPages, 1)}
          </div>

          <div
            className="grid grid-4"
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}
          >
            {results.map((result) => {
              const badgeColor = result.inLibrary ? '#22c55e' : accentColor;

              return (
                <div
                  key={result.tmdbId}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    minHeight: '172px'
                  }}
                >
                  {result.posterUrl ? (
                    <img
                      src={result.posterUrl}
                      alt={result.title}
                      style={{ width: '90px', height: '135px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '90px',
                        height: '135px',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        padding: '8px',
                        flexShrink: 0
                      }}
                    >
                      Pas d’affiche
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          {result.title}
                        </h4>
                        {typeof result.year === 'number' && !Number.isNaN(result.year) && (
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>({result.year})</span>
                        )}
                        {result.score !== null && result.score !== undefined && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: badgeColor
                            }}
                          >
                            ⭐ {result.score.toFixed(1)}/10
                          </span>
                        )}
                        {result.inLibrary && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#22c55e',
                              background: 'rgba(34,197,94,0.15)',
                              borderRadius: '999px',
                              padding: '2px 8px'
                            }}
                          >
                            Déjà importé
                          </span>
                        )}
                      </div>
                      {result.originalTitle && result.originalTitle !== result.title && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Titre original : {result.originalTitle}</span>
                      )}
                    </div>

                    {result.overview && (
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {result.overview.length > 280 ? `${result.overview.slice(0, 280)}…` : result.overview}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'auto' }}>
                      <a
                        href={result.tmdbUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Ouvrir sur TMDb
                      </a>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onImport(result.tmdbId)}
                        disabled={loading || result.inLibrary}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        {result.inLibrary ? 'Déjà importé' : importLabel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && !error && hasSearched && results.length === 0 && query && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Aucun résultat trouvé pour « {query} ».
        </p>
      )}

      {!loading && !hasSearched && !query && !error && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{emptyNotice}</p>
      )}

      {results.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={20}
          totalItems={totalResults}
          onPageChange={onPageChange}
          onFirstPage={() => onPageChange(1)}
          onLastPage={() => onPageChange(totalPages)}
          onNextPage={() => onPageChange(Math.min(page + 1, totalPages))}
          onPreviousPage={() => onPageChange(Math.max(page - 1, 1))}
          canGoNext={page < totalPages}
          canGoPrevious={page > 1}
          hideImageView
          hideItemsPerPageSelect
        />
      )}
    </div>
  );
}
