import { Bell, BellOff, CheckCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';

export default function NotificationSettings() {
  const { showToast } = useToast();
  
  const [config, setConfig] = useState({
    enabled: false,
    checkAnimes: true,
    checkAvn: true,
    frequency: '12h' as '6h' | '12h' | 'daily' | 'manual',
    soundEnabled: true,
    checkOnStartup: false
  });
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.getNotificationConfig();
      setConfig(savedConfig);
    } catch (error) {
      console.error('Erreur chargement config notifications:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.saveNotificationConfig(config);
      
      if (result.success) {
        showToast({
          title: 'Configuration sauvegardée',
          description: 'Les notifications ont été configurées avec succès',
          type: 'success'
        });
      } else {
        showToast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la sauvegarde',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        description: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNow = async () => {
    try {
      setChecking(true);
      const result = await window.electronAPI.checkNotificationsNow();
      
      if (result.success) {
        showToast({
          title: 'Vérification terminée',
          description: `${result.count || 0} notification(s) envoyée(s)`,
          type: 'success'
        });
      } else {
        showToast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la vérification',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        description: error.message,
        type: 'error'
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} />
          🔔 Notifications
        </h2>
        
        {/* Activation générale */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
              {config.enabled ? <Bell size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> : <BellOff size={20} style={{ verticalAlign: 'middle', marginRight: '8px', opacity: 0.5 }} />}
              Activer les notifications desktop
            </span>
          </label>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '32px', marginTop: '8px' }}>
            Recevoir des notifications pour les nouveaux épisodes d'animes et les mises à jour AVN
          </p>
        </div>

        {config.enabled && (
          <>
            {/* Options de contenu */}
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              background: 'var(--surface)', 
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
                Contenu à surveiller
              </p>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.checkAnimes}
                  onChange={(e) => setConfig({ ...config, checkAnimes: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  🎬 Nouveaux épisodes d'animes
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.checkAvn}
                  onChange={(e) => setConfig({ ...config, checkAvn: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  🎮 Mises à jour AVN disponibles
                </span>
              </label>
            </div>

            {/* Fréquence de vérification */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                Fréquence de vérification
              </label>
              <select
                value={config.frequency}
                onChange={(e) => setConfig({ ...config, frequency: e.target.value as '6h' | '12h' | 'daily' | 'manual' })}
                className="select"
                style={{ width: '100%', maxWidth: '300px' }}
              >
                <option value="6h">⏰ Toutes les 6 heures</option>
                <option value="12h">🕐 Toutes les 12 heures</option>
                <option value="daily">☀️ Quotidienne (9h du matin)</option>
                <option value="manual">🔧 Manuel uniquement</option>
              </select>
              {config.frequency === 'manual' && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  💡 Vous devrez vérifier manuellement via le bouton ci-dessous
                </p>
              )}
            </div>

            {/* Options supplémentaires */}
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              background: 'var(--surface)', 
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
                Options supplémentaires
              </p>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.soundEnabled}
                  onChange={(e) => setConfig({ ...config, soundEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  🔔 Son de notification activé
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.checkOnStartup}
                  onChange={(e) => setConfig({ ...config, checkOnStartup: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  🚀 Vérifier au démarrage de l'application
                </span>
              </label>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSaveConfig}
                className="btn btn-primary"
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle size={18} />
                {loading ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
              </button>

              <button
                onClick={handleCheckNow}
                className="btn btn-outline"
                disabled={checking}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} className={checking ? 'spin' : ''} />
                {checking ? 'Vérification...' : 'Vérifier maintenant'}
              </button>
            </div>
          </>
        )}

        {!config.enabled && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center', 
            background: 'var(--surface)', 
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <BellOff size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Les notifications sont désactivées.<br />
              Activez-les pour être informé des nouveaux épisodes et mises à jour.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
