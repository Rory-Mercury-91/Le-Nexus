import { LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';

export default function PlatformConnectionsSettings() {
  const { showToast } = useToast();
  const [platformMessage, setPlatformMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // États pour LewdCorner
  const [lewdCornerConnected, setLewdCornerConnected] = useState(false);
  const [checkingLewdCorner, setCheckingLewdCorner] = useState(true);
  const [connectingLewdCorner, setConnectingLewdCorner] = useState(false);
  
  // États pour F95Zone
  const [f95zoneConnected, setF95zoneConnected] = useState(false);
  const [checkingF95zone, setCheckingF95zone] = useState(true);
  const [connectingF95zone, setConnectingF95zone] = useState(false);

  // Vérifier les sessions au chargement
  useEffect(() => {
    checkSessions();
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
      } else {
        setPlatformMessage({ 
          type: 'error', 
          text: result.error || 'Erreur de connexion à LewdCorner' 
        });
      }
    } catch (error: any) {
      setPlatformMessage({ 
        type: 'error', 
        text: error.message || 'Erreur de connexion à LewdCorner' 
      });
    } finally {
      setConnectingLewdCorner(false);
    }
  };

  const handleLewdCornerDisconnect = async () => {
    try {
      await window.electronAPI.lewdCornerDisconnect();
      setLewdCornerConnected(false);
      setPlatformMessage({ 
        type: 'success', 
        text: 'Déconnexion de LewdCorner réussie' 
      });
      setTimeout(() => setPlatformMessage(null), 3000);
    } catch (error: any) {
      setPlatformMessage({ 
        type: 'error', 
        text: error.message || 'Erreur de déconnexion' 
      });
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
          text: 'Connexion à F95Zone réussie !' 
        });
        setTimeout(() => setPlatformMessage(null), 5000);
      } else {
        setPlatformMessage({ 
          type: 'error', 
          text: result.error || 'Erreur de connexion à F95Zone' 
        });
      }
    } catch (error: any) {
      setPlatformMessage({ 
        type: 'error', 
        text: error.message || 'Erreur de connexion à F95Zone' 
      });
    } finally {
      setConnectingF95zone(false);
    }
  };

  const handleF95ZoneDisconnect = async () => {
    try {
      await window.electronAPI.f95zoneDisconnect();
      setF95zoneConnected(false);
      setPlatformMessage({ 
        type: 'success', 
        text: 'Déconnexion de F95Zone réussie' 
      });
      setTimeout(() => setPlatformMessage(null), 3000);
    } catch (error: any) {
      setPlatformMessage({ 
        type: 'error', 
        text: error.message || 'Erreur de déconnexion' 
      });
    }
  };

  const renderPlatformCard = (
    platform: string,
    connected: boolean,
    checking: boolean,
    connecting: boolean,
    onConnect: () => void,
    onDisconnect: () => void,
    statusText: string
  ) => (
    <div style={{
      padding: '16px',
      background: 'var(--surface)',
      borderRadius: '8px',
      border: `1px solid ${connected ? '#10b981' : 'var(--border)'}`,
      marginBottom: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: '600', 
            marginBottom: '4px',
            color: 'var(--text)'
          }}>
            {platform}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: connected ? '#10b981' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {checking ? (
              'Vérification...'
            ) : (
              <>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: connected ? '#10b981' : '#94a3b8',
                  display: 'inline-block'
                }} />
                {connected ? 'Connecté' : 'Déconnecté'}
              </>
            )}
          </div>
        </div>

        {connected ? (
          <button
            onClick={onDisconnect}
            className="btn btn-outline"
            style={{
              fontSize: '13px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: '#ef4444',
              color: '#ef4444'
            }}
          >
            <LogOut size={14} />
            Déconnecter
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="btn btn-primary"
            style={{
              fontSize: '13px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: connecting ? 0.6 : 1
            }}
          >
            <LogIn size={14} />
            {connecting ? 'Connexion...' : 'Se connecter'}
          </button>
        )}
      </div>

      <div style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        padding: '8px',
        background: 'var(--background)',
        borderRadius: '6px'
      }}>
        {statusText}
      </div>
    </div>
  );

  return (
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
  );
}

