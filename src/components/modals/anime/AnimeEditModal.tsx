import { AnimeSerie } from '../../../types';
import EditMalItemModal from '../common/EditMalItemModal';
import { createAnimeEditConfig } from '../common/edit-mal-helpers';

interface AnimeEditModalProps {
  anime: AnimeSerie;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnimeEditModal({ anime, onClose, onSuccess }: AnimeEditModalProps) {
  const config = createAnimeEditConfig(anime);

  return (
    <EditMalItemModal
      config={config}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
