import { CheckCircle, Clock, Download, FolderOpen, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirm } from '../../../hooks/useConfirm';
import { useToast } from '../../../hooks/useToast';

interface DatabaseSettingsProps {
  baseDirectory: string;
  exporting: boolean;
  importing: boolean;
  showSuccess: boolean;
  showExportSuccess: boolean;
  showImportSuccess: boolean;
  onChangeBaseDirectory: () => void;
  onExport: () => void;
  onImport: () => void;
}

export default function DatabaseSettings({
  baseDirectory,
  exporting,
  importing,
  showSuccess,
  showExportSuccess,
  showImportSuccess,
  onChangeBaseDirectory,
  onExport,
  onImport,
}: DatabaseSettingsProps) {
  const { confirm } = useConfirm();
  const { showToast, ToastContainer } = useToast();
  
  // États pour le backup automatique
  const [backupConfig, setBackupConfig] = useState({
    enabled: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'manual',
    keepCount: 7,
    lastBackup: null as string | null
  });
  const [backups, setBackups] = useState<Array<{ name: string; path: string; size: number; date: Date; timestamp: number }>>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Charger la configuration au montage
  useEffect(() => {
    loadBackupConfig();
    loadBackupsList();
  }, []);

  const loadBackupConfig = async () => {
    try {
      const config = await window.electronAPI.getBackupConfig();
      setBackupConfig(config);
    } catch (error) {
      console.error('Erreur chargement config backup:', error);
    }
  };

  const loadBackupsList = async () => {
    try {
      setLoadingBackups(true);
      const result = await window.electronAPI.listBackups();
      if (result.success) {
        setBackups(result.backups);
      }
    } catch (error) {
      console.error('Erreur chargement liste backups:', error);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleSaveBackupConfig = async () => {
    try {
      setSavingConfig(true);
      const result = await window.electronAPI.saveBackupConfig(backupConfig);
      if (result.success) {
        setBackupMessage({ type: 'success', text: 'Configuration sauvegardée !' });
        setTimeout(() => setBackupMessage(null), 3000);
      }
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: error.message || 'Erreur lors de la sauvegarde' });
      setTimeout(() => setBackupMessage(null), 5000);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const result = await window.electronAPI.createBackup();
      if (result.success) {
        setBackupMessage({ type: 'success', text: `Backup créé : ${result.fileName}` });
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

    if (!confirmed) return;

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
          message: result.error || 'Une erreur est survenue',
          type: 'error',
          duration: 5000
        });
      }
    } catch (error: any) {
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

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.deleteBackup(backupPath);
      if (result.success) {
        setBackupMessage({ type: 'success', text: 'Backup supprimé' });
        setTimeout(() => setBackupMessage(null), 3000);
        await loadBackupsList();
      }
    } catch (error: any) {
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
      <ToastContainer />
      <div style={{ marginBottom: '30px' }}>
        <div className="settings-section">
        <div className="settings-header">
          <h2 className="settings-title">
            💾 Emplacement de la base
          </h2>
        </div>
        <div className="settings-content">
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

        <button onClick={onChangeBaseDirectory} className="btn btn-primary">
          <FolderOpen size={18} />
          Changer l'emplacement
        </button>

        {showSuccess && (
          <div style={{
            marginTop: '16px',
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

        <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          padding: '12px',
          background: 'var(--surface)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--primary)'
        }}>
          💡 Tous les utilisateurs partagent cette base de données. Idéal pour une utilisation cloud (Proton Drive, OneDrive, etc.).
        </p>

        {/* Export/Import intégré */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Export / Import
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={onExport}
              className="btn btn-primary"
              disabled={exporting}
            >
              <Download size={18} />
              {exporting ? 'Export en cours...' : 'Exporter'}
            </button>

            <button
              onClick={onImport}
              className="btn btn-outline"
              disabled={importing}
            >
              <Upload size={18} />
              {importing ? 'Import en cours...' : 'Importer'}
            </button>
          </div>

          {showExportSuccess && (
            <div style={{
              marginTop: '16px',
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
              marginTop: '16px',
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
        </div>

        {/* Backup automatique */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} />
            Backup automatique
          </h3>

          {backupMessage && (
            <div style={{
              marginBottom: '16px',
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
          <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={backupConfig.enabled}
                onChange={(e) => setBackupConfig({ ...backupConfig, enabled: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Activer le backup automatique</span>
            </label>

            {backupConfig.enabled && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Fréquence
                    </label>
                    <select
                      value={backupConfig.frequency}
                      onChange={(e) => setBackupConfig({ ...backupConfig, frequency: e.target.value as 'daily' | 'weekly' | 'manual' })}
                      className="select"
                      style={{ width: '100%' }}
                    >
                      <option value="daily">Quotidien (2h du matin)</option>
                      <option value="weekly">Hebdomadaire (Dimanche 2h)</option>
                      <option value="manual">Manuel uniquement</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Backups à conserver
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={backupConfig.keepCount}
                      onChange={(e) => setBackupConfig({ ...backupConfig, keepCount: parseInt(e.target.value) || 7 })}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveBackupConfig}
                  className="btn btn-primary"
                  disabled={savingConfig}
                  style={{ width: 'fit-content' }}
                >
                  <Save size={18} />
                  {savingConfig ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                </button>
              </>
            )}
          </div>

          {/* Backup manuel */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Créer un backup maintenant</h4>
                {backupConfig.lastBackup && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Dernier backup : {formatDate(new Date(backupConfig.lastBackup))}
                  </p>
                )}
              </div>
              <button
                onClick={handleCreateBackup}
                className="btn btn-primary"
                disabled={creatingBackup}
              >
                <RefreshCw size={18} />
                {creatingBackup ? 'Création...' : 'Créer un backup'}
              </button>
            </div>
          </div>

          {/* Liste des backups */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💾 Backups disponibles
              {loadingBackups && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Chargement...</span>}
              {!loadingBackups && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({backups.length})</span>}
            </h4>

            {backups.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                Aucun backup disponible. Créez-en un pour commencer.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {backups.map((backup) => (
                  <div
                    key={backup.timestamp}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                        {backup.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                        <span>📅 {formatDate(backup.date)}</span>
                        <span>💾 {formatBytes(backup.size)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleRestoreBackup(backup.path)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        title="Restaurer ce backup"
                      >
                        <RefreshCw size={16} />
                        Restaurer
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.path, backup.name)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '13px', color: '#ef4444', borderColor: '#ef4444' }}
                        title="Supprimer ce backup"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p style={{
            marginTop: '16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            padding: '12px',
            background: 'var(--surface)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--primary)'
          }}>
            💡 Les backups sont stockés dans : AppData/Roaming/Le Nexus/backups/
          </p>
        </div>
        </div>
      </div>
      </div>
    </>
  );
}
