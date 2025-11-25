import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../common/useToast';

export interface ItemActionsConfig<T> {
  /** ID de l'item */
  itemId: number | null | undefined;
  /** Item complet (pour accès aux propriétés) */
  item: T | null;
  /** Fonction pour mettre à jour l'item dans l'état local */
  updateItem: (updater: (prev: T | null) => T | null) => void;
  /** Fonction pour recharger l'item depuis la base */
  reloadItem: () => Promise<void>;
  /** API pour changer le statut */
  setStatusApi: (params: { itemId: number; statut: string }) => Promise<{ success: boolean; statut?: string }>;
  /** API pour toggle favorite */
  toggleFavoriteApi: (itemId: number) => Promise<{ success: boolean; isFavorite: boolean }>;
  /** API pour supprimer l'item */
  deleteApi: (itemId: number) => Promise<{ success: boolean; error?: string }>;
  /** Nom de l'événement CustomEvent pour notifier les changements de statut */
  statusEventName: string;
  /** Fonction pour obtenir les données à inclure dans l'événement de statut */
  getStatusEventData: (item: T) => Record<string, any>;
  /** Route de redirection après suppression */
  redirectRoute: string;
  /** Nom de l'item pour les messages (ex: "film", "série") */
  itemName: string;
  /** Fonction pour obtenir le titre de l'item */
  getItemTitle: (item: T) => string;
  /** Fonction pour obtenir le statut actuel de l'item */
  getCurrentStatus: (item: T) => string | null | undefined;
}

export function useItemActions<T>(config: ItemActionsConfig<T>) {
  const {
    itemId,
    item,
    updateItem,
    reloadItem,
    setStatusApi,
    toggleFavoriteApi,
    deleteApi,
    statusEventName,
    getStatusEventData,
    redirectRoute,
    itemName,
    getItemTitle,
    getCurrentStatus
  } = config;

  const navigate = useNavigate();
  const { showToast } = useToast();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!item || !itemId || updatingStatus || getCurrentStatus(item) === newStatus) {
        return;
      }

      try {
        setUpdatingStatus(true);
        const result = await setStatusApi({ itemId, statut: newStatus });

        if (result?.success) {
          const newStatut = result.statut || newStatus;

          // Recharger depuis la base pour avoir la valeur exacte persistée
          try {
            await reloadItem();
          } catch (reloadErr) {
            console.error(`Erreur rechargement après changement statut ${itemName}:`, reloadErr);
            // Si le rechargement échoue, mettre à jour localement
            updateItem((prev) => {
              if (!prev) return prev;
              return { ...prev, statut_visionnage: newStatut } as T;
            });
          }

          // Notifier la page de collection pour mettre à jour les cartes
          window.dispatchEvent(
            new CustomEvent(statusEventName, {
              detail: {
                ...getStatusEventData(item),
                statut: newStatut
              }
            })
          );

          showToast({
            title: 'Statut mis à jour',
            message: `Le ${itemName} est maintenant marqué comme « ${newStatut} ».`,
            type: 'success'
          });
        } else {
          // Si l'opération n'a pas réussi, recharger les données depuis la base
          try {
            await reloadItem();
          } catch (reloadErr) {
            console.error(`Erreur rechargement après échec changement statut ${itemName}:`, reloadErr);
          }
        }
      } catch (err: any) {
        console.error(`Erreur changement statut ${itemName}:`, err);
        showToast({
          title: 'Erreur',
          message: err?.message || `Impossible de mettre à jour le statut.`,
          type: 'error'
        });
      } finally {
        setUpdatingStatus(false);
      }
    },
    [item, itemId, updatingStatus, setStatusApi, reloadItem, statusEventName, getStatusEventData, itemName, showToast, updateItem, getCurrentStatus]
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!item || !itemId || togglingFavorite) {
      return;
    }

    try {
      setTogglingFavorite(true);
      const result = await toggleFavoriteApi(itemId);
      if (result?.success) {
        updateItem((prev) => {
          if (!prev) return prev;
          return { ...prev, is_favorite: result.isFavorite } as T;
        });
        showToast({
          title: result.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
          message: result.isFavorite
            ? `Ce ${itemName} apparaît désormais dans vos favoris.`
            : `Ce ${itemName} ne fait plus partie de vos favoris.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error(`Erreur bascule favori ${itemName}:`, err);
      showToast({
        title: 'Erreur',
        message: err?.message || `Impossible de mettre à jour le favori.`,
        type: 'error'
      });
    } finally {
      setTogglingFavorite(false);
    }
  }, [item, itemId, togglingFavorite, toggleFavoriteApi, itemName, showToast, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!item || !itemId) return;

    try {
      const result = await deleteApi(itemId);
      if (result?.success) {
        showToast({
          title: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} supprimé`,
          message: `"${getItemTitle(item)}" a été supprimé de votre collection.`,
          type: 'success'
        });
        navigate(redirectRoute);
      } else {
        showToast({
          title: 'Erreur',
          message: result?.error || `Impossible de supprimer le ${itemName}.`,
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error(`Erreur suppression ${itemName}:`, error);
      showToast({
        title: 'Erreur',
        message: error?.message || `Impossible de supprimer le ${itemName}.`,
        type: 'error'
      });
    }
  }, [item, itemId, deleteApi, itemName, getItemTitle, navigate, redirectRoute, showToast]);

  return {
    updatingStatus,
    togglingFavorite,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleStatusChange,
    handleToggleFavorite,
    handleDelete
  };
}
