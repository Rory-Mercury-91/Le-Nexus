import { useState } from 'react';
import BackToTopButton from '../../components/collections/BackToTopButton';
import CollapsibleSection from '../../components/common/CollapsibleSection';
import SyncProgressBanner from '../../components/common/SyncProgressBanner';
import { useSettings } from '../../hooks/settings/useSettings';
import AnimeDisplaySettingsModal from '../../components/modals/common/AnimeDisplaySettingsModal';
import DisplaySettingsModal from '../../components/modals/common/DisplaySettingsModal';
import MovieDisplaySettingsModal from '../../components/modals/common/MovieDisplaySettingsModal';
import SeriesDisplaySettingsModal from '../../components/modals/common/SeriesDisplaySettingsModal';
import AdulteGameDisplaySettingsModal from '../../components/modals/adulte-game/AdulteGameDisplaySettingsModal';
import ApiKeyGuideModal from '../../components/modals/settings/ApiKeyGuideModal';
import {
    AppearanceSettings,
    IntegrationsSettings,
    DangerZone,
    DatabaseSettings,
    DevSettings,
    NotificationSettings,
    SourceCredits,
    TampermonkeySettings,
    UserManagement
} from './components';
import type { ApiKeyProvider } from './components/apiKeyGuideTypes';

export default function Settings() {
  const [apiGuideProvider, setApiGuideProvider] = useState<ApiKeyProvider | null>(null);

  const {
    theme,
    autoLaunch,
    groqApiKey,
    contentPrefs,
    malConnected,
    malUser,
    malLastSync,
    malLastStatusSync,
    malSyncing,
    malAutoSyncEnabled,
    autoTranslate,
    translating,
    translationProgress,
    stoppingAnimeEnrichment,
    stoppingMangaEnrichment,
    imageSource,
    baseDirectory,
    loading,
    showSuccess,
    importing,
    exporting,
    showExportSuccess,
    showImportSuccess,
    animeImportResult,
    animeImportProgress,
    mangaImportProgress,
    importType,
    nautiljonAutoSyncIncludeTomes,
    users,
    userAvatars,
    sectionStates,
    showMangaDisplayModal,
    setShowMangaDisplayModal,
    showAnimeDisplayModal,
    setShowAnimeDisplayModal,
    showMovieDisplayModal,
    setShowMovieDisplayModal,
    showSeriesDisplayModal,
    setShowSeriesDisplayModal,
    showAdulteGameDisplayModal,
    setShowAdulteGameDisplayModal,
    confirm,
    ConfirmDialog,
    malConfirmDialog: MalConfirmDialog,
    showToast,
    ToastContainer,
    toggleSection,
    loadSettings,
    handleThemeChange,
    handleAutoLaunchChange,
    handleContentPrefChange,
    handleMalConnect,
    handleMalDisconnect,
    handleMalSyncNow,
    handleMalAutoSyncChange,
    handleStopAnimeEnrichment,
    handleStopMangaEnrichment,
    handleGroqApiKeyChange,
    handleAutoTranslateChange,
    nautiljonAutoSyncEnabled,
    handleNautiljonAutoSyncChange,
    handleNautiljonIncludeTomesChange,
    handleImageSourceChange,
    tmdbLanguage,
    tmdbRegion,
    handleTmdbLanguageChange,
    handleTmdbRegionChange,
    globalSyncInterval,
    globalSyncUpdating,
    handleGlobalSyncIntervalChange,
    notifyEnrichment,
    handleNotifyEnrichmentChange,
    handleChangeBaseDirectory,
    handleExport,
    handleImport,
    handleDeleteUserData,
    handleDeleteAllData
  } = useSettings();

  if (loading) {
    return (
      <div style={{ padding: '40px' }} className="fade-in">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  const sectionDescriptors = [
    {
      id: 'user-management',
      title: 'Gestion utilisateurs',
      icon: '👥',
      content: (
        <UserManagement
          users={users}
          userAvatars={userAvatars}
          onUsersChange={loadSettings}
          showToast={showToast}
          confirm={confirm}
        />
      ),
      span: 2
    },
    {
      id: 'tampermonkey',
      title: 'Scripts Tampermonkey',
      icon: '🔧',
      content: <TampermonkeySettings showToast={showToast} />,
      span: 2
    },
    {
      id: 'appearance',
      title: 'Apparence et préférences',
      icon: '🎨',
      content: (
        <AppearanceSettings
          theme={theme}
          autoLaunch={autoLaunch}
          contentPrefs={contentPrefs}
          onThemeChange={handleThemeChange}
          onAutoLaunchChange={handleAutoLaunchChange}
          onContentPrefChange={handleContentPrefChange}
          tmdbLanguage={tmdbLanguage}
          tmdbRegion={tmdbRegion}
          onTmdbLanguageChange={handleTmdbLanguageChange}
          onTmdbRegionChange={handleTmdbRegionChange}
          onOpenMangaSettings={() => setShowMangaDisplayModal(true)}
          onOpenAnimeSettings={() => setShowAnimeDisplayModal(true)}
          onOpenMovieSettings={() => setShowMovieDisplayModal(true)}
          onOpenSeriesSettings={() => setShowSeriesDisplayModal(true)}
          onOpenAdultGameSettings={() => setShowAdulteGameDisplayModal(true)}
        />
      ),
      span: 2
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      content: <NotificationSettings showToast={showToast} />
    },
    {
      id: 'integrations',
      title: 'Intégrations et services externes',
      icon: '🔌',
      content: (
        <IntegrationsSettings
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          malAutoSyncEnabled={malAutoSyncEnabled}
          onMalAutoSyncChange={handleMalAutoSyncChange}
          nautiljonAutoSyncEnabled={nautiljonAutoSyncEnabled}
          onNautiljonAutoSyncChange={handleNautiljonAutoSyncChange}
          nautiljonAutoSyncIncludeTomes={nautiljonAutoSyncIncludeTomes}
          onNautiljonIncludeTomesChange={handleNautiljonIncludeTomesChange}
          globalSyncInterval={globalSyncInterval}
          globalSyncUpdating={globalSyncUpdating}
          onGlobalSyncIntervalChange={handleGlobalSyncIntervalChange}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
          notifyEnrichment={notifyEnrichment}
          onNotifyEnrichmentChange={handleNotifyEnrichmentChange}
          showToast={showToast}
          animeImportResult={animeImportResult}
        />
      ),
      span: 2
    },
    {
      id: 'database',
      title: 'Base de données',
      icon: '💾',
      content: (
        <DatabaseSettings
          baseDirectory={baseDirectory}
          exporting={exporting}
          importing={importing}
          showSuccess={showSuccess}
          showExportSuccess={showExportSuccess}
          showImportSuccess={showImportSuccess}
          showToast={showToast}
          onChangeBaseDirectory={handleChangeBaseDirectory}
          onExport={handleExport}
          onImport={handleImport}
        />
      ),
      span: 2
    },
    {
      id: 'source-credits',
      title: 'Sources & crédits',
      icon: '📚',
      content: <SourceCredits />,
      span: 2
    },
    {
      id: 'dev',
      title: 'Mode développeur',
      icon: '💻',
      content: <DevSettings showToast={showToast} />,
      span: 2
    }
  ] as const;

  return (
    <div style={{ padding: '40px' }} className="fade-in">
      <ConfirmDialog />
      {MalConfirmDialog && <MalConfirmDialog />}
      {ToastContainer}
      
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          paddingRight: '40px'
        }}
      >
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '0' }}>
          ⚙️ Paramètres
        </h1>

        {/* Bannière de progression de synchronisation (non-bloquante) */}
        <SyncProgressBanner
          isVisible={malSyncing || !!(animeImportProgress || mangaImportProgress) || translating}
          animeProgress={animeImportProgress}
          mangaProgress={mangaImportProgress}
          translating={translating}
          translationProgress={translationProgress}
          onStopAnimeEnrichment={handleStopAnimeEnrichment}
          onStopMangaEnrichment={handleStopMangaEnrichment}
          stoppingAnimeEnrichment={stoppingAnimeEnrichment}
          stoppingMangaEnrichment={stoppingMangaEnrichment}
          importType={importType}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {sectionDescriptors.map(({ id, title, icon, content }) => (
            <div
              key={id}
              style={{
                width: '100%'
              }}
            >
              <CollapsibleSection
                id={id}
                title={title}
                defaultIcon={icon}
                isOpen={sectionStates[id] ?? true}
                onToggle={() => toggleSection(id)}
              >
                {content}
              </CollapsibleSection>
            </div>
          ))}
        </div>

        {/* Section Danger Zone (pleine largeur, pliée par défaut) */}
        <DangerZone
          onDeleteUserData={handleDeleteUserData}
          onDeleteAllData={handleDeleteAllData}
        />
      </div>

      {showMangaDisplayModal && (
        <DisplaySettingsModal
          onClose={() => setShowMangaDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showAnimeDisplayModal && (
        <AnimeDisplaySettingsModal
          onClose={() => setShowAnimeDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showMovieDisplayModal && (
        <MovieDisplaySettingsModal
          onClose={() => setShowMovieDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showSeriesDisplayModal && (
        <SeriesDisplaySettingsModal
          onClose={() => setShowSeriesDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showAdulteGameDisplayModal && (
        <AdulteGameDisplaySettingsModal
          onClose={() => setShowAdulteGameDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {apiGuideProvider && (
        <ApiKeyGuideModal
          initialProvider={apiGuideProvider}
          onClose={() => setApiGuideProvider(null)}
        />
      )}

      {/* Bouton retour en haut */}
      <BackToTopButton />
    </div>
  );
}
