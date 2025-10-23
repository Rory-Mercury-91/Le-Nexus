import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Download, Edit2, Eye, EyeOff, Folder, FolderOpen, Moon, Plus, Sun, Trash2, Tv, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { AnimeImportProgress, AnimeImportResult } from '../types';

interface UserData {
  id: number;
  name: string;
  emoji: string;
  avatar_path: string | null;
  color: string;
}

export default function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [showGroqApiKey, setShowGroqApiKey] = useState(false);
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
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmoji, setNewUserEmoji] = useState('👤');
  const [newUserColor, setNewUserColor] = useState('#8b5cf6');
  const [userError, setUserError] = useState('');
  const [userAvatars, setUserAvatars] = useState<Record<number, string | null>>({});
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showDatabaseSection, setShowDatabaseSection] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    loadSettings();
    loadTheme();
    loadAutoLaunch();
    loadGroqApiKey();
    
    // Écouter les mises à jour de progression de l'import
    const unsubscribe = window.electronAPI.onAnimeImportProgress((progress) => {
      setAnimeImportProgress(progress);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await window.electronAPI.getTheme();
      if (savedTheme) {
        setTheme(savedTheme as 'dark' | 'light');
      }
    } catch (error) {
      console.error('Erreur chargement thème:', error);
    }
  };

  const loadAutoLaunch = async () => {
    try {
      const enabled = await window.electronAPI.getAutoLaunch();
      setAutoLaunch(enabled);
    } catch (error) {
      console.error('Erreur chargement auto-launch:', error);
    }
  };

  const loadGroqApiKey = async () => {
    try {
      const apiKey = await window.electronAPI.getGroqApiKey();
      setGroqApiKey(apiKey || '');
    } catch (error) {
      console.error('Erreur chargement clé API Groq:', error);
    }
  };

  const handleGroqApiKeyChange = async (newApiKey: string) => {
    try {
      await window.electronAPI.setGroqApiKey(newApiKey);
      setGroqApiKey(newApiKey);
      showToast(newApiKey ? 'Clé API Groq enregistrée' : 'Clé API Groq supprimée', 'success');
    } catch (error) {
      console.error('Erreur sauvegarde clé API Groq:', error);
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

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

  const applyTheme = (newTheme: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleThemeChange = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    // Auto-save
    await window.electronAPI.setTheme(newTheme);
  };

  const handleAutoLaunchChange = async (enabled: boolean) => {
    try {
      const result = await window.electronAPI.setAutoLaunch(enabled);
      if (result.success) {
        setAutoLaunch(enabled);
        if (result.message) {
          showToast(result.message, 'info');
        } else {
          showToast(
            enabled 
              ? 'Démarrage automatique activé' 
              : 'Démarrage automatique désactivé',
            'success'
          );
        }
      } else {
        showToast(result.error || 'Erreur lors de la modification', 'error');
      }
    } catch (error) {
      console.error('Erreur auto-launch:', error);
      showToast('Erreur lors de la modification', 'error');
    }
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
      // Si un avatar a été choisi, le sauvegarder
      if (avatarFile && result.user.id) {
        await window.electronAPI.setUserAvatarFromPath(result.user.id, avatarFile);
      }

      setNewUserName('');
      setNewUserEmoji('👤');
      setNewUserColor('#8b5cf6');
      setAvatarFile(null);
      setAvatarPreview(null);
      setUserError('');
      setShowAddUserForm(false);
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
      // Si un nouvel avatar a été choisi, le sauvegarder
      if (avatarFile) {
        await window.electronAPI.setUserAvatarFromPath(editingUser.id, avatarFile);
      }

      setEditingUser(null);
      setNewUserName('');
      setNewUserEmoji('👤');
      setNewUserColor('#8b5cf6');
      setAvatarFile(null);
      setAvatarPreview(null);
      setUserError('');
      await loadSettings();
    } else {
      setUserError(result.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const confirmed = await confirm({
      title: `Supprimer l'utilisateur "${user.name}"`,
      message: `Cette action supprimera DÉFINITIVEMENT toutes les données de cet utilisateur.\n\nÊtes-vous absolument sûr ?`,
      confirmText: 'Oui, supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      const result = await window.electronAPI.deleteUser(userId);
      if (result.success) {
        showToast({
          title: 'Utilisateur supprimé',
          message: `${user.name} a été supprimé avec succès`,
          type: 'success',
          duration: 3000
        });
        await loadSettings();
      } else {
        showToast({
          title: 'Erreur',
          message: result.error || 'Erreur lors de la suppression',
          type: 'error',
          duration: 5000
        });
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
    setShowAddUserForm(true);
    // Charger l'avatar existant si présent
    setAvatarPreview(userAvatars[user.id] || null);
    setAvatarFile(null); // Pas de nouveau fichier sélectionné
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmoji('👤');
    setNewUserColor('#8b5cf6');
    setAvatarFile(null);
    setAvatarPreview(null);
    setUserError('');
    setShowAddUserForm(false);
  };

  const handleAvatarSelect = async () => {
    const result = await window.electronAPI.chooseAvatarFile();
    if (result.success && result.path) {
      setAvatarFile(result.path);
      // Prévisualiser l'image (convertir le chemin en URL temporaire)
      setAvatarPreview(`file://${result.path}`);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleChangeBaseDirectory = async () => {
    const result = await window.electronAPI.changeBaseDirectory();
    if (result.success && result.path) {
      setBaseDirectory(result.path);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      if (result.message) {
        showToast({
          title: 'Emplacement modifié',
          message: result.message,
          type: 'info',
          duration: 5000
        });
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
        setAnimeImportProgress(null);
        
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
      message: 'Cette action supprimera TOUTES les données de lecture de l\'utilisateur actuel (tomes lus, épisodes vus, etc.). Les séries et tomes ne seront PAS supprimés. Cette action est irréversible !',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (confirmed) {
      try {
        const currentUser = await window.electronAPI.getCurrentUser();
        await window.electronAPI.deleteUserData(currentUser);
        showToast({
          title: 'Données supprimées',
          message: 'Redémarrez l\'application pour voir les changements',
          type: 'success',
          duration: 5000
        });
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showToast({
          title: 'Erreur',
          message: 'Erreur lors de la suppression des données utilisateur',
          type: 'error',
          duration: 5000
        });
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
        showToast({
          title: 'Suppression en cours...',
          message: 'L\'application va redémarrer',
          type: 'info',
          duration: 2000
        });
        setTimeout(() => {
          window.electronAPI.quitApp({ shouldRelaunch: true });
        }, 2000);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showToast({
          title: 'Erreur',
          message: 'Erreur lors de la suppression des données',
          type: 'error',
          duration: 5000
        });
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px' }} className="fade-in">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }} className="fade-in">
      <ConfirmDialog />
      <ToastContainer />
      <div className="container">
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '32px' }}>
          ⚙️ Paramètres
        </h1>

        {/* Grille pour Utilisateurs + Apparence */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Section Gestion des utilisateurs */}
          <div className="card" style={{ padding: '24px' }}>
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
          </div>

          {/* Section Apparence */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
              🎨 Apparence
            </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--text-secondary)'
            }}>
              Thème de l'application
            </label>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleThemeChange('dark')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: theme === 'dark' ? 'var(--primary)' : 'var(--surface)',
                  border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: theme === 'dark' ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Moon size={20} />
                Mode sombre
              </button>

              <button
                onClick={() => handleThemeChange('light')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: theme === 'light' ? 'var(--primary)' : 'var(--surface)',
                  border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: theme === 'light' ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Sun size={20} />
                Mode clair
              </button>
            </div>
          </div>

          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            padding: '12px',
            background: 'var(--surface)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--primary)'
          }}>
            💡 Le thème est automatiquement sauvegardé
          </p>

          {/* Démarrage automatique */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '16px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            >
              <input
                type="checkbox"
                checked={autoLaunch}
                onChange={(e) => handleAutoLaunchChange(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Lancer au démarrage
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Démarrer automatiquement Ma Mangathèque avec Windows
                </div>
              </div>
            </label>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              ℹ️ Désactivé en mode développement
            </p>
          </div>
          </div>
        </div>

        {/* Section Intelligence Artificielle */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
            🤖 Intelligence Artificielle
          </h2>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text-secondary)'
            }}>
              Clé API Groq (optionnel)
            </label>
            
            <div style={{ position: 'relative' }}>
              <input
                type={showGroqApiKey ? "text" : "password"}
                value={groqApiKey}
                onChange={(e) => handleGroqApiKeyChange(e.target.value)}
                placeholder="gsk_..."
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={() => setShowGroqApiKey(!showGroqApiKey)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showGroqApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            padding: '12px',
            background: 'var(--surface)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--primary)',
            marginBottom: '12px'
          }}>
            🌐 Permet la traduction automatique des synopsis d'anime lors de l'import XML
            <br />
            📊 Limite gratuite : 14 400 traductions/jour (30/min)
          </p>

          <a
            href="https://console.groq.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              fontSize: '13px',
              color: 'var(--primary)',
              textDecoration: 'none',
              padding: '8px 12px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '6px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
            }}
          >
            🔗 Obtenir une clé API gratuite
          </a>

          <details style={{ marginTop: '16px' }}>
            <summary style={{
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              padding: '8px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}>
              ℹ️ Comment obtenir une clé API ?
            </summary>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              marginTop: '8px',
              lineHeight: '1.6'
            }}>
              <ol style={{ paddingLeft: '20px', margin: '0' }}>
                <li>Allez sur <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>console.groq.com</a></li>
                <li>Créez un compte gratuit (email + mot de passe)</li>
                <li>Vérifiez votre email si demandé</li>
                <li>Cliquez sur "API Keys" dans le menu</li>
                <li>Cliquez sur "Create API Key"</li>
                <li>Copiez votre clé (elle commence par <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px' }}>gsk_...</code>)</li>
                <li>Collez-la dans le champ ci-dessus</li>
              </ol>
              <p style={{ marginTop: '12px', fontWeight: '600', color: 'var(--warning)' }}>
                ⚠️ Gardez une copie de votre clé dans un endroit sûr. Elle n'est affichée qu'une seule fois !
              </p>
            </div>
          </details>
        </div>

        {/* Formulaire d'ajout/édition (pleine largeur en dessous) */}
        {(showAddUserForm || editingUser) && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              {editingUser ? '✏️ Modifier un utilisateur' : '➕ Ajouter un utilisateur'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  placeholder="Prénom de l'utilisateur"
                  className="input"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: 'var(--text-secondary)'
                }}>
                  Emoji (si pas d'avatar)
                </label>
                <input
                  type="text"
                  value={newUserEmoji}
                  onChange={(e) => setNewUserEmoji(e.target.value)}
                  placeholder="👤"
                  className="input"
                  maxLength={4}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: 'var(--text-secondary)'
                }}>
                  Avatar personnalisé (optionnel)
                </label>
                
                {avatarPreview ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid var(--primary)',
                      flexShrink: 0
                    }}>
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="btn"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--error)',
                        border: '1px solid var(--error)',
                        padding: '8px 12px'
                      }}
                    >
                      <X size={16} />
                      Retirer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAvatarSelect}
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                  >
                    <Upload size={16} />
                    Choisir une image
                  </button>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: 'var(--text-secondary)'
                }}>
                  Couleur
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newUserColor}
                    onChange={(e) => setNewUserColor(e.target.value)}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)'
                  }}>
                    {newUserColor}
                  </span>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: newUserColor,
                      border: '1px solid var(--border)'
                    }}
                  />
                </div>
              </div>
            </div>

            {userError && (
              <div style={{
                marginTop: '16px',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                color: 'var(--error)',
                fontSize: '12px'
              }}>
                {userError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {editingUser ? (
                <>
                  <button
                    onClick={handleUpdateUser}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <CheckCircle size={16} />
                    Mettre à jour
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    <X size={16} />
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreateUser}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <Plus size={16} />
                  Créer l'utilisateur
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section Base de données (Collapsible) */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div
            onClick={() => setShowDatabaseSection(!showDatabaseSection)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginBottom: showDatabaseSection ? '20px' : '0'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Folder size={20} />
              Emplacement de la base de données
            </h2>
            {showDatabaseSection ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>

          {showDatabaseSection && (
            <div style={{ marginTop: '20px' }}>
              <div style={{
                background: 'var(--surface)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all'
              }}>
                {baseDirectory}
              </div>

              <button onClick={handleChangeBaseDirectory} className="btn btn-primary">
                <FolderOpen size={18} />
                Changer l'emplacement
              </button>

              {showSuccess && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '8px',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={18} />
                  Emplacement modifié avec succès !
                </div>
              )}

              <p style={{
                marginTop: '16px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                padding: '12px',
                background: 'var(--surface)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--primary)'
              }}>
                💡 <strong>Configuration globale :</strong> Tous les utilisateurs partagent la même base de données. Ce chemin est commun à l'ensemble de l'application.
              </p>

              {/* Import/Export intégré */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={18} />
                  Import / Export
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <button
                    onClick={handleExport}
                    className="btn btn-primary"
                    disabled={exporting}
                  >
                    <Download size={18} />
                    {exporting ? 'Export en cours...' : 'Exporter'}
                  </button>

                  <button
                    onClick={handleImport}
                    className="btn btn-outline"
                    disabled={importing}
                  >
                    <Upload size={18} />
                    {importing ? 'Import en cours...' : 'Importer'}
                  </button>
                </div>

                {showExportSuccess && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={18} />
                    Base de données exportée avec succès !
                  </div>
                )}

                {showImportSuccess && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={18} />
                    Import réussi ! Rechargement...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section Import Animes */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
            <Tv size={20} style={{ display: 'inline', marginRight: '8px' }} />
            Import d'animes depuis MyAnimeList
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Importez votre liste d'animes depuis un fichier XML exporté de MyAnimeList
          </p>

          <button
            onClick={handleImportAnimeXml}
            className="btn btn-primary"
            disabled={importingAnimes}
          >
            <Upload size={18} />
            {importingAnimes ? 'Import en cours...' : 'Choisir un fichier XML'}
          </button>

          {animeImportProgress && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {/* Informations lots */}
              {animeImportProgress.currentBatch && animeImportProgress.totalBatches && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  📦 Lot {animeImportProgress.currentBatch}/{animeImportProgress.totalBatches}
                </div>
              )}
              
              {/* Progression globale */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {animeImportProgress.currentIndex || animeImportProgress.imported + animeImportProgress.updated} / {animeImportProgress.total}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {Math.round(((animeImportProgress.currentIndex || animeImportProgress.imported + animeImportProgress.updated) / animeImportProgress.total) * 100)}%
                </span>
              </div>
              
              {/* Barre de progression */}
              <div style={{
                width: '100%',
                height: '8px',
                background: 'var(--surface-light)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  width: `${((animeImportProgress.currentIndex || animeImportProgress.imported + animeImportProgress.updated) / animeImportProgress.total) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              
              {/* Anime en cours */}
              {animeImportProgress.currentAnime && (
                <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '12px', fontWeight: '500' }}>
                  🎬 {animeImportProgress.currentAnime}
                </p>
              )}
              
              {/* Statistiques temps réel */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                fontSize: '12px', 
                color: 'var(--text-secondary)', 
                marginTop: '8px' 
              }}>
                <span>✅ {animeImportProgress.imported} importés</span>
                <span>🔄 {animeImportProgress.updated} mis à jour</span>
                {animeImportProgress.errors > 0 && (
                  <span style={{ color: 'var(--error)' }}>⚠️ {animeImportProgress.errors} erreurs</span>
                )}
              </div>
            </div>
          )}

          {animeImportResult && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                Import terminé !
              </h3>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <p>✅ <strong>{animeImportResult.imported}</strong> animes importés</p>
                <p>🔄 <strong>{animeImportResult.updated}</strong> animes mis à jour</p>
                <p>📊 <strong>{animeImportResult.total}</strong> animes au total</p>
                {animeImportResult.errors && animeImportResult.errors.length > 0 && (
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--error)' }}>
                      ⚠️ {animeImportResult.errors.length} erreur(s)
                    </summary>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
                      {animeImportResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i} style={{ color: 'var(--text-secondary)' }}>{err.error}</li>
                      ))}
                      {animeImportResult.errors.length > 5 && (
                        <li style={{ color: 'var(--text-secondary)' }}>
                          ... et {animeImportResult.errors.length - 5} autres
                        </li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section Danger Zone */}
        <div className="card" style={{
          padding: '24px',
          border: '1px solid var(--error)',
          background: 'rgba(239, 68, 68, 0.05)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: 'var(--error)' }}>
            <AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px' }} />
            Zone dangereuse
          </h2>

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
            >
              <Trash2 size={16} />
              Supprimer mes données
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
            >
              <Trash2 size={16} />
              TOUT supprimer (réinitialiser l'app)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
