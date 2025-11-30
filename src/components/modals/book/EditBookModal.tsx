import { useState, useEffect } from 'react';
import { Book, BookType } from '../../../types';
import { useToast } from '../../../hooks/common/useToast';
import Modal from '../common/Modal';
import CoverImageUpload from '../common/CoverImageUpload';
import MultiSelectDropdown from '../common/MultiSelectDropdown';

interface EditBookModalProps {
  book: Book;
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

export default function EditBookModal({ book, onClose, onSuccess }: EditBookModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [titre, setTitre] = useState(book.titre || '');
  const [titreOriginal, setTitreOriginal] = useState(book.titre_original || '');
  const [auteur, setAuteur] = useState(Array.isArray(book.auteurs) ? book.auteurs[0] || '' : (book.auteur || ''));
  const [isbn, setIsbn] = useState(book.isbn || '');
  const [isbn13, setIsbn13] = useState(book.isbn13 || '');
  const [editeur, setEditeur] = useState(book.editeur || '');
  const [datePublication, setDatePublication] = useState(book.date_publication || '');
  const [nombrePages, setNombrePages] = useState(book.nombre_pages?.toString() || '');
  const [typeLivre, setTypeLivre] = useState<BookType | ''>(book.type_livre || '');
  const [description, setDescription] = useState(book.description || '');
  const [couvertureUrl, setCouvertureUrl] = useState(book.couverture_url || '');
  const [genres, setGenres] = useState<string[]>(Array.isArray(book.genres) ? book.genres : (book.genres ? book.genres.split(',').map(g => g.trim()) : []));
  const [genreInput, setGenreInput] = useState('');

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

      const result = await window.electronAPI.booksUpdate?.({ bookId: book.id, bookData });
      
      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Livre modifié avec succès',
          type: 'success'
        });
        onSuccess();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de modifier le livre',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur modification livre:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le livre',
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
        title="Modifier le livre"
        onClose={onClose}
        size="large"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              {loading ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
