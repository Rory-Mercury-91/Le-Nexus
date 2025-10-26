import { LogIn, LogOut, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';

export default function AVNSettings() {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [platformMessage, setPlatformMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avnMessage, setAvnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // États pour LewdCorner
  const [lewdCornerConnected, setLewdCornerConnected] = useState(false);
  const [checkingLewdCorner, setCheckingLewdCorner] = useState(true);
  const [connectingLewdCorner, setConnectingLewdCorner] = useState(false);
  
  // États pour F95Zone
  const [f95zoneConnected, setF95zoneConnected] = useState(false);
  const [checkingF95zone, setCheckingF95zone] = useState(true);
  const [connectingF95zone, setConnectingF95zone] = useState(false);
  
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

  // Vérifier les sessions au chargement
  useEffect(() => {
    checkSessions();
    loadTradConfig();
  }, []);

  const checkSessions = async () => {
    await Promise.all([
      checkLewdCornerSession(),
      checkF95ZoneSession()
    ]);
  };

  const checkLewdCornerSession = async () => {
    try {
      const result = await window.electronAPI.lewdCornerCheckSession();
      setLewdCornerConnected(result.connected);
    } catch (error) {
      console.error('Erreur check session LewdCorner:', error);
    } finally {
      setCheckingLewdCorner(false);
    }
  };

  const checkF95ZoneSession = async () => {
    try {
      const result = await window.electronAPI.f95zoneCheckSession();
      setF95zoneConnected(result.connected);
    } catch (error) {
      console.error('Erreur check session F95Zone:', error);
    } finally {
      setCheckingF95zone(false);
    }
  };

  const handleLewdCornerConnect = async () => {
    setConnectingLewdCorner(true);
    setPlatformMessage(null);
    
    try {
      const result = await window.electronAPI.lewdCornerConnect();
      if (result.success) {
        setLewdCornerConnected(true);
        setPlatformMessage({ 
          type: 'success', 
          text: 'Connexion à LewdCorner réussie ! Les images s\'afficheront maintenant.' 
        });
        setTimeout(() => setPlatformMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur connexion LewdCorner:', error);
      setPlatformMessage({ 
        type: 'error', 
        text: `LewdCorner: ${error.message || 'Erreur lors de la connexion'}` 
      });
      setTimeout(() => setPlatformMessage(null), 5000);
    } finally {
      setConnectingLewdCorner(false);
    }
  };

  const handleLewdCornerDisconnect = async () => {
    setPlatformMessage(null);
    
    try {
      const result = await window.electronAPI.lewdCornerDisconnect();
      if (result.success) {
        setLewdCornerConnected(false);
        setPlatformMessage({ 
          type: 'success', 
          text: 'Déconnexion de LewdCorner réussie' 
        });
        setTimeout(() => setPlatformMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur déconnexion LewdCorner:', error);
      setPlatformMessage({ 
        type: 'error', 
        text: 'Erreur lors de la déconnexion de LewdCorner' 
      });
      setTimeout(() => setPlatformMessage(null), 5000);
    }
  };

  const handleF95ZoneConnect = async () => {
    setConnectingF95zone(true);
    setPlatformMessage(null);
    
    try {
      const result = await window.electronAPI.f95zoneConnect();
      if (result.success) {
        setF95zoneConnected(true);
        setPlatformMessage({ 
          type: 'success', 
          text: 'Connexion à F95Zone réussie ! Vous pouvez maintenant accéder aux données membres.' 
        });
        setTimeout(() => setPlatformMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur connexion F95Zone:', error);
      setPlatformMessage({ 
        type: 'error', 
        text: `F95Zone: ${error.message || 'Erreur lors de la connexion'}` 
      });
      setTimeout(() => setPlatformMessage(null), 5000);
    } finally {
      setConnectingF95zone(false);
    }
  };

  const handleF95ZoneDisconnect = async () => {
    setPlatformMessage(null);
    
    try {
      const result = await window.electronAPI.f95zoneDisconnect();
      if (result.success) {
        setF95zoneConnected(false);
        setPlatformMessage({ 
          type: 'success', 
          text: 'Déconnexion de F95Zone réussie' 
        });
        setTimeout(() => setPlatformMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur déconnexion F95Zone:', error);
      setPlatformMessage({ 
        type: 'error', 
        text: 'Erreur lors de la déconnexion de F95Zone' 
      });
      setTimeout(() => setPlatformMessage(null), 5000);
    }
  };

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

  const handleSaveTradConfig = async () => {
    try {
      const result = await window.electronAPI.saveTraductionConfig(tradConfig);
      if (result.success) {
        showToast({
          title: 'Configuration sauvegardée',
          description: 'La configuration des traductions a été mise à jour',
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
    }
  };

  const handleSyncTraductions = async () => {
    if (tradConfig.traducteurs.length === 0) {
      showToast({
        title: 'Aucun traducteur',
        description: 'Veuillez ajouter au moins un traducteur à suivre',
        type: 'error'
      });
      return;
    }

    setSyncing(true);
    try {
      const result = await window.electronAPI.syncTraductionsNow();
      if (result.success) {
        showToast({
          title: 'Synchronisation terminée',
          description: `${result.matched || 0} jeu(x) synchronisé(s), ${result.updated || 0} mis à jour`,
          type: 'success'
        });
        // Recharger la config pour avoir les nouvelles données
        await loadTradConfig();
      } else {
        showToast({
          title: 'Erreur',
          description: result.error || result.message || 'Erreur lors de la synchronisation',
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
      setSyncing(false);
    }
  };

  const handleAddTraducteur = () => {
    if (!newTraducteur.trim()) {
      showToast({
        title: 'Champ vide',
        description: 'Veuillez entrer un nom de traducteur',
        type: 'error'
      });
      return;
    }

    if (tradConfig.traducteurs.includes(newTraducteur.trim())) {
      showToast({
        title: 'Déjà ajouté',
        description: 'Ce traducteur est déjà dans la liste',
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

  const renderPlatformCard = (
    platform: 'F95Zone' | 'LewdCorner',
    connected: boolean,
    checking: boolean,
    connecting: boolean,
    onConnect: () => void,
    onDisconnect: () => void,
    description: string
  ) => (
    <div style={{
      padding: '16px',
      background: 'var(--surface)',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      marginBottom: '16px'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {platform === 'F95Zone' ? '🎮' : '🌐'} {platform}
      </h3>

      {checking ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Vérification...
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            padding: '12px',
            background: connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 146, 60, 0.1)',
            borderRadius: '8px',
            border: `1px solid ${connected ? '#10b981' : '#fb923c'}`
          }}>
            <span style={{ fontSize: '20px' }}>{connected ? '✅' : '⚠️'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: connected ? '#10b981' : '#fb923c', marginBottom: '2px' }}>
                {connected ? 'Connecté' : 'Non connecté'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {description}
              </p>
            </div>
          </div>

          <button
            onClick={connected ? onDisconnect : onConnect}
            disabled={connecting}
            className={connected ? 'btn btn-outline' : 'btn btn-primary'}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: connecting ? 0.6 : 1,
              fontSize: '13px',
              padding: '10px'
            }}
          >
            {connected ? <LogOut size={16} /> : <LogIn size={16} />}
            {connecting ? 'Connexion...' : (connected ? 'Se déconnecter' : 'Se connecter')}
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Container Grid pour les 2 colonnes */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px'
      }}>
        {/* Colonne gauche : Connexions Plateformes */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔐 Connexions aux plateformes
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
            Connectez-vous pour accéder au contenu réservé aux membres (images, liens de téléchargement, etc.)
          </p>

          {/* Message de feedback général */}
          {platformMessage && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: platformMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${platformMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
              color: platformMessage.type === 'success' ? '#10b981' : '#ef4444',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {platformMessage.type === 'success' ? '✅' : '❌'} {platformMessage.text}
            </div>
          )}

          {/* F95Zone */}
          {renderPlatformCard(
            'F95Zone',
            f95zoneConnected,
            checkingF95zone,
            connectingF95zone,
            handleF95ZoneConnect,
            handleF95ZoneDisconnect,
            f95zoneConnected ? 'Accès aux données membres' : 'Images et liens masqués'
          )}

          {/* LewdCorner */}
          {renderPlatformCard(
            'LewdCorner',
            lewdCornerConnected,
            checkingLewdCorner,
            connectingLewdCorner,
            handleLewdCornerConnect,
            handleLewdCornerDisconnect,
            lewdCornerConnected ? 'Images accessibles' : 'Images bloquées (403)'
          )}

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
              ℹ️ Sécurité et confidentialité
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
              Vos identifiants restent dans votre navigateur et ne sont <strong>jamais stockés</strong> par l'application. La connexion permet uniquement de récupérer les cookies de session pour accéder au contenu protégé.
            </div>
          </details>
        </div>

        {/* Section AVN - Vérification & Traductions */}
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
            onClick={handleSaveTradConfig}
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
        </div> {/* Fin card AVN */}
      </div> {/* Fin grid */}
    </>
  );
}
