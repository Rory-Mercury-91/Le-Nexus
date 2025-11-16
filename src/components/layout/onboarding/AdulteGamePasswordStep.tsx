import { Eye, EyeOff, Lock } from 'lucide-react';

interface AdulteGamePasswordStepProps {
  adulteGamePassword: string;
  adulteGamePasswordConfirm: string;
  showAdulteGamePassword: boolean;
  showAdulteGamePasswordConfirm: boolean;
  onAdulteGamePasswordChange: (password: string) => void;
  onAdulteGamePasswordConfirmChange: (password: string) => void;
  onShowAdulteGamePasswordToggle: () => void;
  onShowAdulteGamePasswordConfirmToggle: () => void;
}

export default function AdulteGamePasswordStep({
  adulteGamePassword,
  adulteGamePasswordConfirm,
  showAdulteGamePassword,
  showAdulteGamePasswordConfirm,
  onAdulteGamePasswordChange,
  onAdulteGamePasswordConfirmChange,
  onShowAdulteGamePasswordToggle,
  onShowAdulteGamePasswordConfirmToggle
}: AdulteGamePasswordStepProps) {
  return (
    <div>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(139, 92, 246, 0.15)',
        border: '3px solid var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <Lock size={40} style={{ color: 'var(--primary)' }} />
      </div>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '12px'
      }}>
        Protection des contenus adultes (optionnel)
      </h2>
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        Protégez l'accès aux contenus adultes (animes et mangas avec rating 18+, ainsi que la section Jeux adulte) avec un mot de passe maître valable pour tous les utilisateurs de cette machine. Les couvertures seront floutées et l'accès aux pages de détail nécessitera le mot de passe. Utile si votre bibliothèque est partagée. Vous pourrez le configurer plus tard dans les paramètres.
      </p>

      <div style={{ textAlign: 'left', marginBottom: '16px' }}>
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <input
            type={showAdulteGamePassword ? 'text' : 'password'}
            value={adulteGamePassword}
            onChange={(e) => onAdulteGamePasswordChange(e.target.value)}
            placeholder="Mot de passe (min. 4 caractères)"
            className="input"
            style={{ width: '100%', paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={onShowAdulteGamePasswordToggle}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {showAdulteGamePassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        
        <div style={{ position: 'relative' }}>
          <input
            type={showAdulteGamePasswordConfirm ? 'text' : 'password'}
            value={adulteGamePasswordConfirm}
            onChange={(e) => onAdulteGamePasswordConfirmChange(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="input"
            style={{ width: '100%', paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={onShowAdulteGamePasswordConfirmToggle}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {showAdulteGamePasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div style={{
        padding: '12px',
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '8px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        textAlign: 'left',
        lineHeight: '1.5'
      }}>
        💡 <strong>Conseil :</strong> Le mot de passe verrouille automatiquement l'accès aux contenus adultes après 30 minutes d'inactivité.
      </div>
    </div>
  );
}
