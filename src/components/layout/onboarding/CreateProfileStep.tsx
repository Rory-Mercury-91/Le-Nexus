import { ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Palette, Smile, Upload, User, X } from 'lucide-react';
import Toggle from '../../common/Toggle';
import { PRESET_COLORS } from './constants';

interface CreateProfileStepProps {
  name: string;
  emoji: string;
  color: string;
  avatarPreview: string | null;
  showMangas: boolean;
  showAnimes: boolean;
  showMovies: boolean;
  showSeries: boolean;
  showAdulteGame: boolean;
  showBooks: boolean;
  adulteGamePassword: string;
  adulteGamePasswordConfirm: string;
  showAdulteGamePassword: boolean;
  showAdulteGamePasswordConfirm: boolean;
  onNameChange: (name: string) => void;
  onEmojiChange: (emoji: string) => void;
  onColorChange: (color: string) => void;
  onAvatarSelect: () => void;
  onRemoveAvatar: () => void;
  onShowMangasChange: (show: boolean) => void;
  onShowAnimesChange: (show: boolean) => void;
  onShowMoviesChange: (show: boolean) => void;
  onShowSeriesChange: (show: boolean) => void;
  onShowAdulteGameChange: (show: boolean) => void;
  onAdulteGamePasswordChange: (password: string) => void;
  onAdulteGamePasswordConfirmChange: (password: string) => void;
  onShowAdulteGamePasswordToggle: () => void;
  onShowAdulteGamePasswordConfirmToggle: () => void;
  onBack?: () => void;
  onComplete?: () => void;
  loading?: boolean;
  error?: string;
}

