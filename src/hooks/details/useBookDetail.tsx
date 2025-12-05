import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Book } from '../../types';
import { useDetailPage } from './useDetailPage';
import { useItemActions } from './useItemActions';

type BookDisplayPrefs = Record<string, boolean>;

const bookDisplayDefaults: BookDisplayPrefs = {};

export function useBookDetail() {
  const { id } = useParams();

  const loadDetailApi = useCallback(async (itemId: number) => {
    const data = await window.electronAPI.booksGetDetail?.(itemId);
    return data || null;
  }, []);

  const loadDisplaySettingsApi = useCallback(async () => {
    const result = await window.electronAPI.getBooksDisplaySettings?.();
    return result || null;
  }, []);

  const loadDisplayOverridesApi = useCallback(async (itemId: number) => {
    const result = await window.electronAPI.getBooksDisplayOverrides?.(itemId);
    return result || null;
  }, []);

  const isEventForCurrentItem = useCallback((event: CustomEvent, _item: Book | null, itemId: string | undefined) => {
    const { bookId } = event.detail;
    const currentId = itemId ? Number(itemId) : null;
    return currentId !== null && bookId === currentId;
  }, []);

  const reloadAfterEvent = useCallback(async (event: CustomEvent, itemId: string | undefined): Promise<Book | null> => {
    const { bookId } = event.detail;
    const targetId = bookId || (itemId ? Number(itemId) : null);
    if (targetId) {
      const detail = await window.electronAPI.booksGetDetail?.(targetId);
      return detail || null;
    }
    return null;
  }, []);

  const {
    item: book,
    setItem: setBook,
    loading,
    displayPrefs,
    showDisplaySettingsModal,
    setShowDisplaySettingsModal,
    showEditModal,
    setShowEditModal,
    loadDetail
  } = useDetailPage<Book, BookDisplayPrefs>({
    itemId: id,
    displayDefaults: bookDisplayDefaults,
    loadDetailApi,
    displayPreferencesMode: 'global-local',
    loadDisplaySettingsApi,
    loadDisplayOverridesApi,
    statusEventName: 'book-status-changed',
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError: 'Identifiant livre manquant',
    notFoundError: 'Livre introuvable dans votre collection'
  });

  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; name: string; color: string; emoji: string }>>([]);
  const [profileImages, setProfileImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Utiliser getAllUsers() comme dans useMangaDetail
        const allUsers = await window.electronAPI.getAllUsers?.() || [];
        setUsers(allUsers);

        // Utiliser getCurrentUser() comme dans useMangaDetail
        const currentUserName = await window.electronAPI.getCurrentUser?.();
        if (currentUserName) {
          const user = allUsers.find((u: { id: number; name: string }) => u.name === currentUserName);
          if (user) {
            setCurrentUser({ id: user.id, name: user.name });
          }
        }

        // Charger les images de profil (utiliser getUserProfileImage comme dans useMangaDetail)
        const images: Record<string, string | null> = {};
        for (const user of allUsers) {
          try {
            const image = await window.electronAPI.getUserProfileImage?.(user.name);
            images[user.name] = image || null;
          } catch {
            images[user.name] = null;
          }
        }
        setProfileImages(images);
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
      }
    };
    loadUsers();
  }, []);

  const {
    updatingStatus,
    togglingFavorite,
    handleStatusChange,
    handleToggleFavorite,
    handleDelete
  } = useItemActions<Book>({
    itemId: book?.id,
    item: book,
    updateItem: setBook,
    reloadItem: async () => {
      if (book?.id) {
        const detail = await window.electronAPI.booksGetDetail?.(book.id);
        if (detail) {
          setBook(detail);
        }
      }
    },
    setStatusApi: ({ itemId, statut }) => window.electronAPI.booksSetStatus?.({ bookId: itemId, statut }) || Promise.resolve({ success: false, statut: '' }),
    toggleFavoriteApi: async (itemId) => {
      await window.electronAPI.booksToggleFavorite?.({ bookId: itemId });
      // Recharger le livre pour obtenir l'état actuel du favori
      const book = await window.electronAPI.booksGetDetail?.(itemId);
      return { success: true, isFavorite: !!book?.is_favorite };
    },
    deleteApi: (itemId) => window.electronAPI.booksDelete?.(itemId) || Promise.resolve({ success: false, error: 'API non disponible' }),
    statusEventName: 'book-status-changed',
    getStatusEventData: (item) => ({
      bookId: item.id,
      statut: item.statut_lecture
    }),
    redirectRoute: '/lectures/books',
    itemName: 'livre',
    getItemTitle: (item) => item.titre,
    getCurrentStatus: (item) => item.statut_lecture || 'À lire'
  });

  const loadBook = useCallback(async (preserveScroll = false) => {
    await loadDetail({ silent: preserveScroll });
  }, [loadDetail]);

  // Calculer les coûts par utilisateur (même logique que pour les mangas)
  const costsByUser = users.map(user => {
    if (!book?.proprietaires) return { user, cost: 0 };

    const userProp = book.proprietaires.find(p => p.id === user.id);
    return {
      user,
      cost: userProp?.prix || 0
    };
  }).filter(item => item.cost > 0);

  // Utiliser prix_total du livre si disponible, sinon calculer depuis les propriétaires
  const totalPrix = book?.prix_total || (book?.proprietaires?.reduce((sum, p) => sum + (p.prix || 0), 0) || 0);

  const shouldShow = useCallback((field: string): boolean => {
    return displayPrefs[field] !== false;
  }, [displayPrefs]);

  return {
    // Données
    book,
    loading,
    costsByUser,
    totalPrix,
    users,
    currentUser,
    profileImages,

    // États UI
    showEditModal,
    showCustomizeDisplay: showDisplaySettingsModal,
    displayPrefs,

    // Actions
    setShowEditModal,
    setShowCustomizeDisplay: setShowDisplaySettingsModal,
    handleDelete,
    handleStatusChange,
    handleToggleFavorite,
    loadBook,
    shouldShow,

    // Loading states
    updatingStatus,
    togglingFavorite
  };
}
