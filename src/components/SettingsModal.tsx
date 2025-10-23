import { AlertTriangle, CheckCircle, Download, Edit2, Folder, FolderOpen, Plus, Trash2, Tv, Upload, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { AnimeImportProgress, AnimeImportResult } from '../types';

interface UserData {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

interface SettingsModalProps {
  onClose: () => void;
  currentUser: string;
}

export default function SettingsModal({ onClose, currentUser }: SettingsModalProps) {
  const [baseDirectory, setBaseDirectory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importingAnimes, setImportingAnimes] = useState(false);
  const [animeImportResult, setAnimeImportResult] = useState<AnimeImportResult | null>(null);
  const [animeImportProgress, setAnimeImportProgress] = useState<AnimeImportProgress | null>(null);
  const [importStartTime, setImportStartTime] = useState<number>(0);
  const [users, setUsers] = useState<UserData[]>([]);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmoji, setNewUserEmoji] = useState('👤');
  const [newUserColor, setNewUserColor] = useState('#8b5cf6');
  const [userError, setUserError] = useState('');
  const [userAvatars, setUserAvatars] = useState<Record<number, string | null>>({});
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    loadSettings();
    
    // Écouter les mises à jour de progression de l'import
    const unsubscribe = window.electronAPI.onAnimeImportProgress((progress) => {
      setAnimeImportProgress(progress);
    });
    
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const loadSettings = async () => {
    const baseDir = await window.electronAPI.getBaseDirectory();
    setBaseDirectory(baseDir || 'Non configuré');
    
    const usersData = await window.electronAPI.getAllUsers();
    setUsers(usersData);
    
    // Charger les avatars de tous les utilisateurs
    const avatars: Record<number, string | null> = {};
    for (const user of usersData) {
      const avatar = await window.electronAPI.getUserAvatar(user.id);
      avatars[user.id] = avatar;
    }
    setUserAvatars(avatars);
    
    setLoading(false);
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      setUserError('Veuillez saisir un nom');
      return;
    }

    const result = await window.electronAPI.createUser({
      name: newUserName.trim(),
      emoji: newUserEmoji,
      color: newUserColor
    });

    if (result.success && result.user) {
      setNewUserName('');
      setNewUserEmoji('👤');
      setNewUserColor('#8b5cf6');
      setUserError('');
      await loadSettings();
    } else {
      setUserError(result.error || 'Erreur lors de la création');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !newUserName.trim()) {
      setUserError('Veuillez saisir un nom');
      return;
    }

    const result = await window.electronAPI.updateUser({
      id: editingUser.id,
      name: newUserName.trim(),
      emoji: newUserEmoji,
      color: newUserColor
    });

    if (result.success) {
      setEditingUser(null);
      setNewUserName('');
      setNewUserEmoji('👤');
      setNewUserColor('#8b5cf6');
      setUserError('');
      await loadSettings();
    } else {
      setUserError(result.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const confirmed = await confirm({
      title: 'Supprimer cet utilisateur',
      message: 'Cette action supprimera toutes les données de cet utilisateur. Cette action est irréversible !',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      const result = await window.electronAPI.deleteUser(userId);
      if (result.success) {
        await loadSettings();
      } else {
        alert(result.error || 'Erreur lors de la suppression');
      }
    }
  };

  const handleSetUserAvatar = async (userId: number) => {
    const result = await window.electronAPI.setUserAvatar(userId);
    if (result.success) {
      await loadSettings();
    }
  };

  const handleRemoveUserAvatar = async (userId: number) => {
    const result = await window.electronAPI.removeUserAvatar(userId);
    if (result.success) {
      await loadSettings();
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setNewUserName(user.name);
    setNewUserEmoji(user.emoji);
    setNewUserColor(user.color);
    setUserError('');
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmoji('👤');
    setNewUserColor('#8b5cf6');
    setUserError('');
  };

  const handleChangeBaseDirectory = async () => {
    const result = await window.electronAPI.changeBaseDirectory();
    if (result.success && result.path) {
      setBaseDirectory(result.path);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      if (result.message) {
        alert(result.message);
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await window.electronAPI.exportDatabase();
      if (result.success) {
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await window.electronAPI.importDatabase();
      if (result.success) {
        setShowImportSuccess(true);
        setTimeout(() => {
          setShowImportSuccess(false);
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleImportAnimeXml = () => {
    // Créer un input file caché
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImportingAnimes(true);
      setAnimeImportResult(null);
      setAnimeImportProgress(null);
      setImportStartTime(Date.now());

      try {
        const text = await file.text();
        const result = await window.electronAPI.importAnimeXml(text);
        setAnimeImportResult(result);
        setAnimeImportProgress(null); // Réinitialiser la progression
        
        // Masquer le résultat après 30 secondes
        setTimeout(() => setAnimeImportResult(null), 30000);
      } catch (error) {
        console.error('Erreur lors de l\'import des animes:', error);
        setAnimeImportResult({
          total: 0,
          imported: 0,
          updated: 0,
          errors: [{ error: 'Erreur lors de la lecture du fichier XML' }]
        });
        setAnimeImportProgress(null);
      } finally {
        setImportingAnimes(false);
      }
    };

    input.click();
  };

  const handleDeleteUserData = async () => {
    const confirmed = await confirm({
      title: 'Supprimer les données utilisateur',
      message: `Cette action supprimera TOUTES les données de lecture de ${currentUser} (tomes lus, épisodes vus, etc.). Les séries et tomes ne seront PAS supprimés. Cette action est irréversible !`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        await window.electronAPI.deleteUserData(currentUser);
        alert(`✅ Données de ${currentUser} supprimées avec succès.\n\nRedémarrez l'application pour voir les changements.`);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('❌ Erreur lors de la suppression des données utilisateur.');
      }
    }
  };

  const handleDeleteAllData = async () => {
    const confirmed = await confirm({
      title: '⚠️ DANGER : Supprimer TOUTES les données',
      message: 'Cette action supprimera DÉFINITIVEMENT:\n\n• Toutes les séries (mangas et animes)\n• Tous les tomes\n• Toutes les données de lecture de TOUS les utilisateurs\n• Toutes les images de couvertures\n\nCette action est IRRÉVERSIBLE !\n\nL\'application se fermera automatiquement.',
      confirmText: 'Je comprends, TOUT supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        await window.electronAPI.deleteAllData();
        // Attendre 2 secondes pour laisser le temps au store de se sauvegarder sur le disque
        // avant de redémarrer l'application
        setTimeout(() => {
          window.electronAPI.quitApp({ shouldRelaunch: true });
        }, 2000);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('❌ Erreur lors de la suppression des données.');
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '900px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Paramètres</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            {/* ========== EMPLACEMENT DES DONNÉES (Pleine largeur) ========== */}
            <div style={{
                gridColumn: '1 / -1',
                background: 'var(--surface-light)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexShrink: 0
                }}>
                  <Folder size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    Emplacement des données
                  </h3>
                </div>

                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)'
                }}>
                  <strong>Ma Mangathèque</strong> stocke tous vos fichiers dans un seul dossier :
                  <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                    <li>📦 Base de données</li>
                    <li>🖼️ Images de profils</li>
                    <li>📚 Couvertures de séries et tomes</li>
                  </ul>
                </div>

                <div style={{ flex: 1 }} />

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <div style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '10px',
                    background: 'var(--background)',
                    borderRadius: '6px',
                    wordBreak: 'break-all',
                    color: 'var(--text-secondary)'
                  }}>
                    {baseDirectory}
                  </div>

                  <button
                    onClick={handleChangeBaseDirectory}
                    className="btn btn-primary"
                    style={{ 
                      justifyContent: 'center', 
                      fontSize: '13px',
                      padding: '10px 20px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Folder size={16} />
                    Changer l'emplacement
                  </button>
                </div>

                {showSuccess && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'rgba(251, 146, 60, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    fontSize: '12px',
                    color: '#fb923c'
                  }}>
                    ⚠️ Redémarrez l'application pour appliquer les changements
                  </div>
                )}
              </div>

            {/* ========== GESTION DES UTILISATEURS (Pleine largeur) ========== */}
            <div style={{
                gridColumn: '1 / -1',
                background: 'var(--surface-light)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '10px', 
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={18} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      Gestion des utilisateurs
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowUserManagement(!showUserManagement)}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px'
                    }}
                  >
                    {showUserManagement ? <X size={16} /> : <Edit2 size={16} />}
                    {showUserManagement ? 'Fermer' : 'Gérer'}
                  </button>
                </div>

                {/* Liste des utilisateurs */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: showUserManagement ? '20px' : '0'
                }}>
                  {users.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        padding: '16px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        border: `1px solid ${user.name === currentUser ? user.color : 'var(--border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      {/* Avatar ou emoji */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: userAvatars[user.id] ? 'transparent' : `${user.color}22`,
                        border: `2px solid ${user.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0,
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        {userAvatars[user.id] ? (
                          <img
                            src={userAvatars[user.id]!}
                            alt={user.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          user.emoji
                        )}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: user.color,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {user.name}
                        </div>
                        {user.name === currentUser && (
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            Vous
                          </div>
                        )}
                      </div>
                      
                      {showUserManagement && (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="btn btn-outline"
                            style={{
                              padding: '6px',
                              minWidth: 'auto'
                            }}
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn btn-outline"
                            style={{
                              padding: '6px',
                              minWidth: 'auto',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              color: '#ef4444'
                            }}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Formulaire d'ajout/modification */}
                {showUserManagement && (
                  <div style={{
                    padding: '20px',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {editingUser ? <Edit2 size={16} /> : <Plus size={16} />}
                      {editingUser ? `Modifier "${editingUser.name}"` : 'Nouvel utilisateur'}
                    </h4>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto',
                      gap: '12px',
                      alignItems: 'end'
                    }}>
                      {/* Avatar (si en mode édition) */}
                      {editingUser && (
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '600',
                            marginBottom: '6px',
                            color: 'var(--text-secondary)'
                          }}>
                            Avatar
                          </label>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: userAvatars[editingUser.id] ? 'transparent' : `${newUserColor}22`,
                              border: `2px solid ${newUserColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              overflow: 'hidden'
                            }}>
                              {userAvatars[editingUser.id] ? (
                                <img
                                  src={userAvatars[editingUser.id]!}
                                  alt={editingUser.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                newUserEmoji
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <button
                                onClick={() => handleSetUserAvatar(editingUser.id)}
                                className="btn btn-outline"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  minWidth: 'auto'
                                }}
                                title="Changer l'avatar"
                              >
                                <Upload size={12} />
                              </button>
                              {userAvatars[editingUser.id] && (
                                <button
                                  onClick={() => handleRemoveUserAvatar(editingUser.id)}
                                  className="btn btn-outline"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    minWidth: 'auto',
                                    borderColor: 'rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444'
                                  }}
                                  title="Supprimer l'avatar"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Nom */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          color: 'var(--text-secondary)'
                        }}>
                          Nom
                        </label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Nom ou pseudo..."
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--background)',
                            color: 'var(--text)',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      {/* Emoji */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          color: 'var(--text-secondary)'
                        }}>
                          Emoji
                        </label>
                        <input
                          type="text"
                          value={newUserEmoji}
                          onChange={(e) => setNewUserEmoji(e.target.value)}
                          maxLength={2}
                          style={{
                            width: '60px',
                            padding: '10px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--background)',
                            color: 'var(--text)',
                            fontSize: '20px',
                            textAlign: 'center'
                          }}
                        />
                      </div>

                      {/* Couleur */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          color: 'var(--text-secondary)'
                        }}>
                          Couleur personnalisée
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="color"
                            value={newUserColor}
                            onChange={(e) => setNewUserColor(e.target.value)}
                            style={{
                              width: '60px',
                              height: '42px',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              background: 'var(--background)',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{
                            padding: '6px 12px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace'
                          }}>
                            {newUserColor.toUpperCase()}
                          </div>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: newUserColor,
                            border: '2px solid var(--border)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={editingUser ? handleUpdateUser : handleCreateUser}
                        className="btn btn-primary"
                        style={{
                          padding: '10px 20px',
                          fontSize: '13px'
                        }}
                      >
                        {editingUser ? (
                          <>
                            <CheckCircle size={16} />
                            Enregistrer
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            Créer
                          </>
                        )}
                      </button>
                      {editingUser ? (
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-outline"
                          style={{
                            padding: '10px 20px',
                            fontSize: '13px'
                          }}
                        >
                          <X size={16} />
                          Annuler
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            const user = users.find(u => u.name === newUserName.trim());
                            if (!user) {
                              setUserError('Créez d\'abord l\'utilisateur');
                              return;
                            }
                            await handleSetUserAvatar(user.id);
                          }}
                          className="btn btn-outline"
                          style={{
                            padding: '10px 20px',
                            fontSize: '13px'
                          }}
                          disabled={!newUserName.trim()}
                        >
                          <Upload size={16} />
                          Ajouter avatar après création
                        </button>
                      )}
                    </div>

                    {/* Erreur */}
                    {userError && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '13px'
                      }}>
                        {userError}
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* ========== COLONNE GAUCHE : SAUVEGARDE ========== */}
            {/* Sauvegarde */}
            <div style={{
                background: 'var(--surface-light)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexShrink: 0
                }}>
                  <Download size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    Sauvegarde
                  </h3>
                </div>

                <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Exportez ou importez votre base de données.
                </p>

                <div style={{ flex: 1 }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <button
                    onClick={handleExport}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px' }}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <div className="loading" style={{ width: '14px', height: '14px' }} />
                        ...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Exporter
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleImport}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px' }}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <div className="loading" style={{ width: '14px', height: '14px' }} />
                        ...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Importer
                      </>
                    )}
                  </button>
                </div>

                {showExportSuccess && (
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    marginBottom: '8px'
                  }}>
                    <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                    Exportée !
                  </div>
                )}

                {showImportSuccess && (
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    marginBottom: '8px'
                  }}>
                    <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                    Importée ! Rechargement...
                  </div>
                )}

                <div style={{
                  padding: '8px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  color: 'var(--text-secondary)'
                }}>
                  ℹ️ Sauvegarde auto à la fermeture.
                </div>
              </div>

              {/* ========== COLONNE DROITE : MAINTENANCE & ANIMES ========== */}
              {/* Maintenance */}
              <div style={{
                background: 'var(--surface-light)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexShrink: 0
                }}>
                  <FolderOpen size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    Maintenance
                  </h3>
                </div>

                <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Nettoyez les dossiers vides.
                </p>

                <div style={{ flex: 1 }} />

                <button
                  onClick={async () => {
                    const result = await window.electronAPI.cleanEmptyFolders();
                    if (result.success) {
                      alert(`✅ ${result.count || 0} dossier(s) vide(s) supprimé(s).`);
                    } else {
                      alert(`❌ Erreur: ${result.error}`);
                    }
                  }}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
                >
                  <FolderOpen size={16} />
                  Nettoyer
                </button>
              </div>

              {/* Animes */}
              <div style={{
                background: 'var(--surface-light)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  flexShrink: 0
                }}>
                  <Tv size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    Animes
                  </h3>
                </div>

                <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Importez votre liste d'animes depuis ADKami/MyAnimeList (format XML).
                </p>

                <div style={{ flex: 1 }} />

                <button
                  onClick={handleImportAnimeXml}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
                  disabled={importingAnimes}
                >
                  {importingAnimes ? (
                    <>
                      <div className="loading" style={{ width: '14px', height: '14px' }} />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Importer XML
                    </>
                  )}
                </button>

                {/* Barre de progression détaillée */}
                {animeImportProgress && importingAnimes && (
                  <div style={{
                    marginTop: '12px',
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)'
                  }}>
                    {/* En-tête avec stats */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--success)' }}>
                          ✅ {animeImportProgress.imported} importés
                        </span>
                        <span style={{ color: 'var(--primary)' }}>
                          ↻ {animeImportProgress.updated} mis à jour
                        </span>
                        {animeImportProgress.errors > 0 && (
                          <span style={{ color: '#fb923c' }}>
                            ⚠️ {animeImportProgress.errors} erreur{animeImportProgress.errors > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Lot {animeImportProgress.currentBatch}/{animeImportProgress.totalBatches}
                      </div>
                    </div>

                    {/* Barre de progression principale */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--background)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: `${(animeImportProgress.currentIndex || 0) / animeImportProgress.total * 100}%`,
                        height: '100%',
                        background: animeImportProgress.phase === 'pause' 
                          ? 'linear-gradient(90deg, #fb923c, #f59e0b)' 
                          : 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {/* Pourcentage et progression */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                        {Math.round((animeImportProgress.currentIndex || 0) / animeImportProgress.total * 100)}%
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {animeImportProgress.currentIndex || 0} / {animeImportProgress.total}
                      </span>
                    </div>

                    {/* Anime en cours ou pause */}
                    {animeImportProgress.phase === 'pause' ? (
                      <div style={{
                        padding: '8px 12px',
                        background: 'rgba(251, 146, 60, 0.1)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#fb923c',
                        textAlign: 'center',
                        fontWeight: '600'
                      }}>
                        ⏸️ Pause : {animeImportProgress.remainingPauseSeconds}s avant le prochain lot
                      </div>
                    ) : animeImportProgress.currentAnime ? (
                      <div style={{
                        padding: '8px 12px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        📺 {animeImportProgress.currentAnime}
                      </div>
                    ) : null}

                    {/* Temps écoulé */}
                    {importStartTime > 0 && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center'
                      }}>
                        ⏱️ Temps écoulé : {Math.floor((Date.now() - importStartTime) / 1000)}s
                      </div>
                    )}
                  </div>
                )}

                {animeImportResult && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: animeImportResult.errors.length > 0 ? 'rgba(251, 146, 60, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: `1px solid ${animeImportResult.errors.length > 0 ? 'rgba(251, 146, 60, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                    fontSize: '11px',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ marginBottom: '4px' }}>
                      ✅ <strong>{animeImportResult.imported}</strong> importés, <strong>{animeImportResult.updated}</strong> mis à jour
                    </div>
                    {animeImportResult.errors.length > 0 && (
                      <div style={{ color: '#fb923c' }}>
                        ⚠️ {animeImportResult.errors.length} erreur(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>
        )}

        {/* ========== ZONE DANGEREUSE ========== */}
        {!loading && (
          <div style={{
            gridColumn: '1 / -1',
            marginTop: '24px',
            background: 'rgba(239, 68, 68, 0.05)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
            }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#ef4444' }}>
                Zone dangereuse
              </h3>
            </div>

            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#fb923c'
            }}>
              ⚠️ <strong>Attention :</strong> Ces actions sont <strong>irréversibles</strong>. Assurez-vous d'avoir une sauvegarde avant de continuer.
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {/* Supprimer données utilisateur */}
              <button
                onClick={handleDeleteUserData}
                className="btn btn-outline"
                style={{
                  justifyContent: 'center',
                  fontSize: '13px',
                  padding: '12px 20px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#ef4444'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                <Trash2 size={16} />
                Supprimer mes données ({currentUser})
              </button>

              {/* Supprimer toutes les données */}
              <button
                onClick={handleDeleteAllData}
                className="btn btn-outline"
                style={{
                  justifyContent: 'center',
                  fontSize: '13px',
                  padding: '12px 20px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  fontWeight: '600'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                }}
              >
                <Trash2 size={16} />
                TOUT supprimer (réinitialiser l'app)
              </button>
            </div>
          </div>
        )}

        {!loading && (
          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{
                minWidth: '200px',
                justifyContent: 'center',
                fontSize: '14px',
                padding: '12px 24px',
                background: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
                color: 'var(--primary)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
              }}
            >
              <X size={18} />
              Fermer
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
}
