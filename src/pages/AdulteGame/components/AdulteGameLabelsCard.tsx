import React from 'react';
import LabelsCard from '../../../components/common/LabelsCard';

interface AdulteGameLabelsCardProps {
  gameId: number;
  onLabelsChange?: () => void;
}

const AdulteGameLabelsCard: React.FC<AdulteGameLabelsCardProps> = ({ gameId, onLabelsChange }) => {
  return (
    <LabelsCard
      itemId={gameId}
      onLabelsChange={onLabelsChange}
      getLabels={window.electronAPI.getAdulteGameLabels}
      getAllLabels={window.electronAPI.getAllAdulteGameLabels}
      addLabel={window.electronAPI.addAdulteGameLabel}
      removeLabel={window.electronAPI.removeAdulteGameLabel}
    />
  );
};

export default AdulteGameLabelsCard;
