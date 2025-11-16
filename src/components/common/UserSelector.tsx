import { useEffect, useState } from 'react';
import FullScreenOverlay from './FullScreenOverlay';
import GradientTitle from './GradientTitle';
import LoadingSpinner from './LoadingSpinner';

interface UserSelectorProps {
  onUserSelected: (user: string) => void;
}

interface User {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

export default function UserSelector({ onUserSelected }: UserSelectorProps) {
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
    <FullScreenOverlay>
      {/* Logo */}
      <div style={{ marginBottom: '48px', textAlign: 'center' }}>
        <GradientTitle fontSize="42px" style={{ marginBottom: '12px' }}>
          Nexus
        </GradientTitle>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
          Qui êtes-vous ?
        </p>
      </div>

      {/* Sélection utilisateur */}
      {loading ? (
        <LoadingSpinner 
          message="Chargement des utilisateurs..."
          style={{ padding: '40px' }}
        />
      ) : (
        <div style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {users.map((user) => (
          <button
            key={user.name}
            onClick={() => handleSelect(user.name)}
            className="card"
            style={{
              width: '200px',
              padding: '32px 24px',
              cursor: 'pointer',
              border: selectedUser === user.name ? `3px solid ${user.color}` : '1px solid var(--border)',
              background: selectedUser === user.name ? `${user.color}11` : 'var(--surface)',
              transition: 'all 0.3s ease',
              transform: selectedUser === user.name ? 'scale(1.05)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (selectedUser !== user.name) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = user.color;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedUser !== user.name) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }
            }}
          >
            <div style={{
              marginBottom: '16px',
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
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `3px solid ${user.color}`
                  }}
                />
              ) : (
                <div style={{ fontSize: '64px' }}>
                  {user.emoji}
                </div>
              )}
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center',
              color: user.color
            }}>
              {user.name}
            </h3>
          </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div style={{
        marginTop: '48px',
        padding: '16px 24px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '12px',
        borderLeft: '4px solid var(--primary)',
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          💡 Vos modifications seront automatiquement sauvegardées dans votre base personnelle à la fermeture de l'application
        </p>
      </div>
    </FullScreenOverlay>
  );
}
