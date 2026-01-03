import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Serie, SerieTag } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';
import { useDetailPage } from './useDetailPage';
import { useMangaTomes } from './useMangaTomes';


export function useMangaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog: SerieConfirmDialog } = useConfirm();

  // Mémoriser les fonctions pour éviter les re-renders en boucle
  const loadDetailApi = useCallback(async (itemId: number) => {
    const data = await window.electronAPI.getSerie(itemId);
    return data || null;
  }, []);


  const isEventForCurrentItem = useCallback((event: CustomEvent, _item: Serie | null, itemId: string | undefined) => {
    const { serieId } = event.detail;
    const currentId = itemId ? Number(itemId) : null;
    return currentId !== null && serieId === currentId;
  }, []);

  const reloadAfterEvent = useCallback(async (event: CustomEvent, itemId: string | undefined) => {
    const { serieId } = event.detail;
    const targetId = serieId || (itemId ? Number(itemId) : null);
    if (targetId) {
      return await window.electronAPI.getSerie(targetId);
    }
    return null;
  }, []);

  // Hook pour la page de détails (chargement, états, modales)
  const {
    item: serie,
    setItem: setSerie,
    loading,
    showEditModal,
    setShowEditModal,
    loadDetail
  } = useDetailPage<Serie, Record<string, never>>({
    itemId: id,
    displayDefaults: {},
    loadDetailApi,
    statusEventName: 'manga-status-changed',
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError: 'Identifiant série manquant',
    notFoundError: 'Série introuvable dans votre collection'
  });

  // États spécifiques
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; name: string; color: string; emoji: string }>>([]);
  const [profileImages, setProfileImages] = useState<Record<string, string | null>>({});
  const [enriching, setEnriching] = useState(false);
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);

  // Définir loadSerie avant de l'utiliser dans les useEffect
  const loadSerie = useCallback(async (preserveScroll = false) => {
    if (preserveScroll) {
      setScrollPosition(window.scrollY);
    }

    if (!preserveScroll) {
      // Le loading est géré par useDetailPage
    }

    await loadDetail({ silent: preserveScroll });
  }, [loadDetail]);

  // Charger utilisateur et images de profil
  useEffect(() => {
    const loadCurrentUser = async () => {
      const allUsers = await window.electronAPI.getAllUsers();
      const userName = await window.electronAPI.getCurrentUser();
      const user = allUsers.find((u: { id: number; name: string }) => u.name === userName);
      setCurrentUser(user || null);
      setUsers(allUsers);
    };

    const loadProfileImages = async () => {
      const allUsers = await window.electronAPI.getAllUsers();
      const images: Record<string, string | null> = {};
      for (const user of allUsers) {
        const image = await window.electronAPI.getUserProfileImage(user.name);
        images[user.name] = image;
      }
      setProfileImages(images);
    };

    loadCurrentUser();
    loadProfileImages();

    // Écouter l'événement d'import pour rafraîchir la série si elle est mise à jour
    const handleMangaImported = (_event: unknown, data: { id?: number; serieId?: number }) => {
      const serieId = data.id || data.serieId;
      if (serieId && Number(serieId) === Number(id)) {
        console.log(`🔄 [MangaDetail] Rafraîchissement après import pour série ${serieId}`);
        loadSerie(true);
      }
    };

    const unsubscribe = window.electronAPI.onMangaImported?.(handleMangaImported);
    return () => {
      if (unsubscribe) {
        unsubscribe();
      } else if (window.electronAPI.offMangaImported) {
        window.electronAPI.offMangaImported(handleMangaImported);
      }
    };
  }, [id, loadSerie]);

  // Restaurer la position de scroll après le chargement
  useEffect(() => {
    if (scrollPosition !== null && !loading) {
      window.scrollTo(0, scrollPosition);
      setScrollPosition(null);
    }
  }, [loading, scrollPosition]);

  // Hook pour les tomes
  const {
    tomes,
    lastTome,
    totalPrix,
    totalMihon,
    showAddTome,
    setShowAddTome,
    editingTome,
    setEditingTome,
    draggingTomeId,
    updateTomes,
    handleDeleteTome,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    ConfirmDialog: TomeConfirmDialog
  } = useMangaTomes({
    serieId: serie?.id || null,
    initialTomes: serie?.tomes || [],
    onSerieReload: async () => {
      await loadSerie(true);
    }
  });

  // Mettre à jour les tomes quand la série change
  useEffect(() => {
    if (serie?.tomes) {
      updateTomes(serie.tomes);
    }
  }, [serie?.tomes, updateTomes]);

  // Suppression
  const handleDeleteSerie = useCallback(async () => {
    if (!serie) return;

    const confirmed = await confirm({
      title: 'Supprimer la série',
      message: `Êtes-vous sûr de vouloir supprimer "${serie.titre}" et tous ses tomes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await window.electronAPI.deleteSerie(serie.id);
      navigate('/lectures', { replace: true });
    } catch (error) {
      console.error('Erreur suppression série:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer la série',
        type: 'error'
      });
    }
  }, [serie, showToast]);

  // Changement de statut (avec gestion des tags)
  const handleStatusChange = useCallback(async (status: 'En cours' | 'Terminé' | 'Abandonné' | 'En pause' | 'À lire') => {
    if (!currentUser || !serie) return;

    try {
      let newTag: SerieTag | null = null;
      let newStatut: string | null = null;

      // Convertir le statut en tag ou mettre à jour le statut de la série
      const lectureStatus = status === 'Terminé' ? 'Terminé' : status;
      const statusToTagMap: Record<'À lire' | 'En cours' | 'Terminé' | 'Abandonné' | 'En pause', SerieTag> = {
        'À lire': 'a_lire',
        'En cours': 'en_cours',
        'Terminé': 'lu',
        'Abandonné': 'abandonne',
        'En pause': 'en_pause'
      };

      const mappedTag = statusToTagMap[status];
      if (mappedTag) {
        await window.electronAPI.setSerieTag(serie.id, currentUser.id, mappedTag);
        newTag = mappedTag;
      }

      const updatePayload: Record<string, string> = { statut_lecture: lectureStatus };
      if (status === 'Abandonné') {
        newStatut = 'Abandonnée';
        updatePayload.statut = 'Abandonnée';
      } else if (status === 'En cours') {
        newStatut = 'En cours';
        updatePayload.statut = 'En cours';
      } else if (status === 'Terminé') {
        newStatut = 'Terminée';
        updatePayload.statut = 'Terminée';
      }

      await window.electronAPI.updateSerie(serie.id, updatePayload);

      // Mettre à jour l'état local
      if (serie) {
        let finalTag: SerieTag | null = serie.tag ?? null;
        if (newTag !== null) {
          finalTag = newTag;
        }

        setSerie({
          ...serie,
          tag: finalTag,
          statut: (newStatut || serie.statut) as 'En cours' | 'Terminée' | 'Abandonnée',
          statut_lecture: lectureStatus
        });

        // Notifier la page de collection
        window.dispatchEvent(new CustomEvent('manga-status-changed', {
          detail: {
            serieId: serie.id,
            status,
            tag: finalTag,
            statut: newStatut,
            statutLecture: lectureStatus
          }
        }));
      }

      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du changement de statut',
        type: 'error'
      });
    }
  }, [currentUser, serie, setSerie, showToast]);

  // Toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!currentUser || !serie) return;

    try {
      await window.electronAPI.toggleSerieFavorite(serie.id, currentUser.id);
      setSerie({ ...serie, is_favorite: !serie.is_favorite });

      window.dispatchEvent(new CustomEvent('manga-favorite-changed', {
        detail: { serieId: serie.id, isFavorite: !serie.is_favorite }
      }));

      showToast({
        title: 'Favoris modifiés',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur lors du toggle favori:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la modification des favoris',
        type: 'error'
      });
    }
  }, [currentUser, serie, setSerie, showToast]);

  // Enrichissement
  const handleEnrich = useCallback(async () => {
    if (!serie?.mal_id && !(serie as any)?.anilist_id) {
      alert("Ce manga n'a pas de MAL ID ou AniList ID. Ajoutez un MAL ID ou AniList ID (via édition ou import) pour lancer l'enrichissement.");
      return;
    }
    if (!serie?.id) {
      return;
    }
    setEnriching(true);
    try {
      const res = await window.electronAPI.enrichMangaNow?.(serie.id, false);
      if (res && res.success) {
        loadSerie(true);
      } else {
        alert(`Enrichissement impossible${res?.error ? `: ${res.error}` : ''}`);
      }
    } finally {
      setEnriching(false);
    }
  }, [serie, loadSerie]);

  // Force vérification (ignore user_modified_fields)
  const handleForceEnrich = useCallback(async () => {
    if (!serie?.mal_id && !(serie as any)?.anilist_id) {
      alert("Ce manga n'a pas de MAL ID ou AniList ID. Ajoutez un MAL ID ou AniList ID (via édition ou import) pour lancer l'enrichissement.");
      return;
    }
    if (!serie) {
      return;
    }

    // Récupérer les champs protégés pour afficher dans la confirmation
    const userModifiedFields = serie.user_modified_fields || null;
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
      'description', 'date_debut', 'date_fin', 'nb_volumes', 'nb_chapitres',
      'statut_publication', 'themes', 'demographie', 'genres', 'score_mal',
      'rank_mal', 'popularity_mal', 'serialization', 'auteurs', 'rating',
      'langue_originale', 'editeur', 'editeur_vo', 'annee_publication', 'annee_vf',
      'nb_volumes_vf', 'nb_chapitres_vf', 'statut_publication_vf', 'media_type', 'type_volume', 'type_contenu'
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
    if (!serie?.id) {
      return;
    }

    setEnriching(true);
    try {
      const res = await window.electronAPI.enrichMangaNow?.(serie.id, true);
      if (res && res.success) {
        showToast({ title: 'Force vérification terminée', type: 'success' });
        loadSerie(true);
      } else {
        showToast({ title: 'Erreur', message: res?.error || 'Impossible de forcer la vérification', type: 'error' });
      }
    } finally {
      setEnriching(false);
    }
  }, [serie, confirm, showToast, loadSerie]);

  // Calculs dérivés
  const costsByUser = users.map(user => {
    const userCost = tomes.reduce((sum, tome) => {
      if (!tome.proprietaires || tome.proprietaires.length === 0) return sum;
      const isOwner = tome.proprietaires.some(p => p.id === user.id);
      if (!isOwner) return sum;
      return sum + (tome.prix / tome.proprietaires.length);
    }, 0);

    const tomesCount = tomes.filter(tome =>
      tome.proprietaires && tome.proprietaires.some(p => p.id === user.id)
    ).length;

    return { user, cost: userCost, tomesCount };
  }).filter(item => item.cost > 0 || item.tomesCount > 0);

  const shouldShow = useCallback((_field?: string): boolean => {
    return true;
  }, []);

  return {
    // Données
    serie,
    loading,
    tomes,
    lastTome,
    totalPrix,
    totalMihon,
    costsByUser,
    users,
    currentUser,
    profileImages,

    // États UI
    showAddTome,
    showEditSerie: showEditModal,
    editingTome,
    draggingTomeId,
    enriching,

    // Actions
    setShowAddTome,
    setShowEditSerie: setShowEditModal,
    setEditingTome,
    handleDeleteSerie,
    handleDeleteTome,
    handleStatusChange,
    handleToggleFavorite,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEnrich,
    handleForceEnrich,
    loadSerie,
    shouldShow,

    // Confirm
    ConfirmDialog: SerieConfirmDialog,
    TomeConfirmDialog,

    // Config (pour compatibilité)
    TAG_CONFIG: {
      a_lire: { label: 'À lire', icon: null, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
      en_cours: { label: 'En cours', icon: null, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
      lu: { label: 'Lu', icon: null, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
      abandonne: { label: 'Abandonné', icon: null, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
      en_pause: { label: 'En pause', icon: null, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' }
    },
    MANUAL_TAGS: ['a_lire', 'abandonne', 'en_pause'] as SerieTag[]
  };
}
