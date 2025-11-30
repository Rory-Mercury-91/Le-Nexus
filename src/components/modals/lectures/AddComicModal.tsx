import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface AddComicModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onComplete?: () => void;
}

interface ComicSearchResult {
  source: string;
  googleBooksId: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  coverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  isbn10?: string;
  isbn13?: string;
  sourceUrl?: string;
  inLibrary: boolean;
}

export default function AddComicModal({ onClose, onSuccess, onComplete }: AddComicModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ComicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedComic, setSelectedComic] = useState<ComicSearchResult | null>(null);
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez entrer un terme de recherche',
        type: 'error'
      });
      return;
    }

    setSearching(true);
    try {
      const results = await window.electronAPI.comicsSearch?.({ query: searchQuery });
      const searchResultsData = results?.results || [];
      
      // Log pour debug
      console.log('[Comic Modal] Search results received:', searchResultsData.length);
      if (searchResultsData.length > 0) {
        console.log('[Comic Modal] First result:', {
          title: searchResultsData[0].title,
          coverUrl: searchResultsData[0].coverUrl ? 'present' : 'missing',
          coverUrlValue: searchResultsData[0].coverUrl ? searchResultsData[0].coverUrl.substring(0, 60) + '...' : null
        });
      }
      
      setSearchResults(searchResultsData);

      if (!results?.results || results.results.length === 0) {
        showToast({
          title: 'Aucun résultat',
          message: 'Aucun comic trouvé pour cette recherche',
          type: 'info'
        });
      }
    } catch (error: any) {
      console.error('Erreur recherche comics:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la recherche sur Google Books.',
        type: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectComic = (comic: ComicSearchResult) => {
    if (comic.inLibrary) {
      showToast({
        title: 'Déjà dans la collection',
        message: 'Ce comic est déjà présent dans votre collection',
        type: 'info'
      });
      return;
    }
    setSelectedComic(comic);
    setSelectedComicId(comic.googleBooksId);
  };

  const handleImport = async () => {
    if (!selectedComicId) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez sélectionner un comic',
        type: 'error'
      });
      return;
    }

    if (!selectedComic) {
      showToast({
        title: 'Erreur',
        message: 'Aucun comic sélectionné',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Comic Modal] Importing comic with ID:', selectedComicId);
      const result = await window.electronAPI.comicsImportFromGoogleBooks?.(selectedComicId);
      console.log('[Comic Modal] Import result:', result);

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Comic ajouté avec succès',
          type: 'success'
        });
        if (onSuccess) onSuccess();
        if (onComplete) onComplete();
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Erreur lors de l\'import',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur import comic:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'import',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {ToastContainer}
      <Modal onClickOverlay={onClose} maxWidth="900px" maxHeight="90vh">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '24px'
        }}>
          <ModalHeader
            title="🦸 Ajouter un Comic"
            description="Recherchez un comic sur Google Books et importez-le dans votre collection"
            onClose={onClose}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflow: 'hidden' }}>
            {/* Section de recherche */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Rechercher un comic
              </label>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginBottom: '12px',
                lineHeight: '1.4'
              }}>
                💡 Tapez un titre, un auteur ou un éditeur → Recherchez → Sélectionnez un résultat pour l'importer
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Ex: Batman, Spider-Man, Watchmen..."
                  className="input"
                  style={{ flex: 1 }}
                  disabled={searching}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="btn btn-primary"
                  disabled={searching || !searchQuery.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '140px',
                    justifyContent: 'center'
                  }}
                >
                  {searching ? (
                    <>
                      <Loader2 size={18} className="loading" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Rechercher
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Résultats de recherche */}
            {searchResults.length > 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3 style={{
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--text)'
                }}>
                  Résultats ({searchResults.length})
                </h3>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  paddingRight: '4px'
                }}>
                  {searchResults.map((comic, index) => {
                    // Log pour debug (seulement pour les 3 premiers)
                    if (index < 3) {
                      console.log(`[Comic Modal] Rendering comic ${index}:`, {
                        title: comic.title,
                        coverUrl: comic.coverUrl ? 'present' : 'missing',
                        coverUrlValue: comic.coverUrl ? comic.coverUrl.substring(0, 60) + '...' : null
                      });
                    }
                    
                    // Fonction helper pour comparer deux comics
                    const isSameComic = (c1: ComicSearchResult | null, c2: ComicSearchResult): boolean => {
                      if (!c1) return false;
                      return c1.googleBooksId === c2.googleBooksId;
                    };
                    
                    const isSelected = isSameComic(selectedComic, comic);
                    
                    return (
                    <div
                      key={comic.googleBooksId}
                      onClick={() => handleSelectComic(comic)}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : '1px solid var(--border)',
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.1)'
                          : comic.inLibrary
                            ? 'var(--surface-light)'
                            : 'transparent',
                        cursor: comic.inLibrary ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: comic.inLibrary ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!comic.inLibrary) {
                          e.currentTarget.style.background = 'var(--hover)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!comic.inLibrary) {
                          e.currentTarget.style.background = isSelected
                            ? 'rgba(99, 102, 241, 0.1)'
                            : 'transparent';
                          e.currentTarget.style.borderColor = isSelected
                            ? 'var(--primary)'
                            : 'var(--border)';
                        }
                      }}
                    >
                      {/* Image de couverture */}
                      <div style={{
                        width: '80px',
                        height: '120px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {comic.coverUrl ? (
                          <img
                            src={comic.coverUrl}
                            alt={comic.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 32px; background: linear-gradient(135deg, var(--surface-light), var(--surface))">🦸</div>';
                              }
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '32px',
                            background: 'linear-gradient(135deg, var(--surface-light), var(--surface))'
                          }}>
                            🦸
                          </div>
                        )}
                      </div>

                      {/* Informations */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {comic.title}
                          </span>
                          {comic.inLibrary && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--primary)',
                              color: 'white',
                              fontWeight: '500',
                              whiteSpace: 'nowrap'
                            }}>
                              ✓ Déjà dans la collection
                            </span>
                          )}
                        </div>
                        {comic.subtitle && (
                          <div style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            marginBottom: '4px',
                            fontStyle: 'italic'
                          }}>
                            {comic.subtitle}
                          </div>
                        )}
                        {comic.authors && comic.authors.length > 0 && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginBottom: '6px'
                          }}>
                            👤 {comic.authors.slice(0, 3).join(', ')}{comic.authors.length > 3 ? ` et ${comic.authors.length - 3} autre${comic.authors.length - 3 > 1 ? 's' : ''}` : ''}
                          </div>
                        )}
                        {comic.description && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginBottom: '6px',
                              lineHeight: '1.4',
                              maxHeight: '2.8em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            dangerouslySetInnerHTML={{
                              __html: (comic.description || '')
                                .replace(/<p>/g, '')
                                .replace(/<\/p>/g, ' ')
                                .replace(/<i>/g, '<em style="font-style: italic;">')
                                .replace(/<\/i>/g, '</em>')
                                .replace(/<b>/g, '<strong style="font-weight: 600;">')
                                .replace(/<\/b>/g, '</strong>')
                                .replace(/<br\s*\/?>/gi, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .substring(0, 200) + ((comic.description || '').length > 200 ? '...' : '')
                            }}
                          />
                        )}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                          fontSize: '12px',
                          color: 'var(--text-secondary)'
                        }}>
                          {comic.publisher && (
                            <span>📚 {comic.publisher}</span>
                          )}
                          {comic.publishedDate && (
                            <span>📅 {comic.publishedDate.substring(0, 4)}</span>
                          )}
                          {comic.pageCount && (
                            <span>📖 {comic.pageCount} pages</span>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message si aucun résultat */}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}>
                Aucun résultat trouvé. Essayez avec d'autres mots-clés.
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={loading}
              >
                Annuler
              </button>
              {selectedComicId && !selectedComic?.inLibrary && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '140px',
                    justifyContent: 'center'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="loading" />
                      Import...
                    </>
                  ) : (
                    'Importer'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
