import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(-1);
  };

  return (
    <div className={`detail-page-header${className ? ` ${className}` : ''}`}>
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
