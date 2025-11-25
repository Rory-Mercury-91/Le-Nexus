import { useState, useCallback } from 'react';
import { Tome } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { useToast } from '../common/useToast';

interface UseMangaTomesConfig {
  serieId: number | null;
  initialTomes?: Tome[];
  onSerieReload?: () => Promise<void>;
}

export function useMangaTomes(config: UseMangaTomesConfig) {
  const { serieId, initialTomes = [], onSerieReload } = config;
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tomes, setTomes] = useState<Tome[]>(initialTomes);
  const [showAddTome, setShowAddTome] = useState(false);
  const [editingTome, setEditingTome] = useState<number | null>(null);
  const [draggingTomeId, setDraggingTomeId] = useState<number | null>(null);

  const updateTomes = useCallback((newTomes: Tome[]) => {
    setTomes(newTomes);
  }, []);

  const handleDeleteTome = useCallback(async (tomeId: number) => {
    const confirmed = await confirm({
      title: 'Supprimer le tome',
      message: 'Êtes-vous sûr de vouloir supprimer ce tome ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await window.electronAPI.deleteTome(tomeId);
      if (onSerieReload) {
        await onSerieReload();
      }
    } catch (error) {
      console.error('Erreur suppression tome:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer le tome',
        type: 'error'
      });
    }
  }, [confirm, onSerieReload, showToast]);

  const handleDragOver = useCallback((e: React.DragEvent, tomeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(tomeId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, tome: Tome, serieTitre?: string, mediaType?: string, typeVolume?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(null);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    // @ts-expect-error path est injecté par Electron dans l'environnement renderer
    const filePath = file.path;

    if (!filePath) return;
    if (!serieId) return;

    try {
      const result = await window.electronAPI.saveCoverFromPath(filePath, serieTitre || 'Tome', 'tome', {
        mediaType: mediaType || 'Manga',
        typeVolume: typeVolume || 'Broché'
      });

      if (result.success && result.localPath) {
        await window.electronAPI.updateTome(tome.id, {
          couverture_url: result.localPath
        });
        if (onSerieReload) {
          await onSerieReload();
        }
      }
    } catch (error) {
      console.error('Erreur upload couverture tome:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible d\'uploader la couverture',
        type: 'error'
      });
    }
  }, [serieId, onSerieReload, showToast]);

  // Calculs dérivés
  const lastTome = tomes.length > 0
    ? tomes.reduce((max, tome) => tome.numero > max.numero ? tome : max, tomes[0])
    : null;
  const totalPrix = tomes.reduce((sum, tome) => sum + tome.prix, 0);
  
  // Calculer le total Mihon (tomes marqués comme Mihon)
  const totalMihon = tomes
    .filter(tome => {
      const hasOwners = tome.proprietaires && tome.proprietaires.length > 0;
      return tome.mihon === 1 && !hasOwners;
    })
    .reduce((sum, tome) => sum + tome.prix, 0);

  return {
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
    ConfirmDialog
  };
}
