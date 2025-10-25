import { RefreshCw } from 'lucide-react';

export default function AVNSettings() {
  const handleCheckUpdates = async () => {
    try {
      const result = await window.electronAPI.checkAvnUpdates();
      if (result.updated > 0) {
        alert(`✅ ${result.updated} mise(s) à jour détectée(s) sur ${result.checked} jeux !`);
      } else {
        alert(`✅ Aucune mise à jour. ${result.checked} jeux vérifiés.`);
      }
    } catch (error) {
      console.error('Erreur vérification MAJ AVN:', error);
      alert('❌ Erreur lors de la vérification des mises à jour');
    }
  };

  return (
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

      {/* Bouton vérification manuelle */}
      <button
        onClick={handleCheckUpdates}
        className="btn btn-secondary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <RefreshCw size={18} />
        Vérifier maintenant
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
  );
}
