import { LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AVNSettings() {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lewdCornerConnected, setLewdCornerConnected] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Vérifier la session au chargement
  useEffect(() => {
    checkLewdCornerSession();
  }, []);

  const checkLewdCornerSession = async () => {
    try {
      const result = await window.electronAPI.lewdCornerCheckSession();
      setLewdCornerConnected(result.connected);
    } catch (error) {
      console.error('Erreur check session:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLewdCornerConnect = async () => {
    setConnecting(true);
    setMessage(null);
    
    try {
      const result = await window.electronAPI.lewdCornerConnect();
      if (result.success) {
        setLewdCornerConnected(true);
        setMessage({ 
          type: 'success', 
          text: 'Connexion réussie ! Les images LewdCorner s\'afficheront maintenant.' 
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur connexion LewdCorner:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la connexion' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setConnecting(false);
    }
  };

  const handleLewdCornerDisconnect = async () => {
    setMessage(null);
    
    try {
      const result = await window.electronAPI.lewdCornerDisconnect();
      if (result.success) {
        setLewdCornerConnected(false);
        setMessage({ 
          type: 'success', 
          text: 'Déconnexion réussie' 
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur déconnexion LewdCorner:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors de la déconnexion' 
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    setMessage(null);
    
    try {
      const result = await window.electronAPI.checkAvnUpdates();
      if (result.updated > 0) {
        setMessage({ 
          type: 'success', 
          text: `${result.updated} nouvelle(s) mise(s) à jour détectée(s) sur ${result.checked} jeux !` 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Aucune nouvelle mise à jour. ${result.checked} jeux vérifiés.` 
        });
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Erreur vérification MAJ AVN:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors de la vérification des mises à jour' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      {/* Section Connexion LewdCorner */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🌐 Connexion LewdCorner
        </h2>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Connectez-vous à LewdCorner pour afficher les images des jeux provenant de ce site.
        </p>

        {checkingSession ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Vérification de la session...
          </div>
        ) : (
          <div style={{
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            marginBottom: '16px'
          }}>
            {lewdCornerConnected ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid #10b981'
                }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
                      Connecté à LewdCorner
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Les images s'afficheront correctement
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLewdCornerDisconnect}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <LogOut size={18} />
                  Se déconnecter
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(251, 146, 60, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid #fb923c'
                }}>
                  <span style={{ fontSize: '24px' }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#fb923c', marginBottom: '4px' }}>
                      Non connecté
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Les images LewdCorner ne s'afficheront pas
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLewdCornerConnect}
                  disabled={connecting}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: connecting ? 0.6 : 1
                  }}
                >
                  <LogIn size={18} />
                  {connecting ? 'Connexion...' : 'Se connecter à LewdCorner'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message de feedback global */}
        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
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
            ℹ️ Pourquoi me connecter ?
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
            LewdCorner protège ses images et nécessite une session active pour les afficher. En vous connectant, l'application pourra récupérer les images pour vos jeux LewdCorner. Vos identifiants restent dans votre navigateur et ne sont jamais stockés par l'application.
          </div>
        </details>
      </div>

      {/* Section Vérification automatique */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎮 AVN - Vérification automatique
        </h2>
      
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

      {/* Message de feedback */}
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Bouton vérification manuelle */}
      <button
        onClick={handleCheckUpdates}
        disabled={checking}
        className="btn btn-secondary"
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
    </div>
    </>
  );
}
