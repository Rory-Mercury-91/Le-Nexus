import AddMalItemModal from '../common/AddMalItemModal';
import { createMangaModalConfig } from '../common/mal-modal-helpers';

interface AddSerieModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMalId?: string;
}

export default function AddSerieModal({ onClose, onSuccess, initialMalId }: AddSerieModalProps) {
  return (
    <AddMalItemModal
      config={createMangaModalConfig(initialMalId)}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
