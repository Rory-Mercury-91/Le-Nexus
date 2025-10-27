import { Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';

export default function AVNSettings() {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [avnMessage, setAvnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // États pour la synchronisation des traductions
  const [tradConfig, setTradConfig] = useState({
    enabled: false,
    traducteurs: [] as string[],
    sheetUrl: '',
    syncFrequency: '6h' as '6h' | '12h' | 'daily' | 'manual',
    lastSync: null as string | null,
    gamesCount: 0
  });
  const [syncing, setSyncing] = useState(false);
  const [newTraducteur, setNewTraducteur] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Charger la config des traductions au chargement
  useEffect(() => {
    loadTradConfig();
  }, []);

  // Sauvegarder automatiquement quand la config change (après le chargement initial)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSaveTradConfig();
    }, 1000); // Debounce de 1 seconde

    return () => clearTimeout(timeoutId);
  }, [tradConfig.enabled, tradConfig.syncFrequency, tradConfig.traducteurs]);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setAvnMessage(null);
    
    try {
      const result = await window.electronAPI.checkAvnUpdates();
      if (result.updated > 0) {
        setAvnMessage({ 
          type: 'success', 
          text: `${result.updated} nouvelle(s) mise(s) à jour détectée(s) sur ${result.checked} jeux !` 
        });
      } else {
        setAvnMessage({ 
          type: 'success', 
          text: `Aucune nouvelle mise à jour. ${result.checked} jeux vérifiés.` 
        });
      }
      setTimeout(() => setAvnMessage(null), 5000);
    } catch (error) {
      console.error('Erreur vérification MAJ AVN:', error);
      setAvnMessage({ 
        type: 'error', 
        text: 'Erreur lors de la vérification des mises à jour' 
      });
      setTimeout(() => setAvnMessage(null), 5000);
    } finally {
      setChecking(false);
    }
  };

  // ========== FONCTIONS TRADUCTIONS ==========

  const loadTradConfig = async () => {
    try {
      const config = await window.electronAPI.getTraductionConfig();
      setTradConfig(config);
    } catch (error) {
      console.error('Erreur chargement config traductions:', error);
    }
  };

  const handleSaveTradConfig = async (silent = true) => {
    try {
      const result = await window.electronAPI.saveTraductionConfig(tradConfig);
      if (result.success) {
        if (!silent) {
          showToast({
            type: 'success',
            title: 'Configuration sauvegardée'
          });
        }
      } else {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: result.error || 'Erreur lors de la sauvegarde'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message
      });
    }
  };

  const handleSyncTraductions = async () => {
    if (tradConfig.traducteurs.length === 0) {
      showToast({
        title: 'Aucun traducteur',
        message: 'Veuillez ajouter au moins un traducteur à suivre',
        type: 'error'
      });
      return;
    }

    setSyncing(true);
    try {
      const result = await window.electronAPI.syncTraductionsNow();
      if (result.success) {
        const parts = [];
        if (result.matched) parts.push(`${result.matched} synchronisé(s)`);
        if (result.created) parts.push(`${result.created} créé(s)`);
        if (result.updated) parts.push(`${result.updated} mis à jour`);
        
        showToast({
          title: '✅ Synchronisation terminée',
          message: parts.length > 0 ? parts.join(', ') : 'Aucun changement',
          type: 'success'
        });
        // Recharger la config pour avoir les nouvelles données
        await loadTradConfig();
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || result.message || 'Erreur lors de la synchronisation',
          type: 'error'
        });
      }
    } catch (error: any) {
      showToast({
        title: 'Erreur',
        message: error.message,
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTraducteur = () => {
    if (!newTraducteur.trim()) {
      showToast({
        title: 'Champ vide',
        message: 'Veuillez entrer un nom de traducteur',
        type: 'error'
      });
      return;
    }

    if (tradConfig.traducteurs.includes(newTraducteur.trim())) {
      showToast({
        title: 'Déjà ajouté',
        message: 'Ce traducteur est déjà dans la liste',
        type: 'error'
      });
      return;
    }

    setTradConfig({
      ...tradConfig,
      traducteurs: [...tradConfig.traducteurs, newTraducteur.trim()]
    });
    setNewTraducteur('');
  };

  const handleRemoveTraducteur = (trad: string) => {
    setTradConfig({
      ...tradConfig,
      traducteurs: tradConfig.traducteurs.filter(t => t !== trad)
    });
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Jamais';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎮 AVN - Gestion automatique
        </h2>
      
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
        Vérification des mises à jour
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
        Vérifiez automatiquement les mises à jour de vos jeux AVN par scraping direct de F95Zone.
      </p>

      <div style={{
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        marginBottom: '16px'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          marginBottom: '12px'
        }}>
          <input
            type="checkbox"
            defaultChecked={false}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
            Vérification automatique des mises à jour
          </span>
        </label>

        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '6px',
            color: 'var(--text-secondary)'
          }}>
            Fréquence de vérification
          </label>
          <select
            className="select"
            defaultValue={6}
            style={{ width: '100%' }}
          >
            <option value={1}>Toutes les heures</option>
            <option value={3}>Toutes les 3 heures</option>
            <option value={6}>Toutes les 6 heures</option>
            <option value={12}>Toutes les 12 heures</option>
            <option value={24}>Une fois par jour</option>
          </select>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            defaultChecked={true}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>
            Vérifier au démarrage de l'application
          </span>
        </label>

        <p style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          marginTop: '12px',
          lineHeight: '1.5'
        }}>
          💡 La vérification automatique détecte les nouvelles versions disponibles et affiche un badge sur vos jeux.
        </p>
      </div>

      {/* Message de feedback AVN */}
      {avnMessage && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          background: avnMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${avnMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: avnMessage.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {avnMessage.type === 'success' ? '✅' : '❌'} {avnMessage.text}
        </div>
      )}

      {/* Bouton vérification manuelle */}
      <button
        onClick={handleCheckUpdates}
        disabled={checking}
        className="btn btn-primary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          opacity: checking ? 0.6 : 1
        }}
      >
        <RefreshCw size={18} className={checking ? 'spin' : ''} />
        {checking ? 'Vérification en cours...' : 'Vérifier maintenant'}
      </button>

      <details style={{ marginTop: '16px' }}>
        <summary style={{
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          padding: '8px',
          borderRadius: '6px',
          transition: 'background 0.2s'
        }}>
          ℹ️ Comment ça fonctionne ?
        </summary>
        <div style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          padding: '12px',
          background: 'var(--surface)',
          borderRadius: '8px',
          marginTop: '8px',
          lineHeight: '1.6'
        }}>
          Le système scrape directement les pages F95Zone de vos jeux pour détecter les nouvelles versions. Si une mise à jour est disponible, un badge violet "🔄 MAJ" s'affiche sur la carte du jeu et toutes les données (version, statut, tags, image) sont automatiquement actualisées.
        </div>
      </details>

        {/* Séparateur visuel */}
        <div style={{
          height: '1px',
          background: 'var(--border)',
          margin: '32px 0'
        }} />
        
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
          🇫🇷 Synchronisation des traductions françaises
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Synchronisez automatiquement les traductions françaises de vos jeux AVN depuis la base collaborative Google Sheets.
        </p>

        {/* Configuration */}
        <div style={{
          padding: '16px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          marginBottom: '16px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}>
            <input
              type="checkbox"
              checked={tradConfig.enabled}
              onChange={(e) => setTradConfig({ ...tradConfig, enabled: e.target.checked })}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
              Activer la synchronisation automatique
            </span>
          </label>

          {/* Fréquence */}
          {tradConfig.enabled && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '6px',
                color: 'var(--text-secondary)'
              }}>
                Fréquence de synchronisation
              </label>
              <select
                className="select"
                value={tradConfig.syncFrequency}
                onChange={(e) => setTradConfig({ ...tradConfig, syncFrequency: e.target.value as any })}
                style={{ width: '100%' }}
              >
                <option value="6h">Toutes les 6 heures</option>
                <option value="12h">Toutes les 12 heures</option>
                <option value="daily">Une fois par jour</option>
                <option value="manual">Manuel uniquement</option>
              </select>
            </div>
          )}

          {/* Traducteurs à suivre */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text-secondary)'
            }}>
              Traducteurs à suivre
            </label>

            {/* Liste des traducteurs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {tradConfig.traducteurs.map((trad, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  {trad}
                  <button
                    onClick={() => handleRemoveTraducteur(trad)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {tradConfig.traducteurs.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Aucun traducteur ajouté
                </p>
              )}
            </div>

            {/* Ajouter un traducteur */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ex: Rory-Mercury91"
                value={newTraducteur}
                onChange={(e) => setNewTraducteur(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTraducteur()}
                className="input"
                style={{ flex: 1, fontSize: '13px' }}
              />
              <button
                onClick={handleAddTraducteur}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>
          </div>

          <p style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '12px',
            lineHeight: '1.5'
          }}>
            💡 Seules les traductions des traducteurs sélectionnés seront synchronisées (évite d'importer les 1924 jeux du sheet).
          </p>
        </div>

        {/* Statistiques */}
        {tradConfig.traducteurs.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                {tradConfig.traducteurs.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Traducteur(s)
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                {tradConfig.gamesCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Jeu(x) synchronisé(s)
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                {formatLastSync(tradConfig.lastSync)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Dernière sync
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSaveTradConfig(false)}
            className="btn btn-primary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            💾 Sauvegarder la configuration
          </button>

          <button
            onClick={handleSyncTraductions}
            disabled={syncing || tradConfig.traducteurs.length === 0}
            className="btn btn-primary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (syncing || tradConfig.traducteurs.length === 0) ? 0.6 : 1
            }}
          >
            <RefreshCw size={18} className={syncing ? 'spin' : ''} />
            {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </button>
        </div>

        <details style={{ marginTop: '16px' }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            padding: '8px',
            borderRadius: '6px',
            transition: 'background 0.2s'
          }}>
            ℹ️ Comment ça fonctionne ?
          </summary>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            padding: '12px',
            background: 'var(--surface)',
            borderRadius: '8px',
            marginTop: '8px',
            lineHeight: '1.6'
          }}>
            L'application récupère automatiquement les traductions françaises depuis le Google Sheet collaboratif et les associe à vos jeux AVN par leur ID F95Zone. Seules les traductions de VOS pseudos traducteurs sont importées, évitant ainsi de charger les 1924 jeux du tableur. Un badge 🇫🇷 s'affiche sur les jeux traduits avec un lien direct de téléchargement.
          </div>
        </details>
      </div>
    </div>
  );
}
