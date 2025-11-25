import { ArrowLeft, ArrowRight, CheckCircle, Folder } from 'lucide-react';

interface OnboardingNavigationProps {
  step: number;
  baseDirectory: string | null;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
  onChooseDirectory: () => Promise<void>;
  onComplete: () => void;
  hasExistingDatabases?: boolean;
  existingUsers?: Array<{ name: string; emoji: string; color: string; avatar_path: string | null }>;
  showCreateButton?: boolean;
}

export default function OnboardingNavigation({
  step,
  baseDirectory,
  loading,
  onBack,
  onNext,
  onChooseDirectory,
  onComplete,
  hasExistingDatabases = false,
  existingUsers = [],
  showCreateButton = false
}: OnboardingNavigationProps) {
  // À l'étape 2, si des bases existent et qu'un emplacement est sélectionné,
  // on ne montre pas les boutons de navigation (le sélecteur gère la sélection)
  // Mais si aucune base n'existe, on doit montrer le bouton "Suivant" pour passer à l'étape 3
  if (step === 2 && hasExistingDatabases && baseDirectory && existingUsers.length > 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      marginTop: '32px',
      justifyContent: step === 1 ? 'center' : 'space-between'
    }}>
      {step > 1 && (
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

      {step < 3 ? (
        <button
          onClick={step === 2 && !baseDirectory ? onChooseDirectory : onNext}
          className="btn btn-primary"
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            flex: step === 1 ? 'none' : '1'
          }}
        >
          {step === 2 && !baseDirectory ? (
            <>
              <Folder size={20} />
              Choisir l'emplacement
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
            width: showCreateButton ? '100%' : 'auto',
            flex: showCreateButton ? 'none' : '1'
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading" style={{ width: '18px', height: '18px' }} />
              Création du profil...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Créer le profil
            </>
          )}
        </button>
      )}
    </div>
  );
}
