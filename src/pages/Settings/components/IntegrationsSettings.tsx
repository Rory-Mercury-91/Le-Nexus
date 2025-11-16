import { BookOpenCheck, CheckCircle, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Toggle from '../../../components/common/Toggle';
import AnimeEnrichmentConfigModal, { EnrichmentConfig as AnimeEnrichmentConfig } from '../../../components/modals/anime/AnimeEnrichmentConfigModal';
import MangaEnrichmentConfigModal, { EnrichmentConfig as MangaEnrichmentConfig } from '../../../components/modals/manga/MangaEnrichmentConfigModal';
import type { AnimeImportResult } from '../../../types';
import AdulteGameSettings from './AdulteGameSettings';
import type { ApiKeyProvider } from './apiKeyGuideTypes';

const DEFAULT_MAL_REDIRECT_URI = 'http://localhost:8888/callback';

interface IntegrationsSettingsProps {
  onOpenGuide: (provider: ApiKeyProvider) => void;

  malConnected: boolean;
  malUser: { name?: string; picture?: string } | null;
  malLastSync: { timestamp?: string; animes?: number; mangas?: number } | null;
  malLastStatusSync: { timestamp?: string } | null;
  onMalConnect: () => void;
  onMalDisconnect: () => void;
  onMalSyncNow: () => void | Promise<void>;

  malAutoSyncEnabled: boolean;
  onMalAutoSyncChange: (enabled: boolean) => void;

  nautiljonAutoSyncEnabled: boolean;
  onNautiljonAutoSyncChange: (enabled: boolean) => void;
  nautiljonAutoSyncIncludeTomes: boolean;
  onNautiljonIncludeTomesChange: (include: boolean) => void;
  globalSyncInterval: 1 | 3 | 6 | 12 | 24;
  globalSyncUpdating: boolean;
  onGlobalSyncIntervalChange: (interval: 1 | 3 | 6 | 12 | 24) => void | Promise<void>;
  imageSource: 'mal' | 'anilist' | 'tmdb';
  onImageSourceChange: (source: 'mal' | 'anilist' | 'tmdb') => void;
  groqApiKey: string;
  onGroqApiKeyChange: (apiKey: string) => void | Promise<void>;
  autoTranslate: boolean;
  onAutoTranslateChange: (enabled: boolean) => void | Promise<void>;
  notifyEnrichment: boolean;
  onNotifyEnrichmentChange: (enabled: boolean) => void | Promise<void>;
  showToast?: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  animeImportResult: AnimeImportResult | null;
}

interface NestedSectionProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const nestedHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '18px 22px',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'background 0.2s ease',
};

const nestedContainerStyle: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
  boxShadow: 'var(--card-shadow)',
  overflow: 'hidden',
};

const nestedBodyStyle: React.CSSProperties = {
  padding: '20px 24px 24px 24px',
  background: 'var(--surface)',
};

function NestedSection({ id, title, isOpen, onToggle, children }: NestedSectionProps) {
  return (
    <div id={id} style={nestedContainerStyle}>
      <div
        onClick={onToggle}
        style={nestedHeaderStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text)',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {title}
        </h3>
        <span style={{ fontSize: '13px', opacity: 0.65 }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && <div style={nestedBodyStyle}>{children}</div>}
    </div>
  );
}

