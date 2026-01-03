import React, { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimeSerie } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';
import { useAnimeEpisodes } from './useAnimeEpisodes';
import { useDetailPage } from './useDetailPage';
import { useItemActions } from './useItemActions';
import { useStreamingLinks } from './useStreamingLinks';


export function useAnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // Mémoriser les fonctions pour éviter les re-renders en boucle
  const loadDetailApi = useCallback(async (itemId: number) => {
    const result = await window.electronAPI.getAnimeDetail(itemId);
    if (result.success && result.anime) {
      return result.anime;
    }
    return null;
  }, []);


  const isEventForCurrentItem = useCallback((event: CustomEvent, _item: AnimeSerie | null, itemId: string | undefined) => {
    const { animeId } = event.detail;
    const currentId = itemId ? Number(itemId) : null;
    return currentId !== null && animeId === currentId;
  }, []);

  const reloadAfterEvent = useCallback(async (event: CustomEvent, itemId: string | undefined) => {
    const { animeId } = event.detail;
    const targetId = animeId || (itemId ? Number(itemId) : null);
    if (targetId) {
      const result = await window.electronAPI.getAnimeDetail(targetId);
      if (result.success && result.anime) {
        return result.anime;
      }
    }
    return null;
  }, []);

  // Hook pour la page de détails (chargement, états, modales)
  const {
    item: anime,
    setItem: setAnime,
    loading,
    showEditModal,
    setShowEditModal,
    loadDetail
  } = useDetailPage<AnimeSerie, Record<string, never>>({
    itemId: id,
    displayDefaults: {},
    loadDetailApi,
    statusEventName: 'anime-status-changed',
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError: 'Identifiant anime manquant',
    notFoundError: 'Anime introuvable dans votre collection'
  });

  // Hook pour les actions communes (favorite, status)
  const {
    handleStatusChange,
    handleToggleFavorite
  } = useItemActions<AnimeSerie>({
    itemId: anime?.id,
    item: anime,
    updateItem: setAnime,
    reloadItem: async () => {
      if (anime?.id) {
        const result = await window.electronAPI.getAnimeDetail(anime.id);
        if (result.success && result.anime) {
          setAnime(result.anime);
        }
      }
    },
    setStatusApi: ({ itemId, statut }) => window.electronAPI.setAnimeStatutVisionnage(itemId, statut),
    toggleFavoriteApi: async (itemId) => {
      const currentUser = await window.electronAPI.getCurrentUser();
      const users = await window.electronAPI.getAllUsers();
      const user = users.find((u: any) => u.name === currentUser);
      if (user) {
        await window.electronAPI.toggleAnimeFavorite(itemId, user.id);
        const result = await window.electronAPI.getAnimeDetail(itemId);
        if (result.success && result.anime) {
          return { success: true, isFavorite: result.anime.is_favorite };
        }
      }
      return { success: false, isFavorite: false };
    },
    deleteApi: (itemId) => window.electronAPI.deleteAnime(itemId),
    statusEventName: 'anime-status-changed',
    getStatusEventData: (item) => ({
      animeId: item.id,
      statut: item.statut_visionnage
    }),
    redirectRoute: '/animes',
    itemName: 'anime',
    getItemTitle: (item) => item.titre,
    getCurrentStatus: (item) => item.statut_visionnage
  });

  // Suppression avec confirmation
  const handleDelete = useCallback(async () => {
    if (!anime) return;

    const confirmed = await confirm({
      title: 'Supprimer l\'anime',
      message: `Êtes-vous sûr de vouloir supprimer "${anime.titre}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.deleteAnime(anime.id);
      if (result?.success) {
        showToast({
          title: 'Anime supprimé',
          message: `"${anime.titre}" a été supprimé de votre collection.`,
          type: 'success'
        });
        navigate('/animes');
      } else {
        const errorMessage = (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string')
          ? result.error
          : 'Impossible de supprimer l\'anime.';
        showToast({
          title: 'Erreur',
          message: errorMessage,
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur suppression anime:', error);
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de supprimer l\'anime.',
        type: 'error'
      });
    }
  }, [anime, confirm, showToast, navigate]);

  // Hook pour les épisodes
  const {
    episodes,
    episodesVus,
    updateEpisodes,
    handleToggleEpisode,
    handleMarquerToutVu
  } = useAnimeEpisodes({
    animeId: anime?.id || null,
    initialEpisodes: [],
    onAnimeUpdated: (updatedAnime) => {
      setAnime(updatedAnime);
    }
  });

  // Hook pour les liens streaming
  const {
    streamingLinks,
    showAddLinkForm,
    setShowAddLinkForm,
    newLink,
    setNewLink,
    loadStreamingLinks,
    handleAddLink,
    handleDeleteLink,
    handleAddExternalLink
  } = useStreamingLinks({
    animeId: anime?.id || null,
    malId: anime?.mal_id || null,
    initialLinks: []
  });

  // Charger les épisodes et liens streaming après le chargement de l'anime
  useEffect(() => {
    if (anime) {
      // Charger les épisodes depuis le résultat de getAnimeDetail
      window.electronAPI.getAnimeDetail(anime.id).then((result) => {
        if (result.success) {
          updateEpisodes(result.episodes || []);
          loadStreamingLinks(anime.id, anime.mal_id);
        }
      });
    }
  }, [anime?.id, anime?.mal_id, updateEpisodes, loadStreamingLinks]);

  const loadAnime = async () => {
    await loadDetail();
  };

  // Enrichissement
  const [enriching, setEnriching] = React.useState(false);
  const handleEnrich = async () => {
    if (!anime?.mal_id) {
      showToast({
        title: 'Erreur',
        message: "Cet anime n'a pas de MAL ID. Ajoutez un MAL ID (via édition ou import MAL) pour lancer l'enrichissement.",
        type: 'error'
      });
      return;
    }
    setEnriching(true);
    try {
      const res = await window.electronAPI.enrichAnimeNow?.(anime.id, false);
      if (res && res.success) {
        showToast({
          title: 'Enrichissement réussi',
          message: res.message || 'L\'anime a été enrichi avec succès',
          type: 'success'
        });
        loadAnime();
      } else {
        showToast({
          title: 'Erreur',
          message: res?.error || 'Enrichissement impossible',
          type: 'error'
        });
      }
    } finally {
      setEnriching(false);
    }
  };

  // Force vérification (ignore user_modified_fields)
  const handleForceEnrich = async () => {
    if (!anime?.mal_id) {
      showToast({
        title: 'Erreur',
        message: "Cet anime n'a pas de MAL ID. Ajoutez un MAL ID (via édition ou import MAL) pour lancer l'enrichissement.",
        type: 'error'
      });
      return;
    }

    // Récupérer les champs protégés pour afficher dans la confirmation
    const userModifiedFields = anime.user_modified_fields || null;
    let protectedFields: string[] = [];
    if (userModifiedFields) {
      try {
        const parsed = JSON.parse(userModifiedFields);
        if (Array.isArray(parsed)) {
          protectedFields = parsed;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }

    // Filtrer pour ne garder que les champs d'enrichissement (pas les champs personnalisés)
    const enrichmentFields = [
      'titre', 'titre_romaji', 'titre_natif', 'titre_anglais', 'titres_alternatifs',
      'description', 'date_debut', 'date_fin', 'nb_episodes', 'statut_diffusion',
      'themes', 'demographics', 'genres', 'score', 'rank_mal', 'popularity_mal',
      'studios', 'producteurs', 'diffuseurs', 'rating', 'age_conseille', 'type',
      'source', 'annee', 'saison_diffusion', 'date_sortie_vf', 'date_debut_streaming',
      'duree', 'editeur', 'site_web', 'en_cours_diffusion'
    ];

    const fieldsToUpdate = protectedFields.filter(field => enrichmentFields.includes(field));

    // Demander confirmation
    const confirmed = await confirm({
      title: 'Force vérification',
      message: fieldsToUpdate.length > 0
        ? `Les champs suivants seront mis à jour depuis les sources externes (protection ignorée) :\n\n${fieldsToUpdate.map(f => `• ${f}`).join('\n')}\n\nLes champs personnalisés (labels, notes privées, etc.) ne seront pas modifiés.\n\nContinuer ?`
        : 'Aucun champ protégé ne sera mis à jour. Continuer ?',
      confirmText: 'Forcer la vérification',
      cancelText: 'Annuler',
      isDanger: false
    });

    if (!confirmed) return;

    setEnriching(true);
    try {
      const res = await window.electronAPI.enrichAnimeNow?.(anime.id, true);
      if (res && res.success) {
        showToast({
          title: 'Force vérification terminée',
          type: 'success'
        });
        loadAnime();
      } else {
        showToast({
          title: 'Erreur',
          message: res?.error || 'Impossible de forcer la vérification',
          type: 'error'
        });
      }
    } finally {
      setEnriching(false);
    }
  };

  // Calculs dérivés
  const liensStreaming = anime?.liens_streaming ? JSON.parse(anime.liens_streaming) : [];
  const liensExternes = anime?.liens_externes ? JSON.parse(anime.liens_externes) : [];

  const shouldShow = (_field?: string): boolean => {
    return true;
  };

  return {
    // Données
    anime,
    episodes,
    loading,
    streamingLinks,
    liensStreaming,
    liensExternes,
    episodesVus,

    // États UI
    showEditModal,
    showAddLinkForm,
    newLink,
    enriching,

    // Actions
    setShowEditModal,
    setShowAddLinkForm,
    setNewLink,
    handleDelete,
    handleAddLink,
    handleDeleteLink,
    handleAddExternalLink,
    handleToggleEpisode,
    handleMarquerToutVu,
    handleChangeStatutVisionnage: handleStatusChange,
    handleToggleFavorite,
    handleEnrich,
    handleForceEnrich,
    loadAnime,
    shouldShow,

    // Toast
    ToastContainer,

    // Confirm
    ConfirmDialog
  };
}
