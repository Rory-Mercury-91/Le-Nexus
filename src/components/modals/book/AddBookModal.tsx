import { useState, useEffect } from 'react';
import { BookType } from '../../../types';
import { useToast } from '../../../hooks/common/useToast';
import { useBookSearch } from '../../../hooks/common/useBookSearch';
import Modal from '../common/Modal';
import CoverImageUpload from '../common/CoverImageUpload';
import AddBookSearchSection from '../common/AddBookSearchSection';

interface AddBookModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BOOK_TYPE_OPTIONS: Array<{ value: BookType; label: string }> = [
  { value: 'Roman', label: '📖 Roman' },
  { value: 'Biographie', label: '👤 Biographie' },
  { value: 'Autobiographie', label: '✍️ Autobiographie' },
  { value: 'Essai', label: '📝 Essai' },
  { value: 'Documentaire', label: '📚 Documentaire' },
  { value: 'Polar', label: '🔍 Polar' },
  { value: 'Science-fiction', label: '🚀 Science-fiction' },
  { value: 'Fantasy', label: '✨ Fantasy' },
  { value: 'Horreur', label: '👻 Horreur' },
  { value: 'Romance', label: '💕 Romance' },
  { value: 'Thriller', label: '⚡ Thriller' },
  { value: 'Bande dessinée', label: '📗 Bande dessinée' },
  { value: 'Comics', label: '🦸 Comics' },
  { value: 'Manga', label: '📘 Manga' },
  { value: 'Autre', label: '📕 Autre' }
];

