import React from 'react';
import LabelsCard from '../../../components/common/LabelsCard';

interface MangaLabelsCardProps {
  serieId: number;
  onLabelsChange?: () => void;
}

const MangaLabelsCard: React.FC<MangaLabelsCardProps> = ({ serieId, onLabelsChange }) => {
  return (
    <LabelsCard
      itemId={serieId}
      onLabelsChange={onLabelsChange}
      getLabels={window.electronAPI.getMangaLabels}
      getAllLabels={window.electronAPI.getAllMangaLabels}
      addLabel={window.electronAPI.addMangaLabel}
      removeLabel={window.electronAPI.removeMangaLabel}
    />
  );
};

export default MangaLabelsCard;
