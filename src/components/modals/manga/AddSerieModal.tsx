import AddMalItemModal from '../common/AddMalItemModal';
import { createMangaModalConfig } from '../common/mal-modal-helpers';

interface AddSerieModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onComplete?: () => void;
  initialMalId?: string;
  initialMediaType?: string;
}

export default function AddSerieModal({ onClose, onSuccess, onComplete, initialMalId, initialMediaType }: AddSerieModalProps) {
  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    if (onComplete) onComplete();
  };

  return (
    <AddMalItemModal
      config={createMangaModalConfig(initialMalId, initialMediaType)}
      onClose={onClose}
      onSuccess={handleSuccess}
    />
  );
}
