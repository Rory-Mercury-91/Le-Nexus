import { Edit, Settings, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { BackToBottomButton, BackToTopButton } from '../../components/collections';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import DetailStatusSection from '../../components/details/DetailStatusSection';
import BookOwnershipModal from '../../components/modals/book/BookOwnershipModal';
import OwnershipModalLoader from '../../components/modals/book/OwnershipModalLoader';
import EditBookModal from '../../components/modals/book/EditBookModal';
import DisplaySettingsModal, { DisplayFieldCategory } from '../../components/modals/common/DisplaySettingsModal';
import { useConfirm } from '../../hooks/common/useConfirm';
import { useToast } from '../../hooks/common/useToast';
import { useBookDetail } from '../../hooks/details/useBookDetail';
import { COMMON_STATUSES } from '../../utils/status';
import { BookCostsSection, BookCover, BookInfoSection } from './components';

const BOOK_DISPLAY_CATEGORIES: DisplayFieldCategory[] = [
  {
    title: 'Informations principales',
    icon: '📚',
    fields: [
      { key: 'titre', label: 'Titre' },
      { key: 'auteur', label: 'Auteur' },
      { key: 'description', label: 'Description' },
      { key: 'type_livre', label: 'Type de livre' },
      { key: 'editeur', label: 'Éditeur' },
      { key: 'date_publication', label: 'Date de publication' },
      { key: 'nombre_pages', label: 'Nombre de pages' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'langue', label: 'Langue' },
      { key: 'genres', label: 'Genres' },
      { key: 'score', label: 'Note moyenne' },
      { key: 'prix', label: 'Prix suggéré' }
    ]
  },
  {
    title: 'Coûts',
    icon: '💰',
    fields: [
      { key: 'costs', label: 'Coûts par propriétaire' }
    ]
  }
];

const BOOK_DISPLAY_DEFAULTS: Record<string, boolean> = {
  titre: true,
  auteur: true,
  description: true,
  type_livre: true,
  editeur: true,
  date_publication: true,
  nombre_pages: true,
  isbn: true,
  langue: true,
  genres: true,
  score: true,
  prix: true,
  costs: true
};

export default function BookDetail() {
  const location = useLocation();
  const { id } = useParams();
  const { showToast, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const {
    book,
    loading,
    costsByUser,
    totalPrix,
    users,
    currentUser,
    profileImages,
    showEditModal,
    showCustomizeDisplay,
    setShowEditModal,
    setShowCustomizeDisplay,
    handleDelete,
    handleStatusChange,
    handleToggleFavorite,
    loadBook,
    shouldShow,
    updatingStatus,
    togglingFavorite
  } = useBookDetail();

  // Flag pour s'assurer qu'on n'ouvre la modale qu'une seule fois
  const hasOpenedEditModal = useRef(false);
  const lastBookId = useRef<string | undefined>(undefined);

  // Réinitialiser le flag si on change de livre
  useEffect(() => {
    if (id !== lastBookId.current) {
      lastBookId.current = id;
      hasOpenedEditModal.current = false;
    }
  }, [id]);

  // Ouvrir automatiquement le mode édition si demandé via navigation state
  useEffect(() => {
    if (location.state?.openEdit && !loading && book && !hasOpenedEditModal.current) {
      hasOpenedEditModal.current = true;
      setShowEditModal(true);
      // Nettoyer le state pour éviter de rouvrir à chaque navigation
      window.history.replaceState({ ...location.state, openEdit: undefined }, '');
    }
  }, [location.state, loading, book, setShowEditModal]);

  const handleMarkAsRead = async () => {
    if (!book?.id) return;

    setIsMarkingAsRead(true);
    try {
      const result = await window.electronAPI.booksMarkAsRead?.(book.id);
      if (result?.success) {
        showToast({
          title: 'Succès',
          message: 'Livre marqué comme lu',
          type: 'success'
        });
        loadBook();
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || 'Impossible de marquer le livre comme lu',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erreur marquage comme lu:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de marquer le livre comme lu',
        type: 'error'
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleMarkAsOwned = () => {
    console.log('handleMarkAsOwned called', { currentUser, usersLength: users.length, users });
    if (!currentUser) {
      showToast({
        title: 'Erreur',
        message: 'Aucun utilisateur connecté. Veuillez vous connecter.',
        type: 'error'
      });
      return;
    }
    if (users.length === 0) {
      showToast({
        title: 'Erreur',
        message: 'Aucun utilisateur disponible. Veuillez attendre le chargement.',
        type: 'error'
      });
      return;
    }
    console.log('Opening ownership modal');
    setShowOwnershipModal(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  if (!book) return null;

  const currentStatus = book.statut_lecture || 'À lire';

  return (
    <>
      {ToastContainer}
      <DetailPageHeader
        backLabel="Retour à la collection"
        backTo={location.state?.from || '/lectures/books'}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCustomizeDisplay(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              Personnaliser l'affichage
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowEditModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Edit size={16} />
              Modifier
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Supprimer le livre',
                  message: `Êtes-vous sûr de vouloir supprimer "${book.titre}" ? Cette action est irréversible.`,
                  confirmText: 'Supprimer',
                  cancelText: 'Annuler',
                  isDanger: true
                });
                if (confirmed) {
                  await handleDelete();
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        }
      />

      <div className="fade-in" style={{ padding: '110px 40px 60px' }}>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          {/* Colonne gauche : Couverture */}
          <div style={{ flexShrink: 0 }}>
            <BookCover
              book={book}
              size="large"
              onCoverUpdated={loadBook}
              onMarkAsRead={handleMarkAsRead}
              onMarkAsOwned={handleMarkAsOwned}
              isMarkingAsRead={isMarkingAsRead}
              isMarkingAsOwned={false}
            />

            {/* Section statut */}
            <div style={{ marginTop: '24px' }}>
              <DetailStatusSection
                currentStatus={currentStatus}
                availableStatuses={[...COMMON_STATUSES.BOOK]}
                onStatusChange={handleStatusChange}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={!!book.is_favorite}
                updatingStatus={updatingStatus}
                togglingFavorite={togglingFavorite}
                statusCategory="book"
              />
            </div>
          </div>

          {/* Colonne droite : Informations */}
          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <BookInfoSection book={book} shouldShow={shouldShow} />

            {shouldShow('costs') && costsByUser.length > 0 && (
              <BookCostsSection
                costsByUser={costsByUser}
                totalPrix={totalPrix}
                profileImages={profileImages}
                shouldShow={true}
              />
            )}

            {book.notes_privees && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: 'var(--text)' }}>
                  Notes privées
                </h3>
                <div style={{
                  padding: '16px',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {book.notes_privees}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditBookModal
          book={book}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadBook();
            setShowEditModal(false);
          }}
        />
      )}

      {showCustomizeDisplay && book && (
        <DisplaySettingsModal
          title="Personnaliser l'affichage"
          description="Les modifications locales surchargent les paramètres globaux pour ce livre."
          fields={BOOK_DISPLAY_CATEGORIES}
          mode="global-local"
          itemId={book.id}
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getBooksDisplaySettings?.();
            return prefs || BOOK_DISPLAY_DEFAULTS;
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveBooksDisplaySettings?.(prefs);
            window.dispatchEvent(new CustomEvent('book-display-settings-updated'));
          }}
          loadLocalOverrides={async (itemId) => {
            const overrides = await window.electronAPI.getBooksDisplayOverrides?.(itemId);
            return overrides || {};
          }}
          saveLocalOverrides={async (itemId, overrides) => {
            await window.electronAPI.saveBooksDisplayOverrides?.(itemId, overrides);
            window.dispatchEvent(new CustomEvent('book-display-settings-updated'));
          }}
          deleteLocalOverrides={async (itemId, keys) => {
            await window.electronAPI.deleteBooksDisplayOverrides?.(itemId, keys);
            window.dispatchEvent(new CustomEvent('book-display-settings-updated'));
          }}
          onSave={() => {
            loadBook();
            setShowCustomizeDisplay(false);
          }}
          onClose={() => setShowCustomizeDisplay(false)}
          showToast={showToast}
        />
      )}

      {showOwnershipModal && book && (
        <>
          {users.length > 0 && currentUser ? (
            <BookOwnershipModal
              item={{ type: 'book', book }}
              users={users}
              currentUserId={currentUser.id}
              onClose={() => setShowOwnershipModal(false)}
              onSuccess={() => {
                loadBook();
                setShowOwnershipModal(false);
              }}
            />
          ) : (
            <OwnershipModalLoader onClose={() => setShowOwnershipModal(false)} />
          )}
        </>
      )}

      <ConfirmDialog />
      <BackToTopButton />
      <BackToBottomButton />
    </>
  );
}
