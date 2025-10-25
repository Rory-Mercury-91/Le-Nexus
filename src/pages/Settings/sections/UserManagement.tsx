import { Edit2, Plus, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';

interface UserData {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

interface UserManagementProps {
  users: UserData[];
  userAvatars: Record<number, string | null>;
  onUsersChange: () => void;
  showToast: (config: { title: string; message: string; type: 'success' | 'error' | 'info' }) => void;
  confirm: (config: { title: string; message: string; confirmText: string; cancelText: string; isDanger: boolean }) => Promise<boolean>;
}

export default function UserManagement({ users, userAvatars, onUsersChange, showToast, confirm }: UserManagementProps) {
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmoji, setNewUserEmoji] = useState('👤');
  const [newUserColor, setNewUserColor] = useState('#8b5cf6');
  const [userError, setUserError] = useState('');
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setNewUserName(user.name);
    setNewUserEmoji(user.emoji);
    setNewUserColor(user.color);
    setAvatarPreview(userAvatars[user.id] || null);
    setShowAddUserForm(false);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmoji('👤');
    setNewUserColor('#8b5cf6');
    setAvatarFile(null);
    setAvatarPreview(null);
    setUserError('');
  };

  const handleUpdateUser = async () => {
    if (!newUserName.trim() || !editingUser) {
      setUserError('Le nom est requis');
      return;
    }

    const result = await window.electronAPI.updateUser(editingUser.id, {
      name: newUserName.trim(),
      emoji: newUserEmoji,
      color: newUserColor,
    });

    if (result.success) {
      if (avatarFile) {
        await window.electronAPI.setUserAvatarFromPath(editingUser.id, avatarFile);
      }
      
      handleCancelEdit();
      onUsersChange();
    } else {
      setUserError(result.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const users = await window.electronAPI.getAllUsers();
    if (users.length === 1) {
      showToast({
        title: 'Impossible de supprimer',
        message: 'Vous devez avoir au moins un utilisateur',
        type: 'error',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Supprimer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Toutes ses données seront réassignées à un autre utilisateur.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true,
    });

    if (confirmed) {
      const targetUserId = users.find(u => u.id !== userId)?.id;
      if (targetUserId) {
        const result = await window.electronAPI.deleteUserData(userId, targetUserId);
        if (result.success) {
          onUsersChange();
        } else {
          showToast({
            title: 'Erreur',
            message: result.error || 'Erreur lors de la suppression',
            type: 'error',
          });
        }
      }
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      setUserError('Le nom est requis');
      return;
    }

    const result = await window.electronAPI.createUser({
      name: newUserName.trim(),
      emoji: newUserEmoji,
      color: newUserColor,
    });

    if (result.success && result.user) {
      if (avatarFile) {
        await window.electronAPI.setUserAvatarFromPath(result.user.id, avatarFile);
      }
      
      setShowAddUserForm(false);
      setNewUserName('');
      setNewUserEmoji('👤');
      setNewUserColor('#8b5cf6');
      setAvatarFile(null);
      setAvatarPreview(null);
      setUserError('');
      onUsersChange();
    } else {
      setUserError(result.error || 'Erreur lors de la création');
    }
  };

  const handleAvatarSelect = async () => {
    const result = await window.electronAPI.chooseAvatarFile();
    if (result.success && result.path) {
      setAvatarFile(result.path);
      setAvatarPreview(`manga://${encodeURIComponent(result.path)}`);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
        👥 Gestion des utilisateurs
      </h2>

      {/* Liste des utilisateurs */}
      <div style={{ marginBottom: '24px' }}>
        {users.map(user => (
          <div key={user.id} style={{
            background: 'var(--surface)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${user.color}`,
                flexShrink: 0,
                background: 'var(--surface-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {userAvatars[user.id] ? (
                  <img
                    src={userAvatars[user.id]!}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '24px' }}>{user.emoji}</span>
                )}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {user.emoji} • {user.color}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleEditUser(user)}
                className="btn btn-outline"
                style={{ padding: '8px 12px' }}
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="btn"
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--error)',
                  border: '1px solid var(--error)'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton pour afficher le formulaire d'ajout */}
      {!showAddUserForm && !editingUser && (
        <button
          onClick={() => setShowAddUserForm(true)}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          <Plus size={18} />
          Ajouter un utilisateur
        </button>
      )}

      {/* Formulaire d'ajout/édition */}
      {(showAddUserForm || editingUser) && (
        <div style={{
          marginTop: '24px',
          padding: '24px',
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            {editingUser ? '✏️ Modifier un utilisateur' : '➕ Ajouter un utilisateur'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                Nom
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Prénom de l'utilisateur"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                Emoji (si pas d'avatar)
              </label>
              <input
                type="text"
                value={newUserEmoji}
                onChange={(e) => setNewUserEmoji(e.target.value)}
                placeholder="👤"
                maxLength={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  fontSize: '24px',
                  textAlign: 'center'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                Avatar personnalisé (optionnel)
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {avatarPreview && (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `2px solid ${newUserColor}`,
                    flexShrink: 0
                  }}>
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <button
                  onClick={handleAvatarSelect}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  <Upload size={16} />
                  Choisir une image
                </button>
                {avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="btn"
                    style={{
                      padding: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--error)',
                      border: '1px solid var(--error)'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                Couleur
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newUserColor}
                  onChange={(e) => setNewUserColor(e.target.value)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={newUserColor}
                  onChange={(e) => setNewUserColor(e.target.value)}
                  placeholder="#8b5cf6"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          </div>

          {userError && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              color: 'var(--error)',
              fontSize: '14px'
            }}>
              {userError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={handleCancelEdit}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Annuler
            </button>
            {editingUser ? (
              <button
                onClick={handleUpdateUser}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Edit2 size={16} />
                Modifier l'utilisateur
              </button>
            ) : (
              <button
                onClick={handleCreateUser}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Plus size={16} />
                Créer l'utilisateur
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
