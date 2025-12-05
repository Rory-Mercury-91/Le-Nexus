import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';
import { useDetailPage } from './useDetailPage';
import { useItemActions } from './useItemActions';

export interface RawgGameDetail {
  // Données de la base locale
  id: number;
  titre: string;
  game_version: string | null;
  game_statut: string | null;
  game_engine: string | null;
  game_developer: string | null;
  game_site: string;
  couverture_url: string | null;
  tags: string | null | string[];
  rawg_id: number;
  rawg_rating: number | null;
  rawg_released: string | null;
  rawg_platforms: string | null;
  rawg_description: string | null;
  rawg_website: string | null;
  chemin_executable: string | null;
  notes_privees: string | null;
  derniere_session: string | null;
  version_jouee: string | null;
  is_favorite: boolean;
  statut_perso: string | null;
  is_hidden: boolean;
  labels: Array<{ label: string; color: string }>;
  display_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;

  // Données complètes de l'API RAWG
  rawgData: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    description_raw: string | null;
    released: string | null;
    tba: boolean;
    background_image: string | null;
    background_image_additional: string | null;
    website: string | null;
    rating: number | null;
    rating_top: number;
    ratings: Array<{ id: number; title: string; count: number }>;
    ratings_count: number;
    metacritic: number | null;
    metacritic_platforms: Array<any>;
    playtime: number | null;
    screenshots_count: number;
    movies_count: number;
    platforms: Array<any>;
    genres: Array<{ id: number; name: string; slug: string }>;
    tags: Array<{ id: number; name: string; slug: string }>;
    developers: Array<{ id: number; name: string; slug: string }>;
    publishers: Array<{ id: number; name: string; slug: string }>;
    stores: Array<any>;
    short_screenshots: Array<{ id: number; image: string }>;
    screenshots: Array<any>;
    movies: Array<any>;
    updated: string;
    added: string;
    added_by_status: any;
    parent_platforms: Array<any>;
    dominant_color: string | null;
    saturated_color: string | null;
    reddit_url: string | null;
    reddit_name: string | null;
    reddit_description: string | null;
    reddit_count: number;
    twitch_count: number;
    youtube_count: number;
    reviews_text_count: number;
    reviews_count: number;
    suggestions_count: number;
    alternative_names: Array<string>;
    community_rating: number | null;
    status: string | null;
    esrb_rating: { id: number; name: string; slug: string } | null | string;
    clip: any;
  };
}

type RawgGameDisplayPrefs = {
  banner: boolean;
  description: boolean;
  metadata: boolean;
  ratings: boolean;
  platforms: boolean;
  genres: boolean;
  tags: boolean;
  developers: boolean;
  publishers: boolean;
  stores: boolean;
  screenshots: boolean;
  movies: boolean;
  requirements: boolean;
  community: boolean;
  externalLinks: boolean;
};

const rawgGameDisplayDefaults: RawgGameDisplayPrefs = {
  banner: true,
  description: true,
  metadata: true,
  ratings: true,
  platforms: true,
  genres: true,
  tags: true,
  developers: true,
  publishers: true,
  stores: true,
  screenshots: true,
  movies: true,
  requirements: true,
  community: true,
  externalLinks: true
};

