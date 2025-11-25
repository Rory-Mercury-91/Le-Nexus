import AddMalItemModal from '../common/AddMalItemModal';
import { createAnimeModalConfig } from '../common/mal-modal-helpers';

interface AddAnimeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMalId?: number;
}

export default function AddAnimeModal({ onClose, onSuccess, initialMalId }: AddAnimeModalProps) {
  return (
    <AddMalItemModal
      config={createAnimeModalConfig(initialMalId)}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
