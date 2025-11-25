import { Serie } from '../../../types';
import EditMalItemModal from '../common/EditMalItemModal';
import { createMangaEditConfig } from '../common/edit-mal-helpers';

interface EditSerieModalProps {
  serie: Serie;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSerieModal({ serie, onClose, onSuccess }: EditSerieModalProps) {
  const config = createMangaEditConfig(serie);

  return (
    <EditMalItemModal
      config={config}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
