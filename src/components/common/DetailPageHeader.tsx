import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';

interface DetailPageHeaderProps {
  backLabel: string;
  backTo?: string;
  onBack?: () => void;
  className?: string;
  actions?: React.ReactNode;
}

export default function DetailPageHeader({
  backLabel,
  backTo,
  onBack,
  className,
  actions
}: DetailPageHeaderProps) {
  const navigate = useNavigate();

  // Calculer la hauteur de la barre de progression pour ajuster le top du header
  const {
    malSyncing,
    animeProgress,
    mangaProgress,
    translating,
    adulteGameUpdating,
    adulteGameProgress,
    isProgressCollapsed
  } = useGlobalProgress();
  
  const hasActiveProgress = malSyncing ||
    animeProgress !== null ||
    mangaProgress !== null ||
    translating ||
    adulteGameUpdating ||
    adulteGameProgress !== null;
  
  // Calculer le top en fonction de l'état collapsed (60px si réduit, 200px si étendu)
  const progressHeaderHeight = hasActiveProgress ? (isProgressCollapsed ? 60 : 200) : 0;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(-1);
  };

  return (
    <div 
      className={`detail-page-header${className ? ` ${className}` : ''}`}
      style={{
        top: `${progressHeaderHeight}px`,
        transition: 'top 0.3s ease'
      }}
    >
      <div className="detail-page-header__left">
        {backTo ? (
          <Link to={backTo} className="detail-page-header__back">
            <ArrowLeft size={18} />
            {backLabel}
          </Link>
        ) : (
          <button type="button" onClick={handleBack} className="detail-page-header__back">
            <ArrowLeft size={18} />
            {backLabel}
          </button>
        )}
      </div>
      <div className="detail-page-header__actions">
        {actions}
      </div>
    </div>
  );
}
