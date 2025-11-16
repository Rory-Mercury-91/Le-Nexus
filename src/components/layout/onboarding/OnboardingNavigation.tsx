import { ArrowLeft, ArrowRight, CheckCircle, Folder } from 'lucide-react';

interface OnboardingNavigationProps {
  step: number;
  adulteGamePassword: string;
  baseDirectory: string | null;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
  onChooseDirectory: () => Promise<void>;
  onComplete: () => void;
}

export default function OnboardingNavigation({
  step,
  adulteGamePassword,
  baseDirectory,
  loading,
  onBack,
  onNext,
  onChooseDirectory,
  onComplete
}: OnboardingNavigationProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      marginTop: '32px',
      justifyContent: step === 1 ? 'center' : 'space-between'
    }}>
      {step > 1 && step < 7 && (
        <button
          onClick={onBack}
          className="btn btn-outline"
          style={{
            padding: '12px 24px',
            fontSize: '16px'
          }}
        >
          <ArrowLeft size={20} />
          Retour
        </button>
      )}

      {step < 6 ? (
        <button
          onClick={step === 3 && !baseDirectory ? onChooseDirectory : onNext}
          className="btn btn-primary"
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            flex: step === 1 ? 'none' : '1'
          }}
        >
          {step === 3 && !baseDirectory ? (
            <>
              <Folder size={20} />
              Choisir l'emplacement
            </>
          ) : step === 4 ? (
            <>
              Valider mes choix
              <ArrowRight size={20} />
            </>
          ) : step === 5 ? (
            <>
              {adulteGamePassword ? 'Définir et continuer' : 'Continuer sans protection'}
              <ArrowRight size={20} />
            </>
          ) : (
            <>
              Suivant
              <ArrowRight size={20} />
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onComplete}
          className="btn btn-primary"
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            width: '100%'
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading" style={{ width: '18px', height: '18px' }} />
              Finalisation...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Commencer
            </>
          )}
        </button>
      )}
    </div>
  );
}
