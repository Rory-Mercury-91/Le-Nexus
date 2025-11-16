import { BookOpenCheck, Globe2, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Toggle from '../../../components/common/Toggle';
import type { ApiKeyProvider } from './apiKeyGuideTypes';

interface MediaSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  onOpenGuide?: (provider: ApiKeyProvider) => void;
}

export default function MediaSettings({ showToast, onOpenGuide }: MediaSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [language, setLanguage] = useState('fr-FR');
  const [region, setRegion] = useState('FR');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingChanges = useRef(false);
  const latestValuesRef = useRef({
    apiKey: '',
    apiToken: '',
    language: 'fr-FR',
    region: 'FR',
    autoTranslate: true
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
          setAutoTranslate(syncSettings.autoTranslate ?? true);
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
      region,
      autoTranslate
    };
  }, [apiKey, apiToken, language, region, autoTranslate]);

  const persistSettings = useCallback(async () => {
    if (!initialLoadDone) {
      return;
    }

    const { apiKey: currentApiKey, apiToken: currentApiToken, language: currentLanguage, region: currentRegion, autoTranslate: currentAutoTranslate } =
      latestValuesRef.current;

    setIsAutoSaving(true);
    try {
      await window.electronAPI.setTmdbCredentials({
        apiKey: currentApiKey,
        apiToken: currentApiToken
      });
      await window.electronAPI.saveMediaSyncSettings({
        language: currentLanguage,
        region: currentRegion,
        autoTranslate: currentAutoTranslate
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
      {onOpenGuide && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onOpenGuide('tmdb')}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '13px'
            }}
          >
            <BookOpenCheck size={16} />
            Guide TMDb
          </button>
        </div>
      )}

      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '24px',
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} />
              TMDb API Key (v3)
            </span>
          </label>
          <input
            type="text"
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
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)'
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Requise pour les requêtes REST principales (recherche, détails, images).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} />
              Jeton d’accès lecture (v4)
            </span>
          </label>
          <input
            type="text"
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
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)'
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Optionnel. Utilisé si vous préférez l’authentification Bearer pour certaines routes (découverte avancée).
          </p>
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '24px',
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)'
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Format attendu : langue-pays (ex: fr-FR, en-US).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              textTransform: 'uppercase'
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Utilisé pour les disponibilités (streaming) et la découverte.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            borderLeft: '1px solid var(--border)',
            paddingLeft: '20px'
          }}
        >
          <label style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
            Traduction automatique (Groq)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Toggle
              checked={autoTranslate}
              onChange={(value) => {
                setAutoTranslate(Boolean(value));
                scheduleAutoSave();
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Traduire automatiquement les synopsis en français si TMDb ne les fournit pas.
            </span>
          </div>
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
        <button
          onClick={handleTestConnection}
          className="btn btn-outline"
          disabled={testing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px'
          }}
        >
          <RefreshCw size={16} style={{ animation: testing ? 'spin 1s linear infinite' : 'none' }} />
          {testing ? 'Test en cours...' : 'Tester la connexion TMDb'}
        </button>
        {lastTestResult && (
          <span
            style={{
              fontSize: '12px',
              color: lastTestResult.success ? '#22c55e' : '#ef4444'
            }}
          >
            {lastTestResult.message}
          </span>
        )}
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
