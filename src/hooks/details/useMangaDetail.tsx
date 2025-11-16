import { Ban, BookMarked, CheckCircle2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Serie, SerieTag } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

const TAG_CONFIG: Record<SerieTag, { label: string; icon: any; color: string; bg: string }> = {
  a_lire: { label: 'À lire', icon: BookMarked, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  en_cours: { label: 'En cours', icon: BookMarked, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  lu: { label: 'Lu', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  abandonne: { label: 'Abandonné', icon: Ban, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
  en_pause: { label: 'En pause', icon: BookMarked, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' }
};

// Tags manuels uniquement
const MANUAL_TAGS: SerieTag[] = ['a_lire', 'abandonne', 'en_pause'];

export function useMangaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [serie, setSerie] = useState<Serie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTome, setShowAddTome] = useState(false);
  const [showEditSerie, setShowEditSerie] = useState(false);
  const [editingTome, setEditingTome] = useState<number | null>(null);
  const [showCustomizeDisplay, setShowCustomizeDisplay] = useState(false);
  const [draggingTomeId, setDraggingTomeId] = useState<number | null>(null);
  const [draggingSerie, setDraggingSerie] = useState(false);
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const [profileImages, setProfileImages] = useState<Record<string, string | null>>({});
  const [users, setUsers] = useState<Array<{ id: number; name: string; color: string; emoji: string }>>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [globalPrefs, setGlobalPrefs] = useState<Record<string, boolean>>({});
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSerie();
    loadProfileImages();
    loadCurrentUser();
    window.electronAPI.getAllUsers().then(setUsers);

    // Écouter l'événement d'import pour rafraîchir la série si elle est mise à jour
    const handleMangaImported = (_event: unknown, data: { serieId: number }) => {
      if (Number(data.serieId) === Number(id)) {
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
  }, [id]);

  const loadCurrentUser = async () => {
    const allUsers = await window.electronAPI.getAllUsers();
    const userName = await window.electronAPI.getCurrentUser();
    const user = allUsers.find((u: { id: number; name: string }) => u.name === userName);
    setCurrentUser(user || null);
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

  useEffect(() => {
    // Restaurer la position de scroll après le chargement
    if (scrollPosition !== null && !loading) {
      window.scrollTo(0, scrollPosition);
      setScrollPosition(null);
    }
  }, [loading, scrollPosition]);

  const loadSerie = async (preserveScroll = false) => {
    if (preserveScroll) {
      setScrollPosition(window.scrollY);
    }

    if (!preserveScroll) {
      setLoading(true);
    }

    const data = await window.electronAPI.getSerie(Number(id));
    if (!data) {
      navigate('/collection');
      return;
    }
    
    // Notifier la page de collection si le tag ou le statut a changé
    if (serie && data) {
      const tagChanged = serie.tag !== data.tag;
      const statutChanged = serie.statut !== data.statut || serie.statut_lecture !== data.statut_lecture;
      const volumesLusChanged = serie.volumes_lus !== data.volumes_lus;
      const chapitresLusChanged = serie.chapitres_lus !== data.chapitres_lus;
      
      if (tagChanged || statutChanged || volumesLusChanged || chapitresLusChanged) {
        window.dispatchEvent(new CustomEvent('manga-status-changed', {
          detail: {
            serieId: data.id,
            tag: data.tag,
            statut: data.statut,
            statutLecture: data.statut_lecture,
            volumes_lus: data.volumes_lus,
            chapitres_lus: data.chapitres_lus
          }
        }));
      }
    }
    
    setSerie(data);
    try {
      const gp = await window.electronAPI.getMangaDisplaySettings?.();
      const lp = await window.electronAPI.getMangaDisplayOverrides?.(Number(id));
      setGlobalPrefs(gp || {});
      setLocalPrefs(lp || {});
    } catch { }
    setLoading(false);
  };

  const shouldShow = (field: string): boolean => {
    if (field in localPrefs) return !!localPrefs[field];
    if (field in globalPrefs) return !!globalPrefs[field];
    return true;
  };

  const handleDeleteSerie = async () => {
    const confirmed = await confirm({
      title: 'Supprimer la série',
      message: `Êtes-vous sûr de vouloir supprimer "${serie?.titre}" et tous ses tomes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    await window.electronAPI.deleteSerie(Number(id));
    navigate('/collection');
  };

  const handleDeleteTome = async (tomeId: number) => {
    const confirmed = await confirm({
      title: 'Supprimer le tome',
      message: 'Êtes-vous sûr de vouloir supprimer ce tome ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    await window.electronAPI.deleteTome(tomeId);
    loadSerie(true);
  };

  const handleStatusChange = async (status: 'En cours' | 'Terminé' | 'Abandonné' | 'En pause' | 'À lire') => {
    if (!currentUser || !serie) return;

    try {
      let newTag: SerieTag | null = null;
      let newStatut: string | null = null;

      // Convertir le statut en tag ou mettre à jour le statut de la série
      const lectureStatus = status === 'Terminé' ? 'Terminé' : status;
      if (status === 'À lire') {
        newTag = 'a_lire';
        await window.electronAPI.setSerieTag(serie.id, currentUser.id, 'a_lire');
        await window.electronAPI.updateSerie(serie.id, { statut_lecture: lectureStatus });
      } else if (status === 'Abandonné') {
        newTag = 'abandonne';
        newStatut = 'Abandonnée';
        await window.electronAPI.setSerieTag(serie.id, currentUser.id, 'abandonne');
        await window.electronAPI.updateSerie(serie.id, { statut: 'Abandonnée', statut_lecture: lectureStatus });
      } else if (status === 'En pause') {
        newTag = 'en_pause';
        await window.electronAPI.setSerieTag(serie.id, currentUser.id, 'en_pause');
        await window.electronAPI.updateSerie(serie.id, { statut_lecture: lectureStatus });
      } else if (status === 'En cours') {
        // Retirer les tags manuels si présents
        if (serie.tag === 'a_lire' || serie.tag === 'abandonne' || serie.tag === 'en_pause') {
          await window.electronAPI.removeSerieTag(serie.id, currentUser.id);
        }
        newStatut = 'En cours';
        await window.electronAPI.updateSerie(serie.id, { statut: 'En cours', statut_lecture: lectureStatus });
      } else if (status === 'Terminé') {
        // Retirer les tags manuels si présents
        if (serie.tag === 'a_lire' || serie.tag === 'abandonne' || serie.tag === 'en_pause') {
          await window.electronAPI.removeSerieTag(serie.id, currentUser.id);
        }
        newStatut = 'Terminée';
        await window.electronAPI.updateSerie(serie.id, { statut: 'Terminée', statut_lecture: lectureStatus });
      }

      // Mettre à jour l'état local sans recharger
      if (serie) {
        let finalTag: SerieTag | null = serie.tag ?? null;
        if (newTag !== null) {
          // Si un nouveau tag est défini, l'utiliser
          finalTag = newTag;
        } else if (status === 'En cours' || status === 'Terminé') {
          // Si on passe à "En cours" ou "Terminé", retirer le tag
          finalTag = null;
        }

        setSerie({
          ...serie,
          tag: finalTag,
          statut: (newStatut || serie.statut) as 'En cours' | 'Terminée' | 'Abandonnée',
          statut_lecture: lectureStatus
        });

        // Notifier la page de collection pour mettre à jour les cartes
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
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !serie) return;

    try {
      await window.electronAPI.toggleSerieFavorite(serie.id, currentUser.id);

      // Mettre à jour l'état local sans recharger
      setSerie({ ...serie, is_favorite: !serie.is_favorite });

      // Notifier la page de collection pour mettre à jour les cartes
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
  };

  const handleDragOver = (e: React.DragEvent, tomeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(tomeId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(null);
  };

  const handleDrop = async (e: React.DragEvent, tome: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(null);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    // @ts-expect-error path est injecté par Electron dans l'environnement renderer
    const filePath = file.path;

    if (!filePath) return;
    if (!serie) return;

    const result = await window.electronAPI.saveCoverFromPath(filePath, serie.titre, 'tome', {
      mediaType: serie.media_type,
      typeVolume: serie.type_volume
    });

    if (result.success && result.localPath) {
      await window.electronAPI.updateTome(tome.id, {
        couverture_url: result.localPath
      });
      loadSerie(true);
    }
  };

  const handleSerieDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSerie(true);
  };

  const handleSerieDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSerie(false);
  };

  const handleSerieDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSerie(false);

    if (!serie) return;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    // @ts-expect-error path est injecté par Electron dans l'environnement renderer
    const filePath = file.path;

    if (!filePath) return;

    const result = await window.electronAPI.saveCoverFromPath(filePath, serie.titre, 'serie', {
      mediaType: serie.media_type,
      typeVolume: serie.type_volume
    });

    if (result.success && result.localPath) {
      await window.electronAPI.updateSerie(serie.id, {
        couverture_url: result.localPath
      });
      loadSerie(true);
    }
  };

  const handleEnrich = async () => {
    if (!serie?.mal_id) {
      alert("Ce manga n'a pas de MAL ID. Ajoutez un MAL ID (via édition ou import MAL) pour lancer l'enrichissement.");
      return;
    }
    setEnriching(true);
    try {
      const res = await window.electronAPI.enrichMangaNow?.(serie.id);
      if (res && res.success) {
        loadSerie(true);
      } else {
        alert(`Enrichissement impossible${res?.error ? `: ${res.error}` : ''}`);
      }
    } finally {
      setEnriching(false);
    }
  };

  // Calculs dérivés
  const tomes = serie?.tomes || [];
  const lastTome = tomes.length > 0
    ? tomes.reduce((max, tome) => tome.numero > max.numero ? tome : max, tomes[0])
    : null;
  const totalPrix = tomes.reduce((sum, tome) => sum + tome.prix, 0);
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

  return {
    // Données
    serie,
    loading,
    tomes,
    lastTome,
    totalPrix,
    costsByUser,
    users,
    currentUser,
    profileImages,
    globalPrefs,
    localPrefs,

    // États UI
    showAddTome,
    showEditSerie,
    editingTome,
    showCustomizeDisplay,
    draggingTomeId,
    draggingSerie,
    enriching,

    // Actions
    setShowAddTome,
    setShowEditSerie,
    setEditingTome,
    setShowCustomizeDisplay,
    handleDeleteSerie,
    handleDeleteTome,
    handleStatusChange,
    handleToggleFavorite,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSerieDragOver,
    handleSerieDragLeave,
    handleSerieDrop,
    handleEnrich,
    loadSerie,
    shouldShow,

    // Navigation
    navigate,

    // Confirm
    ConfirmDialog,

    // Config
    TAG_CONFIG,
    MANUAL_TAGS
  };
}