export default function IntegrationsSettings({
  onOpenGuide,
  malConnected,
  malUser,
  malLastSync,
  malLastStatusSync,
  onMalConnect,
  onMalDisconnect,
  onMalSyncNow,
  malAutoSyncEnabled,
  onMalAutoSyncChange,
  nautiljonAutoSyncEnabled,
  onNautiljonAutoSyncChange,
  nautiljonAutoSyncIncludeTomes,
  onNautiljonIncludeTomesChange,
  globalSyncInterval,
  globalSyncUpdating,
  onGlobalSyncIntervalChange,
  imageSource,
  onImageSourceChange,
  groqApiKey,
  onGroqApiKeyChange,
  autoTranslate,
  onAutoTranslateChange,
  notifyEnrichment,
  onNotifyEnrichmentChange,
  showToast,
  animeImportResult,
}: IntegrationsSettingsProps) {
  const [malClientId, setMalClientId] = useState('');
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [lastCredentialSaveAt, setLastCredentialSaveAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectUriRef = useRef<string>(DEFAULT_MAL_REDIRECT_URI);

  // Charger les états des sections imbriquées depuis localStorage
  const loadNestedSectionStates = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem('settings-section-states');
      const defaults = {
        mal: true,
        tmdb: true,
        groq: true,
        adulteGame: true,
      };
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          mal: parsed['integrations-mal'] ?? defaults.mal,
          tmdb: parsed['integrations-tmdb'] ?? defaults.tmdb,
          groq: parsed['integrations-groq'] ?? defaults.groq,
          adulteGame: parsed['integrations-adulteGame'] ?? defaults.adulteGame,
        };
      }
      return defaults;
    } catch (error) {
      console.error('Erreur chargement états sections imbriquées:', error);
      return {
        mal: true,
        tmdb: true,
        groq: true,
        adulteGame: true,
      };
    }
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(loadNestedSectionStates);

  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [tmdbApiToken, setTmdbApiToken] = useState('');
  const [tmdbInitialLoad, setTmdbInitialLoad] = useState(false);
  const [tmdbSaving, setTmdbSaving] = useState(false);
  const [tmdbLastSavedAt, setTmdbLastSavedAt] = useState<Date | null>(null);
  const tmdbSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tmdbTesting, setTmdbTesting] = useState(false);
  const [tmdbTestResult, setTmdbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tmdbKeyVisible, setTmdbKeyVisible] = useState(false);
  const [tmdbTokenVisible, setTmdbTokenVisible] = useState(false);

  const [groqApiKeyInput, setGroqApiKeyInput] = useState('');
  const [groqInitialLoad, setGroqInitialLoad] = useState(false);
  const [groqSaving, setGroqSaving] = useState(false);
  const groqSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [groqTesting, setGroqTesting] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [groqLastSavedAt, setGroqLastSavedAt] = useState<Date | null>(null);
  const [groqKeyVisible, setGroqKeyVisible] = useState(false);
  const [malClientVisible, setMalClientVisible] = useState(false);
  const [showAnimeEnrichmentModal, setShowAnimeEnrichmentModal] = useState(false);
  const [showMangaEnrichmentModal, setShowMangaEnrichmentModal] = useState(false);

  const toggleNestedSection = (key: string) => {
    setOpenSections((prev) => {
      const newState = { ...prev, [key]: !prev[key] };
      // Sauvegarder dans localStorage avec la clé préfixée
      const storageKey = `integrations-${key}`;
      try {
        const stored = localStorage.getItem('settings-section-states');
        const states = stored ? JSON.parse(stored) : {};
        states[storageKey] = newState[key];
        localStorage.setItem('settings-section-states', JSON.stringify(states));
      } catch (error) {
        console.error('Erreur sauvegarde état section imbriquée:', error);
      }
      return newState;
    });
  };

  const lastSyncDate = malLastSync?.timestamp
    ? new Date(malLastSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;
  const handleAnimeEnrichmentSaved = (config: AnimeEnrichmentConfig) => {
    if (config) {
      showToast?.({
        title: 'Configuration enrichissement anime enregistrée',
        type: 'success',
        duration: 2500
      });
    }
  };

  const handleMangaEnrichmentSaved = (config: MangaEnrichmentConfig) => {
    if (config) {
      showToast?.({
        title: 'Configuration enrichissement manga enregistrée',
        type: 'success',
        duration: 2500
      });
    }
  };

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const creds = await window.electronAPI.getMalCredentials?.();
        if (creds) {
          setMalClientId(creds.clientId || '');
          redirectUriRef.current = creds.redirectUri || DEFAULT_MAL_REDIRECT_URI;
        } else {
          redirectUriRef.current = DEFAULT_MAL_REDIRECT_URI;
        }
      } catch (error) {
        console.error('Erreur chargement identifiants MAL:', error);
      } finally {
        setCredentialsLoaded(true);
      }
    };

    loadCredentials();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadTmdbCredentials = async () => {
      try {
        const creds = await window.electronAPI.getTmdbCredentials?.();
        if (creds) {
          setTmdbApiKey(creds.apiKey || '');
          setTmdbApiToken(creds.apiToken || '');
        }
      } catch (error) {
        console.error('Erreur chargement identifiants TMDb:', error);
      } finally {
        setTmdbInitialLoad(true);
      }
    };

    loadTmdbCredentials();

    return () => {
      if (tmdbSaveTimeout.current) {
        clearTimeout(tmdbSaveTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setGroqApiKeyInput(groqApiKey || '');
    setGroqInitialLoad(true);

    return () => {
      if (groqSaveTimeout.current) {
        clearTimeout(groqSaveTimeout.current);
      }
    };
  }, [groqApiKey]);

  const scheduleCredentialSave = (nextClientId: string) => {
    if (!credentialsLoaded || !window.electronAPI.setMalCredentials) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const trimmedClientId = nextClientId.trim();

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSavingCredentials(true);
      try {
        await window.electronAPI.setMalCredentials?.({
          clientId: trimmedClientId,
          redirectUri: redirectUriRef.current || DEFAULT_MAL_REDIRECT_URI,
        });
        setLastCredentialSaveAt(new Date());
      } catch (error) {
        console.error('Erreur sauvegarde identifiants MAL:', error);
      } finally {
        setIsSavingCredentials(false);
        saveTimeoutRef.current = null;
      }
    }, 600);
  };

  const scheduleTmdbCredentialSave = useCallback(
    (nextKey?: string, nextToken?: string) => {
      if (!tmdbInitialLoad || !window.electronAPI.setTmdbCredentials) {
        return;
      }

      if (tmdbSaveTimeout.current) {
        clearTimeout(tmdbSaveTimeout.current);
      }

      const keyValue = (nextKey ?? tmdbApiKey).trim();
      const tokenValue = (nextToken ?? tmdbApiToken).trim();

      tmdbSaveTimeout.current = setTimeout(async () => {
        setTmdbSaving(true);
        try {
          await window.electronAPI.setTmdbCredentials?.({
            apiKey: keyValue,
            apiToken: tokenValue,
          });
          setTmdbLastSavedAt(new Date());
        } catch (error: any) {
          console.error('Erreur sauvegarde identifiants TMDb:', error);
          showToast?.({
            title: 'Erreur TMDb',
            message: error?.message || 'Impossible de sauvegarder les identifiants TMDb.',
            type: 'error',
          });
        } finally {
          setTmdbSaving(false);
          tmdbSaveTimeout.current = null;
        }
      }, 600);
    },
    [tmdbInitialLoad, tmdbApiKey, tmdbApiToken, showToast]
  );

  const flushTmdbCredentialSave = useCallback(async () => {
    if (!tmdbInitialLoad || !window.electronAPI.setTmdbCredentials) {
      return;
    }

    if (tmdbSaveTimeout.current) {
      clearTimeout(tmdbSaveTimeout.current);
      tmdbSaveTimeout.current = null;
    }

    setTmdbSaving(true);
    try {
      await window.electronAPI.setTmdbCredentials?.({
        apiKey: tmdbApiKey.trim(),
        apiToken: tmdbApiToken.trim(),
      });
      setTmdbLastSavedAt(new Date());
    } catch (error: any) {
      console.error('Erreur sauvegarde identifiants TMDb:', error);
      showToast?.({
        title: 'Erreur TMDb',
        message: error?.message || 'Impossible de sauvegarder les identifiants TMDb.',
        type: 'error',
      });
    } finally {
      setTmdbSaving(false);
    }
  }, [tmdbApiKey, tmdbApiToken, tmdbInitialLoad, showToast]);

  useEffect(() => {
    return () => {
      // Ne pas appeler flushTmdbCredentialSave dans le cleanup pour éviter les boucles infinies
      // La sauvegarde est déjà gérée par onBlur et le timeout
      if (tmdbSaveTimeout.current) {
        clearTimeout(tmdbSaveTimeout.current);
        tmdbSaveTimeout.current = null;
      }
    };
  }, []);

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
          setGroqLastSavedAt(new Date());
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
      setGroqLastSavedAt(new Date());
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

  const handleTestTmdbConnection = useCallback(async () => {
    if (!tmdbApiKey.trim()) {
      const message = 'La clé API TMDb (v3) est requise pour tester la connexion.';
      setTmdbTestResult({ success: false, message });
      showToast?.({
        title: 'Clé API requise',
        message,
        type: 'error'
      });
      return;
    }

    try {
      setTmdbTesting(true);
      setTmdbTestResult(null);

      const result = await window.electronAPI.testTmdbConnection?.({
        apiKey: tmdbApiKey.trim(),
        apiToken: tmdbApiToken.trim()
      });

      if (result?.success) {
        const message = 'Connexion établie. Les services TMDb sont disponibles.';
        setTmdbTestResult({ success: true, message });
        showToast?.({
          title: 'Connexion TMDb réussie',
          message,
          type: 'success'
        });
      } else {
        const message = result?.error || 'Connexion refusée par TMDb.';
        setTmdbTestResult({ success: false, message });
        showToast?.({
          title: 'Connexion TMDb échouée',
          message,
          type: 'error'
        });
      }
    } catch (error: any) {
      const message = error?.message || 'Impossible de contacter TMDb.';
      setTmdbTestResult({ success: false, message });
      showToast?.({
        title: 'Connexion TMDb échouée',
        message,
        type: 'error'
      });
    } finally {
      setTmdbTesting(false);
    }
  }, [showToast, tmdbApiKey, tmdbApiToken]);

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
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                {malUser?.name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Dernière synchronisation :{' '}
                {lastSyncDate || 'Jamais'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Dernier état progression :{' '}
                {malLastStatusSync?.timestamp
                  ? new Date(malLastStatusSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
              </p>
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

  const renderSyncToggles = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {[{
          key: 'mal-auto-sync',
          label: '🔄 Synchronisation automatique MyAnimeList',
          description: 'Met à jour vos progressions toutes les quelques heures.',
          checked: malAutoSyncEnabled,
          onChange: onMalAutoSyncChange,
        }, {
          key: 'nautiljon-auto-sync',
          label: '📚 Synchronisation automatique de Nautiljon',
          description: 'Actualise les fiches Nautiljon liées aux séries suivies.',
          checked: nautiljonAutoSyncEnabled,
          onChange: onNautiljonAutoSyncChange,
        }, {
          key: 'nautiljon-tomes-sync',
          label: '📚 Gestion des tomes/volumes (Nautiljon)',
          description: 'Synchronise la progression des tomes et leurs métadonnées.',
          checked: nautiljonAutoSyncIncludeTomes,
          onChange: onNautiljonIncludeTomesChange,
        }].map(({ key, label, description, checked, onChange }) => (
          <div
            key={key}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{label}</div>
              <Toggle checked={checked} onChange={onChange} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{description}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px'
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>⚙️ Enrichissement des animes</h4>
            <button
              type="button"
              onClick={() => setShowAnimeEnrichmentModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              🔧 Paramètres d'enrichissement
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Sélectionnez les champs à compléter via Jikan / AniList et ajustez vos préférences d'images HQ.
          </p>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>📚 Enrichissement des mangas</h4>
            <button
              type="button"
              onClick={() => setShowMangaEnrichmentModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              🔧 Paramètres d'enrichissement
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Activez la récupération des métadonnées détaillées et des traductions automatiques pour vos mangas.
          </p>
        </div>

        {malConnected && (
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface-light)',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
              🔄 Synchronisation Manuelle MyAnimeList
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Déclenchez une synchronisation immédiate de vos progressions anime et manga.
            </p>
            <button
              onClick={() => Promise.resolve(onMalSyncNow())}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                width: '100%',
              }}
            >
              <RefreshCw size={16} />
              Synchroniser maintenant
            </button>
            {malLastSync?.timestamp && (
              <div style={{ 
                marginTop: '8px', 
                padding: '12px', 
                borderRadius: '8px', 
                background: 'var(--surface)', 
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  📊 Dernière synchronisation
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {new Date(malLastSync.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
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
                        <span style={{ fontWeight: 600 }}>Mangas :</span>{' '}
                        <span style={{ color: 'var(--success)' }}>{malLastSync.mangas}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderTmdbSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={16} />
            TMDb API Key (v3) <span style={{ color: '#f97316' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type={tmdbKeyVisible ? 'text' : 'password'}
              value={tmdbApiKey}
              onChange={(e) => {
                const value = e.target.value;
                setTmdbApiKey(value);
                scheduleTmdbCredentialSave(value, undefined);
              }}
              onBlur={() => {
                flushTmdbCredentialSave().catch(() => undefined);
              }}
              placeholder="Clé API publique v3"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text)',
                fontSize: '14px',
                letterSpacing: tmdbKeyVisible ? '0.4px' : '0.6px',
              }}
            />
            <button
              type="button"
              onClick={() => setTmdbKeyVisible((prev) => !prev)}
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
              aria-label={tmdbKeyVisible ? 'Masquer la clé TMDb' : 'Afficher la clé TMDb'}
            >
              {tmdbKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Requise pour les requêtes REST (détails, images, recherches).
          </p>
          <div
            style={{
              fontSize: '12px',
              color: tmdbSaving ? 'var(--primary-light)' : 'var(--text-secondary)',
            }}
          >
            {tmdbSaving
              ? 'Sauvegarde automatique…'
              : tmdbLastSavedAt
                ? `Dernière sauvegarde : ${tmdbLastSavedAt.toLocaleTimeString('fr-FR')}`
                : 'Enregistrement automatique activé.'}
          </div>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} />
            Jeton d’accès lecture (v4)
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type={tmdbTokenVisible ? 'text' : 'password'}
              value={tmdbApiToken}
              onChange={(e) => {
                const value = e.target.value;
                setTmdbApiToken(value);
                scheduleTmdbCredentialSave(undefined, value);
              }}
              onBlur={() => {
                flushTmdbCredentialSave().catch(() => undefined);
              }}
              placeholder="Token Bearer (optionnel)"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text)',
                fontSize: '14px',
                letterSpacing: tmdbTokenVisible ? '0.4px' : '0.6px',
              }}
            />
            <button
              type="button"
              onClick={() => setTmdbTokenVisible((prev) => !prev)}
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
              aria-label={tmdbTokenVisible ? 'Masquer le jeton TMDb' : 'Afficher le jeton TMDb'}
            >
              {tmdbTokenVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Optionnel, utile pour les requêtes nécessitant l’authentification Bearer (listes privées, découvertes avancées).
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Source des images</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Choisissez la priorité d’extraction pour les affiches et banners.
          </p>
          <select
            value={imageSource}
            onChange={(e) => onImageSourceChange(e.target.value as 'mal' | 'anilist' | 'tmdb')}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--text)',
              fontSize: '13px',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="anilist">AniList (haute définition)</option>
            <option value="mal">MyAnimeList</option>
            <option value="tmdb">TMDb</option>
          </select>
        </div>

        <div
          style={{
            padding: '18px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          <button
            onClick={handleTestTmdbConnection}
            className="btn btn-outline"
            disabled={tmdbTesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
              width: '220px',
              textAlign: 'center'
            }}
          >
            <RefreshCw size={15} style={{ animation: tmdbTesting ? 'spin 1s linear infinite' : 'none' }} />
            {tmdbTesting ? 'Test en cours…' : 'Tester la connexion TMDb'}
          </button>

          <button
            type="button"
            onClick={() => onOpenGuide('tmdb')}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              width: '220px',
              boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
              textAlign: 'center'
            }}
          >
            <BookOpenCheck size={16} />
            Ouvrir le Guide TMDb
          </button>

          {tmdbTestResult && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${tmdbTestResult.success ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                background: tmdbTestResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                color: tmdbTestResult.success ? 'var(--success)' : 'var(--error)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%'
              }}
            >
              <CheckCircle size={14} />
              {tmdbTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* message test déjà géré dans la carte ci-dessus */}
    </div>
  );

  const renderGroqSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Clé API Groq
              <span style={{ color: '#f97316' }}>*</span>
            </label>
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
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  fontSize: '14px',
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
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Coller ici la clé fournie par Groq (affichée une seule fois). Elle est stockée chiffrée sur votre machine.
            </p>
            <div style={{ fontSize: '12px', color: groqSaving ? 'var(--primary-light)' : 'var(--text-secondary)' }}>
              {groqSaving
                ? 'Sauvegarde en cours…'
                : groqLastSavedAt
                  ? `Dernière sauvegarde : ${groqLastSavedAt.toLocaleTimeString('fr-FR')}`
                  : 'Sauvegarde automatique activée.'}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '18px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          <button
            onClick={handleTestGroqConnection}
            className="btn btn-outline"
            disabled={groqTesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              width: '220px',
              boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)'
            }}
          >
            <RefreshCw size={14} style={{ animation: groqTesting ? 'spin 1s linear infinite' : 'none' }} />
            {groqTesting ? 'Test en cours…' : 'Tester la connexion Groq'}
          </button>
          <button
            onClick={() => onOpenGuide('groq')}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              width: '220px',
              boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)'
            }}
          >
            <BookOpenCheck size={14} />
            Ouvrir le Guide Groq
          </button>
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
                width: '100%'
              }}
            >
              <CheckCircle size={14} />
              {groqTestResult.message}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Fonctionnalités IA</div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <label
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                Traduction automatique (Groq)
              </span>
              <Toggle checked={autoTranslate} onChange={(checked) => onAutoTranslateChange(checked)} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Traduire automatiquement les synopsis indisponibles en français via Groq lors de l’enrichissement.
            </p>
          </label>

          <label
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                ✨ Fin d’enrichissement des données
              </span>
              <Toggle checked={notifyEnrichment} onChange={(checked) => onNotifyEnrichmentChange(checked)} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Envoyer une notification lorsque le traitement d’enrichissement (Jikan/AniList + Groq) a terminé.
            </p>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '18px',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '240px'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            Fréquence de Synchronisation Globale
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Appliquée à toutes les routines automatiques activées (MyAnimeList, Nautiljon, Jeux adultes…).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={globalSyncInterval}
            onChange={(e) => onGlobalSyncIntervalChange(Number(e.target.value) as 1 | 3 | 6 | 12 | 24)}
            disabled={globalSyncUpdating}
            aria-busy={globalSyncUpdating}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: globalSyncUpdating ? 'var(--surface)' : 'var(--surface-light)',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: '13px',
              minWidth: '220px',
              cursor: globalSyncUpdating ? 'wait' : 'pointer',
              opacity: globalSyncUpdating ? 0.65 : 1
            }}
          >
            <option value={1}>Toutes les heures</option>
            <option value={3}>Toutes les 3 heures</option>
            <option value={6}>Toutes les 6 heures</option>
            <option value={12}>Toutes les 12 heures</option>
            <option value={24}>Tous les jours</option>
          </select>
          {globalSyncUpdating && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Mise à jour…
            </span>
          )}
        </div>
      </div>

      <NestedSection
        id="integrations-mal"
        title="🤝 MyAnimeList (Progression Anime/Manga)"
        isOpen={openSections.mal}
        onToggle={() => toggleNestedSection('mal')}
      >
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
                background: 'var(--surface-light)',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>Client ID MyAnimeList</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type={malClientVisible ? 'text' : 'password'}
                  value={malClientId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMalClientId(value);
                    scheduleCredentialSave(value);
                  }}
                  placeholder="Clé client générée dans le portail MAL"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    letterSpacing: malClientVisible ? '0.4px' : '0.6px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMalClientVisible((prev) => !prev)}
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
                  aria-label={malClientVisible ? 'Masquer le Client ID' : 'Afficher le Client ID'}
                >
                  {malClientVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {isSavingCredentials
                  ? 'Sauvegarde…'
                  : lastCredentialSaveAt
                    ? `Dernière sauvegarde : ${lastCredentialSaveAt.toLocaleTimeString('fr-FR')}`
                    : 'Enregistrement automatique activé.'}
              </span>
            </div>

            {renderMalStatus()}

            <div
              style={{
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface-light)',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => onOpenGuide('mal')}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  width: '220px',
                  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)'
                }}
              >
                <BookOpenCheck size={14} />
                Ouvrir le Guide MAL
              </button>
            </div>
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
                background: 'var(--surface-light)',
                boxShadow: '0 10px 26px rgba(15, 23, 42, 0.22)',
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
      </NestedSection>

      <NestedSection
        id="integrations-tmdb"
        title="🎬 Sources Médias et Images (TMDb)"
        isOpen={openSections.tmdb}
        onToggle={() => toggleNestedSection('tmdb')}
      >
        {renderTmdbSection()}
      </NestedSection>

      <NestedSection
        id="integrations-groq"
        title="🧠 Traductions et Enrichissement IA (Groq)"
        isOpen={openSections.groq}
        onToggle={() => toggleNestedSection('groq')}
      >
        {renderGroqSection()}
      </NestedSection>

      <NestedSection
        id="integrations-adulte-game"
        title="🕹️ Synchronisation & Outils (Jeux Adultes)"
        isOpen={openSections.adulteGame}
        onToggle={() => toggleNestedSection('adulteGame')}
      >
        <AdulteGameSettings showToast={showToast ?? (() => undefined)} />
      </NestedSection>

      {showAnimeEnrichmentModal && (
        <AnimeEnrichmentConfigModal
          onClose={() => setShowAnimeEnrichmentModal(false)}
          onSave={(config) => {
            handleAnimeEnrichmentSaved(config);
          }}
        />
      )}

      {showMangaEnrichmentModal && (
        <MangaEnrichmentConfigModal
          onClose={() => setShowMangaEnrichmentModal(false)}
          onSave={(config) => {
            handleMangaEnrichmentSaved(config);
          }}
        />
      )}
    </div>
  );
}
