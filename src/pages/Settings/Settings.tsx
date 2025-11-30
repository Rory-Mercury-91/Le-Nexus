import { ReactNode, useMemo, useState } from 'react';
import BackToBottomButton from '../../components/collections/BackToBottomButton';
import BackToTopButton from '../../components/collections/BackToTopButton';
import CollapsibleSection from '../../components/common/CollapsibleSection';
import { ADULTE_GAME_DISPLAY_CATEGORIES, ADULTE_GAME_DISPLAY_DEFAULTS } from '../../components/modals/adulte-game/displayConfig';
import { ANIME_DISPLAY_FIELD_CATEGORIES } from '../../utils/anime-display-fields';
import DisplaySettingsModal, { DisplayFieldCategory } from '../../components/modals/common/DisplaySettingsModal';
import ApiKeyGuideModal from '../../components/modals/settings/ApiKeyGuideModal';
import { useSettings } from '../../hooks/settings/useSettings';
import {
  AppearanceSettings,
  DangerZone,
  DatabaseSettings,
  DevSettings,
  IntegrationsSettings,
  NotificationSettings,
  SourceCredits,
  TampermonkeySettings,
  UserManagement
} from './components';
import MergeEntitiesModal, { MergePreviewData } from '../../components/modals/settings/MergeEntitiesModal';
import type { ApiKeyProvider } from './components/apiKeyGuideTypes';

