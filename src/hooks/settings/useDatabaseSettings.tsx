import { useState } from 'react';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

export function useDatabaseSettings() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await window.electronAPI.exportDatabase();
      if (result.success) {
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await window.electronAPI.importDatabase();
      if (result.success) {
        setShowImportSuccess(true);
        setTimeout(() => {
          setShowImportSuccess(false);
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteUserData = async () => {
    const confirmed = await confirm({
      title: 'Supprimer les données utilisateur',
      message: 'Cette action supprimera TOUTES les données de lecture de l\'utilisateur actuel (tomes lus, épisodes vus, etc.). Les séries et tomes ne seront PAS supprimés. Cette action est irréversible !',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        const currentUser = await window.electronAPI.getCurrentUser();
        await window.electronAPI.deleteUserData(currentUser);
        showToast({
          title: 'Données supprimées',
          message: 'Redémarrez l\'application pour voir les changements',
          type: 'success'
        });
      } catch (error) {
        showToast({ title: 'Erreur', message: 'Erreur lors de la suppression des données utilisateur', type: 'error' });
      }
    }
  };

  const handleDeleteAllData = async () => {
    const confirmed = await confirm({
      title: '⚠️ DANGER : Supprimer TOUTES les données',
      message: 'Cette action supprimera DÉFINITIVEMENT:\n\n• Toutes les séries (mangas et animes)\n• Tous les tomes\n• Toutes les données de lecture de TOUS les utilisateurs\n• Toutes les images de couvertures\n\nCette action est IRRÉVERSIBLE !\n\nL\'application se fermera automatiquement.',
      confirmText: 'Je comprends, TOUT supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        await window.electronAPI.deleteAllData();
        showToast({ title: 'Suppression en cours...', message: 'L\'application va redémarrer', type: 'info' });
        setTimeout(() => {
          window.electronAPI.quitApp({ shouldRelaunch: true });
        }, 2000);
      } catch (error) {
        showToast({ title: 'Erreur', message: 'Erreur lors de la suppression des données', type: 'error' });
      }
    }
  };

  return {
    importing,
    exporting,
    showExportSuccess,
    showImportSuccess,
    handleExport,
    handleImport,
    handleDeleteUserData,
    handleDeleteAllData,
    confirm,
    ConfirmDialog
  };
}
