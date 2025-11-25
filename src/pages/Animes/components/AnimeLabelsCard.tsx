import React from 'react';
import LabelsCard from '../../../components/common/LabelsCard';

interface AnimeLabelsCardProps {
  animeId: number;
  onLabelsChange?: () => void;
}

const AnimeLabelsCard: React.FC<AnimeLabelsCardProps> = ({ animeId, onLabelsChange }) => {
  return (
    <LabelsCard
      itemId={animeId}
      onLabelsChange={onLabelsChange}
      getLabels={window.electronAPI.getAnimeLabels}
      getAllLabels={window.electronAPI.getAllAnimeLabels}
      addLabel={window.electronAPI.addAnimeLabel}
      removeLabel={window.electronAPI.removeAnimeLabel}
    />
  );
};

export default AnimeLabelsCard;
