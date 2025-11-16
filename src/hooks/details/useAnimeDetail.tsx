import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimeSerie } from '../../types';
import { useToast } from '../common/useToast';

interface Episode {
  numero: number;
  vu: boolean;
  date_visionnage: string | null;
}

interface StreamingLink {
  source: 'anilist' | 'manual';
  platform: string;
  url: string;
  language: string;
  id?: number;
  color?: string;
  icon?: string;
  createdAt?: string;
}

export function useAnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  
  const [anime, setAnime] = useState<AnimeSerie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCustomizeDisplay, setShowCustomizeDisplay] = useState(false);
  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([]);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newLink, setNewLink] = useState({ platform: '', url: '', language: 'fr' });
  const [globalPrefs, setGlobalPrefs] = useState<Record<string, boolean>>({});
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (id) {
      loadAnime();
    }
  }, [id]);

  const loadDisplayPreferences = async (targetAnimeId?: number) => {
    const resolvedId = targetAnimeId ?? (anime ? anime.id : id ? parseInt(id) : undefined);
    try {
      const gp = await window.electronAPI.getAnimeDisplaySettings?.() || {};
      setGlobalPrefs(gp);

      if (resolvedId) {
        const lp = await window.electronAPI.getAnimeDisplayOverrides?.(resolvedId) || {};
        setLocalPrefs(lp);
      } else {
        setLocalPrefs({});
      }
    } catch (error) {
      console.error('Erreur chargement préférences affichage anime:', error);
    }
  };

  const loadAnime = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getAnimeDetail(parseInt(id!));
      if (result.success) {
        setAnime(result.anime || null);
        setEpisodes((result.episodes || []).map((ep: Episode) => ({
          ...ep,
          date_visionnage: ep.date_visionnage || null
        })));
        
        if (result.anime) {
          loadStreamingLinks(result.anime.id, result.anime.mal_id);
          loadDisplayPreferences(result.anime.id);
        } else {
          loadDisplayPreferences(undefined);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStreamingLinks = async (animeId: number, malId?: number) => {
    try {
      const result = await window.electronAPI.getStreamingLinks(animeId, malId);
      if (result.success) {
        setStreamingLinks(result.links);
      }
    } catch (error) {
      console.error('Erreur chargement liens streaming:', error);
    }
  };

  const handleAddLink = async () => {
    if (!newLink.platform || !newLink.url) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs',
        type: 'error'
      });
      return;
    }

    try {
      const result = await window.electronAPI.addStreamingLink(parseInt(id!), newLink);
      if (result.success) {
        showToast({
          title: 'Lien ajouté',
          message: `Le lien ${newLink.platform} a été ajouté`,
          type: 'success'
        });
        setNewLink({ platform: '', url: '', language: 'fr' });
        setShowAddLinkForm(false);
        loadStreamingLinks(parseInt(id!), anime?.mal_id);
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || 'Erreur lors de l\'ajout',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error.message,
        type: 'error'
      });
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    try {
      const result = await window.electronAPI.deleteStreamingLink(linkId);
      if (result.success) {
        showToast({
          title: 'Lien supprimé',
          message: 'Le lien a été supprimé avec succès',
          type: 'success'
        });
        loadStreamingLinks(parseInt(id!), anime?.mal_id);
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || 'Erreur lors de la suppression',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error.message,
        type: 'error'
      });
    }
  };

  const handleAddExternalLink = async (linkData: { name: string; url: string }) => {
    try {
      const result = await window.electronAPI.addExternalLink(parseInt(id!), linkData);
      if (result.success) {
        showToast({
          title: 'Lien ajouté',
          message: 'Le lien a été ajouté avec succès',
          type: 'success'
        });
        loadAnime(); // Recharger pour afficher le nouveau lien
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || 'Erreur lors de l\'ajout',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error.message,
        type: 'error'
      });
    }
  };

  const handleToggleEpisode = async (episodeNumero: number, currentVu: boolean) => {
    try {
      setEpisodes(prevEpisodes => 
        prevEpisodes.map(ep => 
          ep.numero === episodeNumero 
            ? { ...ep, vu: !currentVu, date_visionnage: !currentVu ? new Date().toISOString() : null }
            : ep
        )
      );
      
      await window.electronAPI.toggleEpisodeVu(parseInt(id!), episodeNumero, !currentVu);
      
      // Recharger l'anime pour obtenir le nouveau statut (qui peut avoir changé automatiquement)
      const result = await window.electronAPI.getAnimeDetail(parseInt(id!));
      if (result.success && result.anime) {
        setAnime(result.anime);
        setEpisodes((result.episodes || []).map((ep: Episode) => ({
          ...ep,
          date_visionnage: ep.date_visionnage || null
        })));
        
        // Notifier la page de collection si le statut a changé
        if (result.anime.statut_visionnage) {
          window.dispatchEvent(new CustomEvent('anime-status-changed', {
            detail: { animeId: parseInt(id!), statut: result.anime.statut_visionnage, episodes_vus: result.anime.episodes_vus }
          }));
        }
      }
    } catch (error) {
      console.error('Erreur toggle episode:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de mettre à jour l\'épisode',
        type: 'error'
      });
      loadAnime();
    }
  };

  const handleMarquerToutVu = async () => {
    try {
      await window.electronAPI.marquerAnimeComplet(parseInt(id!));
      loadAnime();
    } catch (error) {
      console.error('Erreur marquer tout vu:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const animeId = parseInt(id!);
      await window.electronAPI.deleteAnime(animeId);
      
      // Notifier la page de collection pour supprimer l'anime de la liste
      window.dispatchEvent(new CustomEvent('anime-deleted', {
        detail: { animeId }
      }));
      
      navigate('/animes');
    } catch (error) {
      console.error('Erreur suppression anime:', error);
    }
  };

  const handleChangeStatutVisionnage = async (nouveauStatut: 'En cours' | 'Terminé' | 'Abandonné' | 'À regarder' | 'En pause') => {
    try {
      const animeId = parseInt(id!);
      await window.electronAPI.setAnimeStatutVisionnage(animeId, nouveauStatut);
      
      // Mettre à jour l'état local sans recharger
      if (anime) {
        setAnime({ ...anime, statut_visionnage: nouveauStatut });
      }
      
      // Notifier la page de collection pour mettre à jour les cartes
      window.dispatchEvent(new CustomEvent('anime-status-changed', {
        detail: { animeId, statut: nouveauStatut }
      }));
      
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur changement statut:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du changement de statut',
        type: 'error'
      });
    }
  };

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
      const res = await window.electronAPI.enrichAnimeNow?.(anime.id, true);
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

  const handleToggleFavorite = async () => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      const users = await window.electronAPI.getAllUsers();
      const user = users.find((u: any) => u.name === currentUser);
      
      if (user && anime) {
        await window.electronAPI.toggleAnimeFavorite(parseInt(id!), user.id);
        
        // Mettre à jour l'état local sans recharger
        setAnime({ ...anime, is_favorite: !anime.is_favorite });
        
        // Notifier la page de collection pour mettre à jour les cartes
        window.dispatchEvent(new CustomEvent('anime-favorite-changed', {
          detail: { animeId: parseInt(id!), isFavorite: !anime.is_favorite }
        }));
        
        showToast({
          title: 'Favoris modifiés',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la modification des favoris',
        type: 'error'
      });
    }
  };

  const shouldShow = (field: string): boolean => {
    if (field in localPrefs) return !!localPrefs[field];
    if (field in globalPrefs) return !!globalPrefs[field];
    return true;
  };

  const reloadDisplayPreferences = async () => {
    await loadDisplayPreferences();
  };

  // Calculs dérivés
  const liensStreaming = anime?.liens_streaming ? JSON.parse(anime.liens_streaming) : [];
  const liensExternes = anime?.liens_externes ? JSON.parse(anime.liens_externes) : [];
  const episodesVus = episodes.filter(ep => ep.vu).length;
  const isCrunchyroll = anime?.source_import === 'crunchyroll';

  return {
    // Données
    anime,
    episodes,
    loading,
    streamingLinks,
    liensStreaming,
    liensExternes,
    episodesVus,
    isCrunchyroll,
    
    // États UI
    showDeleteModal,
    showEditModal,
    showCustomizeDisplay,
    showAddLinkForm,
    newLink,
    enriching,
    
    // Actions
    setShowDeleteModal,
    setShowEditModal,
    setShowCustomizeDisplay,
    setShowAddLinkForm,
    setNewLink,
    handleDelete,
    handleAddLink,
    handleDeleteLink,
    handleAddExternalLink,
    handleToggleEpisode,
    handleMarquerToutVu,
    handleChangeStatutVisionnage,
    handleToggleFavorite,
    handleEnrich,
    loadAnime,
    reloadDisplayPreferences,
    shouldShow,
    
    // Navigation
    navigate,
    
    // Toast
    ToastContainer
  };
}