export default function CreateProfileStep({
  name,
  emoji,
  color,
  avatarPreview,
  showMangas,
  showAnimes,
  showMovies,
  showSeries,
  showAdulteGame,
  showBooks: _showBooks, // Non utilisé - synchronisé automatiquement avec showMangas
  adulteGamePassword,
  adulteGamePasswordConfirm,
  showAdulteGamePassword,
  showAdulteGamePasswordConfirm,
  onNameChange,
  onEmojiChange,
  onColorChange,
  onAvatarSelect,
  onRemoveAvatar,
  onShowMangasChange,
  onShowAnimesChange,
  onShowMoviesChange,
  onShowSeriesChange,
  onShowAdulteGameChange,
  onAdulteGamePasswordChange,
  onAdulteGamePasswordConfirmChange,
  onShowAdulteGamePasswordToggle,
  onShowAdulteGamePasswordConfirmToggle,
  onBack,
  onComplete,
  loading = false,
  error
}: CreateProfileStepProps) {
  return (
    <div style={{ textAlign: 'left' }}>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        Créez votre profil
      </h2>
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        Personnalisez votre espace et configurez vos préférences
      </p>

      {/* Layout 2 colonnes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginBottom: '24px'
      }}>
        {/* Colonne de gauche : Profil */}
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '20px',
            color: 'var(--text)'
          }}>
            Profil
          </h3>

          {/* Avatar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
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
              overflow: 'hidden',
              marginBottom: '12px'
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

            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center'
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
          </div>

          {/* Nom */}
          <div style={{ marginBottom: '24px' }}>
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
            <div style={{ marginBottom: '24px' }}>
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
                Emoji
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {[
                  { emoji: '👤', label: 'Neutre' },
                  { emoji: '👨', label: 'Garçon' },
                  { emoji: '👩', label: 'Fille' },
                  { emoji: '🧑', label: 'Personne' },
                  { emoji: '👶', label: 'Enfant' },
                  { emoji: '🧓', label: 'Aîné' }
                ].map(({ emoji: e, label }) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onEmojiChange(e)}
                    title={label}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: emoji === e ? `2px solid ${color}` : '1px solid var(--border)',
                      background: emoji === e ? `${color}22` : 'var(--surface)',
                      fontSize: '24px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Couleur */}
          <div style={{ marginBottom: '24px' }}>
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

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => onColorChange(presetColor)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: presetColor,
                    border: color === presetColor ? '3px solid var(--text)' : '2px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: color === presetColor ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={presetColor}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                style={{
                  width: '60px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: 'none'
                }}
              />
              <span style={{
                fontSize: '12px',
                color: 'var(--text-secondary)'
              }}>
                ou choisir une couleur personnalisée
              </span>
            </div>
          </div>

          {/* Mot de passe jeux adultes (si activé) */}
          {showAdulteGame && (
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text)'
              }}>
                <Lock size={16} />
                Mot de passe jeux adultes
              </label>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginBottom: '12px',
                lineHeight: '1.5'
              }}>
                Protégez l'accès aux contenus adultes avec un mot de passe maître.
              </p>

              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <input
                  type={showAdulteGamePassword ? 'text' : 'password'}
                  value={adulteGamePassword}
                  onChange={(e) => onAdulteGamePasswordChange(e.target.value)}
                  placeholder="Mot de passe (min. 4 caractères)"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
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
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
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
          )}
        </div>

        {/* Colonne de droite : Préférences de contenu + Résumé */}
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '20px',
            color: 'var(--text)'
          }}>
            Préférences de contenu
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Colonne gauche : 3 options */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {[
                {
                  key: 'mangas',
                  label: '📚 Lectures',
                  description: 'Manga, manhwa, comics, BD, livres…',
                  checked: showMangas,
                  onChange: (checked: boolean) => {
                    onShowMangasChange(checked);
                    // showBooks est automatiquement synchronisé avec showMangas dans useOnboarding
                  }
                },
                {
                  key: 'videos',
                  label: '🎬 Vidéos',
                  description: 'Animes, Films et Séries',
                  checked: showAnimes || showMovies || showSeries,
                  onChange: (checked: boolean) => {
                    onShowAnimesChange(checked);
                    onShowMoviesChange(checked);
                    onShowSeriesChange(checked);
                  }
                }
              ].map(option => (
                <div
                  key={option.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px',
                    background: option.checked ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                    border: option.checked ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {option.description}
                    </div>
                  </div>
                  <Toggle checked={option.checked} onChange={option.onChange} />
                </div>
              ))}
            </div>

            {/* Colonne droite : 2 options */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {[
                {
                  key: 'adulte-game',
                  label: '🎮 Jeux',
                  description: 'Nouveautés et suivis',
                  checked: showAdulteGame,
                  onChange: onShowAdulteGameChange
                }
              ].map(option => (
                <div
                  key={option.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px',
                    background: option.checked ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                    border: option.checked ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {option.description}
                    </div>
                  </div>
                  <Toggle checked={option.checked} onChange={option.onChange} />
                </div>
              ))}
            </div>
          </div>

          {/* Résumé */}
          <div style={{
            padding: '20px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginTop: '24px'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--text-secondary)'
            }}>
              Résumé
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: avatarPreview ? 'transparent' : `${color}22`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                overflow: 'hidden'
              }}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={name}
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
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '2px' }}>
                  {name || 'Votre nom'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {avatarPreview ? 'Avatar personnalisé' : `${emoji} ${color}`}
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              Contenu activé :
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {showMangas && <span style={{ padding: '4px 8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '4px', fontSize: '11px' }}>📚</span>}
              {(showAnimes || showMovies || showSeries) && <span style={{ padding: '4px 8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '4px', fontSize: '11px' }}>🎬</span>}
              {showAdulteGame && <span style={{ padding: '4px 8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '4px', fontSize: '11px' }}>🎮</span>}
            </div>

            {showAdulteGame && (
              <div style={{
                marginTop: '12px',
                padding: '8px',
                background: adulteGamePassword ? 'rgba(16, 185, 129, 0.1)' : 'var(--background)',
                borderRadius: '6px',
                fontSize: '11px',
                color: adulteGamePassword ? 'var(--success)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Lock size={12} />
                {adulteGamePassword ? 'Protection activée' : 'Protection non configurée'}
              </div>
            )}
          </div>

          {/* Boutons de navigation */}
          {onBack && onComplete && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={onBack}
                className="btn btn-outline"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px'
                }}
              >
                <ArrowLeft size={20} />
                Retour
              </button>
              <button
                onClick={onComplete}
                className="btn btn-primary"
                style={{
                  padding: '12px 32px',
                  fontSize: '16px',
                  flex: 1
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading" style={{ width: '18px', height: '18px' }} />
                    Création du profil...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Créer le profil
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