export default function Settings() {
  const [apiGuideProvider, setApiGuideProvider] = useState<ApiKeyProvider | null>(null);
  const [devMergePreview, setDevMergePreview] = useState<MergePreviewData | null>(null);
  const [devMergeLoading, setDevMergeLoading] = useState(false);
  const [devMergeApplying, setDevMergeApplying] = useState(false);

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
    showMangaDisplayModal,
    setShowMangaDisplayModal,
    showAnimeDisplayModal,
    setShowAnimeDisplayModal,
    showMovieDisplayModal,
    setShowMovieDisplayModal,
    showSeriesDisplayModal,
    setShowSeriesDisplayModal,
    showBooksDisplayModal,
    setShowBooksDisplayModal,
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

  const handleOpenDevMergeModal = async (payload: { type: 'manga' | 'anime' | 'movie' | 'tv' | 'game'; sourceId: number; targetId: number }) => {
    setDevMergeLoading(true);
    try {
      const preview = await window.electronAPI.getDevMergePreview?.(payload);
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
        type: devMergePreview.type as 'manga' | 'anime' | 'movie' | 'tv' | 'game',
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
          onOpenMangaSettings={() => setShowMangaDisplayModal(true)}
          onOpenAnimeSettings={() => setShowAnimeDisplayModal(true)}
          onOpenMovieSettings={() => setShowMovieDisplayModal(true)}
          onOpenSeriesSettings={() => setShowSeriesDisplayModal(true)}
          onOpenBooksSettings={() => setShowBooksDisplayModal(true)}
          onOpenAdultGameSettings={() => setShowAdulteGameDisplayModal(true)}
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
          showToast={showToast}
          animeImportResult={animeImportResult}
          sectionStates={sectionStates}
          onSectionStateChange={setSectionState}
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
    }
  ], [notificationHeaderActions, showToast, users, userAvatars, loadSettings, confirm, theme, autoLaunch, contentPrefs, handleThemeChange, handleAutoLaunchChange, handleContentPrefChange, tmdbLanguage, tmdbRegion, handleTmdbLanguageChange, handleTmdbRegionChange, setShowMangaDisplayModal, setShowAnimeDisplayModal, setShowMovieDisplayModal, setShowSeriesDisplayModal, setShowAdulteGameDisplayModal, globalSyncInterval, malConnected, malUser, malLastSync, malLastStatusSync, handleMalConnect, handleMalDisconnect, handleMalSyncNow, malAutoSyncEnabled, handleMalAutoSyncChange, nautiljonAutoSyncEnabled, handleNautiljonAutoSyncChange, nautiljonAutoSyncIncludeTomes, handleNautiljonIncludeTomesChange, globalSyncUpdating, handleGlobalSyncIntervalChange, imageSource, handleImageSourceChange, groqApiKey, handleGroqApiKeyChange, autoTranslate, handleAutoTranslateChange, animeImportResult, sectionStates, setSectionState, baseDirectory, exporting, importing, showSuccess, showExportSuccess, showImportSuccess, handleChangeBaseDirectory, handleExport, handleImport, handleOpenDevMergeModal, devMergeLoading]);

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
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '0' }}>
          ⚙️ Paramètres
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {sectionDescriptors.map(({ id, title, icon, content, headerActions }) => (
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
                headerActions={headerActions}
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
          isOpen={sectionStates['danger-zone'] ?? false}
          onToggle={() => setSectionState('danger-zone', !(sectionStates['danger-zone'] ?? false))}
        />
      </div>

      {showMangaDisplayModal && (
        <DisplaySettingsModal
          title="Affichage des mangas"
          description="Activez ou désactivez les sections visibles sur les fiches mangas."
          fields={[
            {
              title: 'Informations principales',
              icon: '📚',
              fields: [
                { key: 'couverture', label: 'Couverture' },
                { key: 'titre', label: 'Titre' },
                { key: 'description', label: 'Description / Synopsis' },
                { key: 'titres_alternatifs', label: 'Titres alternatifs' }
              ]
            },
            {
              title: 'Publication',
              icon: '📅',
              fields: [
                { key: 'annee_publication', label: 'Année de publication (VO)' },
                { key: 'annee_vf', label: 'Année de publication (VF)' },
                { key: 'date_debut', label: 'Date de début' },
                { key: 'date_fin', label: 'Date de fin' },
                { key: 'statut_publication', label: 'Statut de publication (VO)' },
                { key: 'statut_publication_vf', label: 'Statut de publication (VF)' }
              ]
            },
            {
              title: 'Volumes et chapitres',
              icon: '📖',
              fields: [
                { key: 'nb_volumes', label: 'Nombre de volumes (VO)' },
                { key: 'nb_volumes_vf', label: 'Nombre de volumes (VF)' },
                { key: 'nb_chapitres', label: 'Nombre de chapitres (VO)' },
                { key: 'nb_chapitres_vf', label: 'Nombre de chapitres (VF)' },
                { key: 'type_volume', label: 'Type de volume' }
              ]
            },
            {
              title: 'Classification',
              icon: '🏷️',
              fields: [
                { key: 'genres', label: 'Genres' },
                { key: 'themes', label: 'Thèmes' },
                { key: 'demographie', label: 'Démographie' },
                { key: 'rating', label: 'Classification / Rating' },
                { key: 'media_type', label: 'Type de média' }
              ]
            },
            {
              title: 'Édition',
              icon: '🏢',
              fields: [
                { key: 'editeur', label: 'Éditeur (VF)' },
                { key: 'editeur_vo', label: 'Éditeur (VO)' },
                { key: 'serialization', label: 'Sérialisation' },
                { key: 'langue_originale', label: 'Langue originale' }
              ]
            },
            {
              title: 'Créateurs',
              icon: '👤',
              fields: [
                { key: 'auteurs', label: 'Auteurs' }
              ]
            },
            {
              title: 'MyAnimeList',
              icon: '🔗',
              fields: [
                { key: 'mal_id', label: 'ID MyAnimeList' },
                { key: 'mal_block', label: 'Bloc MyAnimeList' }
              ]
            },
            {
              title: 'Sections de la fiche',
              icon: '🗂️',
              fields: [
                { key: 'section_costs', label: 'Coûts & propriétaires' },
                { key: 'section_progression', label: 'Progression de lecture' },
                { key: 'section_chapitres', label: 'Gestion des chapitres' },
                { key: 'section_tomes', label: 'Liste des tomes' }
              ]
            },
            {
              title: 'Personnalisation',
              icon: '🏷️',
              fields: [
                { key: 'labels', label: 'Labels personnalisés' }
              ]
            }
          ] as DisplayFieldCategory[]}
          mode="global"
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getMangaDisplaySettings?.();
            return prefs || {};
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveMangaDisplaySettings?.(prefs);
          }}
          onSave={() => {
            setShowMangaDisplayModal(false);
          }}
          onClose={() => setShowMangaDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showAnimeDisplayModal && (
        <DisplaySettingsModal
          title="Paramètres d'affichage des animés"
          description="Choisissez les informations visibles par défaut sur les fiches animés"
          fields={ANIME_DISPLAY_FIELD_CATEGORIES}
          mode="global"
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getAnimeDisplaySettings?.();
            return prefs || {};
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveAnimeDisplaySettings?.(prefs);
          }}
          onClose={() => setShowAnimeDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showMovieDisplayModal && (
        <DisplaySettingsModal
          title="Affichage des films"
          description="Activez ou désactivez les sections visibles sur les fiches films."
          fields={[
            {
              title: 'Présentation',
              icon: '🎬',
              fields: [
                { key: 'banner', label: 'Bannière & affiches' },
                { key: 'synopsis', label: 'Synopsis' }
              ]
            },
            {
              title: 'Métadonnées',
              icon: '📊',
              fields: [
                { key: 'metadata', label: 'Informations principales' }
              ]
            },
            {
              title: 'Médias',
              icon: '🎞️',
              fields: [
                { key: 'videos', label: 'Bandes-annonces' },
                { key: 'images', label: 'Galerie d\'images' }
              ]
            },
            {
              title: 'Découverte',
              icon: '✨',
              fields: [
                { key: 'recommendations', label: 'Recommandations & similaires' },
                { key: 'externalLinks', label: 'Liens externes (IMDb, site officiel...)' }
              ]
            }
          ] as DisplayFieldCategory[]}
          mode="global"
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getMovieDisplaySettings?.();
            return prefs || {
              banner: true,
              synopsis: true,
              metadata: true,
              videos: true,
              images: true,
              recommendations: true,
              externalLinks: true
            };
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveMovieDisplaySettings?.(prefs);
          }}
          onSave={() => {
            setShowMovieDisplayModal(false);
          }}
          onClose={() => setShowMovieDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showSeriesDisplayModal && (
        <DisplaySettingsModal
          title="Affichage des séries"
          description="Activez ou désactivez les sections visibles sur les fiches séries."
          fields={[
            {
              title: 'Présentation',
              icon: '📺',
              fields: [
                { key: 'banner', label: 'Bannière & affiches' },
                { key: 'synopsis', label: 'Synopsis' },
                { key: 'nextEpisode', label: 'Prochain épisode' }
              ]
            },
            {
              title: 'Métadonnées',
              icon: '📊',
              fields: [
                { key: 'metadata', label: 'Informations principales' }
              ]
            },
            {
              title: 'Contenu',
              icon: '🎬',
              fields: [
                { key: 'seasons', label: 'Saisons' },
                { key: 'episodes', label: 'Épisodes' }
              ]
            },
            {
              title: 'Médias',
              icon: '🎞️',
              fields: [
                { key: 'videos', label: 'Bandes-annonces' },
                { key: 'images', label: 'Galerie d\'images' }
              ]
            },
            {
              title: 'Découverte',
              icon: '✨',
              fields: [
                { key: 'externalLinks', label: 'Liens externes (IMDb, site officiel...)' },
                { key: 'recommendations', label: 'Recommandations TMDb' }
              ]
            },
            {
              title: 'Progression',
              icon: '📊',
              fields: [
                { key: 'progression', label: 'Section progression utilisateur' }
              ]
            }
          ] as DisplayFieldCategory[]}
          mode="global"
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getSeriesDisplaySettings?.();
            return prefs || {
              banner: true,
              synopsis: true,
              nextEpisode: true,
              metadata: true,
              seasons: true,
              episodes: true,
              externalLinks: true,
              videos: true,
              images: true,
              progression: true,
              recommendations: true
            };
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveSeriesDisplaySettings?.(prefs);
            // Déclencher un événement pour recharger les préférences dans les pages de détails
            window.dispatchEvent(new CustomEvent('series-display-settings-changed'));
          }}
          onSave={() => {
            setShowSeriesDisplayModal(false);
          }}
          onClose={() => setShowSeriesDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showBooksDisplayModal && (
        <DisplaySettingsModal
          title="Affichage des livres"
          description="Activez ou désactivez les sections visibles sur les fiches livres."
          fields={[
            {
              title: 'Informations principales',
              icon: '📚',
              fields: [
                { key: 'titre', label: 'Titre' },
                { key: 'auteur', label: 'Auteur' },
                { key: 'description', label: 'Description' },
                { key: 'type_livre', label: 'Type de livre' },
                { key: 'editeur', label: 'Éditeur' },
                { key: 'date_publication', label: 'Date de publication' },
                { key: 'nombre_pages', label: 'Nombre de pages' },
                { key: 'isbn', label: 'ISBN' },
                { key: 'langue', label: 'Langue' },
                { key: 'genres', label: 'Genres' },
                { key: 'score', label: 'Note moyenne' },
                { key: 'prix', label: 'Prix suggéré' }
              ]
            },
            {
              title: 'Coûts',
              icon: '💰',
              fields: [
                { key: 'costs', label: 'Coûts par propriétaire' }
              ]
            }
          ] as DisplayFieldCategory[]}
          mode="global"
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getBooksDisplaySettings?.();
            return prefs || {
              titre: true,
              auteur: true,
              description: true,
              type_livre: true,
              editeur: true,
              date_publication: true,
              nombre_pages: true,
              isbn: true,
              langue: true,
              genres: true,
              score: true,
              prix: true,
              costs: true
            };
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveBooksDisplaySettings?.(prefs);
            window.dispatchEvent(new CustomEvent('book-display-settings-updated'));
          }}
          onSave={() => {
            setShowBooksDisplayModal(false);
          }}
          onClose={() => setShowBooksDisplayModal(false)}
          showToast={showToast}
        />
      )}

      {showAdulteGameDisplayModal && (
        <DisplaySettingsModal
          title="Affichage des jeux adultes"
          description="Activez ou désactivez les sections visibles sur les fiches jeux adultes."
          fields={ADULTE_GAME_DISPLAY_CATEGORIES as DisplayFieldCategory[]}
          mode="global"
          loadGlobalPrefs={async () => {
            const prefs = await window.electronAPI.getAdulteGameDisplaySettings?.();
            return prefs || ADULTE_GAME_DISPLAY_DEFAULTS;
          }}
          saveGlobalPrefs={async (prefs) => {
            await window.electronAPI.saveAdulteGameDisplaySettings?.(prefs);
          }}
          onSave={() => {
            window.dispatchEvent(new CustomEvent('adulte-game-display-settings-updated'));
            setShowAdulteGameDisplayModal(false);
          }}
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
