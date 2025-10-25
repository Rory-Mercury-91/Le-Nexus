import { ArrowLeft, ArrowRight, CheckCircle, Folder, Palette, Smile, Upload, User, X } from 'lucide-react';
import { useState } from 'react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

// Emojis suggérés
const PRESET_EMOJIS = [
  '👤', '👨', '👩', '🧑', '👦', '👧',
  '😀', '😊', '😎', '🥰', '🤓', '🧐',
  '🐱', '🐶', '🐼', '🦊', '🐻', '🐰',
  '🎮', '📚', '🎬', '🎨', '⚡', '✨',
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [color, setColor] = useState('#8b5cf6');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [baseDirectory, setBaseDirectory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Préférences de contenu
  const [showMangas, setShowMangas] = useState(true);
  const [showAnimes, setShowAnimes] = useState(true);
  const [showAvn, setShowAvn] = useState(true);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) {
        setError('Veuillez saisir un nom');
        return;
      }
      setError('');
      setStep(3);
    } else if (step === 3) {
      handleChooseDirectory();
    } else if (step === 4) {
      // Valider qu'au moins un type de contenu est sélectionné
      if (!showMangas && !showAnimes && !showAvn) {
        setError('Veuillez sélectionner au moins un type de contenu');
        return;
      }
      setError('');
      setStep(5);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleChooseDirectory = async () => {
    const result = await window.electronAPI.changeBaseDirectory();
    if (result.success && result.path) {
      setBaseDirectory(result.path);
      setStep(4); // Passer à l'étape des préférences
    }
  };

  const handleAvatarSelect = async () => {
    const result = await window.electronAPI.chooseAvatarFile();
    if (result.success && result.path) {
      setAvatarFile(result.path as any); // On stocke le chemin au lieu du File
      // Utiliser le protocole manga:// pour afficher l'image
      setAvatarPreview(`manga://${encodeURIComponent(result.path)}`);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Créer l'utilisateur dans la DB actuelle
      const result = await window.electronAPI.createUser({
        name: name.trim(),
        emoji,
        color,
      });

      if (!result.success || !result.user) {
        setError(result.error || 'Erreur lors de la création de l\'utilisateur');
        setLoading(false);
        return;
      }

      // Si un avatar a été sélectionné, le copier
      if (avatarFile && result.user.id) {
        await window.electronAPI.setUserAvatarFromPath(result.user.id, avatarFile as any);
      }

      // Si un nouvel emplacement a été choisi, copier MAINTENANT toute la DB avec l'utilisateur
      if (baseDirectory) {
        console.log('Copie de la DB vers le nouvel emplacement:', baseDirectory);
        const copyResult = await window.electronAPI.copyToNewLocation(baseDirectory);
        if (!copyResult.success) {
          setError('Erreur lors de la copie vers le nouvel emplacement');
          setLoading(false);
          return;
        }
      }

      // Définir l'utilisateur actuel
      const userName = name.trim();
      await window.electronAPI.setCurrentUser(userName);
      
      // Sauvegarder les préférences de contenu
      await window.electronAPI.setContentPreferences(userName, {
        showMangas,
        showAnimes,
        showAvn
      });

      // Compléter l'onboarding
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, var(--background) 0%, #1a1f35 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '40px'
    }}>
      {/* Progression */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            style={{
              width: step >= s ? '48px' : '32px',
              height: '6px',
              background: step >= s ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>

      {/* Contenu */}
      <div className="card" style={{
        maxWidth: '600px',
        width: '100%',
        padding: '48px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Étape 1 : Bienvenue */}
        {step === 1 && (
          <div>
            <div style={{
              fontSize: '72px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '700'
            }}>
              📚
            </div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '700',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Bienvenue dans Le Nexus
            </h1>
            <p style={{
              fontSize: '18px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              marginBottom: '32px',
              maxWidth: '480px',
              margin: '0 auto 32px'
            }}>
              Gérez votre collection de mangas et d'animes de manière simple et élégante.
              Nous allons configurer votre espace personnel en quelques étapes.
            </p>
          </div>
        )}

        {/* Étape 2 : Profil */}
        {step === 2 && (
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
                onClick={handleAvatarSelect}
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
                  onClick={handleRemoveAvatar}
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
                onChange={(e) => setName(e.target.value)}
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
                      onClick={() => setEmoji(e)}
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
                marginBottom: '8px',
                color: 'var(--text)'
              }}>
                <Palette size={16} />
                Couleur personnalisée
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: '80px',
                    height: '48px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: 'none'
                  }}
                />
                <div style={{
                  padding: '8px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace'
                }}>
                  {color.toUpperCase()}
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Étape 3 : Emplacement */}
        {step === 3 && (
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
              <Folder size={40} style={{ color: 'var(--primary)' }} />
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '12px'
            }}>
              Choisissez l'emplacement
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              Sélectionnez où stocker vos données (base de données, couvertures, images de profil).
            </p>

            <div style={{
              padding: '20px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.7',
                color: 'var(--text-secondary)',
                margin: 0
              }}>
                💡 <strong>Conseil :</strong> Choisissez un dossier synchronisé (OneDrive, Google Drive, Proton Drive, etc.)
                pour sauvegarder automatiquement vos données dans le cloud.
              </p>
            </div>

            <div style={{
              padding: '16px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '24px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textAlign: 'left'
            }}>
              <strong>Ce qui sera stocké :</strong>
              <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                <li>📦 Base de données (toutes vos séries et tomes)</li>
                <li>🖼️ Images de profils</li>
                <li>📚 Couvertures de séries et tomes</li>
              </ul>
            </div>
          </div>
        )}

        {/* Étape 4 : Préférences de contenu */}
        {step === 4 && (
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
              <Palette size={40} style={{ color: 'var(--primary)' }} />
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '12px'
            }}>
              Personnalisez votre accueil
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              lineHeight: '1.6',
              maxWidth: '500px',
              margin: '0 auto 32px'
            }}>
              Choisissez les types de contenu que vous souhaitez voir sur votre page d'accueil. Vous pourrez modifier ce choix à tout moment dans les paramètres.
            </p>

            {/* Options de contenu */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '500px',
              margin: '0 auto',
              textAlign: 'left'
            }}>
              {/* Mangas */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: showMangas ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
                  border: showMangas ? '2px solid var(--primary)' : '2px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setShowMangas(!showMangas)}
              >
                <input
                  type="checkbox"
                  checked={showMangas}
                  onChange={(e) => setShowMangas(e.target.checked)}
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                    📚 Mangas
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Afficher les nouveautés, suivis et recommandations de mangas
                  </div>
                </div>
              </label>

              {/* Animes */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: showAnimes ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
                  border: showAnimes ? '2px solid var(--primary)' : '2px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setShowAnimes(!showAnimes)}
              >
                <input
                  type="checkbox"
                  checked={showAnimes}
                  onChange={(e) => setShowAnimes(e.target.checked)}
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                    🎬 Animes
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Afficher les nouveautés, suivis et recommandations d'animes
                  </div>
                </div>
              </label>

              {/* AVN */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: showAvn ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
                  border: showAvn ? '2px solid var(--primary)' : '2px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setShowAvn(!showAvn)}
              >
                <input
                  type="checkbox"
                  checked={showAvn}
                  onChange={(e) => setShowAvn(e.target.checked)}
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                    🎮 AVN (Adult Visual Novels)
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Afficher les nouveautés, suivis et recommandations d'AVN
                  </div>
                </div>
              </label>
            </div>

            {error && (
              <div style={{
                marginTop: '24px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Étape 5 : Terminé */}
        {step === 5 && (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '3px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={40} style={{ color: 'var(--success)' }} />
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '12px'
            }}>
              Tout est prêt !
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              Votre espace personnel a été créé avec succès. Vous pouvez maintenant commencer à gérer votre collection.
            </p>

            {/* Récapitulatif */}
            <div style={{
              padding: '24px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px',
                color: 'var(--text-secondary)'
              }}>
                Récapitulatif
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: avatarPreview ? 'transparent' : `${color}22`,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
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
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {avatarPreview ? (
                      <span>✅ Avatar personnalisé</span>
                    ) : (
                      <>
                        <span style={{ 
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: color,
                          marginRight: '6px',
                          verticalAlign: 'middle'
                        }} />
                        Couleur personnalisée
                      </>
                    )}
                  </div>
                </div>
              </div>
              {baseDirectory && (
                <div style={{
                  padding: '12px',
                  background: 'var(--background)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                  wordBreak: 'break-all'
                }}>
                  📁 {baseDirectory}
                </div>
              )}
              
              {/* Préférences de contenu */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--background)',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px'
                }}>
                  Contenu affiché sur l'accueil :
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {showMangas && (
                    <span style={{
                      padding: '4px 12px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--primary)'
                    }}>
                      📚 Mangas
                    </span>
                  )}
                  {showAnimes && (
                    <span style={{
                      padding: '4px 12px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--primary)'
                    }}>
                      🎬 Animes
                    </span>
                  )}
                  {showAvn && (
                    <span style={{
                      padding: '4px 12px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--primary)'
                    }}>
                      🎮 AVN
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '14px',
            marginTop: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Boutons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '32px',
          justifyContent: step === 1 ? 'center' : 'space-between'
        }}>
          {step > 1 && step < 5 && (
            <button
              onClick={handleBack}
              className="btn btn-outline"
              style={{
                padding: '12px 24px',
                fontSize: '16px'
              }}
            >
              <ArrowLeft size={20} />
              Retour
            </button>
          )}

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="btn btn-primary"
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                flex: step === 1 ? 'none' : '1'
              }}
            >
              {step === 3 ? (
                <>
                  <Folder size={20} />
                  Choisir l'emplacement
                </>
              ) : step === 4 ? (
                <>
                  Valider mes choix
                  <ArrowRight size={20} />
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="btn btn-primary"
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                width: '100%'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading" style={{ width: '18px', height: '18px' }} />
                  Finalisation...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Commencer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
