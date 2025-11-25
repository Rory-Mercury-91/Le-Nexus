import { FormField } from '../../../hooks/common/useFormValidation';
import { AnimeSerie, Serie } from '../../../types';
import { EditMalItemModalConfig } from './EditMalItemModal';

/**
 * Crée la configuration pour AnimeEditModal
 */
export function createAnimeEditConfig(anime: AnimeSerie): EditMalItemModalConfig<AnimeSerie> {
  const animeFields: FormField[] = [
    // Métadonnées de base
    {
      key: 'type',
      type: 'select',
      label: 'Type',
      options: [
        { value: 'TV', label: 'TV' },
        { value: 'Movie', label: 'Film' },
        { value: 'OVA', label: 'OVA' },
        { value: 'ONA', label: 'ONA' },
        { value: 'Special', label: 'Special' },
        { value: 'Music', label: 'Music' }
      ],
      required: false
    },
    { key: 'annee', type: 'number', label: 'Année (optionnel)', placeholder: '2024', required: false },
    { key: 'description', type: 'textarea', label: 'Description (optionnel)', placeholder: 'Synopsis de l\'anime...', required: false },
    
    // Métadonnées détaillées
    { key: 'source', type: 'text', label: 'Source (optionnel)', placeholder: 'Manga, Light Novel...', required: false },
    { key: 'nb_episodes', type: 'number', label: 'Nb épisodes (optionnel)', placeholder: '12', required: false },
    { key: 'duree', type: 'text', label: 'Durée (optionnel)', placeholder: '24 min', required: false },
    { key: 'statut_diffusion', type: 'text', label: 'Statut diffusion (optionnel)', placeholder: 'Finished Airing', required: false },
    { key: 'saison_diffusion', type: 'text', label: 'Saison (optionnel)', placeholder: 'Winter, Spring...', required: false },
    { key: 'en_cours_diffusion', type: 'checkbox', label: 'En cours de diffusion', required: false },
    
    // Dates
    { key: 'date_debut', type: 'date', label: 'Date début (VO) (optionnel)', required: false },
    { key: 'date_fin', type: 'date', label: 'Date fin (VO) (optionnel)', required: false },
    { key: 'date_sortie_vf', type: 'date', label: 'Date sortie VF (optionnel)', required: false },
    { key: 'date_debut_streaming', type: 'date', label: 'Date début streaming/simulcast (optionnel)', required: false },
    
    // Classification
    { key: 'genres', type: 'text', label: 'Genres (optionnel)', placeholder: 'Action, Aventure, Fantasy', required: false },
    { key: 'themes', type: 'text', label: 'Thèmes (optionnel)', placeholder: 'School, Military...', required: false },
    { key: 'demographics', type: 'text', label: 'Démographie (optionnel)', placeholder: 'Shounen, Seinen...', required: false },
    { key: 'rating', type: 'text', label: 'Rating (optionnel)', placeholder: 'PG-13, R+...', required: false },
    { key: 'age_conseille', type: 'text', label: 'Âge conseillé (optionnel)', placeholder: '12 ans et +, 16 ans...', required: false },
    { key: 'score', type: 'number', label: 'Score MAL (optionnel)', placeholder: '8.5', step: '0.01', required: false },
    
    // Statistiques MAL
    { key: 'rank_mal', type: 'number', label: 'Rang MAL (optionnel)', placeholder: '#1', required: false },
    { key: 'popularity_mal', type: 'number', label: 'Popularité MAL (optionnel)', placeholder: '#1', required: false },
    { key: 'scored_by', type: 'number', label: 'Nombre de notes (optionnel)', placeholder: '1000', required: false },
    { key: 'favorites', type: 'number', label: 'Favoris (optionnel)', placeholder: '500', required: false },
    
    // Production
    { key: 'studios', type: 'text', label: 'Studios (optionnel)', placeholder: 'Studio Ghibli, Toei Animation', required: false },
    { key: 'producteurs', type: 'text', label: 'Producteurs (optionnel)', placeholder: 'Bandai Visual, Aniplex', required: false },
    { key: 'diffuseurs', type: 'text', label: 'Diffuseurs (optionnel)', placeholder: 'Netflix, Disney+', required: false },
    { key: 'editeur', type: 'text', label: 'Éditeur (DVD/Blu-ray) (optionnel)', placeholder: 'KAZÉ, Kana...', required: false },
    { key: 'site_web', type: 'text', label: 'Site web officiel (optionnel)', placeholder: 'https://...', required: false },
    
    // Informations contextuelles
    { key: 'background', type: 'textarea', label: 'Background / Informations contextuelles (optionnel)', placeholder: 'Informations contextuelles sur l\'anime...', required: false },
    
    // Relations et franchise
    { key: 'franchise_name', type: 'text', label: 'Nom de la franchise (optionnel)', placeholder: 'Fate Series', required: false },
    { key: 'franchise_order', type: 'number', label: 'Ordre dans la franchise (optionnel)', placeholder: '1', required: false },
    { key: 'prequel_mal_id', type: 'number', label: 'Prequel MAL ID (optionnel)', placeholder: '12345', required: false },
    { key: 'sequel_mal_id', type: 'number', label: 'Sequel MAL ID (optionnel)', placeholder: '12346', required: false },
    
    // Liens
    { key: 'mal_url', type: 'text', label: 'URL MyAnimeList (optionnel)', placeholder: 'https://myanimelist.net/anime/12345', required: false },
    { key: 'liens_externes', type: 'textarea', label: 'Liens externes (JSON) (optionnel)', placeholder: '[{"name": "Wikipedia", "url": "https://..."}]', required: false },
    { key: 'liens_streaming', type: 'textarea', label: 'Liens streaming (JSON) (optionnel)', placeholder: '[{"name": "Netflix", "url": "https://..."}]', required: false }
  ];

  return {
    title: 'Modifier l\'anime',
    mediaType: 'anime',
    item: anime,
    formFields: animeFields,
    extractInitialValues: (item) => ({
      titre: item.titre || '',
      titre_romaji: item.titre_romaji || '',
      titre_natif: item.titre_natif || '',
      titre_anglais: item.titre_anglais || '',
      titres_alternatifs: item.titres_alternatifs || '',
      couverture_url: item.couverture_url || '',
      description: item.description || '',
      type: item.type || 'TV',
      source: item.source || '',
      nb_episodes: item.nb_episodes?.toString() || '',
      statut_diffusion: item.statut_diffusion || '',
      en_cours_diffusion: item.en_cours_diffusion || false,
      date_debut: item.date_debut || '',
      date_fin: item.date_fin || '',
      date_sortie_vf: item.date_sortie_vf || '',
      date_debut_streaming: item.date_debut_streaming || '',
      duree: item.duree || '',
      annee: item.annee?.toString() || '',
      saison_diffusion: item.saison_diffusion || '',
      genres: item.genres || '',
      themes: item.themes || '',
      demographics: item.demographics || '',
      rating: item.rating || '',
      age_conseille: item.age_conseille || '',
      score: item.score?.toString() || '',
      rank_mal: item.rank_mal?.toString() || '',
      popularity_mal: item.popularity_mal?.toString() || '',
      scored_by: item.scored_by?.toString() || '',
      favorites: item.favorites?.toString() || '',
      studios: item.studios || '',
      producteurs: item.producteurs || '',
      diffuseurs: item.diffuseurs || '',
      editeur: item.editeur || '',
      site_web: item.site_web || '',
      background: item.background || '',
      franchise_name: item.franchise_name || '',
      franchise_order: item.franchise_order?.toString() || '',
      prequel_mal_id: item.prequel_mal_id?.toString() || '',
      sequel_mal_id: item.sequel_mal_id?.toString() || '',
      mal_url: item.mal_url || '',
      liens_externes: item.liens_externes || '',
      liens_streaming: item.liens_streaming || ''
    }),
    updateApi: async (itemId, data) => {
      const updateData: Record<string, any> = {};
      
      // Ne traiter QUE les champs présents dans data (pas de || null pour les champs absents)
      if (data.titre !== undefined) {
        updateData.titre = data.titre ? data.titre.trim() : null;
      }
      if (data.titre_romaji !== undefined) {
        updateData.titre_romaji = data.titre_romaji?.trim() || null;
      }
      if (data.titre_natif !== undefined) {
        updateData.titre_natif = data.titre_natif?.trim() || null;
      }
      if (data.titre_anglais !== undefined) {
        updateData.titre_anglais = data.titre_anglais?.trim() || null;
      }
      if (data.titres_alternatifs !== undefined) {
        updateData.titres_alternatifs = data.titres_alternatifs?.trim() || null;
      }
      if (data.couverture_url !== undefined) {
        updateData.couverture_url = data.couverture_url || null;
      }
      if (data.description !== undefined) {
        updateData.description = data.description || null;
      }
      if (data.type !== undefined) {
        updateData.type = data.type || 'TV';
      }
      if (data.source !== undefined) {
        updateData.source = data.source || null;
      }
      if (data.nb_episodes !== undefined) {
        updateData.nb_episodes = data.nb_episodes ? parseInt(String(data.nb_episodes)) : 0;
      }
      if (data.statut_diffusion !== undefined) {
        updateData.statut_diffusion = data.statut_diffusion || null;
      }
      if (data.en_cours_diffusion !== undefined) {
        updateData.en_cours_diffusion = data.en_cours_diffusion || false;
      }
      if (data.date_debut !== undefined) {
        updateData.date_debut = data.date_debut || null;
      }
      if (data.date_fin !== undefined) {
        updateData.date_fin = data.date_fin || null;
      }
      if (data.date_sortie_vf !== undefined) {
        updateData.date_sortie_vf = data.date_sortie_vf || null;
      }
      if (data.date_debut_streaming !== undefined) {
        updateData.date_debut_streaming = data.date_debut_streaming || null;
      }
      if (data.duree !== undefined) {
        updateData.duree = data.duree || null;
      }
      if (data.annee !== undefined) {
        updateData.annee = data.annee ? parseInt(String(data.annee)) : null;
      }
      if (data.saison_diffusion !== undefined) {
        updateData.saison_diffusion = data.saison_diffusion || null;
      }
      if (data.genres !== undefined) {
        updateData.genres = data.genres || null;
      }
      if (data.themes !== undefined) {
        updateData.themes = data.themes || null;
      }
      if (data.demographics !== undefined) {
        updateData.demographics = data.demographics || null;
      }
      if (data.rating !== undefined) {
        updateData.rating = data.rating || null;
      }
      if (data.age_conseille !== undefined) {
        updateData.age_conseille = data.age_conseille || null;
      }
      if (data.score !== undefined) {
        updateData.score = data.score ? parseFloat(String(data.score)) : null;
      }
      if (data.rank_mal !== undefined) {
        updateData.rank_mal = data.rank_mal ? parseInt(String(data.rank_mal)) : null;
      }
      if (data.popularity_mal !== undefined) {
        updateData.popularity_mal = data.popularity_mal ? parseInt(String(data.popularity_mal)) : null;
      }
      if (data.scored_by !== undefined) {
        updateData.scored_by = data.scored_by ? parseInt(String(data.scored_by)) : null;
      }
      if (data.favorites !== undefined) {
        updateData.favorites = data.favorites ? parseInt(String(data.favorites)) : null;
      }
      if (data.studios !== undefined) {
        updateData.studios = data.studios || null;
      }
      if (data.producteurs !== undefined) {
        updateData.producteurs = data.producteurs || null;
      }
      if (data.diffuseurs !== undefined) {
        updateData.diffuseurs = data.diffuseurs || null;
      }
      if (data.editeur !== undefined) {
        updateData.editeur = data.editeur || null;
      }
      if (data.site_web !== undefined) {
        updateData.site_web = data.site_web || null;
      }
      if (data.background !== undefined) {
        updateData.background = data.background || null;
      }
      if (data.franchise_name !== undefined) {
        updateData.franchise_name = data.franchise_name || null;
      }
      if (data.franchise_order !== undefined) {
        updateData.franchise_order = data.franchise_order ? parseInt(String(data.franchise_order)) : null;
      }
      if (data.prequel_mal_id !== undefined) {
        updateData.prequel_mal_id = data.prequel_mal_id ? parseInt(String(data.prequel_mal_id)) : null;
      }
      if (data.sequel_mal_id !== undefined) {
        updateData.sequel_mal_id = data.sequel_mal_id ? parseInt(String(data.sequel_mal_id)) : null;
      }
      if (data.mal_url !== undefined) {
        updateData.mal_url = data.mal_url || null;
      }
      if (data.liens_externes !== undefined) {
        updateData.liens_externes = data.liens_externes || null;
      }
      if (data.liens_streaming !== undefined) {
        updateData.liens_streaming = data.liens_streaming || null;
      }
      
      return await window.electronAPI.updateAnime(Number(itemId), updateData);
    },
    successMessage: 'Anime modifié avec succès',
    supportBackgroundTranslation: false,
    uploadCoverApi: async (itemTitle, itemType, options) => {
      return await window.electronAPI.uploadCustomCover(itemTitle, itemType as 'serie' | 'tome' | 'anime' | 'adulte-game', options);
    },
    deleteCoverApi: async (coverUrl) => {
      await window.electronAPI.deleteCoverImage(coverUrl);
    }
  };
}

