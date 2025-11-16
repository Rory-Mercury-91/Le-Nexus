import { Eye, EyeOff, HelpCircle, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { useAdulteGameLock } from '../../../hooks/useAdulteGameLock';

interface AdultContentPasswordSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

/**
 * Section de protection par mot de passe pour les contenus adultes (animes et mangas)
 */
export default function AdultContentPasswordSettings({ showToast }: AdultContentPasswordSettingsProps) {
  const { hasPassword, checkPassword } = useAdulteGameLock();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast({
        type: 'warning',
        title: 'Champs manquants',
        message: 'Veuillez remplir tous les champs'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Les mots de passe ne correspondent pas'
      });
      return;
    }

    if (newPassword.length < 4) {
      showToast({
        type: 'warning',
        title: 'Mot de passe trop court',
        message: 'Le mot de passe doit contenir au moins 4 caractères'
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // Définir le mot de passe maître
      const result = await window.electronAPI.setAdulteGamePassword(newPassword);

      if (result.success) {
        showToast({
          type: 'success',
          title: 'Mot de passe maître défini',
          message: 'La protection des contenus adultes est maintenant active pour tous les utilisateurs de cette machine'
        });
        setNewPassword('');
        setConfirmPassword('');
        await checkPassword();
      } else {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: result.error || 'Impossible de définir le mot de passe'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!currentPassword) {
      showToast({
        type: 'warning',
        title: 'Champ manquant',
        message: 'Veuillez saisir votre mot de passe actuel'
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // Supprimer le mot de passe maître
      const result = await window.electronAPI.removeAdulteGamePassword(currentPassword);

      if (result.success) {
        showToast({
          type: 'success',
          title: 'Protection désactivée',
          message: 'Les contenus adultes ne sont plus protégés sur cette machine'
        });
        setCurrentPassword('');
        await checkPassword();
      } else {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: result.error || 'Mot de passe incorrect'
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: '24px',
      padding: '24px',
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '700',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '20px', transform: 'translateY(1px)' }}>🔒</span>
        Protection des contenus adultes
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <button
            type="button"
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
            onFocus={() => setIsTooltipVisible(true)}
            onBlur={() => setIsTooltipVisible(false)}
            aria-label="Informations sur la protection des contenus adultes"
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
            <HelpCircle size={16} />
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
                minWidth: '260px',
                zIndex: 20,
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                Mot de passe maître unique.
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                Requis pour accéder aux détails 18+ (couvertures floutées par défaut).
                Déconnexion automatique après 30 min d'inactivité.
                <span style={{ display: 'block', marginTop: '6px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  Base partagée : mot de passe propre à chaque machine.
                </span>
              </div>
            </div>
          )}
        </span>
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          lineHeight: '1.5'
        }}
      >
        {hasPassword
          ? 'Protection active pour les contenus adultes sur cette machine.'
          : 'Configurez un mot de passe maître pour activer la protection des contenus adultes sur cette machine.'}
      </p>

      {!hasPassword ? (
        /* Définir un nouveau mot de passe */
        <div
          style={{
            padding: '16px',
            background: 'var(--surface-light)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (min. 4 caractères)"
                className="input"
                style={{
                  width: '100%',
                  paddingRight: '44px',
                  background: 'var(--background)',
                  border: '1px solid rgba(148, 163, 184, 0.45)',
                  color: 'var(--text)',
                  boxShadow: 'inset 0 2px 6px rgba(15, 23, 42, 0.12)'
                }}
                disabled={passwordLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
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
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="input"
                style={{
                  width: '100%',
                  paddingRight: '44px',
                  background: 'var(--background)',
                  border: '1px solid rgba(148, 163, 184, 0.45)',
                  color: 'var(--text)',
                  boxShadow: 'inset 0 2px 6px rgba(15, 23, 42, 0.12)'
                }}
                disabled={passwordLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
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
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={handleSetPassword}
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderRadius: '10px',
                minWidth: '220px'
              }}
            >
              <Lock size={18} />
              {passwordLoading ? 'Configuration...' : 'Activer la protection'}
            </button>
          </div>

        </div>
      ) : (
        /* Supprimer le mot de passe existant */
        <div
          style={{
            padding: '16px',
            background: 'var(--surface-light)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div
            style={{
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid var(--success)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--success)',
              textAlign: 'center'
            }}
          >
            🔒 Protection active - Verrouillage automatique après 30 min d'inactivité
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mot de passe actuel pour désactiver"
                className="input"
                style={{
                  width: '100%',
                  paddingRight: '44px',
                  background: 'var(--background)',
                  border: '1px solid rgba(248, 113, 113, 0.45)',
                  color: 'var(--text)',
                  boxShadow: 'inset 0 2px 6px rgba(124, 16, 39, 0.18)'
                }}
                disabled={passwordLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
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
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={handleRemovePassword}
              disabled={passwordLoading || !currentPassword}
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderRadius: '10px',
                background: passwordLoading
                  ? 'var(--surface-light)'
                  : 'linear-gradient(135deg, #ef4444, #991b1b)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 14px 30px rgba(239, 68, 68, 0.35)',
                cursor: passwordLoading ? 'progress' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
            >
              <X size={18} />
              {passwordLoading ? 'Suppression...' : 'Désactiver la protection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
