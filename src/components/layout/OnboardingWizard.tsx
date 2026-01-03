import { useEffect } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import FullScreenOverlay from '../common/FullScreenOverlay';
import UserSelector from '../common/UserSelector';
import {
  CreateProfileStep,
  DirectoryStep,
  OnboardingNavigation,
  OnboardingProgress,
  WelcomeStep
} from './onboarding';

interface OnboardingWizardProps {
  onComplete: () => void;
  initialStep?: number;
  initialBaseDirectory?: string | null;
}

export default function OnboardingWizard({ onComplete, initialStep = 1, initialBaseDirectory = null }: OnboardingWizardProps) {
  const {
    step,
    data,
    loading,
    error,
    showAdulteGamePassword,
    showAdulteGamePasswordConfirm,
    hasExistingDatabases,
    existingUsers,
    autoConnectUser,
    setName,
    setEmoji,
    setColor,
    setShowMangas,
    setShowAnimes,
    setShowMovies,
    setShowSeries,
    setShowAdulteGame,
    setShowSubscriptions,
    setAdulteGamePassword,
    setAdulteGamePasswordConfirm,
    setShowAdulteGamePassword,
    setShowAdulteGamePasswordConfirm,
    handleNext,
    handleBack,
    handleChooseDirectory,
    handleAvatarSelect,
    handleRemoveAvatar,
    handleComplete,
    handleSelectExistingUser,
    handleCreateNewProfile
  } = useOnboarding(initialStep, initialBaseDirectory);

  // Connexion automatique si une seule base de données
  useEffect(() => {
    if (autoConnectUser && step === 2) {
      handleSelectExistingUser(autoConnectUser, onComplete);
    }
  }, [autoConnectUser, step, handleSelectExistingUser, onComplete]);

  const isWideStep = step === 3; // Étape 3 = page complète avec 2 colonnes
  const isUserSelectorStep = step === 2 && hasExistingDatabases && existingUsers.length > 1;

  return (
    <FullScreenOverlay padding="40px">
      <OnboardingProgress step={step} totalSteps={3} />

      {/* Contenu */}
      <div
        className="card"
        style={{
          maxWidth: isWideStep ? '1200px' : isUserSelectorStep ? '900px' : '600px',
          width: '100%',
          padding: isWideStep ? '48px 56px' : isUserSelectorStep ? '48px 56px' : '48px',
          textAlign: 'center',
          position: 'relative',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Étape 1 : Bienvenue */}
        {step === 1 && <WelcomeStep />}

        {/* Étape 2 : Choix de l'emplacement + Sélecteur utilisateur si bases existent */}
        {step === 2 && (
          <>
            {!data.baseDirectory ? (
              <DirectoryStep
                baseDirectory={data.baseDirectory}
                onChooseDirectory={handleChooseDirectory}
                error={error}
              />
            ) : autoConnectUser ? (
              // Connexion automatique en cours - afficher un indicateur de chargement
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                <h2 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
                  Connexion automatique...
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Connexion au profil "{autoConnectUser}"
                </p>
              </div>
            ) : hasExistingDatabases && existingUsers.length > 1 ? (
              <UserSelector
                onUserSelected={(userName) => handleSelectExistingUser(userName, onComplete)}
                onCreateNewProfile={handleCreateNewProfile}
                showCreateButton={true}
                title="Qui êtes-vous ?"
                subtitle="Des profils existent déjà dans cet emplacement. Sélectionnez le vôtre ou créez-en un nouveau."
                isInOnboarding={true}
              />
            ) : (
              <DirectoryStep
                baseDirectory={data.baseDirectory}
                onChooseDirectory={handleChooseDirectory}
                error={error}
              />
            )}
          </>
        )}

        {/* Étape 3 : Page complète de création de profil */}
        {step === 3 && (
          <CreateProfileStep
            name={data.name}
            emoji={data.emoji}
            color={data.color}
            avatarPreview={data.avatarPreview}
            showMangas={data.showMangas}
            showAnimes={data.showAnimes}
            showMovies={data.showMovies}
            showSeries={data.showSeries}
            showAdulteGame={data.showAdulteGame}
            showBooks={data.showBooks}
            showSubscriptions={data.showSubscriptions}
            adulteGamePassword={data.adulteGamePassword}
            adulteGamePasswordConfirm={data.adulteGamePasswordConfirm}
            showAdulteGamePassword={showAdulteGamePassword}
            showAdulteGamePasswordConfirm={showAdulteGamePasswordConfirm}
            onNameChange={setName}
            onEmojiChange={setEmoji}
            onColorChange={setColor}
            onAvatarSelect={handleAvatarSelect}
            onRemoveAvatar={handleRemoveAvatar}
            onShowMangasChange={setShowMangas}
            onShowAnimesChange={setShowAnimes}
            onShowMoviesChange={setShowMovies}
            onShowSeriesChange={setShowSeries}
            onShowAdulteGameChange={setShowAdulteGame}
            onShowSubscriptionsChange={setShowSubscriptions}
            onAdulteGamePasswordChange={setAdulteGamePassword}
            onAdulteGamePasswordConfirmChange={setAdulteGamePasswordConfirm}
            onShowAdulteGamePasswordToggle={() => setShowAdulteGamePassword(!showAdulteGamePassword)}
            onShowAdulteGamePasswordConfirmToggle={() => setShowAdulteGamePasswordConfirm(!showAdulteGamePasswordConfirm)}
            onBack={handleBack}
            onComplete={() => handleComplete(onComplete)}
            loading={loading}
            error={error}
          />
        )}

        {/* Boutons (uniquement pour les étapes 1 et 2) */}
        {step !== 3 && (
          <OnboardingNavigation
            step={step}
            baseDirectory={data.baseDirectory}
            loading={loading}
            onBack={handleBack}
            onNext={handleNext}
            onChooseDirectory={handleChooseDirectory}
            onComplete={() => handleComplete(onComplete)}
            hasExistingDatabases={hasExistingDatabases}
            existingUsers={existingUsers}
            showCreateButton={false}
          />
        )}
      </div>
    </FullScreenOverlay>
  );
}