export default function AddBookModal({ onClose, onSuccess }: AddBookModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [titre, setTitre] = useState('');
  const [titreOriginal, setTitreOriginal] = useState('');
  const [auteur, setAuteur] = useState('');
  const [isbn, setIsbn] = useState('');
  const [isbn13, setIsbn13] = useState('');
  const [editeur, setEditeur] = useState('');
  const [datePublication, setDatePublication] = useState('');
  const [nombrePages, setNombrePages] = useState('');
  const [typeLivre, setTypeLivre] = useState<BookType | ''>('');
  const [description, setDescription] = useState('');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState('');
  
  // Stocker l'ID de l'API pour l'import automatique
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBookSource, setSelectedBookSource] = useState<'google_books' | 'open_library' | 'bnf' | null>(null);

  // Hook de recherche de livres
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    importingDirectly,
    handleSearch,
    handleSelectResult,
    handleImportDirectly
  } = useBookSearch({
    importSuccessMessage: 'Livre importé avec succès',
    importErrorMessage: 'Erreur lors de l\'import depuis l\'API'
  });

  // Gérer la sélection d'un résultat de recherche
  useEffect(() => {
    const handleResultSelection = (result: any) => {
      setTitre(result.title || '');
      setTitreOriginal(result.originalTitle || result.title || '');
      setAuteur(result.mainAuthor || (result.authors && result.authors.length > 0 ? result.authors[0] : ''));
      setIsbn(result.isbn10 || '');
      setIsbn13(result.isbn13 || '');
      setEditeur(result.publisher || '');
      setDatePublication(result.publishedDate || '');
      setNombrePages(result.pageCount ? result.pageCount.toString() : '');
      setDescription(result.description || '');
      setCouvertureUrl(result.coverUrl || '');
      if (result.categories && result.categories.length > 0) {
        setGenres(result.categories);
      }
      
      // Stocker l'ID de l'API pour l'import automatique
      const bookId = result.googleBooksId || result.openLibraryId || result.bnfId;
      if (bookId) {
        setSelectedBookId(bookId);
        setSelectedBookSource(result.source);
      } else {
        setSelectedBookId(null);
        setSelectedBookSource(null);
      }
    };

    // Écouter les sélections de résultats
    const handleSelect = (event: CustomEvent) => {
      handleResultSelection(event.detail);
    };

    window.addEventListener('book-search-result-selected', handleSelect as EventListener);
    return () => {
      window.removeEventListener('book-search-result-selected', handleSelect as EventListener);
    };
  }, []);

  const handleSelectResultWithCallback = (result: any) => {
    handleSelectResult(result);
    // Pré-remplir le formulaire
    setTitre(result.title || '');
    setTitreOriginal(result.originalTitle || result.title || '');
    setAuteur(result.mainAuthor || (result.authors && result.authors.length > 0 ? result.authors[0] : ''));
    setIsbn(result.isbn10 || '');
    setIsbn13(result.isbn13 || '');
    setEditeur(result.publisher || '');
    setDatePublication(result.publishedDate || '');
    setNombrePages(result.pageCount ? result.pageCount.toString() : '');
    setDescription(result.description || '');
    setCouvertureUrl(result.coverUrl || '');
    if (result.categories && result.categories.length > 0) {
      setGenres(result.categories);
    }
    
    // Stocker l'ID de l'API pour l'import automatique
    const bookId = result.googleBooksId || result.openLibraryId || result.bnfId;
    if (bookId) {
      setSelectedBookId(bookId);
      setSelectedBookSource(result.source);
    } else {
      setSelectedBookId(null);
      setSelectedBookSource(null);
    }
  };

  const handleImportDirectlyWithCallback = async (bookId: string, source: 'google_books' | 'open_library' | 'bnf') => {
    const success = await handleImportDirectly(bookId, source);
    if (success) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) {
      showToast({
        title: 'Erreur',
        message: 'Le titre est requis',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      // Si un ID API est présent, importer directement depuis l'API
      // Cela garantit que toutes les données sont complètes et à jour
      if (selectedBookId && selectedBookSource) {
        const importResult = await handleImportDirectly(selectedBookId, selectedBookSource);
        if (importResult) {
          // Import réussi, fermer le modal
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
          return;
        } else {
          // Si l'import échoue, continuer avec la création manuelle
          showToast({
            title: 'Import échoué',
            message: 'Création manuelle du livre avec les données pré-remplies',
            type: 'warning'
          });
        }
      }

      // Création manuelle (si pas d'ID API ou si l'import a échoué)
      const bookData: any = {
        titre: titre.trim(),
        titre_original: titreOriginal.trim() || null,
        auteur: auteur.trim() || null,
        auteurs: auteur.trim() ? [auteur.trim()] : null,
        isbn: isbn.trim() || null,
        isbn13: isbn13.trim() || null,
        editeur: editeur.trim() || null,
        date_publication: datePublication || null,
        nombre_pages: nombrePages ? parseInt(nombrePages, 10) : null,
        type_livre: typeLivre || null,
        description: description.trim() || null,
        couverture_url: couvertureUrl || null,
        genres: genres.length > 0 ? genres : []
      };

      const result = await window.electronAPI.booksCreate?.(bookData);
      
      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Livre ajouté avec succès',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible d\'ajouter le livre',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur ajout livre:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'ajouter le livre',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGenre = () => {
    const genre = genreInput.trim();
    if (genre && !genres.includes(genre)) {
      setGenres([...genres, genre]);
      setGenreInput('');
    }
  };

  const handleRemoveGenre = (genre: string) => {
    setGenres(genres.filter(g => g !== genre));
  };

  return (
    <>
      {ToastContainer}
      <Modal
        title="Ajouter un livre"
        onClose={onClose}
        size="large"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section de recherche API */}
          <AddBookSearchSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchResults={searchResults}
            searching={searching}
            onSearch={handleSearch}
            onSelectResult={handleSelectResultWithCallback}
            onImportDirectly={handleImportDirectlyWithCallback}
            importingDirectly={importingDirectly}
            searchPlaceholder="Ex: Titre, auteur, ISBN..."
          />

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Ou remplir manuellement
            </h3>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Titre <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="input"
              placeholder="Ex: Le Seigneur des Anneaux"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Titre original (optionnel)
            </label>
            <input
              type="text"
              value={titreOriginal}
              onChange={(e) => setTitreOriginal(e.target.value)}
              className="input"
              placeholder="Ex: The Lord of the Rings"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Auteur
              </label>
              <input
                type="text"
                value={auteur}
                onChange={(e) => setAuteur(e.target.value)}
                className="input"
                placeholder="Ex: J.R.R. Tolkien"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Type de livre
              </label>
              <select
                value={typeLivre}
                onChange={(e) => setTypeLivre(e.target.value as BookType)}
                className="select"
              >
                <option value="">-- Sélectionner --</option>
                {BOOK_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                ISBN
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="input"
                placeholder="Ex: 978-2070612758"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                ISBN-13
              </label>
              <input
                type="text"
                value={isbn13}
                onChange={(e) => setIsbn13(e.target.value)}
                className="input"
                placeholder="Ex: 9782070612758"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Éditeur
              </label>
              <input
                type="text"
                value={editeur}
                onChange={(e) => setEditeur(e.target.value)}
                className="input"
                placeholder="Ex: Gallimard"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Date de publication
              </label>
              <input
                type="date"
                value={datePublication}
                onChange={(e) => setDatePublication(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Nombre de pages
            </label>
            <input
              type="number"
              value={nombrePages}
              onChange={(e) => setNombrePages(e.target.value)}
              className="input"
              placeholder="Ex: 1216"
              min="0"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Genres
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGenre();
                  }
                }}
                className="input"
                placeholder="Ajouter un genre"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddGenre}
                className="btn btn-outline"
              >
                Ajouter
              </button>
            </div>
            {genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {genres.map(genre => (
                  <span
                    key={genre}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      background: 'var(--primary)',
                      color: 'white',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {genre}
                    <button
                      type="button"
                      onClick={() => handleRemoveGenre(genre)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: 0,
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Description du livre..."
              rows={4}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Couverture
            </label>
            <CoverImageUpload
              imageUrl={couvertureUrl}
              onImageChange={setCouvertureUrl}
              placeholder="URL de la couverture ou télécharger une image"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
