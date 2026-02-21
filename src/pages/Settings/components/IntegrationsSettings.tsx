import { CheckCircle, Eye, EyeOff, Info, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Toggle from '../../../components/common/Toggle';
import type { AnimeImportResult } from '../../../types';
import AdulteGameSettings from './AdulteGameSettings';
import MediaSettings from './MediaSettings';
import type { ApiKeyProvider } from './apiKeyGuideTypes';

const DEFAULT_MAL_REDIRECT_URI = 'http://localhost:8888/callback';

const tooltipTexts = {
  tmdbKey: "Requise pour toutes les requêtes REST TMDb (détails, images, recherches).",
  tmdbToken: "Optionnel, nécessaire uniquement pour les appels authentifiés comme les listes privées ou découvertes avancées.",
  imageSource: "Choisit la source prioritaire utilisée pour compléter les visuels quand MyAnimeList manque d'images.",
  groqKey: "Collez ici votre clé API Groq (affichée une seule fois). Elle reste stockée localement et chiffrée.",
  groqAutoTranslate: "Traduire automatiquement les synopsis indisponibles en français via Groq lors de l'enrichissement.",
  malAutoSync: "Met à jour vos progressions MAL automatiquement à l'intervalle défini.",
  nautiljonAutoSync: "Actualise en arrière-plan les fiches Nautiljon liées aux séries suivies.",
  nautiljonTomes: "Inclut les tomes/volumes Nautiljon dans la synchronisation automatique.",
  animeEnrichment: "Configurez les champs enrichis (Jikan/AniList, images HQ, traductions) pour les animes.",
  mangaEnrichment: "Activez les remplissages automatiques et traductions IA côté mangas.",
  malManualSync: "Permet de lancer immédiatement une synchronisation complète MyAnimeList.",
  anilistClientId: "Identifiant client généré sur anilist.co/settings/developer (OAuth).",
  anilistClientSecret: "Clé secrète générée sur anilist.co/settings/developer (OAuth).",
  anilistAutoSync: "Met à jour vos progressions AniList automatiquement à l'intervalle défini.",
  anilistManualSync: "Permet de lancer immédiatement une synchronisation complète AniList.",
  mihonImport: "L'import du backup doit contenir les données suivantes uniquement :\n\n• Séries de la bibliothèque\n• Chapitres\n• Suivi\n• Historique\n\nLes autres options ne sont pas utiles pour cette application.",
  rawgKey: "La clé API RAWG permet d'enrichir votre bibliothèque de jeux avec des métadonnées complètes (description, genres, plateformes, notes, etc.)."
} as const;

type TooltipId = keyof typeof tooltipTexts;

const headerActionPlaceholderStyle: React.CSSProperties = {
  minWidth: '190px',
  height: '36px',
  borderRadius: '8px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '0 4px',
};

interface IntegrationsSettingsProps {
  activeService?: 'mal' | 'anilist' | 'tmdb' | 'groq' | 'rawg' | 'adulte-game' | null;
  onOpenGuide: (provider: ApiKeyProvider) => void;

  malConnected: boolean;
  malUser: { name?: string; picture?: string } | null;
  malLastSync: { timestamp?: string; animes?: number; mangas?: number } | null;
  malLastStatusSync: { timestamp?: string } | null;
  onMalConnect: () => void;
  onMalDisconnect: () => void;
  onMalSyncNow: () => void | Promise<void>;

  anilistConnected: boolean;
  anilistUser: { name?: string; picture?: string } | null;
  anilistLastSync: { timestamp?: string; animes?: number; mangas?: number } | null;
  anilistLastStatusSync: { timestamp?: string } | null;
  onAnilistConnect: () => void;
  onAnilistDisconnect: () => void;
  onAnilistSyncNow: () => void | Promise<void>;

  imageSource: 'mal' | 'anilist' | 'tmdb';
  onImageSourceChange: (source: 'mal' | 'anilist' | 'tmdb') => void;
  groqApiKey: string;
  onGroqApiKeyChange: (apiKey: string) => void | Promise<void>;
  autoTranslate: boolean;
  onAutoTranslateChange: (enabled: boolean) => void | Promise<void>;
  showToast?: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  animeImportResult: AnimeImportResult | null;
}

export default function IntegrationsSettings({
  activeService = null,
  onOpenGuide,
  malConnected,
  malUser,
  malLastSync,
  malLastStatusSync,
  onMalConnect,
  onMalDisconnect,
  onMalSyncNow,
  anilistConnected,
  anilistUser,
  anilistLastSync,
  anilistLastStatusSync,
  onAnilistConnect,
  onAnilistDisconnect,
  onAnilistSyncNow,
  imageSource,
  onImageSourceChange,
  groqApiKey,
  onGroqApiKeyChange,
  autoTranslate,
  onAutoTranslateChange,
  showToast,
  animeImportResult,
}: IntegrationsSettingsProps) {

  const [anilistClientId, setAnilistClientId] = useState('');
  const [anilistClientSecret, setAnilistClientSecret] = useState('');
  const [anilistCredentialsLoaded, setAnilistCredentialsLoaded] = useState(false);
  const [isSavingAnilistCredentials, setIsSavingAnilistCredentials] = useState(false);
  const anilistSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anilistClientIdVisible, setAnilistClientIdVisible] = useState(false);
  const [anilistClientSecretVisible, setAnilistClientSecretVisible] = useState(false);


  const [groqApiKeyInput, setGroqApiKeyInput] = useState('');
  const [groqInitialLoad, setGroqInitialLoad] = useState(false);
  const [groqSaving, setGroqSaving] = useState(false);
  const groqSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [groqTesting, setGroqTesting] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [groqKeyVisible, setGroqKeyVisible] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null);
  const [importingMihon, setImportingMihon] = useState(false);
  const [mihonImportProgress, setMihonImportProgress] = useState<{ step?: string; message?: string; progress?: number; total?: number; current?: number } | null>(null);
  const [animeEnrichmentEnabled, setAnimeEnrichmentEnabled] = useState(false);
  const [mangaEnrichmentEnabled, setMangaEnrichmentEnabled] = useState(false);

  // États RAWG
  const [rawgApiKeyInput, setRawgApiKeyInput] = useState('');
  const [rawgInitialLoad, setRawgInitialLoad] = useState(false);
  const [rawgSaving, setRawgSaving] = useState(false);
  const rawgSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rawgTesting, setRawgTesting] = useState(false);
  const [rawgTestResult, setRawgTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [rawgKeyVisible, setRawgKeyVisible] = useState(false);

  const TooltipIcon = ({ id, placement = 'center' }: { id: TooltipId; placement?: 'center' | 'end' }) => (
    <span
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
      onFocus={() => setActiveTooltip(id)}
      onBlur={() => setActiveTooltip(null)}
      tabIndex={0}
      aria-label={tooltipTexts[id]}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        outline: 'none',
        borderRadius: '50%',
      }}
    >
      <Info size={16} aria-hidden="true" />
      {activeTooltip === id && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: placement === 'end' ? 'auto' : '50%',
            right: placement === 'end' ? 0 : 'auto',
            transform: placement === 'end' ? 'none' : 'translateX(-50%)',
            background: 'var(--surface-light)',
            color: 'var(--text)',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.22)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            lineHeight: 1.45,
            zIndex: 30,
            minWidth: '220px',
            maxWidth: '260px',
            textAlign: 'center',
          }}
        >
          {tooltipTexts[id]}
        </div>
      )}
    </span>
  );


  // Charger les configs d'enrichissement au montage
  useEffect(() => {
    const loadEnrichmentConfigs = async () => {
      try {
        const animeConfig = await window.electronAPI.getAnimeEnrichmentConfig?.();
        if (animeConfig) {
          setAnimeEnrichmentEnabled(animeConfig.enabled || false);
        }
        const mangaConfig = await window.electronAPI.getMangaEnrichmentConfig?.();
        if (mangaConfig) {
          setMangaEnrichmentEnabled(mangaConfig.enabled || false);
        }
      } catch (error) {
        console.error('Erreur chargement configs enrichissement:', error);
      }
    };
    loadEnrichmentConfigs();
  }, []);

  // Handler pour activer/désactiver l'enrichissement anime
  const handleAnimeEnrichmentToggle = async (enabled: boolean) => {
    try {
      const currentConfig = await window.electronAPI.getAnimeEnrichmentConfig?.();
      if (currentConfig) {
        await window.electronAPI.saveAnimeEnrichmentConfig?.({
          ...currentConfig,
          enabled
        });
        setAnimeEnrichmentEnabled(enabled);
        showToast?.({
          title: enabled ? 'Enrichissement anime activé' : 'Enrichissement anime désactivé',
          type: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Erreur changement enrichissement anime:', error);
      showToast?.({
        title: 'Erreur',
        message: 'Impossible de modifier l\'enrichissement anime',
        type: 'error'
      });
    }
  };

  // Handler pour activer/désactiver l'enrichissement manga
  const handleMangaEnrichmentToggle = async (enabled: boolean) => {
    try {
      const currentConfig = await window.electronAPI.getMangaEnrichmentConfig?.();
      if (currentConfig) {
        await window.electronAPI.saveMangaEnrichmentConfig?.({
          ...currentConfig,
          enabled
        });
        setMangaEnrichmentEnabled(enabled);
        showToast?.({
          title: enabled ? 'Enrichissement manga activé' : 'Enrichissement manga désactivé',
          type: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Erreur changement enrichissement manga:', error);
      showToast?.({
        title: 'Erreur',
        message: 'Impossible de modifier l\'enrichissement manga',
        type: 'error'
      });
    }
  };

  const handleImportMihonBackup = useCallback(async () => {
    try {
      // Ouvrir le dialogue de sélection de fichier
      if (!window.electronAPI.selectMihonBackupFile) {
        showToast?.({ title: 'Erreur', message: 'Fonction non disponible', type: 'error' });
        return;
      }
      const result = await window.electronAPI.selectMihonBackupFile();

      if (!result?.success || result.canceled || !result.filePath) {
        return;
      }

      const filePath = result.filePath;
      setImportingMihon(true);
      setMihonImportProgress({ step: 'starting', message: 'Démarrage de l\'import...', progress: 0 });

      // Écouter les événements de progression
      const progressUnsubscribe = window.electronAPI.onMihonImportProgress?.((progress: any) => {
        setMihonImportProgress(progress);
      });

      try {
        if (!window.electronAPI.importMihonBackup) {
          throw new Error('Fonction d\'import non disponible');
        }
        const importResult = await window.electronAPI.importMihonBackup(filePath);

        if (importResult?.success) {
          const stats = importResult.stats;
          showToast?.({
            title: 'Import réussi !',
            message: stats ? `${stats.created} créés, ${stats.updated} mis à jour, ${stats.withMalId} avec mal_id` : 'Import terminé',
            type: 'success',
            duration: 5000
          });

          // Nettoyer la progression après un délai
          setTimeout(() => {
            setMihonImportProgress(null);
          }, 3000);
        } else {
          throw new Error('Import échoué');
        }
      } finally {
        if (progressUnsubscribe) {
          progressUnsubscribe();
        }
        setImportingMihon(false);
      }
    } catch (error: any) {
      console.error('Erreur import backup Mihon:', error);
      showToast?.({
        title: 'Erreur lors de l\'import',
        message: error.message || 'Une erreur est survenue',
        type: 'error',
        duration: 5000
      });
      setImportingMihon(false);
      setMihonImportProgress(null);
    }
  }, [showToast]);


  useEffect(() => {
    const loadAnilistCredentials = async () => {
      try {
        const creds = await window.electronAPI.anilistGetCredentials?.();
        if (creds) {
          setAnilistClientId(creds.clientId || '');
          setAnilistClientSecret(creds.clientSecret || '');
        }
      } catch (error) {
        console.error('Erreur chargement identifiants AniList:', error);
      } finally {
        setAnilistCredentialsLoaded(true);
      }
    };

    loadAnilistCredentials();

    return () => {
      if (anilistSaveTimeoutRef.current) {
        clearTimeout(anilistSaveTimeoutRef.current);
      }
    };
  }, []);

  const scheduleAnilistCredentialSave = (nextClientId: string, nextClientSecret: string) => {
    if (!anilistCredentialsLoaded || !window.electronAPI.anilistSetCredentials) {
      return;
    }

    if (anilistSaveTimeoutRef.current) {
      clearTimeout(anilistSaveTimeoutRef.current);
    }

    const trimmedClientId = nextClientId.trim();
    const trimmedClientSecret = nextClientSecret.trim();

    anilistSaveTimeoutRef.current = setTimeout(async () => {
      setIsSavingAnilistCredentials(true);
      try {
        await window.electronAPI.anilistSetCredentials?.({
          clientId: trimmedClientId,
          clientSecret: trimmedClientSecret,
          redirectUri: `http://localhost:8888/anilist-callback`,
        });
      } catch (error) {
        console.error('Erreur sauvegarde identifiants AniList:', error);
      } finally {
        setIsSavingAnilistCredentials(false);
        anilistSaveTimeoutRef.current = null;
      }
    }, 600);
  };

  useEffect(() => {
    setGroqApiKeyInput(groqApiKey || '');
    setGroqInitialLoad(true);

    return () => {
      if (groqSaveTimeout.current) {
        clearTimeout(groqSaveTimeout.current);
      }
    };
  }, [groqApiKey]);


  const scheduleGroqApiKeySave = useCallback(
    (nextKey: string) => {
      if (!groqInitialLoad) {
        return;
      }

      if (groqSaveTimeout.current) {
        clearTimeout(groqSaveTimeout.current);
      }

      const value = (nextKey || '').trim();

      groqSaveTimeout.current = setTimeout(async () => {
        setGroqSaving(true);
        try {
          await Promise.resolve(onGroqApiKeyChange(value));
        } catch (error: any) {
          console.error('Erreur sauvegarde clé Groq:', error);
          showToast?.({
            title: 'Erreur Groq',
            message: error?.message || 'Impossible de sauvegarder la clé API Groq.',
            type: 'error'
          });
        } finally {
          setGroqSaving(false);
          groqSaveTimeout.current = null;
        }
      }, 600);
    },
    [groqInitialLoad, onGroqApiKeyChange, showToast]
  );

  const flushGroqApiKeySave = useCallback(async () => {
    if (!groqInitialLoad) {
      return;
    }

    if (groqSaveTimeout.current) {
      clearTimeout(groqSaveTimeout.current);
      groqSaveTimeout.current = null;
    }

    setGroqSaving(true);
    try {
      await Promise.resolve(onGroqApiKeyChange(groqApiKeyInput.trim()));
    } catch (error: any) {
      console.error('Erreur sauvegarde clé Groq:', error);
      showToast?.({
        title: 'Erreur Groq',
        message: error?.message || 'Impossible de sauvegarder la clé API Groq.',
        type: 'error'
      });
    } finally {
      setGroqSaving(false);
    }
  }, [groqApiKeyInput, groqInitialLoad, onGroqApiKeyChange, showToast]);

  // Utiliser useRef pour éviter la boucle infinie lors du cleanup
  const flushGroqApiKeySaveRef = useRef(flushGroqApiKeySave);
  useEffect(() => {
    flushGroqApiKeySaveRef.current = flushGroqApiKeySave;
  }, [flushGroqApiKeySave]);

  useEffect(() => {
    return () => {
      // Ne pas appeler flushGroqApiKeySave dans le cleanup pour éviter les boucles infinies
      // La sauvegarde est déjà gérée par onBlur et le timeout
      if (groqSaveTimeout.current) {
        clearTimeout(groqSaveTimeout.current);
        groqSaveTimeout.current = null;
      }
    };
  }, []);

  const handleTestGroqConnection = useCallback(async () => {
    const key = groqApiKeyInput.trim();

    if (!key) {
      const message = 'Veuillez saisir une clé API Groq pour lancer le test.';
      setGroqTestResult({ success: false, message });
      showToast?.({
        title: 'Clé requise',
        message,
        type: 'error'
      });
      return;
    }

    await flushGroqApiKeySave();

    try {
      setGroqTesting(true);
      setGroqTestResult(null);

      const testGroqConnection = (window.electronAPI as any)?.testGroqConnection;
      const result = typeof testGroqConnection === 'function'
        ? await testGroqConnection(key)
        : { success: false, error: 'API Groq non disponible.' };
      if (result?.success) {
        const message = 'Connexion Groq validée. Les services IA sont opérationnels.';
        setGroqTestResult({ success: true, message });
        showToast?.({
          title: 'Connexion Groq réussie',
          message,
          type: 'success'
        });
      } else {
        const message = result?.error || 'Clé API refusée par Groq.';
        setGroqTestResult({ success: false, message });
        showToast?.({
          title: 'Connexion Groq échouée',
          message,
          type: 'error'
        });
      }
    } catch (error: any) {
      const message = error?.message || 'Impossible de contacter Groq.';
      setGroqTestResult({ success: false, message });
      showToast?.({
        title: 'Connexion Groq échouée',
        message,
        type: 'error'
      });
    } finally {
      setGroqTesting(false);
    }
  }, [flushGroqApiKeySave, groqApiKeyInput, showToast]);

  const renderMalStatus = () => {
    if (malConnected) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.18)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {malUser?.picture && (
              <img
                src={malUser.picture}
                alt={malUser.name}
                style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--success)' }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                {malUser?.name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Dernier état progression :{' '}
                {malLastStatusSync?.timestamp
                  ? new Date(malLastStatusSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
              </p>
              {malLastSync?.timestamp && (
                <>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px 0' }}>
                    📊 Dernière synchronisation
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                    {new Date(malLastSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  {(malLastSync.animes !== undefined || malLastSync.mangas !== undefined) && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {malLastSync.animes !== undefined && (
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                          <span style={{ fontWeight: 600 }}>Animes :</span>{' '}
                          <span style={{ color: 'var(--success)' }}>{malLastSync.animes}</span>
                        </div>
                      )}
                      {malLastSync.mangas !== undefined && (
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                          <span style={{ fontWeight: 600 }}>Lectures :</span>{' '}
                          <span style={{ color: 'var(--success)' }}>{malLastSync.mangas}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <button
            onClick={onMalDisconnect}
            className="btn"
            style={{
              background: 'rgba(239, 68, 68, 0.14)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '10px',
            }}
          >
            Déconnecter
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          border: '1px dashed rgba(248, 113, 113, 0.35)',
          background: 'rgba(248, 113, 113, 0.08)',
          boxShadow: '0 10px 24px rgba(248, 113, 113, 0.18)',
        }}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
          Connectez votre compte MyAnimeList pour synchroniser automatiquement vos progressions anime/manga.
        </p>
        <button
          onClick={onMalConnect}
          className="btn btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '12px',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '10px',
          }}
        >
          <img
            src="https://myanimelist.net/img/common/pwa/launcher-icon-3x.png"
            alt="MAL"
            style={{ width: '20px', height: '20px', borderRadius: '4px' }}
          />
          Connecter MyAnimeList
        </button>
      </div>
    );
  };

  const renderAniListStatus = () => {
    if (anilistConnected) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(2, 169, 255, 0.12)',
            border: '1px solid rgba(2, 169, 255, 0.28)',
            boxShadow: '0 12px 32px rgba(2, 169, 255, 0.18)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {anilistUser?.picture && (
              <img
                src={anilistUser.picture}
                alt={anilistUser.name}
                style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #02a9ff' }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                {anilistUser?.name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Dernier état progression :{' '}
                {anilistLastStatusSync?.timestamp
                  ? new Date(anilistLastStatusSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
              </p>
              {anilistLastSync?.timestamp && (
                <>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px 0' }}>
                    📊 Dernière synchronisation
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                    {new Date(anilistLastSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  {(anilistLastSync.animes !== undefined || anilistLastSync.mangas !== undefined) && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {anilistLastSync.animes !== undefined && (
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                          <span style={{ fontWeight: 600 }}>Animes :</span>{' '}
                          <span style={{ color: 'var(--success)' }}>{anilistLastSync.animes}</span>
                        </div>
                      )}
                      {anilistLastSync.mangas !== undefined && (
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                          <span style={{ fontWeight: 600 }}>Lectures :</span>{' '}
                          <span style={{ color: 'var(--success)' }}>{anilistLastSync.mangas}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <button
            onClick={onAnilistDisconnect}
            className="btn"
            style={{
              background: 'rgba(239, 68, 68, 0.14)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '10px',
            }}
          >
            Déconnecter
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          border: '1px dashed rgba(2, 169, 255, 0.35)',
          background: 'rgba(2, 169, 255, 0.08)',
          boxShadow: '0 10px 24px rgba(2, 169, 255, 0.18)',
        }}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
          Connectez votre compte AniList pour synchroniser automatiquement vos progressions anime/manga.
        </p>
        <button
          onClick={async () => {
            // Sauvegarder les identifiants immédiatement avant de connecter
            if (anilistCredentialsLoaded && window.electronAPI.anilistSetCredentials) {
              // Annuler le timeout en cours s'il existe
              if (anilistSaveTimeoutRef.current) {
                clearTimeout(anilistSaveTimeoutRef.current);
                anilistSaveTimeoutRef.current = null;
              }
              // Sauvegarder immédiatement
              try {
                await window.electronAPI.anilistSetCredentials({
                  clientId: anilistClientId.trim(),
                  clientSecret: anilistClientSecret.trim(),
                  redirectUri: `http://localhost:8888/anilist-callback`,
                });
              } catch (error) {
                console.error('Erreur sauvegarde identifiants AniList avant connexion:', error);
              }
            }
            // Lancer la connexion
            onAnilistConnect();
          }}
          className="btn btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '12px',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '10px',
            background: '#02a9ff',
            color: 'white',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Connecter AniList
        </button>
      </div>
    );
  };

  const renderAnilistSyncToggles = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                🔄 Synchronisation manuelle AniList
              </h4>
              <TooltipIcon id="anilistManualSync" />
            </div>
            <button
              onClick={() => Promise.resolve(onAnilistSyncNow())}
              className="btn btn-primary"
              disabled={!anilistConnected}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                opacity: !anilistConnected ? 0.5 : 1,
                cursor: !anilistConnected ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Synchroniser
            </button>
          </div>
          {!anilistConnected && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Connectez votre compte AniList pour activer cette fonctionnalité
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderSyncToggles = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px'
          }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>⚙️ Enrichissement automatique des animes</h4>
              <TooltipIcon id="animeEnrichment" />
            </div>
            <Toggle checked={animeEnrichmentEnabled} onChange={handleAnimeEnrichmentToggle} />
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>📚 Enrichissement automatique des mangas</h4>
              <TooltipIcon id="mangaEnrichment" />
            </div>
            <Toggle checked={mangaEnrichmentEnabled} onChange={handleMangaEnrichmentToggle} />
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
              <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                Source des images
              </label>
              <TooltipIcon id="imageSource" />
            </div>
            <select
              value={imageSource === 'tmdb' ? 'anilist' : imageSource}
              onChange={(e) => onImageSourceChange(e.target.value as 'mal' | 'anilist')}
              className="select"
              style={{ flex: '1 1 auto', minWidth: '150px', maxWidth: '250px' }}
            >
              <option value="anilist">AniList (haute définition)</option>
              <option value="mal">MyAnimeList (par défaut)</option>
            </select>
          </div>

        </div>

        {/* Ligne avec Import Mihon et Synchronisation MAL */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px'
          }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>📥 Import backup Mihon</h4>
                <TooltipIcon id="mihonImport" />
              </div>
              <button
                type="button"
                onClick={handleImportMihonBackup}
                className="btn btn-primary"
                disabled={importingMihon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: importingMihon ? 0.6 : 1
                }}
              >
                {importingMihon ? '⏳ Import en cours...' : '📥 Importer'}
              </button>
            </div>
            {mihonImportProgress && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '100%' }}>
                {mihonImportProgress.message && (
                  <div style={{ marginBottom: '8px' }}>{mihonImportProgress.message}</div>
                )}
                {mihonImportProgress.progress !== undefined && (
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'var(--border)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${mihonImportProgress.progress}%`,
                      height: '100%',
                      background: 'var(--primary)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                )}
                {mihonImportProgress.current !== undefined && mihonImportProgress.total !== undefined && (
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    {mihonImportProgress.current} / {mihonImportProgress.total}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                  🔄 Synchronisation manuelle MyAnimeList
                </h4>
                <TooltipIcon id="malManualSync" />
              </div>
              <button
                onClick={() => Promise.resolve(onMalSyncNow())}
                className="btn btn-primary"
                disabled={!malConnected}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: !malConnected ? 0.5 : 1,
                  cursor: !malConnected ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={16} />
                Synchroniser
              </button>
            </div>
            {!malConnected && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Connectez votre compte MyAnimeList pour activer cette fonctionnalité
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Charger les credentials RAWG au montage
  useEffect(() => {
    const loadRawgCredentials = async () => {
      try {
        const credentials = await window.electronAPI.getRawgCredentials();
        if (credentials) {
          setRawgApiKeyInput(credentials.apiKey || '');
        }
        setRawgInitialLoad(true);
      } catch (error) {
        console.error('Erreur chargement credentials RAWG:', error);
        setRawgInitialLoad(true);
      }
    };
    loadRawgCredentials();

    return () => {
      if (rawgSaveTimeout.current) {
        clearTimeout(rawgSaveTimeout.current);
      }
    };
  }, []);

  const scheduleRawgApiKeySave = useCallback(
    (nextKey: string) => {
      if (!rawgInitialLoad) {
        return;
      }

      if (rawgSaveTimeout.current) {
        clearTimeout(rawgSaveTimeout.current);
      }

      const value = (nextKey || '').trim();

      rawgSaveTimeout.current = setTimeout(async () => {
        setRawgSaving(true);
        try {
          await window.electronAPI.setRawgCredentials({ apiKey: value });
        } catch (error: any) {
          console.error('Erreur sauvegarde clé RAWG:', error);
          showToast?.({
            title: 'Erreur RAWG',
            message: error?.message || 'Impossible de sauvegarder la clé API RAWG.',
            type: 'error'
          });
        } finally {
          setRawgSaving(false);
          rawgSaveTimeout.current = null;
        }
      }, 600);
    },
    [rawgInitialLoad, showToast]
  );

  const flushRawgApiKeySave = useCallback(async () => {
    if (!rawgInitialLoad) {
      return;
    }

    if (rawgSaveTimeout.current) {
      clearTimeout(rawgSaveTimeout.current);
      rawgSaveTimeout.current = null;
    }

    setRawgSaving(true);
    try {
      await window.electronAPI.setRawgCredentials({ apiKey: rawgApiKeyInput.trim() });
    } catch (error: any) {
      console.error('Erreur sauvegarde clé RAWG:', error);
      showToast?.({
        title: 'Erreur RAWG',
        message: error?.message || 'Impossible de sauvegarder la clé API RAWG.',
        type: 'error'
      });
    } finally {
      setRawgSaving(false);
    }
  }, [rawgApiKeyInput, rawgInitialLoad, showToast]);

  const handleTestRawgConnection = useCallback(async () => {
    const key = rawgApiKeyInput.trim();

    if (!key) {
      const message = 'Veuillez saisir une clé API RAWG pour lancer le test.';
      setRawgTestResult({ success: false, message });
      showToast?.({
        title: 'Clé requise',
        message,
        type: 'error'
      });
      return;
    }

    await flushRawgApiKeySave();

    try {
      setRawgTesting(true);
      setRawgTestResult(null);

      const result = await window.electronAPI.testRawgConnection({ apiKey: key });
      if (result?.success) {
        setRawgTestResult({ success: true, message: 'Connexion RAWG validée' });
        showToast?.({
          title: 'Connexion RAWG réussie',
          message: 'Connexion RAWG validée',
          type: 'success'
        });
      } else {
        const message = result?.error || 'Clé API refusée par RAWG.';
        setRawgTestResult({ success: false, message });
        showToast?.({
          title: 'Connexion RAWG échouée',
          message,
          type: 'error'
        });
      }
    } catch (error: any) {
      const message = error?.message || 'Impossible de contacter RAWG.';
      setRawgTestResult({ success: false, message });
      showToast?.({
        title: 'Connexion RAWG échouée',
        message,
        type: 'error'
      });
    } finally {
      setRawgTesting(false);
    }
  }, [flushRawgApiKeySave, rawgApiKeyInput, showToast]);

  const renderRawgSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Clé API RAWG <span style={{ color: '#f97316' }}>*</span>
              </label>
              <TooltipIcon id="rawgKey" />
              {rawgTestResult?.success && (
                <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 500 }}>
                  Connexion RAWG validée
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenGuide('rawg');
                }}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  fontSize: '12px',
                }}
              >
                <Info size={14} />
                Guide RAWG
              </button>
              <button
                onClick={handleTestRawgConnection}
                className="btn btn-outline"
                disabled={rawgTesting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  minWidth: '190px',
                }}
              >
                <RefreshCw size={14} style={{ animation: rawgTesting ? 'spin 1s linear infinite' : 'none' }} />
                {rawgTesting ? 'Test en cours…' : 'Tester la connexion'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type={rawgKeyVisible ? 'text' : 'password'}
              value={rawgApiKeyInput}
              onChange={(e) => {
                const value = e.target.value;
                setRawgApiKeyInput(value);
                scheduleRawgApiKeySave(value);
              }}
              onBlur={() => {
                flushRawgApiKeySave().catch(() => undefined);
              }}
              placeholder="Votre clé API RAWG"
              autoComplete="off"
              className="input"
              style={{
                flex: 1,
                letterSpacing: rawgKeyVisible ? '0.4px' : '0.6px',
              }}
            />
            <button
              type="button"
              onClick={() => setRawgKeyVisible((prev) => !prev)}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--background)',
                borderRadius: '8px',
                width: '42px',
                height: '42px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
              aria-label={rawgKeyVisible ? 'Masquer la clé RAWG' : 'Afficher la clé RAWG'}
            >
              {rawgKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {rawgSaving && (
            <div style={{ fontSize: '12px', color: 'var(--primary-light)' }}>
              Sauvegarde en cours…
            </div>
          )}
          {rawgTestResult && !rawgTestResult.success && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--error)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
              }}
            >
              <CheckCircle size={14} />
              {rawgTestResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGroqSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Clé API Groq <span style={{ color: '#f97316' }}>*</span>
              </label>
              <TooltipIcon id="groqKey" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenGuide('groq');
                }}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  fontSize: '12px',
                }}
              >
                <Info size={14} />
                Guide Groq
              </button>
              <button
                onClick={handleTestGroqConnection}
                className="btn btn-outline"
                disabled={groqTesting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  minWidth: '190px',
                }}
              >
                <RefreshCw size={14} style={{ animation: groqTesting ? 'spin 1s linear infinite' : 'none' }} />
                {groqTesting ? 'Test en cours…' : 'Tester la connexion'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type={groqKeyVisible ? 'text' : 'password'}
              value={groqApiKeyInput}
              onChange={(e) => {
                const value = e.target.value;
                setGroqApiKeyInput(value);
                scheduleGroqApiKeySave(value);
              }}
              onBlur={() => {
                flushGroqApiKeySave().catch(() => undefined);
              }}
              placeholder="gsk_xxxxxxxxxxxxxxxxx"
              autoComplete="off"
              className="input"
              style={{
                flex: 1,
                letterSpacing: '0.4px',
              }}
            />
            <button
              type="button"
              onClick={() => setGroqKeyVisible((prev) => !prev)}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--background)',
                borderRadius: '8px',
                width: '42px',
                height: '42px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
              aria-label={groqKeyVisible ? 'Masquer la clé Groq' : 'Afficher la clé Groq'}
            >
              {groqKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {groqSaving && (
            <div style={{ fontSize: '12px', color: 'var(--primary-light)' }}>
              Sauvegarde en cours…
            </div>
          )}
          {groqTestResult && (
            <div
              style={{
                fontSize: '12px',
                color: groqTestResult.success ? 'var(--success)' : 'var(--error)',
                border: `1px solid ${groqTestResult.success ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                background: groqTestResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
              }}
            >
              <CheckCircle size={14} />
              {groqTestResult.message}
            </div>
          )}
        </div>

        <label
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                Traduction automatique (Groq)
              </span>
              <TooltipIcon id="groqAutoTranslate" />
            </div>
            <Toggle checked={autoTranslate} onChange={(checked) => onAutoTranslateChange(checked)} />
          </div>
        </label>
      </div>
    </div>
  );

  const renderServiceContent = () => {
    if (!activeService) {
      return null;
    }

    switch (activeService) {
      case 'mal':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                display: 'grid',
                gap: '18px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              }}
            >
              {renderMalStatus()}
            </div>

            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Synchronisation Automatique et Manuelle</h4>
              {renderSyncToggles()}
            </div>

            {animeImportResult && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                  <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                  Import XML terminé
                </h4>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)' }}>
                  <p>✅ {animeImportResult.imported} animes importés</p>
                  <p>🔄 {animeImportResult.updated} animes mis à jour</p>
                  <p>⏭️ {animeImportResult.skipped || 0} animes ignorés</p>
                  <p>
                    📊{' '}
                    {animeImportResult.total ||
                      animeImportResult.imported + animeImportResult.updated + (animeImportResult.skipped || 0)}{' '}
                    animes traités
                  </p>
                  {animeImportResult.errors && animeImportResult.errors.length > 0 && (
                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--error)', fontSize: '12px' }}>
                        {animeImportResult.errors.length} erreur(s)
                      </summary>
                      <ul style={{ marginTop: '6px', paddingLeft: '18px', fontSize: '12px' }}>
                        {animeImportResult.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx} style={{ color: 'var(--text-secondary)' }}>
                            {err.error}
                          </li>
                        ))}
                        {animeImportResult.errors.length > 5 && (
                          <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            … et {animeImportResult.errors.length - 5} autres erreurs
                          </li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'anilist':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                display: 'grid',
                gap: '18px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              }}
            >
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>Client ID AniList</label>
                    <TooltipIcon id="anilistClientId" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenGuide('anilist');
                    }}
                    className="btn btn-outline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                    }}
                  >
                    <Info size={14} />
                    Guide AniList
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type={anilistClientIdVisible ? 'text' : 'password'}
                    value={anilistClientId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAnilistClientId(value);
                      scheduleAnilistCredentialSave(value, anilistClientSecret);
                    }}
                    placeholder="Clé client générée sur anilist.co/settings/developer"
                    className="input"
                    style={{
                      flex: 1,
                      letterSpacing: anilistClientIdVisible ? '0.4px' : '0.6px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setAnilistClientIdVisible((prev) => !prev)}
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      borderRadius: '8px',
                      width: '42px',
                      height: '42px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                    aria-label={anilistClientIdVisible ? 'Masquer le Client ID' : 'Afficher le Client ID'}
                  >
                    {anilistClientIdVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>Client Secret AniList</label>
                    <TooltipIcon id="anilistClientSecret" />
                  </div>
                  <div style={headerActionPlaceholderStyle} />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type={anilistClientSecretVisible ? 'text' : 'password'}
                    value={anilistClientSecret}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAnilistClientSecret(value);
                      scheduleAnilistCredentialSave(anilistClientId, value);
                    }}
                    placeholder="Clé secrète générée sur anilist.co/settings/developer"
                    className="input"
                    style={{
                      flex: 1,
                      letterSpacing: anilistClientSecretVisible ? '0.4px' : '0.6px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setAnilistClientSecretVisible((prev) => !prev)}
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      borderRadius: '8px',
                      width: '42px',
                      height: '42px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                    aria-label={anilistClientSecretVisible ? 'Masquer le Client Secret' : 'Afficher le Client Secret'}
                  >
                    {anilistClientSecretVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isSavingAnilistCredentials && (
                  <span style={{ fontSize: '12px', color: 'var(--primary-light)' }}>
                    Sauvegarde en cours…
                  </span>
                )}
              </div>

              {renderAniListStatus()}
            </div>

            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Synchronisation Automatique et Manuelle</h4>
              {renderAnilistSyncToggles()}
            </div>
          </div>
        );

      case 'tmdb':
        return (
          <MediaSettings
            showToast={showToast ?? (() => undefined)}
            TooltipIcon={TooltipIcon}
            onOpenGuide={onOpenGuide}
          />
        );

      case 'groq':
        return renderGroqSection();

      case 'rawg':
        return renderRawgSection();

      case 'adulte-game':
        return <AdulteGameSettings showToast={showToast ?? (() => undefined)} />;

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {renderServiceContent()}

    </div>
  );
}
