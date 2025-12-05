import { TmdbSeriesSearchResult } from '../../../types';
import { getTmdbImageUrl } from '../../../utils/tmdb';
import AddTmdbItemModal, { AddTmdbItemModalConfig, FormField, TmdbResultMapper } from '../common/AddTmdbItemModal';

interface AddSeriesModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialTmdbId?: number;
}

export default function AddSeriesModal({ onClose, onSuccess, initialTmdbId }: AddSeriesModalProps) {
  const seriesFields: FormField[] = [
    { key: 'tmdb_id', type: 'text', label: 'ID TMDb (auto)', required: false },
    { key: 'titre', type: 'text', label: 'Titre', placeholder: 'Ex: Breaking Bad', required: true },
    { key: 'titre_original', type: 'text', label: 'Titre original', placeholder: 'Ex: Breaking Bad', required: false },
    {
      key: 'type',
      type: 'select',
      label: 'Type',
      options: [
        { value: '', label: '-- Non défini --' },
        { value: 'Scripted', label: 'Scriptée' },
        { value: 'Reality', label: 'Réalité' },
        { value: 'Documentary', label: 'Documentaire' },
        { value: 'News', label: 'Actualités' },
        { value: 'Talk Show', label: 'Talk Show' },
        { value: 'Miniseries', label: 'Mini-série' }
      ],
      required: false
    },
    {
      key: 'statut',
      type: 'select',
      label: 'Statut',
      options: [
        { value: '', label: '-- Non défini --' },
        { value: 'Returning Series', label: 'En cours' },
        { value: 'Planned', label: 'Prévue' },
        { value: 'In Production', label: 'En production' },
        { value: 'Ended', label: 'Terminée' },
        { value: 'Canceled', label: 'Annulée' }
      ],
      required: false
    },
    { key: 'date_premiere', type: 'date', label: 'Date de première diffusion', required: false },
    { key: 'date_derniere', type: 'date', label: 'Date de dernière diffusion', required: false },
    { key: 'nb_saisons', type: 'number', label: 'Nombre de saisons', placeholder: 'Ex: 5', min: 0, required: false },
    { key: 'nb_episodes', type: 'number', label: 'Nombre d\'épisodes', placeholder: 'Ex: 62', min: 0, required: false },
    { key: 'duree_episode', type: 'number', label: 'Durée épisode (minutes)', placeholder: 'Ex: 45', min: 0, required: false },
    { key: 'note_moyenne', type: 'number', label: 'Note moyenne', placeholder: 'Ex: 9.5', min: 0, max: 10, step: '0.001', required: false },
    { key: 'popularite', type: 'number', label: 'Popularité', placeholder: 'Ex: 100.5', min: 0, step: '0.1', required: false },
    { key: 'synopsis', type: 'textarea', label: 'Synopsis', placeholder: 'Description de la série...', required: false },
    { key: 'poster_path', type: 'text', label: 'URL image (géré par CoverImageUpload)', required: false },
    { key: 'backdrop_path', type: 'text', label: 'Backdrop (non utilisé)', required: false }
  ];

  const seriesResultMapper: TmdbResultMapper<TmdbSeriesSearchResult> = {
    mapResultToFormData: (result) => ({
      tmdb_id: result.tmdbId || null,
      titre: result.title || '',
      titre_original: result.originalTitle || '',
      synopsis: result.overview || '',
      statut: '',
      type: '',
      date_premiere: result.firstAirDate || '',
      date_derniere: '',
      nb_saisons: '',
      nb_episodes: '',
      duree_episode: '',
      note_moyenne: result.voteAverage ? (Math.round(result.voteAverage * 10) / 10).toString() : '',
      popularite: '',
      poster_path: result.posterPath ? getTmdbImageUrl(result.posterPath, 'w500') || '' : '',
      backdrop_path: ''
    })
  };

  const config: AddTmdbItemModalConfig<TmdbSeriesSearchResult> = {
    title: 'Ajouter une série',
    mediaType: 'serie',
    formFields: seriesFields,
    formLayout: [
      ['titre'],
      ['titre_original'],
      ['type', 'statut'],
      ['date_premiere', 'date_derniere'],
      ['nb_saisons', 'nb_episodes'],
      ['duree_episode'],
      ['note_moyenne', 'popularite'],
      ['synopsis']
    ],
    searchConfig: {
      searchApi: (query) => window.electronAPI.searchTmdbSeries(query, 1),
      importDirectlyApi: (id) => window.electronAPI.syncTvShowFromTmdb(id, { autoTranslate: true, includeEpisodes: true }),
      importOptions: { autoTranslate: true, includeEpisodes: true },
      importSuccessMessage: 'Série importée avec succès',
      importErrorMessage: 'Erreur lors de l\'import depuis TMDb'
    },
    resultMapper: seriesResultMapper,
    createApi: async (data) => {
      const tvShowData = {
        tmdb_id: data.tmdb_id || null,
        titre: data.titre.trim(),
        titre_original: data.titre_original?.trim() || null,
        synopsis: data.synopsis?.trim() || null,
        statut: data.statut || null,
        type: data.type || null,
        date_premiere: data.date_premiere || null,
        date_derniere: data.date_derniere || null,
        nb_saisons: data.nb_saisons ? parseInt(String(data.nb_saisons), 10) : null,
        nb_episodes: data.nb_episodes ? parseInt(String(data.nb_episodes), 10) : null,
        duree_episode: data.duree_episode ? parseInt(String(data.duree_episode), 10) : null,
        note_moyenne: data.note_moyenne ? parseFloat(String(data.note_moyenne)) : null,
        popularite: data.popularite ? parseFloat(String(data.popularite).replace(',', '.')) : null,
        genres: [],
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null
      };
      return await window.electronAPI.createTvShow(tvShowData);
    },
    enrichApi: (tmdbId) => window.electronAPI.syncTvShowFromTmdb(tmdbId, { autoTranslate: true, includeEpisodes: true }),
    enrichOptions: { autoTranslate: true, includeEpisodes: true },
    createSuccessMessage: 'Série ajoutée avec succès',
    enrichSuccessMessage: 'Enrichissement terminé',
    initialTmdbId,
    searchPlaceholder: 'Ex: Breaking Bad, Game of Thrones, ou ID TMDb (1396)...',
    exampleId: '1396'
  };

  return (
    <AddTmdbItemModal
      config={config}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