export function useRawgGameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const { ConfirmDialog } = useConfirm();

  const loadDetailApi = useCallback(async (itemId: number) => {
    const data = await window.electronAPI.getRawgGameDetail?.(itemId);
    return data || null;
  }, []);

  const loadDisplaySettingsApi = useCallback(async () => {
    const result = await window.electronAPI.getRawgGameDisplaySettings();
    return (result as RawgGameDisplayPrefs) || null;
  }, []);

  const loadDisplayOverridesApi = useCallback(async (itemId: number) => {
    const result = await window.electronAPI.getRawgGameDisplayOverrides(itemId);
    return result || null;
  }, []);

  const normalizeData = useCallback((data: RawgGameDetail) => {
    // Parser les tags depuis JSON string si nécessaire
    let tagsArray: string[] = [];
    if (data.tags) {
      if (typeof data.tags === 'string') {
        try {
          const parsed = JSON.parse(data.tags);
          tagsArray = Array.isArray(parsed) ? parsed : [];
        } catch {
          // Si ce n'est pas du JSON valide, traiter comme une chaîne simple
          tagsArray = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      } else if (Array.isArray(data.tags)) {
        tagsArray = data.tags;
      }
    }

    return {
      ...data,
      tags: tagsArray,
      // Mapper les anciens noms vers les nouveaux pour compatibilité avec EditAdulteGameModal
      version: data.game_version,
      statut_jeu: data.game_statut,
      moteur: data.game_engine,
      developpeur: data.game_developer,
      plateforme: data.game_site,
      couverture_url: data.couverture_url,
      rawgData: {
        ...data.rawgData,
        genres: data.rawgData.genres || [],
        tags: data.rawgData.tags || [],
        platforms: data.rawgData.platforms || [],
        developers: data.rawgData.developers || [],
        publishers: data.rawgData.publishers || [],
        stores: data.rawgData.stores || [],
        short_screenshots: data.rawgData.short_screenshots || [],
        screenshots: data.rawgData.screenshots || [],
        movies: data.rawgData.movies || []
      }
    };
  }, []);

  const isEventForCurrentItem = useCallback((event: CustomEvent, _item: RawgGameDetail | null, itemId: string | undefined) => {
    const { gameId } = event.detail;
    const currentId = itemId ? Number(itemId) : null;
    return currentId !== null && gameId === currentId;
  }, []);

  const reloadAfterEvent = useCallback(async (event: CustomEvent, itemId: string | undefined) => {
    const { gameId } = event.detail;
    const targetId = gameId || (itemId ? Number(itemId) : null);
    if (targetId) {
      const detail = await window.electronAPI.getRawgGameDetail(targetId);
      return detail || null;
    }
    return null;
  }, []);

  const [users, setUsers] = useState<Array<{ id: number; name: string; color: string; emoji: string }>>([]);
  const [profileImages, setProfileImages] = useState<Record<string, string | null>>({});
  const [owners, setOwners] = useState<Array<{ id: number; user_id: number; prix: number; date_achat: string | null; platforms: string | null; user_name: string; user_color: string; user_emoji: string }>>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await window.electronAPI.getAllUsers?.() || [];
        setUsers(allUsers);

        // Charger les images de profil
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
    item: game,
    setItem: setGame,
    loading,
    error,
    displayPrefs,
    showDisplaySettingsModal,
    showEditModal,
    setShowEditModal,
    handleOpenDisplaySettings,
    handleCloseDisplaySettings,
    loadDetail
  } = useDetailPage<RawgGameDetail, RawgGameDisplayPrefs>({
    itemId: id,
    displayDefaults: rawgGameDisplayDefaults,
    loadDetailApi,
    displayPreferencesMode: 'global-local',
    loadDisplaySettingsApi,
    loadDisplayOverridesApi,
    normalizeData,
    statusEventName: 'adulte-game-status-changed',
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError: 'Identifiant jeu manquant',
    notFoundError: 'Jeu RAWG introuvable dans votre collection'
  });

  const {
    updatingStatus,
    togglingFavorite,
    handleStatusChange,
    handleToggleFavorite,
    handleDelete
  } = useItemActions<RawgGameDetail>({
    itemId: game?.id,
    item: game,
    updateItem: setGame,
    reloadItem: async () => {
      if (game?.id) {
        const detail = await window.electronAPI.getRawgGameDetail(game.id);
        if (detail) {
          setGame(normalizeData(detail));
        }
      }
    },
    setStatusApi: ({ itemId, statut }) => window.electronAPI.updateAdulteGameGame(itemId, { statut_perso: statut }),
    toggleFavoriteApi: (itemId) => window.electronAPI.toggleAdulteGameFavorite(itemId),
    deleteApi: (itemId) => window.electronAPI.deleteAdulteGameGame(itemId),
    statusEventName: 'adulte-game-status-changed',
    getStatusEventData: (item) => ({
      gameId: item.id,
      statutPerso: item.statut_perso || null
    }),
    redirectRoute: '/games/video',
    itemName: 'jeu',
    getItemTitle: (item) => item.titre,
    getCurrentStatus: (item) => item.statut_perso || 'À jouer'
  });

  // Charger les propriétaires du jeu
  useEffect(() => {
    const loadOwners = async () => {
      if (!game?.id) return;
      try {
        const result = await window.electronAPI.adulteGameGetOwners(game.id);
        if (result?.success && result.owners) {
          // Parser les plateformes depuis JSON si nécessaire
          const ownersWithPlatforms = result.owners.map((owner: any) => {
            if (owner.platforms) {
              if (typeof owner.platforms === 'string') {
                try {
                  const parsed = JSON.parse(owner.platforms);
                  owner.platforms = Array.isArray(parsed) ? parsed.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0) : null;
                } catch {
                  owner.platforms = null;
                }
              } else if (!Array.isArray(owner.platforms)) {
                owner.platforms = null;
              } else {
                // Nettoyer le tableau existant
                owner.platforms = owner.platforms.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0);
              }
            } else {
              owner.platforms = null;
            }
            return owner;
          });
          setOwners(ownersWithPlatforms);
        }
      } catch (error) {
        console.error('Erreur chargement propriétaires:', error);
      }
    };
    loadOwners();
  }, [game?.id]);

  // Écouter les événements de mise à jour des propriétaires
  useEffect(() => {
    const handleOwnershipUpdate = () => {
      if (game?.id) {
        window.electronAPI.adulteGameGetOwners?.(game.id).then((result) => {
          if (result?.success && result.owners) {
            // Parser les plateformes depuis JSON si nécessaire
            const ownersWithPlatforms = result.owners.map((owner: any) => {
              if (owner.platforms) {
                if (typeof owner.platforms === 'string') {
                  try {
                    const parsed = JSON.parse(owner.platforms);
                    owner.platforms = Array.isArray(parsed) ? parsed.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0) : null;
                  } catch {
                    owner.platforms = null;
                  }
                } else if (!Array.isArray(owner.platforms)) {
                  owner.platforms = null;
                } else {
                  // Nettoyer le tableau existant
                  owner.platforms = owner.platforms.filter((p: any) => p && typeof p === 'string' && p.trim().length > 0);
                }
              } else {
                owner.platforms = null;
              }
              return owner;
            });
            setOwners(ownersWithPlatforms);
          }
        }).catch((error) => {
          console.error('Erreur rechargement propriétaires:', error);
        });
      }
    };

    window.addEventListener('adulte-game-ownership-updated', handleOwnershipUpdate);
    return () => {
      window.removeEventListener('adulte-game-ownership-updated', handleOwnershipUpdate);
    };
  }, [game?.id]);

  // Calculer les coûts par utilisateur avec plateformes
  const costsByUser = users.map(user => {
    const userOwner = owners.find(o => o.user_id === user.id);
    let platforms: string[] | null = null;
    if (userOwner?.platforms) {
      if (typeof userOwner.platforms === 'string') {
        try {
          const parsed = JSON.parse(userOwner.platforms);
          platforms = Array.isArray(parsed) ? parsed : null;
        } catch {
          platforms = null;
        }
      } else if (Array.isArray(userOwner.platforms)) {
        platforms = userOwner.platforms;
      }
    }
    return {
      user,
      cost: userOwner?.prix || 0,
      platforms
    };
  }).filter(item => item.cost > 0);

  // Calculer le prix total
  const totalPrix = owners.reduce((sum, o) => sum + (o.prix || 0), 0);

  const handlePlay = useCallback(async () => {
    if (!game?.id) return;

    try {
      const result = await window.electronAPI.launchAdulteGameGame(game.id);

      if (result?.openedWebsite) {
        showToast({
          title: 'Site web ouvert',
          message: 'Le site web du jeu a été ouvert dans votre navigateur',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Jeu lancé',
          message: 'Le jeu a été lancé avec succès',
          type: 'success'
        });
      }

      setTimeout(() => loadDetail({ silent: false }), 1000);
    } catch (error: any) {
      console.error('Erreur lancement jeu:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible de lancer le jeu',
        type: 'error'
      });
    }
  }, [game?.id, showToast, loadDetail]);

  return {
    // Données
    game,
    loading,
    error,

    // États UI
    showEditModal,
    setShowEditModal,
    showDisplaySettingsModal,
    handleOpenDisplaySettings,
    handleCloseDisplaySettings,

    // Actions
    handlePlay,
    handleStatusChange,
    handleToggleFavorite,
    handleDelete,
    loadDetail,

    // Préférences d'affichage
    displayPrefs,

    // États de chargement
    updatingStatus,
    togglingFavorite,

    // Propriétaires et coûts
    owners,
    costsByUser,
    totalPrix,
    users,
    profileImages,

    // Navigation
    navigate,

    // Toast
    ToastContainer,

    // Confirm
    ConfirmDialog
  };
}
