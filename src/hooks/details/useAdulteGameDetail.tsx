import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AdulteGame } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

interface GameVersion {
  version: string;
  path: string;
  label?: string;
}

export function useAdulteGameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  
  const [game, setGame] = useState<AdulteGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadGame();
  }, [id]);

  const loadGame = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAdulteGameGame(Number(id));
      setGame(data);
      
      // Marquer automatiquement comme "vu" si une mise à jour est disponible
      // (l'utilisateur a vu la notification et ouvre la page de détail)
      if (data?.maj_disponible) {
        try {
          await window.electronAPI.markAdulteGameUpdateSeen(data.id);
          // Mettre à jour l'état local pour refléter le changement
          setGame({ ...data, maj_disponible: false });
          
          // Notifier la page de collection pour mettre à jour les cartes
          window.dispatchEvent(new CustomEvent('adulte-game-update-seen', {
            detail: { gameId: data.id }
          }));
        } catch (error) {
          console.error('Erreur marquage MAJ comme vue:', error);
          // Ne pas bloquer l'affichage en cas d'erreur
        }
      }
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
      const result = await window.electronAPI.checkAdulteGameUpdates(game.id, false);
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

  // Force vérification (ignore user_modified_fields)
  const handleForceCheckUpdate = async () => {
    if (!game?.id) return;

    // Récupérer les champs protégés pour afficher dans la confirmation
    const userModifiedFields = game.user_modified_fields || null;
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

    // Filtrer pour ne garder que les champs de vérification (pas les champs personnalisés)
    const checkFields = [
      'titre', 'game_version', 'game_statut', 'game_engine', 'game_developer',
      'game_site', 'tags', 'couverture_url'
    ];
    
    const fieldsToUpdate = protectedFields.filter(field => checkFields.includes(field));

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

    setIsUpdating(true);
    try {
      const result = await window.electronAPI.checkAdulteGameUpdates(game.id, true);
      await loadGame();
      
      showToast({
        title: 'Force vérification terminée',
        type: 'success'
      });
      
      if (result.updated > 0) {
        showToast({
          title: 'Mise à jour détectée !',
          message: `Une nouvelle version est disponible (${result.sheetSynced} jeux synchronisés via Google Sheet)`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur force vérification MAJ:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de forcer la vérification',
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

  const handleDelete = useCallback(async () => {
    if (!game?.id) return;

    const confirmed = await confirm({
      title: 'Supprimer le jeu',
      message: `Êtes-vous sûr de vouloir supprimer "${game.titre}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

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
  }, [game, confirm, showToast, navigate]);

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
          path: exe.path,
          label: exe.label || `Version ${exe.version}`
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
    showEditModal,
    
    // Actions
    setShowEditModal,
    handleCheckUpdate,
    handleForceCheckUpdate,
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
    ToastContainer,

    // Confirm
    ConfirmDialog
  };
}
