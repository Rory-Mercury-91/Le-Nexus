import { Palette, Smile, Upload, User, X } from 'lucide-react';
import { PRESET_COLORS, PRESET_EMOJIS } from './constants';

interface ProfileStepProps {
  name: string;
  emoji: string;
  color: string;
  avatarPreview: string | null;
  onNameChange: (name: string) => void;
  onEmojiChange: (emoji: string) => void;
  onColorChange: (color: string) => void;
  onAvatarSelect: () => void;
  onRemoveAvatar: () => void;
}

export default function ProfileStep({
  name,
  emoji,
  color,
  avatarPreview,
  onNameChange,
  onEmojiChange,
  onColorChange,
  onAvatarSelect,
  onRemoveAvatar
}: ProfileStepProps) {
  return (
    <div>
      <div style={{
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        background: avatarPreview ? 'transparent' : `${color}22`,
        border: `3px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        margin: '0 auto 16px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {avatarPreview ? (
          <img 
            src={avatarPreview} 
            alt="Avatar"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          emoji
        )}
      </div>
      
      {/* Boutons Avatar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <button
          type="button"
          onClick={onAvatarSelect}
          className="btn btn-outline"
          style={{
            padding: '8px 16px',
            fontSize: '13px'
          }}
        >
          <Upload size={14} />
          {avatarPreview ? 'Changer' : 'Ajouter avatar'}
        </button>
        {avatarPreview && (
          <button
            type="button"
            onClick={onRemoveAvatar}
            className="btn btn-outline"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444'
            }}
          >
            <X size={14} />
            Retirer
          </button>
        )}
      </div>
      
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '12px'
      }}>
        Créez votre profil
      </h2>
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px'
      }}>
        Personnalisez votre espace
      </p>

      {/* Nom */}
      <div style={{ textAlign: 'left', marginBottom: '24px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '8px',
          color: 'var(--text)'
        }}>
          <User size={16} />
          Nom ou pseudo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Votre nom..."
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '16px'
          }}
          autoFocus
        />
      </div>

      {/* Emoji (affiché seulement si pas d'avatar) */}
      {!avatarPreview && (
        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: 'var(--text)'
          }}>
            <Smile size={16} />
            Emoji (ou ajoutez un avatar ci-dessus)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '8px'
          }}>
            {PRESET_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onEmojiChange(e)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  border: emoji === e ? `2px solid ${color}` : '1px solid var(--border)',
                  background: emoji === e ? `${color}22` : 'var(--surface)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Couleur */}
      <div style={{ textAlign: 'left', marginBottom: '8px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '12px',
          color: 'var(--text)'
        }}>
          <Palette size={16} />
          Couleur personnalisée
        </label>
        
        {/* Couleurs prédéfinies */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              onClick={() => onColorChange(presetColor)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: presetColor,
                border: color === presetColor ? '3px solid var(--text)' : '2px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: color === presetColor ? 'scale(1.1)' : 'scale(1)',
                boxShadow: color === presetColor ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)'
              }}
              title={presetColor}
            />
          ))}
        </div>
        
        {/* Color picker personnalisé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            style={{
              width: '80px',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              background: 'none'
            }}
          />
          <span style={{
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            ou choisir une couleur personnalisée
          </span>
        </div>
      </div>
    </div>
  );
}
