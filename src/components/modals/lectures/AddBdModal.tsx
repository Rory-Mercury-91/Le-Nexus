import { Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface AddBdModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onComplete?: () => void;
}

interface BdSearchResult {
  source: string;
  bnfId?: string;
  googleBooksId?: string;
  title: string;
  authors?: string[];
  description?: string;
  coverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  sourceUrl?: string;
  inLibrary: boolean;
}

export default function AddBdModal({ onClose, onSuccess, onComplete }: AddBdModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BdSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBd, setSelectedBd] = useState<BdSearchResult | null>(null);
  const [selectedBdId, setSelectedBdId] = useState<string | null>(null);
  const [selectedBdSource, setSelectedBdSource] = useState<'bnf' | 'google_books' | null>(null);

  // Fonction helper pour comparer deux BD
  const isSameBd = (bd1: BdSearchResult | null, bd2: BdSearchResult): boolean => {
    if (!bd1) return false;
    // Comparer par source et ID
    if (bd1.source === 'bnf' && bd2.source === 'bnf' && bd1.bnfId && bd2.bnfId) {
      return bd1.bnfId === bd2.bnfId;
    }
    if (bd1.source === 'google_books' && bd2.source === 'google_books' && bd1.googleBooksId && bd2.googleBooksId) {
      return bd1.googleBooksId === bd2.googleBooksId;
    }
    return false;
  };

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
      const results = await window.electronAPI.bdSearch?.({ query: searchQuery });
      setSearchResults(results?.results || []);
      
      if (!results?.results || results.results.length === 0) {
        showToast({
          title: 'Aucun résultat',
          message: 'Aucune BD trouvée pour cette recherche',
          type: 'info'
        });
      }
    } catch (error: any) {
      console.error('Erreur recherche BD:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la recherche sur la BnF. Vérifiez votre connexion.',
        type: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBd = (bd: BdSearchResult) => {
    if (bd.inLibrary) {
      showToast({
        title: 'Déjà dans la collection',
        message: 'Cette BD est déjà présente dans votre collection',
        type: 'info'
      });
      return;
    }
    
    // Si c'est la même BD déjà sélectionnée, la désélectionner
    if (isSameBd(selectedBd, bd)) {
      setSelectedBd(null);
      setSelectedBdId(null);
      setSelectedBdSource(null);
      return;
    }
    
    // Créer un identifiant unique pour cette BD
    const bdId = bd.bnfId || bd.googleBooksId || null;
    const bdSource = bd.source as 'bnf' | 'google_books';
    
    setSelectedBd(bd);
    setSelectedBdId(bdId);
    setSelectedBdSource(bdSource);
  };

  const handleImport = async () => {
    if (!selectedBdId || !selectedBdSource) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez sélectionner une BD',
        type: 'error'
      });
      return;
    }

    if (!selectedBd) {
      showToast({
        title: 'Erreur',
        message: 'Aucune BD sélectionnée',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      let result;
      if (selectedBdSource === 'google_books') {
        result = await window.electronAPI.bdImportFromGoogleBooks?.(selectedBdId);
      } else {
        result = await window.electronAPI.bdImportFromBnf?.(selectedBdId);
      }
      
      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'BD ajoutée avec succès',
          type: 'success'
        });
        if (onSuccess) onSuccess();
        if (onComplete) onComplete();
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        console.error('[BD] Erreur import:', result);
        showToast({
          title: 'Erreur',
          message: result?.error || 'Erreur lors de l\'import. Vérifiez les logs pour plus de détails.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('[BD] Erreur import exception:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'import. Vérifiez les logs pour plus de détails.',
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
            title="📚 Rechercher une BD"
            description="Recherchez une BD sur la BnF (Bibliothèque nationale de France) et importez-la dans votre collection"
            onClose={onClose}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflow: 'hidden' }}>
            {/* Section de recherche */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Rechercher une BD
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
                  placeholder="Ex: Tintin, Astérix, Lucky Luke..."
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
                  {searchResults.map((bd) => (
                    <div
                      key={`${bd.source}-${bd.bnfId || bd.googleBooksId || bd.title}`}
                      onClick={() => handleSelectBd(bd)}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: isSameBd(selectedBd, bd)
                          ? '2px solid var(--primary)'
                          : '1px solid var(--border)',
                        background: isSameBd(selectedBd, bd)
                          ? 'rgba(99, 102, 241, 0.1)'
                          : bd.inLibrary
                            ? 'var(--surface-light)'
                            : 'transparent',
                        cursor: bd.inLibrary ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: bd.inLibrary ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!bd.inLibrary && !isSameBd(selectedBd, bd)) {
                          e.currentTarget.style.background = 'var(--hover)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!bd.inLibrary) {
                          const isSelected = isSameBd(selectedBd, bd);
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
                        {bd.coverUrl ? (
                          <img
                            src={bd.coverUrl}
                            alt={bd.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
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
                            fontSize: '24px'
                          }}>
                            📚
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
                            {bd.title}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: bd.source === 'google_books' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(0, 123, 181, 0.15)',
                            color: bd.source === 'google_books' ? '#4285f4' : '#007bb5',
                            fontWeight: '500',
                            whiteSpace: 'nowrap'
                          }}>
                            {bd.source === 'google_books' ? '📚 Google Books' : '🇫🇷 BnF'}
                          </span>
                          {bd.inLibrary && (
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
                        {bd.description && (
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
                              __html: (bd.description || '')
                                .replace(/<p>/g, '')
                                .replace(/<\/p>/g, ' ')
                                .replace(/<i>/g, '<em style="font-style: italic;">')
                                .replace(/<\/i>/g, '</em>')
                                .replace(/<b>/g, '<strong style="font-weight: 600;">')
                                .replace(/<\/b>/g, '</strong>')
                                .replace(/<br\s*\/?>/gi, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .substring(0, 200) + ((bd.description || '').length > 200 ? '...' : '')
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
                          {bd.authors && bd.authors.length > 0 && (
                            <span>✍️ {bd.authors.join(', ')}</span>
                          )}
                          {bd.publisher && (
                            <span>📚 {bd.publisher}</span>
                          )}
                          {bd.publishedDate && (
                            <span>📅 {new Date(bd.publishedDate).getFullYear()}</span>
                          )}
                          {bd.isbn && (
                            <span>🔖 ISBN: {bd.isbn}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
              {selectedBdId && selectedBdSource && !selectedBd?.inLibrary && (
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
