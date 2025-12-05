import AddMalItemModal from '../common/AddMalItemModal';
import { createMangaModalConfig } from '../common/mal-modal-helpers';

interface AddMangaModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onComplete?: () => void;
  initialMalId?: string;
}

/**
 * Modal pour ajouter des mangas, manhwa, manhua, light novel, webtoon via MAL/AniList
 */
export default function AddMangaModal({ onClose, onSuccess, onComplete, initialMalId }: AddMangaModalProps) {
  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    if (onComplete) onComplete();
  };

  return (
    <AddMalItemModal
      config={createMangaModalConfig(initialMalId)}
      onClose={onClose}
      onSuccess={handleSuccess}
    />
  );
}
