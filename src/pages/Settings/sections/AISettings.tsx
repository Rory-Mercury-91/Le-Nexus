import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface AISettingsProps {
  groqApiKey: string;
  onGroqApiKeyChange: (key: string) => void;
}

export default function AISettings({ groqApiKey, onGroqApiKeyChange }: AISettingsProps) {
  const [showGroqApiKey, setShowGroqApiKey] = useState(false);

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
        🤖 Intelligence Artificielle
      </h2>

      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '8px',
          color: 'var(--text-secondary)'
        }}>
          Clé API Groq (optionnel)
        </label>
        
        <div style={{ position: 'relative' }}>
          <input
            type={showGroqApiKey ? "text" : "password"}
            value={groqApiKey}
            onChange={(e) => onGroqApiKeyChange(e.target.value)}
            placeholder="gsk_..."
            style={{
              width: '100%',
              padding: '12px 48px 12px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
          />
          <button
            type="button"
            onClick={() => setShowGroqApiKey(!showGroqApiKey)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {showGroqApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <p style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        padding: '12px',
        background: 'var(--surface)',
        borderRadius: '8px',
        borderLeft: '3px solid var(--primary)',
        marginBottom: '12px'
      }}>
        🌐 Permet la traduction automatique des synopsis d'anime lors de l'import XML
        <br />
        📊 Limite gratuite : 14 400 traductions/jour (30/min)
      </p>

      <a
        href="https://console.groq.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          fontSize: '13px',
          color: 'var(--primary)',
          textDecoration: 'none',
          padding: '8px 12px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '6px',
          fontWeight: '600',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
        }}
      >
        🔗 Obtenir une clé API gratuite
      </a>

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
          ℹ️ Comment obtenir une clé API ?
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
          <ol style={{ paddingLeft: '20px', margin: '0' }}>
            <li>Allez sur <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>console.groq.com</a></li>
            <li>Créez un compte gratuit (email + mot de passe)</li>
            <li>Vérifiez votre email si demandé</li>
            <li>Cliquez sur "API Keys" dans le menu</li>
            <li>Cliquez sur "Create API Key"</li>
            <li>Copiez votre clé (elle commence par <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px' }}>gsk_...</code>)</li>
            <li>Collez-la dans le champ ci-dessus</li>
          </ol>
          <p style={{ marginTop: '12px', fontWeight: '600', color: 'var(--warning)' }}>
            ⚠️ Gardez une copie de votre clé dans un endroit sûr. Elle n'est affichée qu'une seule fois !
          </p>
        </div>
      </details>

      <p style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginTop: '16px',
        fontStyle: 'italic',
        padding: '8px',
        background: 'var(--surface)',
        borderRadius: '6px'
      }}>
        💡 Cette clé est globale et partagée par tous les utilisateurs de l'application
      </p>
    </div>
  );
}