/**
 * Crée la configuration pour EditSerieModal (Manga)
 */
export function createMangaEditConfig(serie: Serie): EditMalItemModalConfig<Serie> {
  const mangaFields: FormField[] = [
    // Métadonnées de base
    {
      key: 'type_volume',
      type: 'select',
      label: 'Type de volume',
      options: [
        { value: 'Broché', label: '📖 Broché' },
        { value: 'Kindle', label: '📱 Kindle' },
        { value: 'Webtoon', label: '💻 Webtoon' },
        { value: 'Broché Collector', label: '📚 Broché Collector' },
        { value: 'Coffret', label: '📦 Coffret' },
        { value: 'Webtoon Physique', label: '📄 Webtoon Physique' },
        { value: 'Light Novel', label: '📘 Light Novel' },
        { value: 'Scan Manga', label: 'Scan Manga' },
        { value: 'Scan Webtoon', label: 'Scan Webtoon' },
        { value: 'Numérique', label: 'Numérique' }
      ],
      required: false
    },
    { key: 'description', type: 'textarea', label: 'Description (optionnel)', placeholder: 'Synopsis du manga...', required: false },
    
    // Statut publication
    { key: 'statut_publication', type: 'text', label: 'Statut publication (optionnel)', placeholder: 'Finished', required: false },
    { key: 'statut_publication_vf', type: 'text', label: 'Statut publication VF (optionnel)', placeholder: 'Finished', required: false },
    
    // Années
    { key: 'annee_publication', type: 'number', label: 'Année publication (optionnel)', placeholder: '2020', required: false },
    { key: 'annee_vf', type: 'number', label: 'Année VF (optionnel)', placeholder: '2021', required: false },
    
    // Genres et classification
    { key: 'genres', type: 'text', label: 'Genres (optionnel)', placeholder: 'Action, Aventure, Fantasy', required: false },
    { key: 'themes', type: 'text', label: 'Thèmes (optionnel)', placeholder: 'School, Military...', required: false },
    { key: 'demographie', type: 'text', label: 'Démographie (optionnel)', placeholder: 'Shounen, Seinen...', required: false },
    
    // Chapitres et volumes
    { key: 'nb_chapitres', type: 'number', label: 'Nb chapitres (optionnel)', placeholder: '100', required: false },
    { key: 'nb_chapitres_vf', type: 'number', label: 'Nb chapitres VF (optionnel)', placeholder: '80', required: false },
    { key: 'nb_volumes', type: 'number', label: 'Nb volumes (optionnel)', placeholder: '10', required: false },
    { key: 'nb_volumes_vf', type: 'number', label: 'Nb volumes VF (optionnel)', placeholder: '8', required: false },
    
    // Édition
    { key: 'langue_originale', type: 'text', label: 'Langue originale (optionnel)', placeholder: 'Japanese', required: false },
    { key: 'editeur', type: 'text', label: 'Éditeur (optionnel)', placeholder: 'Kana', required: false },
    { key: 'editeur_vo', type: 'text', label: 'Éditeur VO (optionnel)', placeholder: 'Shueisha', required: false },
    { key: 'serialization', type: 'text', label: 'Sérialisation (optionnel)', placeholder: 'Weekly Shonen Jump', required: false },
    { key: 'auteurs', type: 'text', label: 'Auteurs (optionnel)', placeholder: 'Auteur 1, Auteur 2', required: false },
    
    // Métadonnées MAL
    { key: 'media_type', type: 'text', label: 'Type média (optionnel)', placeholder: 'Manga', required: false },
    { key: 'date_debut', type: 'date', label: 'Date début (optionnel)', required: false },
    { key: 'date_fin', type: 'date', label: 'Date fin (optionnel)', required: false },
    { key: 'mal_id', type: 'number', label: 'MAL ID (optionnel)', placeholder: '12345', required: false },
    { key: 'score_mal', type: 'number', label: 'Score MAL (optionnel)', placeholder: '8.5', step: '0.01', required: false },
    { key: 'rank_mal', type: 'number', label: 'Rang MAL (optionnel)', placeholder: '#1', required: false },
    { key: 'popularity_mal', type: 'number', label: 'Popularité MAL (optionnel)', placeholder: '#1', required: false },
    
    // Informations contextuelles
    { key: 'background', type: 'textarea', label: 'Background / Informations contextuelles (optionnel)', placeholder: 'Informations contextuelles sur le manga...', required: false },
    
    // Relations
    { key: 'prequel_mal_id', type: 'number', label: 'Prequel MAL ID (optionnel)', placeholder: '12345', required: false },
    { key: 'sequel_mal_id', type: 'number', label: 'Sequel MAL ID (optionnel)', placeholder: '12346', required: false }
  ];

  // Fusionner tous les titres alternatifs en un seul champ
  const getTitresAlternatifs = (item: Serie): string => {
    const allTitles: string[] = [];
    if (item.titre_romaji) allTitles.push(item.titre_romaji);
    if (item.titre_natif) allTitles.push(item.titre_natif);
    if (item.titre_anglais) allTitles.push(item.titre_anglais);
    if (item.titres_alternatifs) {
      try {
        const parsed = JSON.parse(item.titres_alternatifs);
        if (Array.isArray(parsed)) {
          allTitles.push(...parsed.map(t => String(t).trim()).filter(Boolean));
        }
      } catch {
        // Ignorer si ce n'est pas du JSON valide
      }
    }
    const uniqueTitles = Array.from(new Set(allTitles.map(t => t.toLowerCase().trim())))
      .map(normalized => allTitles.find(t => t.toLowerCase().trim() === normalized))
      .filter(Boolean) as string[];
    return uniqueTitles.join(' // ');
  };

  return {
    title: 'Modifier la série',
    mediaType: 'manga',
    item: serie,
    formFields: mangaFields,
    extractInitialValues: (item) => ({
      titre: item.titre || '',
      titre_romaji: item.titre_romaji || '',
      titre_natif: item.titre_natif || '',
      titre_anglais: item.titre_anglais || '',
      titres_alternatifs: getTitresAlternatifs(item),
      couverture_url: item.couverture_url || '',
      description: item.description || '',
      type_volume: item.type_volume || 'Broché',
      statut_publication: item.statut_publication || '',
      statut_publication_vf: item.statut_publication_vf || '',
      annee_publication: item.annee_publication?.toString() || '',
      annee_vf: item.annee_vf?.toString() || '',
      genres: item.genres || '',
      nb_chapitres: item.nb_chapitres?.toString() || '',
      nb_chapitres_vf: item.nb_chapitres_vf?.toString() || '',
      nb_volumes: item.nb_volumes?.toString() || '',
      nb_volumes_vf: item.nb_volumes_vf?.toString() || '',
      langue_originale: item.langue_originale || '',
      demographie: item.demographie || '',
      editeur: item.editeur || '',
      editeur_vo: item.editeur_vo || '',
      themes: item.themes || '',
      serialization: item.serialization || '',
      auteurs: item.auteurs || '',
      media_type: item.media_type || '',
      date_debut: item.date_debut ? (() => {
        const d = new Date(item.date_debut);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      })() : '',
      date_fin: item.date_fin ? (() => {
        const d = new Date(item.date_fin);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      })() : '',
      mal_id: item.mal_id?.toString() || '',
      score_mal: item.score_mal?.toString() || '',
      rank_mal: item.rank_mal?.toString() || '',
      popularity_mal: item.popularity_mal?.toString() || '',
      background: item.background || '',
      prequel_mal_id: item.prequel_mal_id?.toString() || '',
      sequel_mal_id: item.sequel_mal_id?.toString() || ''
    }),
    updateApi: async (itemId, data) => {
      const updateData: Record<string, any> = {};
      
      // Ne traiter QUE les champs présents dans data (pas de || null pour les champs absents)
      if (data.titre !== undefined) {
        updateData.titre = data.titre ? data.titre.trim() : null;
      }
      if (data.type_volume !== undefined) {
        updateData.type_volume = data.type_volume || 'Broché';
      }
      if (data.couverture_url !== undefined) {
        updateData.couverture_url = data.couverture_url || null;
      }
      if (data.description !== undefined) {
        updateData.description = data.description || null;
      }
      if (data.statut_publication !== undefined) {
        updateData.statut_publication = data.statut_publication || null;
      }
      if (data.statut_publication_vf !== undefined) {
        updateData.statut_publication_vf = data.statut_publication_vf || null;
      }
      if (data.annee_publication !== undefined) {
        updateData.annee_publication = data.annee_publication ? parseInt(String(data.annee_publication)) : null;
      }
      if (data.annee_vf !== undefined) {
        updateData.annee_vf = data.annee_vf ? parseInt(String(data.annee_vf)) : null;
      }
      if (data.genres !== undefined) {
        updateData.genres = data.genres || null;
      }
      if (data.nb_chapitres !== undefined) {
        updateData.nb_chapitres = data.nb_chapitres ? parseInt(String(data.nb_chapitres)) : null;
      }
      if (data.nb_chapitres_vf !== undefined) {
        updateData.nb_chapitres_vf = data.nb_chapitres_vf ? parseInt(String(data.nb_chapitres_vf)) : null;
      }
      if (data.nb_volumes !== undefined) {
        updateData.nb_volumes = data.nb_volumes ? parseInt(String(data.nb_volumes)) : null;
      }
      if (data.nb_volumes_vf !== undefined) {
        updateData.nb_volumes_vf = data.nb_volumes_vf ? parseInt(String(data.nb_volumes_vf)) : null;
      }
      if (data.langue_originale !== undefined) {
        updateData.langue_originale = data.langue_originale || null;
      }
      if (data.demographie !== undefined) {
        updateData.demographie = data.demographie || null;
      }
      if (data.editeur !== undefined) {
        updateData.editeur = data.editeur || null;
      }
      if (data.editeur_vo !== undefined) {
        updateData.editeur_vo = data.editeur_vo || null;
      }
      if (data.themes !== undefined) {
        updateData.themes = data.themes || null;
      }
      if (data.serialization !== undefined) {
        updateData.serialization = data.serialization || null;
      }
      if (data.auteurs !== undefined) {
        updateData.auteurs = data.auteurs || null;
      }
      // titre_alternatif est toujours null (désactivé, tout est dans titres_alternatifs)
      if (data.titre_romaji !== undefined) {
        updateData.titre_romaji = data.titre_romaji || null;
      }
      if (data.titre_natif !== undefined) {
        updateData.titre_natif = data.titre_natif || null;
      }
      if (data.titre_anglais !== undefined) {
        updateData.titre_anglais = data.titre_anglais || null;
      }
      if (data.titres_alternatifs !== undefined) {
        updateData.titres_alternatifs = data.titres_alternatifs ? JSON.stringify(data.titres_alternatifs.split(' // ').map((t: string) => t.trim()).filter(Boolean)) : null;
      }
      if (data.media_type !== undefined) {
        updateData.media_type = data.media_type || null;
      }
      if (data.date_debut !== undefined) {
        updateData.date_debut = data.date_debut || null;
      }
      if (data.date_fin !== undefined) {
        updateData.date_fin = data.date_fin || null;
      }
      if (data.mal_id !== undefined) {
        updateData.mal_id = data.mal_id ? parseInt(String(data.mal_id)) : null;
      }
      if (data.score_mal !== undefined) {
        updateData.score_mal = data.score_mal ? parseFloat(String(data.score_mal)) : null;
      }
      if (data.rank_mal !== undefined) {
        updateData.rank_mal = data.rank_mal ? parseInt(String(data.rank_mal)) : null;
      }
      if (data.popularity_mal !== undefined) {
        updateData.popularity_mal = data.popularity_mal ? parseInt(String(data.popularity_mal)) : null;
      }
      if (data.background !== undefined) {
        updateData.background = data.background || null;
      }
      if (data.prequel_mal_id !== undefined) {
        updateData.prequel_mal_id = data.prequel_mal_id ? parseInt(String(data.prequel_mal_id)) : null;
      }
      if (data.sequel_mal_id !== undefined) {
        updateData.sequel_mal_id = data.sequel_mal_id ? parseInt(String(data.sequel_mal_id)) : null;
      }
      
      return await window.electronAPI.updateSerie(Number(itemId), updateData);
    },
    successMessage: 'Série modifiée avec succès',
    supportBackgroundTranslation: true,
    translateDescriptionApi: async (itemId) => {
      return await window.electronAPI.translateSerieDescription(Number(itemId));
    },
    translateBackgroundApi: async (itemId) => {
      return await window.electronAPI.translateSerieBackground?.(Number(itemId)) || { success: false, error: 'API non disponible' };
    },
    uploadCoverApi: async (itemTitle, itemType, options) => {
      return await window.electronAPI.uploadCustomCover(itemTitle, itemType as 'serie' | 'tome' | 'anime' | 'adulte-game', options);
    },
    deleteCoverApi: async (coverUrl) => {
      await window.electronAPI.deleteCoverImage(coverUrl);
    }
  };
}
