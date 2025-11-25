import { AnimeSearchResult, MangaSearchResult } from '../../../types';
import { AddMalItemModalConfig } from './AddMalItemModal';

/**
 * Helper pour créer la configuration d'ajout d'anime
 */
export function createAnimeModalConfig(
  initialMalId?: number
): AddMalItemModalConfig<AnimeSearchResult> {
  return {
    title: 'Ajouter un anime',
    mediaType: 'anime',
    searchApi: (query: string) => window.electronAPI.searchAnime(query),
    importDirectlyApi: (malId: number, options?: any) => 
      window.electronAPI.addAnimeByMalId(malId, options),
    createApi: async (data: Record<string, any>) => {
      const animeData = {
        titre: data.titre,
        titre_en: null,
        type: 'TV' as const,
        statut: 'plan_to_watch' as const,
        nb_episodes: 0,
        annee: data.annee || new Date().getFullYear(),
        score: 0,
        synopsis: data.synopsis || data.description || '',
        image_url: data.image_url || '',
        genres: data.genres || '',
        mal_id: data.mal_id || 0
      };
      return await window.electronAPI.createAnime(animeData);
    },
    enrichApi: (animeId: number, force = false) => 
      window.electronAPI.enrichAnimeNow?.(animeId, force) || Promise.resolve({ success: false }),
    createSuccessMessage: 'Anime ajouté avec succès',
    enrichSuccessMessage: 'Enrichissement terminé',
    initialMalId,
    searchPlaceholder: 'Ex: Attack on Titan, Death Note...'
  };
}

/**
 * Helper pour créer la configuration d'ajout de manga
 */
export function createMangaModalConfig(
  initialMalId?: string
): AddMalItemModalConfig<MangaSearchResult> {
  return {
    title: 'Ajouter une série',
    mediaType: 'manga',
    searchApi: (query: string) => window.electronAPI.searchManga(query),
    importDirectlyApi: (malId: number, options?: any) => 
      window.electronAPI.addMangaByMalId(malId, options),
    createApi: async (data: Record<string, any>) => {
      const serieData = {
        titre: data.titre,
        statut: 'En cours' as const,
        type_volume: 'Broché' as const,
        type_contenu: 'volume' as const,
        couverture_url: data.couvertureUrl || null,
        description: data.description || null,
        statut_publication: null,
        annee_publication: data.annee ? parseInt(data.annee.toString(), 10) : null,
        genres: data.genres || null,
        nb_volumes: null,
        nb_chapitres: null,
        langue_originale: null,
        demographie: null,
        editeur: null,
        mal_id: data.mal_id || null,
        themes: null,
        auteurs: null,
        serialization: null,
        titre_romaji: null,
        titre_natif: null,
        titre_anglais: null,
        titres_alternatifs: null,
        date_debut: null,
        date_fin: null,
        score_mal: null,
        rank_mal: null,
        popularity_mal: null,
        background: null,
        media_type: null
      };
      return await window.electronAPI.createSerie(serieData);
    },
    enrichApi: (serieId: number, force = false) => 
      window.electronAPI.enrichMangaNow?.(serieId, force) || Promise.resolve({ success: false }),
    createSuccessMessage: 'Série ajoutée avec succès',
    enrichSuccessMessage: 'Enrichissement terminé',
    initialMalId,
    searchPlaceholder: 'Ex: One Piece, Naruto, ou ID MAL (85781)...'
  };
}
