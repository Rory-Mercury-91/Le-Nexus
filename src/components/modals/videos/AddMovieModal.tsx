import { TmdbMovieSearchResult } from '../../../types';
import { getTmdbImageUrl } from '../../../utils/tmdb';
import AddTmdbItemModal, { AddTmdbItemModalConfig, FormField, TmdbResultMapper } from '../common/AddTmdbItemModal';

interface AddMovieModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialTmdbId?: number;
}

export default function AddMovieModal({ onClose, onSuccess, initialTmdbId }: AddMovieModalProps) {
  const movieFields: FormField[] = [
    { key: 'tmdb_id', type: 'text', label: 'ID TMDb (auto)', required: false },
    { key: 'titre', type: 'text', label: 'Titre', placeholder: 'Ex: Inception', required: true },
    { key: 'titre_original', type: 'text', label: 'Titre original', placeholder: 'Ex: Inception', required: false },
    { key: 'date_sortie', type: 'date', label: 'Date de sortie', required: false },
    { key: 'duree', type: 'number', label: 'Durée (minutes)', placeholder: 'Ex: 148', min: 0, required: false },
    { key: 'note_moyenne', type: 'number', label: 'Note moyenne', placeholder: 'Ex: 8.5', min: 0, max: 10, step: '0.001', required: false },
    { key: 'popularite', type: 'number', label: 'Popularité', placeholder: 'Ex: 100.5', min: 0, step: '0.1', required: false },
    {
      key: 'statut',
      type: 'select',
      label: 'Statut',
      options: [
        { value: '', label: '-- Non défini --' },
        { value: 'Released', label: 'Sorti' },
        { value: 'Planned', label: 'Prévu' },
        { value: 'In Production', label: 'En production' },
        { value: 'Post Production', label: 'Post-production' },
        { value: 'Canceled', label: 'Annulé' }
      ],
      required: false
    },
    { key: 'synopsis', type: 'textarea', label: 'Synopsis', placeholder: 'Description du film...', required: false },
    { key: 'poster_path', type: 'text', label: 'URL image (géré par CoverImageUpload)', required: false },
    { key: 'backdrop_path', type: 'text', label: 'Backdrop (non utilisé)', required: false }
  ];

  const movieResultMapper: TmdbResultMapper<TmdbMovieSearchResult> = {
    mapResultToFormData: (result) => ({
      tmdb_id: result.tmdbId || null,
      titre: result.title || '',
      titre_original: result.originalTitle || '',
      synopsis: result.overview || '',
      statut: '',
      date_sortie: result.releaseDate || '',
      duree: '',
      note_moyenne: result.voteAverage ? (Math.round(result.voteAverage * 10) / 10).toString() : '',
      popularite: '',
      poster_path: result.posterPath ? getTmdbImageUrl(result.posterPath, 'w500') || '' : '',
      backdrop_path: ''
    })
  };

  const config: AddTmdbItemModalConfig<TmdbMovieSearchResult> = {
    title: 'Ajouter un film',
    mediaType: 'movie',
    formFields: movieFields,
    formLayout: [
      ['titre'],
      ['titre_original'],
      ['date_sortie', 'duree'],
      ['note_moyenne', 'popularite'],
      ['statut'],
      ['synopsis']
    ],
    searchConfig: {
      searchApi: (query) => window.electronAPI.searchTmdbMovies(query, 1),
      importDirectlyApi: (id) => window.electronAPI.syncMovieFromTmdb(id, { autoTranslate: true }),
      importOptions: { autoTranslate: true },
      importSuccessMessage: 'Film importé avec succès',
      importErrorMessage: 'Erreur lors de l\'import depuis TMDb'
    },
    resultMapper: movieResultMapper,
    createApi: async (data) => {
      const movieData = {
        tmdb_id: data.tmdb_id || null,
        titre: data.titre.trim(),
        titre_original: data.titre_original?.trim() || null,
        synopsis: data.synopsis?.trim() || null,
        statut: data.statut || null,
        date_sortie: data.date_sortie || null,
        duree: data.duree ? parseInt(String(data.duree), 10) : null,
        note_moyenne: data.note_moyenne ? parseFloat(String(data.note_moyenne)) : null,
        popularite: data.popularite ? parseFloat(String(data.popularite).replace(',', '.')) : null,
        genres: [],
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null
      };
      return await window.electronAPI.createMovie(movieData);
    },
    enrichApi: (tmdbId) => window.electronAPI.syncMovieFromTmdb(tmdbId, { autoTranslate: true }),
    enrichOptions: { autoTranslate: true },
    createSuccessMessage: 'Film ajouté avec succès',
    enrichSuccessMessage: 'Enrichissement terminé',
    initialTmdbId,
    searchPlaceholder: 'Ex: Inception, Stargate, ou ID TMDb (603)...',
    exampleId: '603'
  };

  return (
    <AddTmdbItemModal
      config={config}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
