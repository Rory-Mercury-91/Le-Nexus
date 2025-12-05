import { Loader2 } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookSearch } from '../../../hooks/common/useBookSearch';
import { useToast } from '../../../hooks/common/useToast';
import AddBookSearchSection from '../common/AddBookSearchSection';
import CoverImageUpload from '../common/CoverImageUpload';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';

interface AddBookComicBdModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onComplete?: () => void;
  initialType?: 'book' | 'comic' | 'bd';
}

type ContentType = 'book' | 'comic' | 'bd';

export default function AddBookComicBdModal({ onClose, onSuccess, onComplete, initialType }: AddBookComicBdModalProps) {
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ContentType>(initialType || 'book');
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemSource, setSelectedItemSource] = useState<'bnf' | 'google_books' | 'open_library' | null>(null);

  // États pour le formulaire (pré-rempli si résultat sélectionné)
  const [formData, setFormData] = useState({
    titre: '',
    image_url: '',
    annee: '',
    description: '',
    isbn13: ''
  });

  // Hook de recherche de livres (pour les livres uniquement)
  const {
    searchTerm: bookSearchTerm,
    setSearchTerm: setBookSearchTerm,
    searchResults: bookSearchResults,
    searching: searchingBooks,
    importingDirectly: importingBook,
    handleSearch: handleBookSearch,
    handleSelectResult: handleBookSelectResult,
    handleImportDirectly: handleBookImportDirectly,
    clearResults: clearBookResults
  } = useBookSearch({
    importSuccessMessage: 'Livre importé avec succès',
    importErrorMessage: 'Erreur lors de l\'import depuis l\'API'
  });

  // Pré-remplir le formulaire quand un résultat est sélectionné (unifié pour tous les types)
  useEffect(() => {
    if (selectedItemId && bookSearchResults.length > 0) {
      const selectedResult = bookSearchResults.find(
        r => (r.googleBooksId || r.openLibraryId || r.bnfId) === selectedItemId
      );

      if (selectedResult) {
        const year = selectedResult.publishedDate
          ? new Date(selectedResult.publishedDate).getFullYear().toString()
          : '';

        setFormData({
          titre: selectedResult.title || '',
          image_url: selectedResult.coverUrl || '',
          annee: year,
          description: selectedResult.description || '',
          isbn13: selectedResult.isbn13 || ''
        });
      }
    }
  }, [bookSearchResults, selectedItemId]);

  const handleBookResultSelection = (result: any) => {
    handleBookSelectResult(result);
    const bookId = result.googleBooksId || result.openLibraryId || result.bnfId || null;
    setSelectedItemId(bookId);
    if (result.source === 'open_library' || result.source === 'google_books' || result.source === 'bnf') {
      setSelectedItemSource(result.source);
    } else {
      setSelectedItemSource(null);
    }
  };

  // Import complet depuis l'API avec toutes les données
  const handleImportFromAPI = async () => {
    if (!selectedItemId || !selectedItemSource) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez sélectionner un résultat de recherche',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      let result: any = null;

      if (selectedType === 'book') {
        // Pour les livres, utiliser handleBookImport qui gère déjà tout
        const success = await handleBookImportDirectly(selectedItemId, selectedItemSource);
        if (success) {
          if (onSuccess) onSuccess();
          if (onComplete) onComplete();
          setTimeout(() => {
            onClose();
          }, 500);
        }
        return;
      } else if (selectedType === 'comic') {
        // Pour les comics, utiliser uniquement Google Books (pas de BnF ni Open Library pour les comics)
        if (selectedItemSource === 'google_books' && window.electronAPI.comicsImportFromGoogleBooks) {
          result = await window.electronAPI.comicsImportFromGoogleBooks(selectedItemId);
        } else {
          showToast({
            title: 'Erreur',
            message: selectedItemSource !== 'google_books'
              ? 'Les comics ne peuvent être importés que depuis Google Books'
              : 'Fonction d\'import non disponible',
            type: 'error'
          });
          setLoading(false);
          return;
        }
      } else if (selectedType === 'bd') {
        // Pour les BD, utiliser Google Books ou BnF
        if (selectedItemSource === 'google_books') {
          const importFn = (window.electronAPI as any).bdImportFromGoogleBooks;
          if (importFn && typeof importFn === 'function') {
            result = await importFn(selectedItemId);
          } else {
            showToast({
              title: 'Erreur',
              message: 'Fonction d\'import depuis Google Books non disponible',
              type: 'error'
            });
            setLoading(false);
            return;
          }
        } else if (selectedItemSource === 'bnf') {
          if (window.electronAPI.bdImportFromBnf) {
            result = await window.electronAPI.bdImportFromBnf(selectedItemId);
          } else {
            showToast({
              title: 'Erreur',
              message: 'Fonction d\'import depuis la BnF non disponible',
              type: 'error'
            });
            setLoading(false);
            return;
          }
        } else {
          showToast({
            title: 'Erreur',
            message: 'Source non supportée pour les BD. Utilisez Google Books ou la BnF.',
            type: 'error'
          });
          setLoading(false);
          return;
        }
      }

      if (result?.success) {
        showToast({
          title: 'Succès',
          message: `${selectedType === 'comic' ? 'Comic' : 'BD'} importé avec succès`,
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
      console.error(`Erreur import ${selectedType}:`, error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'import',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Soumission du formulaire (création manuelle uniquement - pas d'import API ici)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titre.trim()) {
      showToast({
        title: 'Erreur',
        message: 'Le titre est obligatoire',
        type: 'error'
      });
      return;
    }

    // Validation de l'année si renseignée
    if (formData.annee.trim()) {
      const year = parseInt(formData.annee, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1000 || year > currentYear + 10) {
        showToast({
          title: 'Erreur',
          message: `L'année doit être entre 1000 et ${currentYear + 10}`,
          type: 'error'
        });
        return;
      }
    }

    // Création manuelle avec les données du formulaire (ouverture de l'édition après création)
    setLoading(true);
    try {
      let result: any = null;
      let itemId: number | null = null;

      if (selectedType === 'book') {
        const year = formData.annee.trim() ? parseInt(formData.annee.trim(), 10) : null;
        const bookData = {
          titre: formData.titre.trim(),
          couverture_url: formData.image_url.trim() || null,
          date_publication: year ? `${year}-01-01` : null,
          description: formData.description.trim() || null,
          isbn13: formData.isbn13.trim() || null,
          source_donnees: 'manual'
        };

        result = await window.electronAPI.booksCreate?.(bookData);
        if (result?.success && result.bookId) {
          itemId = result.bookId;
        }
      } else {
        const year = formData.annee.trim() ? parseInt(formData.annee.trim(), 10) : null;
        const mediaType = selectedType === 'comic' ? 'Comic' : 'BD';

        const serieData = {
          titre: formData.titre.trim(),
          statut: 'En cours',
          type_volume: 'Broché',
          type_contenu: 'volume',
          couverture_url: formData.image_url.trim() || null,
          annee_publication: year || null,
          date_debut: year ? `${year}-01-01` : null,
          description: formData.description.trim() || null,
          media_type: mediaType,
          source_donnees: 'manual'
        };

        result = await window.electronAPI.createSerie?.(serieData);
        if (result?.success && result.id) {
          itemId = result.id;
        }
      }

      if (result?.success && itemId) {
        showToast({
          title: 'Succès',
          message: `${selectedType === 'book' ? 'Livre' : selectedType === 'comic' ? 'Comic' : 'BD'} créé avec succès`,
          type: 'success'
        });

        if (onSuccess) onSuccess();
        if (onComplete) onComplete();

        onClose();

        setTimeout(() => {
          if (selectedType === 'book') {
            navigate(`/books/${itemId}`, { state: { openEdit: true } });
          } else {
            navigate(`/serie/${itemId}`, { state: { openEdit: true } });
          }
        }, 300);
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Erreur lors de la création',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error(`Erreur création ${selectedType}:`, error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResults = () => {
    // Utiliser AddBookSearchSection pour tous les types (recherche unifiée sur les 3 APIs)
    return (
      <AddBookSearchSection
        searchTerm={bookSearchTerm}
        setSearchTerm={setBookSearchTerm}
        searchResults={bookSearchResults}
        searching={searchingBooks}
        onSearch={handleBookSearch}
        onSelectResult={(result) => {
          handleBookResultSelection(result);
        }}
        onImportDirectly={undefined}
        importingDirectly={importingBook}
        searchPlaceholder={
          selectedType === 'book'
            ? 'Ex: Titre, auteur, ISBN...'
            : selectedType === 'comic'
              ? 'Ex: Batman, Spider-Man, Watchmen...'
              : 'Ex: Tintin, Astérix, Lucky Luke...'
        }
      />
    );
  };

  // Vérifier si un résultat API est sélectionné pour afficher le bouton d'import
  const canImport = selectedItemId && selectedItemSource && bookSearchResults.find(
    r => (r.googleBooksId || r.openLibraryId || r.bnfId) === selectedItemId
  );

  // Réinitialiser le formulaire quand on change de type
  const handleTypeChange = (type: ContentType) => {
    setSelectedType(type);
    setSelectedItemId(null);
    setSelectedItemSource(null);
    setFormData({
      titre: '',
      image_url: '',
      annee: '',
      description: '',
      isbn13: ''
    });
    // Réinitialiser aussi les résultats de recherche
    clearBookResults();
  };

  return (
    <Fragment>
      {ToastContainer}
      <Modal onClickOverlay={onClose} maxWidth="900px" maxHeight="90vh">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '24px'
        }}>
          <ModalHeader
            title={selectedType === 'book' ? '📖 Ajouter un Livre' : selectedType === 'comic' ? '🦸 Ajouter un Comic' : '📚 Ajouter une BD'}
            description={
              'Recherchez sur Google Books, Open Library ou la BnF, ou créez manuellement'
            }
            onClose={onClose}
          />

          {/* Sélecteur de type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Type de contenu
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['book', 'comic', 'bd'] as ContentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: selectedType === type ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedType === type ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: 'var(--text)',
                    fontWeight: selectedType === type ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {type === 'book' ? '📖 Livre' : type === 'comic' ? '🦸 Comic' : '📚 BD'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflow: 'hidden' }}>
            {/* Section de recherche API - Unifiée pour tous les types */}
            <div style={{ flexShrink: 0 }}>
              {renderSearchResults()}
            </div>

            {/* Séparateur OU */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexShrink: 0
            }}>
              <div style={{
                flex: 1,
                height: '1px',
                background: 'rgba(139, 92, 246, 0.2)'
              }} />
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-secondary)'
              }}>
                OU
              </span>
              <div style={{
                flex: 1,
                height: '1px',
                background: 'rgba(139, 92, 246, 0.2)'
              }} />
            </div>

            {/* Formulaire de création manuelle */}
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                {/* Colonne image */}
                <CoverImageUpload
                  imageUrl={formData.image_url}
                  onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                  mediaType={selectedType === 'book' ? 'book' : 'serie'}
                  itemTitle={formData.titre || 'Nouveau'}
                  placeholderLabel="Glissez une image ici"
                />

                {/* Colonne formulaire */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      Titre <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.titre}
                      onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                      placeholder={selectedType === 'book' ? 'Ex: Le Seigneur des Anneaux' : selectedType === 'comic' ? 'Ex: Batman' : 'Ex: Tintin'}
                      className="input"
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  {/* Année et ISBN (côte à côte) */}
                  <div style={{ display: 'grid', gridTemplateColumns: selectedType === 'book' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                        Année de sortie
                      </label>
                      <input
                        type="text"
                        value={formData.annee}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setFormData({ ...formData, annee: value });
                          }
                        }}
                        placeholder="Ex: 2023"
                        className="input"
                        style={{ width: '100%' }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>

                    {selectedType === 'book' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                          ISBN 13
                        </label>
                        <input
                          type="text"
                          value={formData.isbn13}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Permettre seulement des chiffres et des tirets
                            if (value === '' || /^[\d-]*$/.test(value)) {
                              setFormData({ ...formData, isbn13: value });
                            }
                          }}
                          placeholder="Ex: 978-2-1234-5678-9"
                          className="input"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      rows={4}
                      placeholder="Description, synopsis..."
                      style={{ resize: 'vertical', width: '100%' }}
                    />
                  </div>

                  {!canImport && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid var(--primary)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      💡 <strong>Astuce :</strong> Après la création manuelle, vous serez redirigé vers la page de détail avec la fenêtre d'édition ouverte pour compléter les autres informations.
                    </div>
                  )}
                  {canImport && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      ✅ <strong>Résultat sélectionné :</strong> Cliquez sur "Importer depuis API" pour ajouter l'entrée avec toutes les données complètes de l'API.
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                marginTop: '24px',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  disabled={loading || importingBook}
                >
                  Annuler
                </button>
                {canImport ? (
                  <button
                    type="button"
                    onClick={handleImportFromAPI}
                    disabled={loading || importingBook}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: '140px',
                      justifyContent: 'center'
                    }}
                  >
                    {(loading || importingBook) ? (
                      <>
                        <Loader2 size={18} className="loading" />
                        Import...
                      </>
                    ) : (
                      'Importer depuis API'
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !formData.titre.trim()}
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
                        Création...
                      </>
                    ) : (
                      'Créer'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </Fragment>
  );
}
