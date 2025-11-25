import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import FullScreenOverlay from './FullScreenOverlay';
import GradientTitle from './GradientTitle';
import LoadingSpinner from './LoadingSpinner';

interface UserSelectorProps {
  onUserSelected: (user: string) => void;
  onCreateNewProfile?: () => void;
  showCreateButton?: boolean;
  title?: string;
  subtitle?: string;
  isInOnboarding?: boolean;
}

interface User {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

export default function UserSelector({ 
  onUserSelected, 
  onCreateNewProfile,
  showCreateButton = true,
  title = 'Qui êtes-vous ?',
  subtitle,
  isInOnboarding = false
}: UserSelectorProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImages, setProfileImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Charger les utilisateurs depuis la base de données
      const usersData = await window.electronAPI.getAllUsers();
      setUsers(usersData);

      // Charger les images de profil en utilisant le nom (unique) plutôt que l'ID
      const images: Record<string, string | null> = {};
      for (const user of usersData) {
        // Utiliser getUserProfileImage qui prend le nom de l'utilisateur
        const imagePath = await window.electronAPI.getUserProfileImage(user.name);
        images[user.name] = imagePath;
      }
      setProfileImages(images);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (userName: string) => {
    setSelectedUser(userName);
    // Petit délai pour l'animation
    setTimeout(() => {
      onUserSelected(userName);
    }, 300);
  };

  return (
    <FullScreenOverlay padding={isInOnboarding ? "40px" : undefined}>
      {/* Logo/Titre */}
      <div style={{ marginBottom: isInOnboarding ? '32px' : '48px', textAlign: 'center' }}>
        {!isInOnboarding && (
          <GradientTitle fontSize="42px" style={{ marginBottom: '12px' }}>
            Nexus
          </GradientTitle>
        )}
        <h1 style={{
          fontSize: isInOnboarding ? '28px' : '24px',
          fontWeight: '700',
          marginBottom: subtitle ? '8px' : '0',
          color: 'var(--text)'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Sélection utilisateur */}
      {loading ? (
        <LoadingSpinner 
          message="Chargement des utilisateurs..."
          style={{ padding: '40px' }}
        />
      ) : (
        <>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            justifyContent: 'center',
            marginBottom: showCreateButton ? '40px' : '0',
            maxHeight: isInOnboarding ? '400px' : 'none',
            overflowY: isInOnboarding ? 'auto' : 'visible',
            padding: isInOnboarding ? '8px' : '0',
            paddingRight: isInOnboarding ? '16px' : '0',
            maxWidth: isInOnboarding ? '900px' : '1200px',
            margin: isInOnboarding ? '0 auto 40px' : '0 auto 48px'
          }}>
            {users.map((user) => (
              <button
                key={user.name}
                onClick={() => handleSelect(user.name)}
                className="card"
                style={{
                  width: isInOnboarding ? '160px' : '200px',
                  padding: isInOnboarding ? '24px 20px' : '32px 24px',
                  cursor: 'pointer',
                  border: selectedUser === user.name ? `3px solid ${user.color}` : '2px solid var(--border)',
                  background: selectedUser === user.name ? `${user.color}15` : 'var(--surface)',
                  transition: 'all 0.3s ease',
                  transform: selectedUser === user.name ? 'scale(1.05)' : 'scale(1)',
                  textAlign: 'center',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: isInOnboarding ? '180px' : '200px',
                  justifyContent: 'center',
                  boxShadow: selectedUser === user.name ? `0 4px 12px ${user.color}40` : 'none',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  if (selectedUser !== user.name) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.borderColor = user.color;
                    e.currentTarget.style.background = `${user.color}15`;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${user.color}40`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedUser !== user.name) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <div style={{
                  marginBottom: isInOnboarding ? '16px' : '20px',
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {profileImages[user.name] ? (
                    <img
                      src={profileImages[user.name]!}
                      alt={user.name}
                      style={{
                        width: isInOnboarding ? '72px' : '100px',
                        height: isInOnboarding ? '72px' : '100px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `3px solid ${user.color}`
                      }}
                    />
                  ) : (
                    <div style={{
                      width: isInOnboarding ? '72px' : '100px',
                      height: isInOnboarding ? '72px' : '100px',
                      borderRadius: '50%',
                      background: `${user.color}22`,
                      border: `3px solid ${user.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isInOnboarding ? '36px' : '48px'
                    }}>
                      {user.emoji}
                    </div>
                  )}
                </div>
                <h3 style={{
                  fontSize: isInOnboarding ? '15px' : '20px',
                  fontWeight: '600',
                  textAlign: 'center',
                  color: 'var(--text)',
                  wordBreak: 'break-word',
                  lineHeight: '1.4'
                }}>
                  {user.name}
                </h3>
              </button>
            ))}
          </div>

          {/* Bouton Créer un nouveau profil (toujours visible si activé) */}
          {showCreateButton && onCreateNewProfile && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '24px 0',
                marginTop: '24px',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: 'var(--border)',
                  maxWidth: '200px'
                }} />
                <span style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  padding: '0 20px',
                  fontWeight: '500'
                }}>
                  ou
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: 'var(--border)',
                  maxWidth: '200px'
                }} />
              </div>

              <button
                onClick={onCreateNewProfile}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  maxWidth: isInOnboarding ? '400px' : '500px',
                  margin: '0 auto',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  borderRadius: '10px'
                }}
              >
                <UserPlus size={20} />
                Créer un nouveau profil
              </button>
            </>
          )}

          {/* Info (seulement si pas dans l'onboarding) */}
          {!isInOnboarding && (
            <div style={{
              marginTop: '48px',
              padding: '16px 24px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '12px',
              borderLeft: '4px solid var(--primary)',
              maxWidth: '500px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                💡 Vos modifications seront automatiquement sauvegardées dans votre base personnelle à la fermeture de l'application
              </p>
            </div>
          )}
        </>
      )}
    </FullScreenOverlay>
  );
}
