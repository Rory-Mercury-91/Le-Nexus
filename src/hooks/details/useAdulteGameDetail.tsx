import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AdulteGame } from '../../types';
import { useToast } from '../common/useToast';

interface GameVersion {
  version: string;
  path: string;
}

export function useAdulteGameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  
  const [game, setGame] = useState<AdulteGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadGame();
  }, [id]);

  const loadGame = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAdulteGameGame(Number(id));
      setGame(data);
    } catch (error) {
      console.error('Erreur chargement jeu adulte:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de charger les détails du jeu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdate = async () => {
    if (!game?.id) return;

    setIsUpdating(true);
    try {
      const result = await window.electronAPI.checkAdulteGameUpdates(game.id);
      await loadGame();
      
      if (result.updated > 0) {
        showToast({
          title: 'Mise à jour détectée !',
          message: `Une nouvelle version est disponible (${result.sheetSynced} jeux synchronisés via Google Sheet)`,
          type: 'success'
        });
      } else {
        showToast({
          title: 'Vérification terminée',
          message: `Aucune mise à jour disponible (${result.sheetSynced} jeux synchronisés via Google Sheet)`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur vérification MAJ:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de vérifier les mises à jour',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePlay = async () => {
    if (!game?.id) return;

    try {
      await window.electronAPI.launchAdulteGameGame(game.id);
      showToast({
        title: 'Jeu lancé',
        message: 'Le jeu a été lancé avec succès',
        type: 'success'
      });
      
      setTimeout(() => loadGame(), 1000);
    } catch (error: any) {
      console.error('Erreur lancement jeu:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible de lancer le jeu',
        type: 'error'
      });
    }
  };

  const handleLaunchVersion = async (version: string) => {
    if (!game?.id) return;

    try {
      await window.electronAPI.launchAdulteGameGame(game.id, version);
      showToast({
        title: 'Jeu lancé',
        message: `Version ${version} lancée avec succès`,
        type: 'success'
      });
      
      setTimeout(() => loadGame(), 1000);
    } catch (error: any) {
      console.error('Erreur lancement jeu:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible de lancer le jeu',
        type: 'error'
      });
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!game?.id) return;

    try {
      await window.electronAPI.deleteAdulteGameGame(game.id);
      showToast({
        title: 'Jeu supprimé',
        message: 'Le jeu a été supprimé avec succès',
        type: 'success'
      });
      navigate('/adulte-game');
    } catch (error) {
      console.error('Erreur suppression jeu:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer le jeu',
        type: 'error'
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!game?.id) return;

    try {
      await window.electronAPI.updateAdulteGameGame(game.id, { statut_perso: newStatus as any });
      
      // Mettre à jour l'état local sans recharger
      if (game) {
        setGame({ ...game, statut_perso: newStatus as any });
      }
      
      // Notifier la page de collection pour mettre à jour les cartes
      window.dispatchEvent(new CustomEvent('adulte-game-status-changed', {
        detail: { gameId: game.id, statutPerso: newStatus }
      }));
      
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur changement statut:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le statut',
        type: 'error'
      });
    }
  };

  const handleNotesChange = (notes: string) => {
    if (game) {
      setGame({ ...game, notes_privees: notes });
    }
  };

  // Calculs dérivés pour les versions disponibles
  const availableVersions: GameVersion[] = (() => {
    if (!game?.chemin_executable) return [];
    try {
      const parsed = JSON.parse(game.chemin_executable);
      if (Array.isArray(parsed)) {
        return parsed.map(exe => ({
          version: exe.version,
          path: exe.path
        }));
      }
    } catch {}
    return [];
  })();

  const canPlay = (() => {
    if (!game?.chemin_executable) return false;
    try {
      const parsed = JSON.parse(game.chemin_executable);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return true; // Ancien format (string simple)
    }
  })();

  return {
    // Données
    game,
    loading,
    availableVersions,
    canPlay,
    
    // États UI
    isUpdating,
    showDeleteConfirm,
    showEditModal,
    
    // Actions
    setShowDeleteConfirm,
    setShowEditModal,
    handleCheckUpdate,
    handlePlay,
    handleLaunchVersion,
    handleEdit,
    handleDelete,
    handleStatusChange,
    handleNotesChange,
    loadGame,
    
    // Navigation
    navigate,
    
    // Toast
    ToastContainer
  };
}
