import { Cloud, Copy, Download, FileUp, Info, RefreshCw, Upload, Users as UsersIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Toggle from '../../../components/common/Toggle';
import { useConfirm } from '../../../hooks/common/useConfirm';

interface CloudSyncSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  onOpenGuide: () => void;
  sectionStates: Record<string, boolean>;
  onSectionStateChange: (sectionId: string, isOpen: boolean) => void;
}

type SyncFrequency = '6h' | '12h' | '24h' | '7d' | '30d' | 'manual';

interface CloudSyncConfig {
  enabled: boolean;
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  syncFrequency: SyncFrequency;
  syncedUsers: string[];
  mergePriority?: 'current-user' | 'source' | 'newest' | 'oldest';
}

export default function CloudSyncSettings({
  showToast,
  onOpenGuide,
  sectionStates,
  onSectionStateChange
}: CloudSyncSettingsProps) {
  const { ConfirmDialog } = useConfirm();

  const [config, setConfig] = useState<CloudSyncConfig>({
    enabled: false,
    endpoint: '',
    bucketName: '',
    accessKeyId: '',
    secretAccessKey: '',
    syncFrequency: '24h',
    syncedUsers: [],
    mergePriority: 'current-user'
  });
  const [currentUUID, setCurrentUUID] = useState<string | null>(null);
  const [loadingUUID, setLoadingUUID] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const showConfig = sectionStates['cloud-sync-config'] ?? true;
  const showUsers = sectionStates['cloud-sync-users'] ?? true;

  // Fonction pour charger les noms d'utilisateurs (définie avant les useEffect qui l'utilisent)
  const loadUserNames = useCallback(async () => {
    const names: Record<string, string> = {};
    for (const uuid of config.syncedUsers) {
      try {
        const result = await window.electronAPI.getUserNameFromUuid(uuid);
        if (result.success && result.name) {
          names[uuid] = result.name;
        }
      } catch (error) {
        console.error(`Erreur chargement nom pour UUID ${uuid}:`, error);
      }
    }
    setUserNames(names);
  }, [config.syncedUsers]);

  // Charger la configuration au montage
  useEffect(() => {
    loadConfig();
    loadCurrentUUID();
    loadLastSync();
    setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
  }, []);

  // Écouter les événements de progression de synchronisation cloud pour mettre à jour lastSync
  useEffect(() => {
    const unsubscribe = window.electronAPI.onCloudSyncProgress?.((_event: any, progress: any) => {
      // Si la synchronisation est terminée, mettre à jour lastSync et recharger les noms
      if (progress.phase === 'complete') {
        loadLastSync();
        if (config.syncedUsers.length > 0) {
          loadUserNames();
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [config.syncedUsers, loadUserNames]);

  // Sauvegarder automatiquement quand la config change
  useEffect(() => {
    if (isInitialLoad || !hasUserInteracted) return;

    const timeoutId = setTimeout(() => {
      handleSaveConfig();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [config, isInitialLoad, hasUserInteracted]);

  // Charger les noms d'utilisateurs pour les UUIDs synchronisés
  useEffect(() => {
    if (config.syncedUsers.length > 0) {
      loadUserNames();
    } else {
      setUserNames({});
    }
  }, [config.syncedUsers, loadUserNames]);

  // Fonction pour nettoyer l'endpoint (retirer le nom du bucket s'il est présent)
  const cleanEndpoint = (url: string): string => {
    if (!url) return url;
    const match = url.match(/^(https?:\/\/[^\/]+\.cloudflarestorage\.com)/);
    return match ? match[1] : url.trim();
  };

  const loadConfig = async () => {
    try {
      const loadedConfig = await window.electronAPI.getCloudSyncConfig();
      setConfig({
        enabled: loadedConfig.enabled || false,
        endpoint: cleanEndpoint(loadedConfig.endpoint || ''),
        bucketName: loadedConfig.bucketName || '',
        accessKeyId: loadedConfig.accessKeyId || '',
        secretAccessKey: loadedConfig.secretAccessKey || '',
        syncFrequency: loadedConfig.syncFrequency || '24h',
        syncedUsers: Array.isArray(loadedConfig.syncedUsers) ? loadedConfig.syncedUsers : [],
        mergePriority: loadedConfig.mergePriority || 'current-user'
      });
    } catch (error) {
      console.error('Erreur chargement config cloud sync:', error);
    }
  };

  const loadCurrentUUID = async () => {
    try {
      setLoadingUUID(true);
      const result = await window.electronAPI.getCurrentUserUuid();
      if (result.success && result.uuid) {
        setCurrentUUID(result.uuid);
      }
    } catch (error) {
      console.error('Erreur chargement UUID:', error);
    } finally {
      setLoadingUUID(false);
    }
  };

  const loadLastSync = async () => {
    try {
      const history = await window.electronAPI.getCloudSyncHistory();
      if (history && history.lastSync) {
        setLastSync(history.lastSync);
      }
    } catch (error) {
      console.error('Erreur chargement last sync:', error);
    }
  };

  const handleSaveConfig = async (silent = false) => {
    try {
      const result = await window.electronAPI.saveCloudSyncConfig(config);
      if (result.success && !silent) {
        showToast({
          type: 'success',
          title: 'Configuration sauvegardée',
          duration: 2000
        });
      }
      if (!result.success) {
        showToast({
          type: 'error',
          title: 'Erreur de sauvegarde',
          message: result.error || 'Erreur lors de la sauvegarde'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: error.message || 'Erreur lors de la sauvegarde'
      });
    }
  };

  const handleTestConnection = async () => {
    if (!config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
      showToast({
        type: 'warning',
        title: 'Configuration incomplète',
        message: 'Veuillez remplir tous les champs de connexion'
      });
      return;
    }

    setTestingConnection(true);
    try {
      const result = await window.electronAPI.testCloudSyncConnection(config);
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Connexion réussie',
          message: 'La connexion à Cloudflare R2 fonctionne correctement'
        });
      } else {
        showToast({
          type: 'error',
          title: 'Échec de la connexion',
          message: result.error || 'Impossible de se connecter à Cloudflare R2'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors du test de connexion'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSync = async () => {
    if (!config.enabled) {
      showToast({
        type: 'warning',
        title: 'Synchronisation désactivée',
        message: 'Activez la synchronisation dans les paramètres'
      });
      return;
    }

    setSyncing(true);
    try {
      // Lancer la synchronisation de manière asynchrone pour ne pas bloquer l'interface
      const result = await window.electronAPI.performCloudSync();
      if (result.success) {
        const uploadSuccess = result.results?.upload?.success;
        const downloadsCount = result.results?.downloads?.filter((d: any) => d.success).length || 0;
        const totalDownloads = result.results?.downloads?.length || 0;

        let message = '';
        if (uploadSuccess && downloadsCount > 0) {
          message = `Upload réussi, ${downloadsCount}/${totalDownloads} téléchargement(s) réussi(s)`;
        } else if (uploadSuccess) {
          message = 'Upload réussi';
        } else if (downloadsCount > 0) {
          message = `${downloadsCount}/${totalDownloads} téléchargement(s) réussi(s)`;
        } else {
          message = 'Synchronisation terminée';
        }

        showToast({
          type: 'success',
          title: 'Synchronisation terminée',
          message,
          duration: 5000
        });

        loadLastSync();
      } else {
        showToast({
          type: 'error',
          title: 'Erreur de synchronisation',
          message: result.error || 'Erreur lors de la synchronisation'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors de la synchronisation'
      });
    } finally {
      setSyncing(false);
    }
  };


  const handleCopyUUID = async () => {
    if (!currentUUID) return;
    try {
      await window.electronAPI.copyToClipboard(currentUUID);
      showToast({
        type: 'success',
        title: 'UUID copié',
        message: 'L\'UUID a été copié dans le presse-papiers',
        duration: 2000
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de copier l\'UUID'
      });
    }
  };

  const handleExportConfig = async () => {
    try {
      const result = await window.electronAPI.exportCloudSyncConfig();
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Configuration exportée',
          message: 'La configuration R2 a été exportée et chiffrée avec succès',
          duration: 3000
        });
      } else if (result.canceled) {
        // L'utilisateur a annulé, pas besoin d'afficher d'erreur
        return;
      } else {
        showToast({
          type: 'error',
          title: 'Erreur d\'export',
          message: result.error || 'Impossible d\'exporter la configuration'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible d\'exporter la configuration'
      });
    }
  };

  const handleImportConfig = async () => {
    try {
      const result = await window.electronAPI.importCloudSyncConfig();
      if (result.success && result.config) {
        setConfig(result.config);
        showToast({
          type: 'success',
          title: 'Configuration importée',
          message: 'La configuration R2 a été importée et déchiffrée avec succès',
          duration: 3000
        });
        // Recharger la config depuis le store
        await loadConfig();
      } else if (result.canceled) {
        // L'utilisateur a annulé, pas besoin d'afficher d'erreur
        return;
      } else {
        showToast({
          type: 'error',
          title: 'Erreur d\'import',
          message: result.error || 'Impossible d\'importer la configuration'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible d\'importer la configuration'
      });
    }
  };

  const handleAddSyncedUser = (uuid: string) => {
    if (!config.syncedUsers.includes(uuid)) {
      setHasUserInteracted(true);
      setConfig({
        ...config,
        syncedUsers: [...config.syncedUsers, uuid]
      });
    }
  };

  const handleRemoveSyncedUser = (uuid: string) => {
    setHasUserInteracted(true);
    setConfig({
      ...config,
      syncedUsers: config.syncedUsers.filter(u => u !== uuid)
    });
  };

  return (
    <>
      <ConfirmDialog />
      <div>
        {/* Configuration principale */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '20px 24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: config.enabled && showConfig ? '16px' : '0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cloud size={18} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Synchronisation Cloud</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={onOpenGuide}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  fontSize: '12px'
                }}
              >
                <Info size={14} />
                Guide R2
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Activer la synchronisation</span>
              <Toggle
                checked={config.enabled}
                onChange={(checked) => {
                  setHasUserInteracted(true);
                  setConfig({ ...config, enabled: checked });
                }}
              />
            </div>
          </div>

          {config.enabled && showConfig && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Champs de connexion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Endpoint R2
                  </label>
                  <input
                    type="text"
                    value={config.endpoint}
                    onChange={(e) => {
                      setHasUserInteracted(true);
                      const cleanedEndpoint = cleanEndpoint(e.target.value);
                      setConfig({ ...config, endpoint: cleanedEndpoint });
                    }}
                    placeholder="https://xxx.r2.cloudflarestorage.com"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Nom du bucket
                  </label>
                  <input
                    type="text"
                    value={config.bucketName}
                    onChange={(e) => {
                      setHasUserInteracted(true);
                      setConfig({ ...config, bucketName: e.target.value });
                    }}
                    placeholder="nexus-sync"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    value={config.accessKeyId}
                    onChange={(e) => {
                      setHasUserInteracted(true);
                      setConfig({ ...config, accessKeyId: e.target.value });
                    }}
                    placeholder="Access Key ID"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    value={config.secretAccessKey}
                    onChange={(e) => {
                      setHasUserInteracted(true);
                      setConfig({ ...config, secretAccessKey: e.target.value });
                    }}
                    placeholder="Secret Access Key"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Boutons test connexion et export/import */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                >
                  {testingConnection ? (
                    <>
                      <div className="loading" style={{ width: '16px', height: '16px' }} />
                      Test en cours...
                    </>
                  ) : (
                    'Tester la connexion'
                  )}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleExportConfig}
                    className="btn btn-outline"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title="Exporter la configuration R2 (chiffrée)"
                  >
                    <Download size={14} />
                    Exporter
                  </button>
                  <button
                    type="button"
                    onClick={handleImportConfig}
                    className="btn btn-outline"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title="Importer la configuration R2 (chiffrée)"
                  >
                    <FileUp size={14} />
                    Importer
                  </button>
                </div>
              </div>

              {/* Fréquence de synchronisation et Priorité de fusion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Fréquence de synchronisation */}
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Fréquence de synchronisation
                  </label>
                  <select
                    value={config.syncFrequency}
                    onChange={(e) => {
                      setHasUserInteracted(true);
                      setConfig({ ...config, syncFrequency: e.target.value as SyncFrequency });
                    }}
                    className="select"
                    style={{ width: '100%' }}
                  >
                    <option value="6h">Toutes les 6 heures</option>
                    <option value="12h">Toutes les 12 heures</option>
                    <option value="24h">Quotidienne</option>
                    <option value="7d">Hebdomadaire</option>
                    <option value="30d">Mensuelle</option>
                    <option value="manual">Manuelle uniquement</option>
                  </select>
                </div>

                {/* Priorité de fusion */}
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Priorité de fusion des données
                    <span style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.7 }}>
                      (en cas de conflit entre bases)
                    </span>
                  </label>
                  <select
                    value={config.mergePriority || 'current-user'}
                    onChange={(e) => {
                      setHasUserInteracted(true);
                      setConfig({ ...config, mergePriority: e.target.value as 'current-user' | 'source' | 'newest' | 'oldest' });
                    }}
                    className="select"
                    style={{ width: '100%' }}
                  >
                    <option value="current-user">Ma base a la priorité (recommandé)</option>
                    <option value="source">La base téléchargée a la priorité</option>
                    <option value="newest">Les données les plus récentes ont la priorité</option>
                    <option value="oldest">Les données les plus anciennes ont la priorité</option>
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                    {(!config.mergePriority || config.mergePriority === 'current-user') && 'Vos données ne seront jamais écrasées par la synchronisation.'}
                    {config.mergePriority === 'source' && 'Les données des autres utilisateurs écraseront les vôtres en cas de conflit.'}
                    {config.mergePriority === 'newest' && 'Les données avec la date de modification la plus récente seront conservées.'}
                    {config.mergePriority === 'oldest' && 'Les données avec la date de modification la plus ancienne seront conservées.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Utilisateurs à synchroniser */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '20px 24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: showUsers ? '16px' : '0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UsersIcon size={18} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                Utilisateurs à synchroniser
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSectionStateChange('cloud-sync-users', !showUsers)}
              style={{
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px' }}>
                {showUsers ? 'Masquer' : 'Afficher'}
              </span>
            </button>
          </div>

          {showUsers && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Colonne gauche : Liste des utilisateurs et bouton R2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Liste des UUIDs synchronisés */}
                {config.syncedUsers.length > 0 ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {config.syncedUsers.map((uuid) => (
                      <div
                        key={uuid}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: 'var(--background)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          {userNames[uuid] && (
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text)'
                            }}>
                              {userNames[uuid]}
                            </div>
                          )}
                          <div style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: userNames[uuid] ? 'var(--text-secondary)' : 'var(--text)',
                            wordBreak: 'break-all'
                          }}>
                            {uuid}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSyncedUser(uuid)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            marginLeft: '12px',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            color: '#ef4444'
                          }}
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    background: 'var(--background)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    Aucun utilisateur synchronisé
                  </div>
                )}
              </div>

              {/* Colonne droite : Ajouter un UUID */}
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    id="new-uuid-input"
                    placeholder="Collez l'UUID ici"
                    className="input"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        const uuid = input.value.trim();
                        if (uuid && uuid !== currentUUID) {
                          handleAddSyncedUser(uuid);
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-uuid-input') as HTMLInputElement;
                      const uuid = input?.value.trim();
                      if (uuid && uuid !== currentUUID) {
                        handleAddSyncedUser(uuid);
                        input.value = '';
                      }
                    }}
                    className="btn btn-primary"
                  >
                    Ajouter
                  </button>
                </div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block' }}>
                  Ajouter un UUID (collez l'UUID d'un autre utilisateur)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* UUID et Synchronisation manuelle en deux colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* UUID utilisateur actuel */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Votre UUID (à partager avec d'autres utilisateurs)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                {loadingUUID ? (
                  <div style={{
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: 'var(--background)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    Chargement...
                  </div>
                ) : currentUUID ? (
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: 'var(--background)',
                    borderRadius: '6px',
                    wordBreak: 'break-all',
                    color: 'var(--text)',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {currentUUID}
                  </div>
                ) : (
                  <div style={{
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: 'var(--background)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    UUID non disponible
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {!currentUUID && !loadingUUID && (
                  <button
                    type="button"
                    onClick={async () => {
                      await loadCurrentUUID();
                    }}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} />
                    Générer
                  </button>
                )}
                {currentUUID && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await loadCurrentUUID();
                      }}
                      className="btn btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      title="Actualiser l'UUID"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyUUID}
                      className="btn btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Copy size={14} />
                      Copier
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bouton de synchronisation manuelle */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '20px 24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px 0' }}>
                  Synchronisation manuelle
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {lastSync ? `Dernière sync : ${new Date(lastSync).toLocaleString('fr-FR')}` : 'Jamais synchronisé'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || !config.enabled}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
              >
                {syncing ? (
                  <>
                    <div className="loading" style={{ width: '16px', height: '16px' }} />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Synchroniser maintenant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
