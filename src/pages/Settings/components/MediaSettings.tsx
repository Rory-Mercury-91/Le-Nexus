import { Eye, EyeOff, Globe2, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MediaSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  imageSource?: 'mal' | 'anilist' | 'tmdb';
  onImageSourceChange?: (source: 'mal' | 'anilist' | 'tmdb') => void;
  TooltipIcon?: ({ id, placement }: { id: 'imageSource' | 'tmdbKey' | 'tmdbToken' | 'groqKey' | 'groqAutoTranslate' | 'malClientId' | 'malAutoSync' | 'nautiljonAutoSync' | 'nautiljonTomes' | 'animeEnrichment' | 'mangaEnrichment' | 'malManualSync' | 'mihonImport'; placement?: 'center' | 'end' }) => JSX.Element;
}

export default function MediaSettings({ showToast, imageSource, onImageSourceChange, TooltipIcon }: MediaSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [language, setLanguage] = useState('fr-FR');
  const [region, setRegion] = useState('FR');
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiTokenVisible, setApiTokenVisible] = useState(false);
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingChanges = useRef(false);
  const latestValuesRef = useRef({
    apiKey: '',
    apiToken: '',
    language: 'fr-FR',
    region: 'FR'
  });

  useEffect(() => {
    const load = async () => {
      try {
        const credentials = await window.electronAPI.getTmdbCredentials();
        setApiKey(credentials?.apiKey || '');
        setApiToken(credentials?.apiToken || '');

        const syncSettings = await window.electronAPI.getMediaSyncSettings?.();
        if (syncSettings) {
          setLanguage(syncSettings.language || 'fr-FR');
          setRegion(syncSettings.region || 'FR');
        }
        setInitialLoadDone(true);
      } catch (error) {
        console.error('Erreur chargement paramètres médias:', error);
      }
    };

    load();
  }, []);

  useEffect(() => {
    latestValuesRef.current = {
      apiKey,
      apiToken,
      language,
      region
    };
  }, [apiKey, apiToken, language, region]);

  const persistSettings = useCallback(async () => {
    if (!initialLoadDone) {
      return;
    }

    const { apiKey: currentApiKey, apiToken: currentApiToken, language: currentLanguage, region: currentRegion } =
      latestValuesRef.current;

    setIsAutoSaving(true);
    try {
      await window.electronAPI.setTmdbCredentials({
        apiKey: currentApiKey,
        apiToken: currentApiToken
      });
      await window.electronAPI.saveMediaSyncSettings({
        language: currentLanguage,
        region: currentRegion
      });
      setLastSavedAt(new Date());
      hasPendingChanges.current = false;
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error?.message || 'Impossible de sauvegarder les paramètres.',
        type: 'error'
      });
      throw error;
    } finally {
      setIsAutoSaving(false);
    }
  }, [initialLoadDone, showToast]);

  const flushAutoSave = useCallback(async () => {
    if (!initialLoadDone) {
      return;
    }
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = null;
    }
    if (hasPendingChanges.current) {
      await persistSettings();
    }
  }, [initialLoadDone, persistSettings]);

  useEffect(() => {
    return () => {
      flushAutoSave().catch((error) => {
        console.error('Erreur lors de la sauvegarde automatique à la fermeture:', error);
      });
    };
  }, [flushAutoSave]);

  const scheduleAutoSave = useCallback(() => {
    if (!initialLoadDone) return;
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    hasPendingChanges.current = true;
    autoSaveTimeout.current = setTimeout(async () => {
      autoSaveTimeout.current = null;
      try {
        await persistSettings();
      } catch {
        // l'erreur a déjà été remontée via toast, éviter de rejeter la promesse non gérée
      }
    }, 600);
  }, [initialLoadDone, persistSettings]);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setLastTestResult(null);
      const result = await window.electronAPI.testTmdbConnection({
        apiKey: apiKey.trim(),
        apiToken: apiToken.trim()
      });
      if (result?.success) {
        setLastTestResult({ success: true, message: 'Connexion établie. Les images TMDb sont disponibles.' });
        showToast({
          title: 'Connexion réussie',
          message: 'Les identifiants TMDb sont valides.',
          type: 'success'
        });
      } else {
        const errorMessage = result?.error || 'Erreur inconnue lors du test.';
        setLastTestResult({ success: false, message: errorMessage });
        showToast({
          title: 'Connexion échouée',
          message: errorMessage,
          type: 'error'
        });
      }
    } catch (error: any) {
      const message = error?.message || 'Impossible de contacter TMDb.';
      setLastTestResult({ success: false, message });
      showToast({
        title: 'Connexion échouée',
        message,
        type: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
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
            background: 'var(--surface-light)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} />
              TMDb API Key (v3)
            </label>
            <button
              onClick={handleTestConnection}
              className="btn btn-outline"
              disabled={testing}
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
              <RefreshCw size={14} style={{ animation: testing ? 'spin 1s linear infinite' : 'none' }} />
              {testing ? 'Test en cours…' : 'Tester la connexion'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type={apiKeyVisible ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                scheduleAutoSave();
              }}
              onBlur={() => {
                flushAutoSave().catch((error) => {
                  console.error('Erreur sauvegarde API key (blur):', error);
                });
              }}
              placeholder="Clé API publique (v3)"
              className="input"
              style={{
                flex: 1,
                letterSpacing: apiKeyVisible ? '0.4px' : '0.6px'
              }}
            />
            <button
              type="button"
              onClick={() => setApiKeyVisible((prev) => !prev)}
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
              aria-label={apiKeyVisible ? 'Masquer la clé API' : 'Afficher la clé API'}
            >
              {apiKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Requise pour les requêtes REST principales (recherche, détails, images).
          </p>
          {lastTestResult && (
            <div
              style={{
                fontSize: '12px',
                color: lastTestResult.success ? 'var(--success)' : 'var(--error)',
                border: `1px solid ${lastTestResult.success ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                background: lastTestResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
              }}
            >
              {lastTestResult.message}
            </div>
          )}
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
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} />
              Jeton d'accès lecture (v4)
            </label>
            <div style={{ minWidth: '190px', height: '36px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type={apiTokenVisible ? 'text' : 'password'}
              value={apiToken}
              onChange={(e) => {
                setApiToken(e.target.value);
                scheduleAutoSave();
              }}
              onBlur={() => {
                flushAutoSave().catch((error) => {
                  console.error('Erreur sauvegarde token (blur):', error);
                });
              }}
              placeholder="Token v4 (Bearer)"
              className="input"
              style={{
                flex: 1,
                letterSpacing: apiTokenVisible ? '0.4px' : '0.6px'
              }}
            />
            <button
              type="button"
              onClick={() => setApiTokenVisible((prev) => !prev)}
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
              aria-label={apiTokenVisible ? 'Masquer le token' : 'Afficher le token'}
            >
              {apiTokenVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Optionnel. Utilisé si vous préférez l'authentification Bearer pour certaines routes (découverte avancée).
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          alignItems: 'stretch',
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
          <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe2 size={16} />
            Langue par défaut
          </label>
          <input
            type="text"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              scheduleAutoSave();
            }}
            onBlur={() => {
              flushAutoSave().catch((error) => {
                console.error('Erreur sauvegarde langue (blur):', error);
              });
            }}
            placeholder="fr-FR"
            className="input"
            style={{
              flex: 1
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Format attendu : langue-pays (ex: fr-FR, en-US).
          </p>
        </div>

        {imageSource !== undefined && onImageSourceChange && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Source des images MyAnimeList</label>
              {TooltipIcon && <TooltipIcon id="imageSource" />}
            </div>
            <select
              value={imageSource === 'tmdb' ? 'mal' : imageSource}
              onChange={(e) => onImageSourceChange(e.target.value as 'mal' | 'anilist')}
              className="select"
              style={{ width: '100%' }}
            >
              <option value="mal">MyAnimeList (par défaut)</option>
              <option value="anilist">AniList (haute définition)</option>
            </select>
          </div>
        )}

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
          <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
            Région par défaut
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value.toUpperCase());
              scheduleAutoSave();
            }}
            onBlur={() => {
              flushAutoSave().catch((error) => {
                console.error('Erreur sauvegarde région (blur):', error);
              });
            }}
            placeholder="FR"
            maxLength={2}
            className="input"
            style={{
              flex: 1,
              textTransform: 'uppercase'
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Utilisé pour les disponibilités (streaming) et la découverte.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '12px', color: isAutoSaving ? 'var(--primary)' : 'var(--text-secondary)' }}>
          {isAutoSaving
            ? 'Sauvegarde automatique...'
            : lastSavedAt
              ? `Dernière sauvegarde auto : ${lastSavedAt.toLocaleTimeString()}`
              : 'La sauvegarde est automatique.'}
        </span>
      </div>
    </div>
  );
}
