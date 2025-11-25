import { useState, useCallback } from 'react';
import { useToast } from '../common/useToast';

interface Episode {
  numero: number;
  vu: boolean;
  date_visionnage: string | null;
}

interface UseAnimeEpisodesConfig {
  animeId: number | null;
  initialEpisodes?: Episode[];
  onAnimeUpdated?: (anime: any) => void;
}

export function useAnimeEpisodes(config: UseAnimeEpisodesConfig) {
  const { animeId, initialEpisodes = [], onAnimeUpdated } = config;
  const { showToast } = useToast();
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);

  const updateEpisodes = useCallback((newEpisodes: Episode[]) => {
    setEpisodes(newEpisodes.map(ep => ({
      ...ep,
      date_visionnage: ep.date_visionnage || null
    })));
  }, []);

  const handleToggleEpisode = useCallback(async (episodeNumero: number, currentVu: boolean) => {
    if (!animeId) return;

    try {
      // Mise à jour optimiste
      setEpisodes(prevEpisodes => 
        prevEpisodes.map(ep => 
          ep.numero === episodeNumero 
            ? { ...ep, vu: !currentVu, date_visionnage: !currentVu ? new Date().toISOString() : null }
            : ep
        )
      );
      
      await window.electronAPI.toggleEpisodeVu(animeId, episodeNumero, !currentVu);
      
      // Recharger l'anime pour obtenir le nouveau statut (qui peut avoir changé automatiquement)
      const result = await window.electronAPI.getAnimeDetail(animeId);
      if (result.success && result.anime) {
        updateEpisodes(result.episodes || []);
        
        if (onAnimeUpdated) {
          onAnimeUpdated(result.anime);
        }
        
        // Notifier la page de collection si le statut a changé
        if (result.anime.statut_visionnage) {
          window.dispatchEvent(new CustomEvent('anime-status-changed', {
            detail: { 
              animeId, 
              statut: result.anime.statut_visionnage, 
              episodes_vus: result.anime.episodes_vus 
            }
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
      // Recharger pour restaurer l'état correct
      if (animeId) {
        const result = await window.electronAPI.getAnimeDetail(animeId);
        if (result.success) {
          updateEpisodes(result.episodes || []);
        }
      }
    }
  }, [animeId, onAnimeUpdated, showToast, updateEpisodes]);

  const handleMarquerToutVu = useCallback(async () => {
    if (!animeId) return;

    try {
      await window.electronAPI.marquerAnimeComplet(animeId);
      // Recharger pour obtenir les épisodes mis à jour
      const result = await window.electronAPI.getAnimeDetail(animeId);
      if (result.success) {
        updateEpisodes(result.episodes || []);
        if (onAnimeUpdated) {
          onAnimeUpdated(result.anime);
        }
      }
    } catch (error) {
      console.error('Erreur marquer tout vu:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de marquer tous les épisodes comme vus',
        type: 'error'
      });
    }
  }, [animeId, onAnimeUpdated, showToast, updateEpisodes]);

  const episodesVus = episodes.filter(ep => ep.vu).length;

  return {
    episodes,
    episodesVus,
    updateEpisodes,
    handleToggleEpisode,
    handleMarquerToutVu
  };
}
