import { FormField } from '../../../hooks/common/useFormValidation';
import { TvShowDetail } from '../../../types';
import { getTmdbImageUrl } from '../../../utils/tmdb';
import EditItemModal, { EditItemModalConfig } from '../common/EditItemModal';

interface EditSeriesModalProps {
  show: TvShowDetail;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSeriesModal({ show, onClose, onSuccess }: EditSeriesModalProps) {
  const seriesFields: FormField[] = [
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

  const config: EditItemModalConfig<TvShowDetail> = {
    title: 'Modifier la série',
    mediaType: 'serie',
    item: show,
    formFields: seriesFields,
    extractInitialValues: (item) => ({
      titre: item.titre || '',
      titre_original: item.titre_original || '',
      synopsis: item.synopsis || '',
      statut: item.statut || '',
      type: item.type || '',
      date_premiere: item.date_premiere || '',
      date_derniere: item.date_derniere || '',
      nb_saisons: item.nb_saisons?.toString() || '',
      nb_episodes: item.nb_episodes?.toString() || '',
      duree_episode: item.duree_episode?.toString() || '',
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
      const tvShowData = {
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
        genres: show.genres || [],
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null
      };
      return await window.electronAPI.updateTvShow(Number(itemId), tvShowData);
    },
    successMessage: 'Série modifiée avec succès'
  };

  return (
    <EditItemModal
      config={config}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
