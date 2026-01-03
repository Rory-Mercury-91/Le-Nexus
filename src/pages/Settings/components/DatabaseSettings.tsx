import { CheckCircle, ChevronDown, Database, Download, FolderOpen, Info, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirm } from '../../../hooks/common/useConfirm';

interface DatabaseSettingsProps {
  baseDirectory: string;
  exporting: boolean;
  importing: boolean;
  showSuccess: boolean;
  showExportSuccess: boolean;
  showImportSuccess: boolean;
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  onChangeBaseDirectory: () => void;
  onExport: () => void;
  onImport: () => void;
  sectionStates: Record<string, boolean>;
  onSectionStateChange: (sectionId: string, isOpen: boolean) => void;
}

type BackupFrequency = 'daily' | 'weekly';

interface BackupConfigState {
  enabled: boolean; // Toujours true, conservé pour compatibilité avec le backend
  frequency: BackupFrequency;
  day: number;
  hour: string;
  keepCount: number; // Toujours 10, conservé pour compatibilité avec le backend
  lastBackup: string | null;
  backupOnStartup: boolean;
  backupOnShutdown: boolean;
}

interface BackupEntry {
  name: string;
  path: string;
  size: number;
  date: Date;
  timestamp: number;
}

export default function DatabaseSettings({
  baseDirectory,
  exporting,
  importing,
  showSuccess,
  showExportSuccess,
  showImportSuccess,
  showToast,
  onChangeBaseDirectory,
  onExport,
  onImport,
  sectionStates,
  onSectionStateChange,
}: DatabaseSettingsProps) {
  const { confirm, ConfirmDialog } = useConfirm();

  // États pour le backup automatique
  const [backupConfig, setBackupConfig] = useState<BackupConfigState>({
    enabled: true, // Toujours activé
    frequency: 'weekly',
    day: 0,
    hour: '02:00',
    keepCount: 10, // Valeur fixe non configurable
    lastBackup: null,
    backupOnStartup: true,
    backupOnShutdown: true
  });
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const showBackupSection = sectionStates['database-backup'] ?? true;

  // Charger la configuration au montage
  useEffect(() => {
    loadBackupConfig();
    loadBackupsList();
    // Attendre un peu avant de considérer le chargement comme terminé
    setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
  }, []);

  // Sauvegarder automatiquement quand la config change (après interaction utilisateur)
  useEffect(() => {
    if (isInitialLoad || !hasUserInteracted) return;

    const timeoutId = setTimeout(() => {
      handleSaveBackupConfig();
    }, 1000); // Debounce de 1 seconde

    return () => clearTimeout(timeoutId);
  }, [backupConfig, isInitialLoad, hasUserInteracted]);

  const loadBackupConfig = async () => {
    try {
      const config = await window.electronAPI.getBackupConfig();
      setBackupConfig(prev => {
        const rawFrequency = (config as any).frequency as string | undefined;
        // Migration : 'manual' devient 'weekly'
        const normalizedFrequency: BackupFrequency =
          rawFrequency === 'weekly' || rawFrequency === 'daily'
            ? rawFrequency
            : rawFrequency === 'manual'
              ? 'weekly'
              : prev.frequency;

        return {
          ...prev,
          enabled: true, // Toujours activé
          frequency: normalizedFrequency,
          day: typeof (config as any).day === 'number' ? (config as any).day : prev.day,
          hour: typeof (config as any).hour === 'string' ? (config as any).hour : prev.hour,
          keepCount: 10, // Valeur fixe
          lastBackup: typeof (config as any).lastBackup === 'string' ? (config as any).lastBackup : prev.lastBackup,
          backupOnStartup: true, // Toujours activé
          backupOnShutdown: true // Toujours activé
        };
      });
    } catch (error) {
      console.error('Erreur chargement config backup:', error);
    }
  };

  const loadBackupsList = async () => {
    try {
      setLoadingBackups(true);
      const result = await window.electronAPI.listBackups();
      if (result.success && Array.isArray(result.backups)) {
        const mapped: BackupEntry[] = result.backups.map((backup) => {
          const rawDate = backup.date ?? backup.timestamp ?? Date.now();
          const dateObj = new Date(rawDate);
          const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
          return {
            name: backup.name,
            path: backup.path,
            size: backup.size,
            date: safeDate,
            timestamp: typeof backup.timestamp === 'number' ? backup.timestamp : safeDate.getTime()
          };
        });
        setBackups(mapped);
        if (mapped.length > 0) {
          setBackupConfig(prev => ({
            ...prev,
            lastBackup: mapped[0].date.toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('Erreur chargement liste backups:', error);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleSaveBackupConfig = async (silent = false) => {
    try {
      // S'assurer que enabled est toujours true, keepCount toujours 10, et backupOnStartup/backupOnShutdown toujours true
      const configToSave = {
        ...backupConfig,
        enabled: true,
        keepCount: 10,
        backupOnStartup: true,
        backupOnShutdown: true
      };
      const result = await window.electronAPI.saveBackupConfig(configToSave);
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

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const result = await window.electronAPI.createBackup();
      if (result.success) {
        const fileLabel = result.fileName ? `Backup créé : ${result.fileName}` : 'Backup créé avec succès';
        setBackupMessage({ type: 'success', text: fileLabel });
        setTimeout(() => setBackupMessage(null), 5000);
        await loadBackupConfig(); // Recharger pour avoir la date du dernier backup
        await loadBackupsList(); // Recharger la liste
      } else {
        setBackupMessage({ type: 'error', text: result.error || 'Erreur lors du backup' });
        setTimeout(() => setBackupMessage(null), 5000);
      }
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: error.message || 'Erreur lors du backup' });
      setTimeout(() => setBackupMessage(null), 5000);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupPath: string) => {

    const confirmed = await confirm({
      title: 'Restaurer ce backup ?',
      message: '⚠️ Cette action va remplacer votre base de données actuelle. L\'application redémarrera automatiquement après la restauration.',
      confirmText: 'Restaurer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) {
      return;
    }

    try {
      const result = await window.electronAPI.restoreBackup(backupPath);

      if (result.success) {
        showToast({
          title: 'Backup restauré !',
          message: 'L\'application va redémarrer...',
          type: 'success',
          duration: 2000
        });
        // Redémarrer l'app après 2 secondes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast({
          title: 'Erreur de restauration',
          message: result.error || 'Une erreur est survenue. Vérifiez la console pour plus de détails.',
          type: 'error',
          duration: 7000
        });
        console.error('❌ Erreur de restauration:', result);
      }
    } catch (error: any) {
      console.error('❌ Exception lors de la restauration:', error);
      showToast({
        title: 'Erreur de restauration',
        message: error.message || 'Une erreur est survenue',
        type: 'error',
        duration: 5000
      });
    }
  };

  const handleDeleteBackup = async (backupPath: string, backupName: string) => {

    const confirmed = await confirm({
      title: 'Supprimer ce backup ?',
      message: `Voulez-vous vraiment supprimer "${backupName}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteBackup(backupPath);

      if (result.success) {
        setBackupMessage({ type: 'success', text: 'Backup supprimé' });
        setTimeout(() => setBackupMessage(null), 3000);
        await loadBackupsList();
      } else {
        setBackupMessage({ type: 'error', text: result.error || 'Erreur lors de la suppression' });
        setTimeout(() => setBackupMessage(null), 5000);
        console.error('❌ Erreur suppression backup:', result);
      }
    } catch (error: any) {
      console.error('❌ Exception lors de la suppression:', error);
      setBackupMessage({ type: 'error', text: error.message || 'Erreur lors de la suppression' });
      setTimeout(() => setBackupMessage(null), 5000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <ConfirmDialog />
      <div>
        {/* Feedback visuel du chemin */}
        <div style={{
          background: 'var(--surface)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontFamily: 'monospace',
          fontSize: '12px',
          wordBreak: 'break-all'
        }}>
          {baseDirectory}
        </div>

        {/* Boutons sur la même ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '12px', marginBottom: '16px', width: 'fit-content' }}>
          <button onClick={onChangeBaseDirectory} className="btn btn-primary">
            <FolderOpen size={18} />
            Changer l'emplacement
          </button>

          <button
            onClick={onExport}
            className="btn btn-primary"
            disabled={exporting}
          >
            <Download size={18} />
            {exporting ? 'Export...' : 'Exporter'}
          </button>

          <button
            onClick={onImport}
            className="btn btn-outline"
            disabled={importing}
          >
            <Upload size={18} />
            {importing ? 'Import...' : 'Importer'}
          </button>
        </div>

        {/* Messages de succès */}
        {showSuccess && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} />
            Emplacement modifié avec succès !
          </div>
        )}

        {showExportSuccess && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} />
            Base de données exportée avec succès !
          </div>
        )}

        {showImportSuccess && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} />
            Import réussi ! Rechargement...
          </div>
        )}

        {/* Backup */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: showBackupSection ? '16px' : '0'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                flex: 1
              }}
              onClick={() => {
                const newState = !showBackupSection;
                onSectionStateChange('database-backup', newState);
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Database size={18} />
                Backup
                {!loadingBackups && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({backups.length})</span>}
                {loadingBackups && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Chargement...</span>}
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onMouseEnter={() => setIsTooltipVisible(true)}
                    onMouseLeave={() => setIsTooltipVisible(false)}
                    onFocus={() => setIsTooltipVisible(true)}
                    onBlur={() => setIsTooltipVisible(false)}
                    aria-label="Informations sur les backups"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <Info size={16} />
                  </button>
                  {isTooltipVisible && (
                    <div
                      role="tooltip"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--surface-light)',
                        color: 'var(--text)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border)',
                        minWidth: '280px',
                        zIndex: 20,
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Rétention :</strong> 10 backups sont conservés automatiquement
                        </div>
                        <div>
                          <strong>Stockage :</strong> AppData/Roaming/Nexus/backups/
                        </div>
                      </div>
                    </div>
                  )}
                </span>
              </h3>
              <ChevronDown
                size={20}
                style={{
                  transform: showBackupSection ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </div>
            <button
              onClick={handleCreateBackup}
              className="btn btn-primary"
              disabled={creatingBackup}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={18} />
              {creatingBackup ? 'Création...' : 'Créer un backup'}
            </button>
          </div>

          {showBackupSection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {backupMessage && (
                <div style={{
                  padding: '12px',
                  background: backupMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  color: backupMessage.type === 'success' ? 'var(--success)' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}>
                  {backupMessage.type === 'success' ? '✅' : '❌'} {backupMessage.text}
                </div>
              )}

              {/* Configuration */}
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Tout sur une ligne en 3 colonnes : Fréquence | Jour | Heure */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Fréquence
                    </label>
                    <select
                      value={backupConfig.frequency}
                      onChange={(e) => {
                        setHasUserInteracted(true);
                        setBackupConfig({ ...backupConfig, frequency: e.target.value as BackupFrequency });
                      }}
                      className="select"
                      style={{ width: '100%' }}
                    >
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdomadaire</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Jour
                    </label>
                    <select
                      value={backupConfig.day}
                      onChange={(e) => {
                        setHasUserInteracted(true);
                        setBackupConfig({ ...backupConfig, day: parseInt(e.target.value) });
                      }}
                      className="select"
                      style={{ width: '100%' }}
                      disabled={backupConfig.frequency !== 'weekly'}
                    >
                      <option value={0}>Dimanche</option>
                      <option value={1}>Lundi</option>
                      <option value={2}>Mardi</option>
                      <option value={3}>Mercredi</option>
                      <option value={4}>Jeudi</option>
                      <option value={5}>Vendredi</option>
                      <option value={6}>Samedi</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Heure
                    </label>
                    <input
                      type="time"
                      value={backupConfig.hour}
                      onChange={(e) => {
                        setHasUserInteracted(true);
                        setBackupConfig({ ...backupConfig, hour: e.target.value });
                      }}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Liste des backups */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Dernier backup :{' '}
                  <strong style={{ color: 'var(--text)' }}>
                    {backupConfig.lastBackup ? formatDate(new Date(backupConfig.lastBackup)) : 'Jamais'}
                  </strong>
                </span>
                <span>Backups conservés : {backups.length}</span>
              </div>

              {backups.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                  Aucun backup disponible. Créez-en un pour commencer.
                </p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gridTemplateRows: 'repeat(2, auto)',
                  gap: '8px'
                }}>
                  {backups.slice(0, 10).map((backup, index) => {
                    const isLatest = index === 0;
                    return (
                      <div
                        key={backup.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '12px',
                          background: 'var(--surface)',
                          borderRadius: '8px',
                          border: isLatest ? '2px solid var(--primary)' : '1px solid var(--border)',
                          position: 'relative'
                        }}
                      >
                        {isLatest && (
                          <span style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            fontSize: '12px',
                            color: 'var(--primary)',
                            fontWeight: 'bold'
                          }}>
                            ⭐
                          </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0, paddingRight: isLatest ? '20px' : '0' }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>
                            {backup.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>📅 {formatDate(backup.date)}</span>
                            <span>💾 {formatBytes(backup.size)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleRestoreBackup(backup.path);
                            }}
                            className="btn btn-outline"
                            style={{
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              minWidth: '32px',
                              height: '32px'
                            }}
                            title="Restaurer ce backup"
                            type="button"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleDeleteBackup(backup.path, backup.name);
                            }}
                            className="btn btn-outline"
                            style={{
                              padding: '6px',
                              color: '#ef4444',
                              borderColor: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              minWidth: '32px',
                              height: '32px'
                            }}
                            title="Supprimer ce backup"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
