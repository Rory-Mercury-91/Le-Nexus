import { ReactNode, useMemo, useState } from 'react';
import BackToBottomButton from '../../components/collections/BackToBottomButton';
import BackToTopButton from '../../components/collections/BackToTopButton';
import ApiKeyGuideModal from '../../components/modals/settings/ApiKeyGuideModal';
import MergeEntitiesModal, { MergePreviewData } from '../../components/modals/settings/MergeEntitiesModal';
import { useSettings } from '../../hooks/settings/useSettings';
import {
  AppearanceSettings,
  CloudSyncSettings,
  DangerZone,
  DatabaseSettings,
  DevSettings,
  IntegrationsSettings,
  NotificationSettings,
  SourceCredits,
  SyncSchedulerSettings,
  TampermonkeySettings,
  UserManagement
} from './components';
import type { ApiKeyProvider } from './components/apiKeyGuideTypes';

export default function Settings() {
  const [apiGuideProvider, setApiGuideProvider] = useState<ApiKeyProvider | null>(null);
  const [devMergePreview, setDevMergePreview] = useState<MergePreviewData | null>(null);
  const [devMergeLoading, setDevMergeLoading] = useState(false);
  const [devMergeApplying, setDevMergeApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('user');
  const [activeSubTab, setActiveSubTab] = useState<Record<string, string>>({
    user: 'user-management',
    data: 'database',
    integrations: 'integrations-mal',
    advanced: 'dev'
  });

  const {
    theme,
    autoLaunch,
    autoDownloadCovers,
    groqApiKey,
    contentPrefs,
    malConnected,
    malUser,
    malLastSync,
    malLastStatusSync,
    malAutoSyncEnabled,
    anilistConnected,
    anilistUser,
    anilistLastSync,
    anilistLastStatusSync,
    handleAnilistConnect,
    handleAnilistDisconnect,
    handleAnilistSyncNow,
    anilistAutoSyncEnabled,
    handleAnilistAutoSyncChange,
    autoTranslate,
    imageSource,
    baseDirectory,
    loading,
    showSuccess,
    importing,
    exporting,
    showExportSuccess,
    showImportSuccess,
    animeImportResult,
    nautiljonAutoSyncIncludeTomes,
    users,
    userAvatars,
    sectionStates,
    confirm,
    ConfirmDialog,
    malConfirmDialog: MalConfirmDialog,
    showToast,
    ToastContainer,
    loadSettings,
    handleThemeChange,
    handleAutoLaunchChange,
    handleAutoDownloadCoversChange,
    handleContentPrefChange,
    handleMalConnect,
    handleMalDisconnect,
    handleMalSyncNow,
    handleMalAutoSyncChange,
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
    handleChangeBaseDirectory,
    handleExport,
    handleImport,
    handleDeleteUserData,
    handleDeleteAllData,
    setSectionState
  } = useSettings();
  const [notificationHeaderActions, setNotificationHeaderActions] = useState<ReactNode | null>(null);

  const handleOpenDevMergeModal = async (payload: { type: 'manga' | 'anime' | 'movie' | 'tv' | 'game' | 'book'; sourceId: number; targetId: number }) => {
    setDevMergeLoading(true);
    try {
      const preview = await window.electronAPI.getDevMergePreview(payload);
      if (!preview?.success) {
        showToast({
          title: 'Préparation impossible',
          message: preview?.error || 'Impossible de préparer la fusion',
          type: 'error'
        });
        return;
      }
      setDevMergePreview(preview as MergePreviewData);
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de préparer la fusion',
        type: 'error'
      });
    } finally {
      setDevMergeLoading(false);
    }
  };

  const handleConfirmDevMerge = async (selectedFields: string[]) => {
    if (!devMergePreview) return;
    setDevMergeApplying(true);
    try {
      const result = await window.electronAPI.performDevMerge?.({
        type: devMergePreview.type as 'manga' | 'anime' | 'movie' | 'tv' | 'game' | 'book',
        sourceId: devMergePreview.source.id,
        targetId: devMergePreview.target.id,
        selectedFields
      });

      if (!result?.success) {
        showToast({
          title: 'Erreur de fusion',
          message: result?.error || 'Impossible de fusionner les entrées',
          type: 'error'
        });
        return;
      }

      const updatedCount = result.updatedFields?.length || 0;
      const transferSummary = result.transfers
        ? Object.entries(result.transfers)
          .filter(([, value]) => typeof value === 'number' && value > 0)
          .map(([key, value]) => `${value} ${key}`)
          .join(', ')
        : '';

      showToast({
        title: 'Fusion terminée',
        message:
          `${updatedCount} champ(s) appliqué(s)` + (transferSummary ? ` • ${transferSummary}` : ''),
        type: 'success',
        duration: 5000
      });

      setDevMergePreview(null);
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de fusionner les entrées',
        type: 'error'
      });
    } finally {
      setDevMergeApplying(false);
    }
  };

  // Structure des onglets avec regroupement logique des sections
  const tabGroups = useMemo(() => [
    {
      id: 'user',
      label: '👤 Utilisateur',
      sections: [
        { id: 'user-management', label: 'Gestion utilisateurs', icon: '👥' },
        { id: 'appearance', label: 'Apparence et préférences', icon: '🎨' }
      ]
    },
    {
      id: 'data',
      label: '🔄 Données',
      sections: [
        { id: 'database', label: 'Base de données', icon: '💾' },
        { id: 'sync-scheduler', label: 'Synchronisation', icon: '🔄' },
        { id: 'cloud-sync', label: 'Synchronisation Cloud', icon: '☁️' },
        { id: 'notifications', label: 'Notifications', icon: '🔔' }
      ]
    },
    {
      id: 'integrations',
      label: '🔌 Intégrations',
      sections: [
        { id: 'integrations-mal', label: 'MyAnimeList', icon: '🤝' },
        { id: 'integrations-anilist', label: 'AniList', icon: '📺' },
        { id: 'integrations-tmdb', label: 'TMDb', icon: '🎬' },
        { id: 'integrations-groq', label: 'Groq', icon: '🧠' },
        { id: 'integrations-rawg', label: 'RAWG', icon: '🎮' },
        { id: 'integrations-adulte-game', label: 'Jeux adultes', icon: '🕹️' },
        { id: 'tampermonkey', label: 'Scripts Tampermonkey', icon: '🔧' }
      ]
    },
    {
      id: 'advanced',
      label: '⚙️ Avancé',
      sections: [
        { id: 'dev', label: 'Mode développeur', icon: '💻' },
        { id: 'source-credits', label: 'Sources & crédits', icon: '📚' },
        { id: 'danger-zone', label: 'Zone dangereuse', icon: '⚠️' }
      ]
    }
  ], []);

  const sectionDescriptors = useMemo(() => [
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
          autoDownloadCovers={autoDownloadCovers}
          contentPrefs={contentPrefs}
          onThemeChange={handleThemeChange}
          onAutoLaunchChange={handleAutoLaunchChange}
          onAutoDownloadCoversChange={handleAutoDownloadCoversChange}
          onContentPrefChange={handleContentPrefChange}
        />
      ),
      span: 2
    },
    {
      id: 'sync-scheduler',
      title: 'Synchronisation',
      icon: '🔄',
      content: (
        <SyncSchedulerSettings
          globalSyncInterval={globalSyncInterval}
          globalSyncUpdating={globalSyncUpdating}
          onGlobalSyncIntervalChange={handleGlobalSyncIntervalChange}
          malAutoSyncEnabled={malAutoSyncEnabled}
          onMalAutoSyncChange={handleMalAutoSyncChange}
          malConnected={malConnected}
          anilistAutoSyncEnabled={anilistAutoSyncEnabled}
          onAnilistAutoSyncChange={handleAnilistAutoSyncChange}
          anilistConnected={anilistConnected}
          nautiljonAutoSyncEnabled={nautiljonAutoSyncEnabled}
          onNautiljonAutoSyncChange={handleNautiljonAutoSyncChange}
          nautiljonAutoSyncIncludeTomes={nautiljonAutoSyncIncludeTomes}
          onNautiljonIncludeTomesChange={handleNautiljonIncludeTomesChange}
        />
      ),
      span: 2
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      headerActions: notificationHeaderActions,
      content: (
        <NotificationSettings
          showToast={showToast}
          onHeaderActionsChange={setNotificationHeaderActions}
          globalSyncInterval={globalSyncInterval}
        />
      )
    },
    {
      id: 'integrations-mal',
      title: 'MyAnimeList',
      icon: '🤝',
      content: (
        <IntegrationsSettings
          activeService="mal"
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          anilistConnected={anilistConnected}
          anilistUser={anilistUser}
          anilistLastSync={anilistLastSync}
          anilistLastStatusSync={anilistLastStatusSync}
          onAnilistConnect={handleAnilistConnect}
          onAnilistDisconnect={handleAnilistDisconnect}
          onAnilistSyncNow={handleAnilistSyncNow}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
          showToast={showToast}
          animeImportResult={animeImportResult}
        />
      ),
      span: 2
    },
    {
      id: 'integrations-anilist',
      title: 'AniList',
      icon: '📺',
      content: (
        <IntegrationsSettings
          activeService="anilist"
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          anilistConnected={anilistConnected}
          anilistUser={anilistUser}
          anilistLastSync={anilistLastSync}
          anilistLastStatusSync={anilistLastStatusSync}
          onAnilistConnect={handleAnilistConnect}
          onAnilistDisconnect={handleAnilistDisconnect}
          onAnilistSyncNow={handleAnilistSyncNow}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
          showToast={showToast}
          animeImportResult={animeImportResult}
        />
      ),
      span: 2
    },
    {
      id: 'integrations-tmdb',
      title: 'TMDb',
      icon: '🎬',
      content: (
        <IntegrationsSettings
          activeService="tmdb"
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          anilistConnected={anilistConnected}
          anilistUser={anilistUser}
          anilistLastSync={anilistLastSync}
          anilistLastStatusSync={anilistLastStatusSync}
          onAnilistConnect={handleAnilistConnect}
          onAnilistDisconnect={handleAnilistDisconnect}
          onAnilistSyncNow={handleAnilistSyncNow}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
          showToast={showToast}
          animeImportResult={animeImportResult}
        />
      ),
      span: 2
    },
    {
      id: 'integrations-groq',
      title: 'Groq',
      icon: '🧠',
      content: (
        <IntegrationsSettings
          activeService="groq"
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          anilistConnected={anilistConnected}
          anilistUser={anilistUser}
          anilistLastSync={anilistLastSync}
          anilistLastStatusSync={anilistLastStatusSync}
          onAnilistConnect={handleAnilistConnect}
          onAnilistDisconnect={handleAnilistDisconnect}
          onAnilistSyncNow={handleAnilistSyncNow}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
          showToast={showToast}
          animeImportResult={animeImportResult}
        />
      ),
      span: 2
    },
    {
      id: 'integrations-rawg',
      title: 'RAWG',
      icon: '🎮',
      content: (
        <IntegrationsSettings
          activeService="rawg"
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          anilistConnected={anilistConnected}
          anilistUser={anilistUser}
          anilistLastSync={anilistLastSync}
          anilistLastStatusSync={anilistLastStatusSync}
          onAnilistConnect={handleAnilistConnect}
          onAnilistDisconnect={handleAnilistDisconnect}
          onAnilistSyncNow={handleAnilistSyncNow}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
          showToast={showToast}
          animeImportResult={animeImportResult}
        />
      ),
      span: 2
    },
    {
      id: 'integrations-adulte-game',
      title: 'Jeux adultes',
      icon: '🕹️',
      content: (
        <IntegrationsSettings
          activeService="adulte-game"
          onOpenGuide={(provider) => setApiGuideProvider(provider)}
          malConnected={malConnected}
          malUser={malUser}
          malLastSync={malLastSync}
          malLastStatusSync={malLastStatusSync}
          onMalConnect={handleMalConnect}
          onMalDisconnect={handleMalDisconnect}
          onMalSyncNow={handleMalSyncNow}
          anilistConnected={anilistConnected}
          anilistUser={anilistUser}
          anilistLastSync={anilistLastSync}
          anilistLastStatusSync={anilistLastStatusSync}
          onAnilistConnect={handleAnilistConnect}
          onAnilistDisconnect={handleAnilistDisconnect}
          onAnilistSyncNow={handleAnilistSyncNow}
          imageSource={imageSource}
          onImageSourceChange={handleImageSourceChange}
          groqApiKey={groqApiKey}
          onGroqApiKeyChange={handleGroqApiKeyChange}
          autoTranslate={autoTranslate}
          onAutoTranslateChange={handleAutoTranslateChange}
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
          sectionStates={sectionStates}
          onSectionStateChange={setSectionState}
        />
      ),
      span: 2
    },
    {
      id: 'cloud-sync',
      title: 'Synchronisation Cloud',
      icon: '☁️',
      content: (
        <CloudSyncSettings
          showToast={showToast}
          onOpenGuide={() => setApiGuideProvider('cloudSync')}
          sectionStates={sectionStates}
          onSectionStateChange={setSectionState}
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
      content: (
        <DevSettings
          showToast={showToast}
          mergePreviewLoading={devMergeLoading}
          onOpenMergeModal={handleOpenDevMergeModal}
        />
      ),
      span: 2
    },
    {
      id: 'danger-zone',
      title: 'Zone dangereuse',
      icon: '⚠️',
      content: (
        <DangerZone
          onDeleteUserData={handleDeleteUserData}
          onDeleteAllData={handleDeleteAllData}
        />
      ),
      span: 2
    }
  ], [notificationHeaderActions, showToast, users, userAvatars, loadSettings, confirm, theme, autoLaunch, contentPrefs, handleThemeChange, handleAutoLaunchChange, handleContentPrefChange, tmdbLanguage, tmdbRegion, handleTmdbLanguageChange, handleTmdbRegionChange, globalSyncInterval, malConnected, malUser, malLastSync, malLastStatusSync, handleMalConnect, handleMalDisconnect, handleMalSyncNow, malAutoSyncEnabled, handleMalAutoSyncChange, anilistConnected, anilistUser, anilistLastSync, anilistLastStatusSync, handleAnilistConnect, handleAnilistDisconnect, handleAnilistSyncNow, anilistAutoSyncEnabled, handleAnilistAutoSyncChange, nautiljonAutoSyncEnabled, handleNautiljonAutoSyncChange, nautiljonAutoSyncIncludeTomes, handleNautiljonIncludeTomesChange, globalSyncUpdating, handleGlobalSyncIntervalChange, imageSource, handleImageSourceChange, groqApiKey, handleGroqApiKeyChange, autoTranslate, handleAutoTranslateChange, animeImportResult, sectionStates, setSectionState, baseDirectory, exporting, importing, showSuccess, showExportSuccess, showImportSuccess, handleChangeBaseDirectory, handleExport, handleImport, handleOpenDevMergeModal, devMergeLoading, handleDeleteUserData, handleDeleteAllData]);

  if (loading) {
    return (
      <div style={{ padding: '40px' }} className="fade-in">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }} />
        </div>
      </div>
    );
  }

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
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '24px' }}>
          ⚙️ Paramètres
        </h1>

        {/* Barre d'onglets principaux */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          gap: '0'
        }}>
          {tabGroups.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Si pas de sous-onglet actif pour cet onglet, définir le premier par défaut
                if (!activeSubTab[tab.id]) {
                  setActiveSubTab(prev => ({ ...prev, [tab.id]: tab.sections[0].id }));
                }
              }}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                position: 'relative',
                top: '1px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Barre de sous-onglets */}
        {(() => {
          const currentTab = tabGroups.find(tab => tab.id === activeTab);
          if (!currentTab) return null;

          const currentSubTab = activeSubTab[activeTab] || currentTab.sections[0].id;

          return (
            <div style={{
              display: 'flex',
              marginBottom: '24px',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {currentTab.sections.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setActiveSubTab(prev => ({ ...prev, [activeTab]: subTab.id }))}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: currentSubTab === subTab.id ? 'var(--surface-light)' : 'transparent',
                    borderBottom: currentSubTab === subTab.id ? '2px solid var(--primary)' : '2px solid transparent',
                    color: currentSubTab === subTab.id ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: currentSubTab === subTab.id ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (currentSubTab !== subTab.id) {
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.background = 'var(--surface-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentSubTab !== subTab.id) {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{subTab.icon}</span>
                  {subTab.label}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Contenu du sous-onglet actif */}
        <div style={{ width: '100%' }}>
          {(() => {
            const currentTab = tabGroups.find(tab => tab.id === activeTab);
            if (!currentTab) return null;

            const currentSubTab = activeSubTab[activeTab] || currentTab.sections[0].id;
            const section = sectionDescriptors.find(s => s.id === currentSubTab);

            if (!section) return null;

            return (
              <div style={{ width: '100%' }}>
                {section.headerActions && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    ...(section.id === 'notifications' ? {} : {
                      padding: '16px 20px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px'
                    })
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                        {section.icon} {section.title}
                      </span>
                    </div>
                    {section.headerActions}
                  </div>
                )}
                {section.content}
              </div>
            );
          })()}
        </div>
      </div>

      {apiGuideProvider && (
        <ApiKeyGuideModal
          initialProvider={apiGuideProvider}
          onClose={() => setApiGuideProvider(null)}
        />
      )}

      {devMergePreview && (
        <MergeEntitiesModal
          preview={devMergePreview}
          isSubmitting={devMergeApplying}
          onConfirm={handleConfirmDevMerge}
          onClose={() => setDevMergePreview(null)}
        />
      )}

      {/* Boutons de navigation */}
      <BackToTopButton />
      <BackToBottomButton />
    </div>
  );
}
