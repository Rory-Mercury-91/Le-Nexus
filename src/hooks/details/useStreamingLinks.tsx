import { useCallback, useState } from 'react';
import { useToast } from '../common/useToast';

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

interface UseStreamingLinksConfig {
  animeId: number | null;
  malId?: number | null;
  initialLinks?: StreamingLink[];
}

export function useStreamingLinks(config: UseStreamingLinksConfig) {
  const { animeId, malId, initialLinks = [] } = config;
  const { showToast } = useToast();
  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>(initialLinks);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newLink, setNewLink] = useState({ platform: '', url: '', language: 'fr' });

  const loadStreamingLinks = useCallback(async (targetAnimeId?: number, targetMalId?: number) => {
    const resolvedAnimeId = targetAnimeId ?? animeId;
    const resolvedMalId = targetMalId ?? malId;

    if (!resolvedAnimeId) return;

    try {
      const result = await window.electronAPI.getStreamingLinks(resolvedAnimeId, resolvedMalId ?? undefined);
      if (result.success) {
        setStreamingLinks(result.links);
      }
    } catch (error) {
      console.error('Erreur chargement liens streaming:', error);
    }
  }, [animeId, malId]);

  const handleAddLink = useCallback(async () => {
    if (!animeId) return;

    if (!newLink.platform || !newLink.url) {
      showToast({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs',
        type: 'error'
      });
      return;
    }

    try {
      const result = await window.electronAPI.addStreamingLink(animeId, newLink);
      if (result.success) {
        showToast({
          title: 'Lien ajouté',
          message: `Le lien ${newLink.platform} a été ajouté`,
          type: 'success'
        });
        setNewLink({ platform: '', url: '', language: 'fr' });
        setShowAddLinkForm(false);
        loadStreamingLinks(animeId, malId ?? undefined);
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
  }, [animeId, malId, newLink, showToast, loadStreamingLinks]);

  const handleDeleteLink = useCallback(async (linkId: number) => {
    try {
      const result = await window.electronAPI.deleteStreamingLink(linkId);
      if (result.success) {
        showToast({
          title: 'Lien supprimé',
          message: 'Le lien a été supprimé avec succès',
          type: 'success'
        });
        loadStreamingLinks(animeId ?? undefined, malId ?? undefined);
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
  }, [animeId, malId, showToast, loadStreamingLinks]);

  const handleAddExternalLink = useCallback(async (linkData: { name: string; url: string }) => {
    if (!animeId) return;

    try {
      const result = await window.electronAPI.addExternalLink(animeId, linkData);
      if (result.success) {
        showToast({
          title: 'Lien ajouté',
          message: 'Le lien a été ajouté avec succès',
          type: 'success'
        });
        // Retourner true pour indiquer qu'un rechargement est nécessaire
        return true;
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || 'Erreur lors de l\'ajout',
          type: 'error'
        });
        return false;
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error.message,
        type: 'error'
      });
      return false;
    }
  }, [animeId, showToast]);

  return {
    streamingLinks,
    showAddLinkForm,
    setShowAddLinkForm,
    newLink,
    setNewLink,
    loadStreamingLinks,
    handleAddLink,
    handleDeleteLink,
    handleAddExternalLink
  };
}
