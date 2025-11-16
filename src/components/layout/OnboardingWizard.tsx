import { useOnboarding } from '../../hooks/useOnboarding';
import FullScreenOverlay from '../common/FullScreenOverlay';
import {
  AdulteGamePasswordStep,
  ContentPreferencesStep,
  DirectoryStep,
  OnboardingNavigation,
  OnboardingProgress,
  ProfileStep,
  SummaryStep,
  WelcomeStep
} from './onboarding';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const {
    step,
    data,
    loading,
    error,
    showAdulteGamePassword,
    showAdulteGamePasswordConfirm,
    setName,
    setEmoji,
    setColor,
    setShowMangas,
    setShowAnimes,
    setShowMovies,
    setShowSeries,
    setShowAdulteGame,
    setAdulteGamePassword,
    setAdulteGamePasswordConfirm,
    setShowAdulteGamePassword,
    setShowAdulteGamePasswordConfirm,
    handleNext,
    handleBack,
    handleChooseDirectory,
    handleAvatarSelect,
    handleRemoveAvatar,
    handleComplete
  } = useOnboarding();

  return (
    <FullScreenOverlay padding="40px">
      <OnboardingProgress step={step} totalSteps={6} />

      {/* Contenu */}
      <div className="card" style={{
        maxWidth: '600px',
        width: '100%',
        padding: '48px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Étape 1 : Bienvenue */}
        {step === 1 && <WelcomeStep />}

        {/* Étape 2 : Profil */}
        {step === 2 && (
          <ProfileStep
            name={data.name}
            emoji={data.emoji}
            color={data.color}
            avatarPreview={data.avatarPreview}
            onNameChange={setName}
            onEmojiChange={setEmoji}
            onColorChange={setColor}
            onAvatarSelect={handleAvatarSelect}
            onRemoveAvatar={handleRemoveAvatar}
          />
        )}

        {/* Étape 3 : Emplacement de la base de données */}
        {step === 3 && (
          <DirectoryStep
            baseDirectory={data.baseDirectory}
            onChooseDirectory={handleChooseDirectory}
            error={error}
          />
        )}

        {/* Étape 4 : Préférences de contenu */}
        {step === 4 && (
          <ContentPreferencesStep
            showMangas={data.showMangas}
            showAnimes={data.showAnimes}
            showMovies={data.showMovies}
            showSeries={data.showSeries}
            showAdulteGame={data.showAdulteGame}
            onShowMangasChange={setShowMangas}
            onShowAnimesChange={setShowAnimes}
            onShowMoviesChange={setShowMovies}
            onShowSeriesChange={setShowSeries}
            onShowAdulteGameChange={setShowAdulteGame}
            error={error}
          />
        )}

        {/* Étape 5 : Mot de passe contenus adultes (optionnel) */}
        {step === 5 && (
          <AdulteGamePasswordStep
            adulteGamePassword={data.adulteGamePassword}
            adulteGamePasswordConfirm={data.adulteGamePasswordConfirm}
            showAdulteGamePassword={showAdulteGamePassword}
            showAdulteGamePasswordConfirm={showAdulteGamePasswordConfirm}
            onAdulteGamePasswordChange={setAdulteGamePassword}
            onAdulteGamePasswordConfirmChange={setAdulteGamePasswordConfirm}
            onShowAdulteGamePasswordToggle={() => setShowAdulteGamePassword(!showAdulteGamePassword)}
            onShowAdulteGamePasswordConfirmToggle={() => setShowAdulteGamePasswordConfirm(!showAdulteGamePasswordConfirm)}
          />
        )}

        {/* Étape 6 : Terminé */}
        {step === 6 && (
          <SummaryStep
            name={data.name}
            emoji={data.emoji}
            color={data.color}
            avatarPreview={data.avatarPreview}
            baseDirectory={data.baseDirectory}
            showMangas={data.showMangas}
            showAnimes={data.showAnimes}
            showMovies={data.showMovies}
            showSeries={data.showSeries}
            showAdulteGame={data.showAdulteGame}
            adulteGamePassword={data.adulteGamePassword}
          />
        )}

        {/* Erreur */}
        {error && step !== 3 && step !== 4 && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '14px',
            marginTop: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Boutons */}
        <OnboardingNavigation
          step={step}
          adulteGamePassword={data.adulteGamePassword}
          baseDirectory={data.baseDirectory}
          loading={loading}
          onBack={handleBack}
          onNext={handleNext}
          onChooseDirectory={handleChooseDirectory}
          onComplete={() => handleComplete(onComplete)}
        />
      </div>
    </FullScreenOverlay>
  );
}
