import { Edit2, LogIn, Plus, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import AdultContentPasswordSettings from './AdultContentPasswordSettings';

interface UserData {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

interface UserManagementProps {
  users: UserData[];
  userAvatars: Record<string, string | null>;
  onUsersChange: () => void;
  showToast: (config: { title: string; message?: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number }) => void;
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
    setAvatarPreview(userAvatars[user.name] || null);
    setShowAddUserForm(false);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setShowAddUserForm(false);
    setNewUserName('');
    setNewUserEmoji('👤');
    setNewUserColor('#8b5cf6');
    setAvatarFile(null);
    setAvatarPreview(null);
    setUserError('');
  };

  const handleSwitchUser = async (user: UserData) => {
    const confirmed = await confirm({
      title: 'Changer d\'utilisateur',
      message: `Voulez-vous vous connecter en tant que "${user.name}" ? L'application va se recharger.`,
      confirmText: 'Se connecter',
      cancelText: 'Annuler',
      isDanger: false
    });

    if (confirmed) {
      // Sauvegarder le nouvel utilisateur dans localStorage
      localStorage.setItem('currentUser', user.name);

      // Recharger l'application
      window.location.reload();
    }
  };

  const handleUpdateUser = async () => {
    if (!newUserName.trim() || !editingUser) {
      setUserError('Le nom est requis');
      return;
    }

    const result = await window.electronAPI.updateUser({
      id: editingUser.id,
      name: newUserName.trim(),
      emoji: newUserEmoji,
      color: newUserColor,
    });

    if (result.success) {
      if (avatarFile) {
        // Utiliser le nom original de l'utilisateur pour identifier sa base
        await window.electronAPI.setUserAvatarFromPath(editingUser.id, avatarFile, editingUser.name);
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
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Toutes ses données seront supprimées.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true,
    });

    if (confirmed) {
      const result = await window.electronAPI.deleteUser(userId);
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
        // Passer aussi le nom de l'utilisateur pour identifier sa base
        await window.electronAPI.setUserAvatarFromPath(result.user.id, avatarFile, result.user.name);
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
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Colonne principale : Gestion des utilisateurs + protection */}
        <div>
          {!showAddUserForm && !editingUser && (
            <button
              onClick={() => setShowAddUserForm(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              <Plus size={18} />
              Ajouter un utilisateur
            </button>
          )}

          {/* Liste des utilisateurs */}
          <div>
            {users.map(user => (
              <div key={`${user.name}-${user.id}`} style={{
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
                    {userAvatars[user.name] ? (
                      <img
                        src={userAvatars[user.name]!}
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Indicateur utilisateur actuel */}
                  {user.name === localStorage.getItem('currentUser') && (
                    <span style={{
                      padding: '4px 8px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid var(--success)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--success)',
                      fontWeight: '600'
                    }}>
                      ✓ Connecté
                    </span>
                  )}

                  {/* Bouton Se connecter (si pas l'utilisateur actuel) */}
                  {user.name !== localStorage.getItem('currentUser') && (
                    <button
                      onClick={() => handleSwitchUser(user)}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <LogIn size={14} />
                      Se connecter
                    </button>
                  )}

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
                    placeholder="Prénom de l&apos;utilisateur"
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
                    Emoji (si pas d&apos;avatar)
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
                    Modifier l&apos;utilisateur
                  </button>
                ) : (
                  <button
                    onClick={handleCreateUser}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <Plus size={16} />
                    Créer l&apos;utilisateur
                  </button>
                )}
              </div>
            </div>
          )}

          <AdultContentPasswordSettings showToast={showToast} />
        </div>
      </div>
    </div>
  );
}
