import { FormField } from '../../../hooks/common/useFormValidation';
import { MovieDetail } from '../../../types';
import { getTmdbImageUrl } from '../../../utils/tmdb';
import EditItemModal, { EditItemModalConfig } from '../common/EditItemModal';

interface EditMovieModalProps {
  movie: MovieDetail;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMovieModal({ movie, onClose, onSuccess }: EditMovieModalProps) {
  const movieFields: FormField[] = [
    { key: 'titre', type: 'text', label: 'Titre', placeholder: 'Ex: Inception', required: true },
    { key: 'titre_original', type: 'text', label: 'Titre original (optionnel)', placeholder: 'Ex: Inception', required: false },
    { key: 'date_sortie', type: 'date', label: 'Date de sortie (optionnel)', required: false },
    { key: 'duree', type: 'number', label: 'Durée (minutes, optionnel)', placeholder: 'Ex: 148', min: 0, required: false },
    { key: 'note_moyenne', type: 'number', label: 'Note moyenne (optionnel)', placeholder: 'Ex: 8.5', min: 0, max: 10, step: '0.001', required: false },
    { key: 'popularite', type: 'number', label: 'Popularité (optionnel)', placeholder: 'Ex: 100.5', min: 0, step: '0.1', required: false },
    {
      key: 'statut',
      type: 'select',
      label: 'Statut (optionnel)',
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
    { key: 'synopsis', type: 'textarea', label: 'Synopsis (optionnel)', placeholder: 'Description du film...', required: false },
    { key: 'poster_path', type: 'text', label: 'URL image (géré par CoverImageUpload)', required: false },
    { key: 'backdrop_path', type: 'text', label: 'Backdrop (non utilisé)', required: false }
  ];

  const config: EditItemModalConfig<MovieDetail> = {
    title: 'Modifier le film',
    mediaType: 'movie',
    item: movie,
    formFields: movieFields,
    extractInitialValues: (item) => ({
      titre: item.titre || '',
      titre_original: item.titre_original || '',
      synopsis: item.synopsis || '',
      statut: item.statut || '',
      date_sortie: item.date_sortie || '',
      duree: item.duree?.toString() || '',
      note_moyenne: item.note_moyenne?.toString() || '',
      popularite: item.popularite?.toString() || '',
      poster_path: item.poster_path || '',
      backdrop_path: item.backdrop_path || ''
    }),
    normalizeImagePath: (path) => {
      if (!path) return '';
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      if (path.startsWith('/')) {
        return getTmdbImageUrl(path, 'original') || path;
      }
      return path;
    },
    formatPopularite: (value) => {
      if (value == null) return '';
      return value.toString().replace(',', '.');
    },
    updateApi: async (itemId, data) => {
      const movieData = {
        titre: data.titre.trim(),
        titre_original: data.titre_original?.trim() || null,
        synopsis: data.synopsis?.trim() || null,
        statut: data.statut || null,
        date_sortie: data.date_sortie || null,
        duree: data.duree ? parseInt(String(data.duree), 10) : null,
        note_moyenne: data.note_moyenne ? parseFloat(String(data.note_moyenne)) : null,
        popularite: data.popularite ? parseFloat(String(data.popularite).replace(',', '.')) : null,
        genres: movie.genres || [],
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null
      };
      return await window.electronAPI.updateMovie(Number(itemId), movieData);
    },
    successMessage: 'Film modifié avec succès'
  };

  return (
    <EditItemModal
      config={config}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
