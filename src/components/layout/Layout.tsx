import { ChevronLeft, ChevronRight, LogOut, Minimize2, Search, Settings, User } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfirm } from '../../hooks/useConfirm';
import GlobalSearch from '../common/GlobalSearch';
import SavingModal from '../modals/common/SavingModal';

interface LayoutProps {
  children: ReactNode;
  currentUser: string;
}

export default function Layout({ children, currentUser }: LayoutProps) {
  const location = useLocation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userColor, setUserColor] = useState('#6366f1');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contentPrefs, setContentPrefs] = useState({ showMangas: true, showAnimes: true, showAvn: true });
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  useEffect(() => {
    loadUserData();
    loadContentPreferences();
    
    // Écouter les changements de préférences en temps réel
    const unsubscribe = window.electronAPI.onContentPreferencesChanged((userName, preferences) => {
      // Mettre à jour uniquement si c'est pour l'utilisateur actuel
      if (userName === currentUser) {
        setContentPrefs(preferences);
      }
    });
    
    // Raccourci clavier Ctrl+K pour recherche globale
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentUser]);

  const loadUserData = async () => {
    const image = await window.electronAPI.getUserProfileImage(currentUser);
    setProfileImage(image);
    
    // Charger la couleur de l'utilisateur
    const users = await window.electronAPI.getAllUsers();
    const user = users.find(u => u.name === currentUser);
    if (user) {
      setUserColor(user.color);
    }
  };
  
  const loadContentPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getContentPreferences(currentUser);
      setContentPrefs(prefs);
    } catch (error) {
      console.error('Erreur chargement préférences de contenu:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const handleQuit = async () => {
    const confirmed = await confirm({
      title: 'Fermer l\'application',
      message: 'Vos modifications seront automatiquement sauvegardées. Voulez-vous fermer l\'application ?',
      confirmText: 'Fermer',
      cancelText: 'Annuler',
      isDanger: false
    });

    if (!confirmed) return;

    setIsSaving(true);
  };

  const handleSaveComplete = async () => {
    await window.electronAPI.quitApp();
  };

  const handleMinimize = async () => {
    await window.electronAPI.minimizeToTray();
  };

  return (
    <>
    <GlobalSearch 
      isOpen={showGlobalSearch} 
      onClose={() => setShowGlobalSearch(false)}
      currentUser={currentUser}
    />
      
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: isCollapsed ? '80px' : '260px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 100,
        transition: 'width 0.3s ease'
      }}>
        {/* Toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute',
            right: '-16px',
            top: '24px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            border: '2px solid var(--surface)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 101,
            transition: 'all 0.3s ease',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.8), 0 4px 16px rgba(0, 0, 0, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)';
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div style={{ 
          padding: '12px 24px', 
          marginBottom: '8px', 
          visibility: isCollapsed ? 'hidden' : 'visible', 
          height: '56px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            whiteSpace: 'nowrap'
          }}>
            Le Nexus
          </h1>
        </div>

        {/* Bouton recherche globale */}
        <button
          onClick={() => setShowGlobalSearch(true)}
          style={{
            margin: '0 16px 16px',
            padding: '10px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            display: isCollapsed ? 'none' : 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover)';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} />
            <span>Rechercher...</span>
          </div>
          <kbd style={{
            padding: '2px 6px',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            Ctrl+K
          </kbd>
        </button>

        {/* Utilisateur connecté */}
        <div style={{
          padding: isCollapsed ? '16px 12px' : '16px 24px',
          marginBottom: '24px',
          background: 'var(--surface-light)',
          borderLeft: `4px solid ${userColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          minHeight: '80px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${userColor}`,
              flexShrink: 0,
              background: `${userColor}15`,
              boxShadow: `0 0 12px ${userColor}66, 0 4px 8px rgba(0, 0, 0, 0.3)`,
              position: 'relative',
              transition: 'all 0.3s ease'
            }}>
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt={currentUser}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: userColor,
                  background: 'var(--surface)'
                }}>
                  <User size={28} />
                </div>
              )}
            </div>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--text)', 
              whiteSpace: 'nowrap',
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? '0' : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.2s ease'
            }}>
              {currentUser}
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: isCollapsed ? '0 12px' : '0 16px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive('/') ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive('/') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              fontWeight: isActive('/') ? '600' : '400',
              transition: 'all 0.2s',
              minHeight: '44px'
            }}
            title={isCollapsed ? 'Tableau de bord' : ''}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🏠</span>
            <span style={{ 
              whiteSpace: 'nowrap',
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? '0' : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.2s ease'
            }}>Tableau de bord</span>
          </Link>

          {contentPrefs.showMangas && (
            <Link
              to="/collection"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive('/collection') ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive('/collection') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                fontWeight: isActive('/collection') ? '600' : '400',
                transition: 'all 0.2s',
                minHeight: '44px'
              }}
              title={isCollapsed ? 'Mangas' : ''}
            >
              <span style={{ fontSize: '20px', flexShrink: 0 }}>📚</span>
              <span style={{ 
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? '0' : 'auto',
                overflow: 'hidden',
                transition: 'opacity 0.2s ease, width 0.2s ease'
              }}>Mangas</span>
            </Link>
          )}

          {contentPrefs.showAnimes && (
            <Link
              to="/animes"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive('/animes') ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive('/animes') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              fontWeight: isActive('/animes') ? '600' : '400',
              transition: 'all 0.2s',
              minHeight: '44px'
            }}
            title={isCollapsed ? 'Animes' : ''}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎬</span>
            <span style={{ 
              whiteSpace: 'nowrap',
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? '0' : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.2s ease'
            }}>Animes</span>
            </Link>
          )}

          {/* AVN (Adult Visual Novels) */}
          {contentPrefs.showAvn && (
            <Link
              to="/avn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive('/avn') ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive('/avn') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              fontWeight: isActive('/avn') ? '600' : '400',
              transition: 'all 0.2s',
              minHeight: '44px'
            }}
            title={isCollapsed ? 'AVN' : ''}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎮</span>
            <span style={{ 
              whiteSpace: 'nowrap',
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? '0' : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.2s ease'
            }}>AVN</span>
            </Link>
          )}
        </nav>

        <div style={{ padding: isCollapsed ? '12px' : '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              to="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive('/settings') ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive('/settings') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                fontWeight: isActive('/settings') ? '600' : '400',
                border: '1px solid var(--border)',
                transition: 'all 0.2s',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                minHeight: '44px'
              }}
              title={isCollapsed ? 'Paramètres' : ''}
            >
              <Settings size={18} style={{ flexShrink: 0 }} />
              <span style={{ 
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? '0' : 'auto',
                overflow: 'hidden',
                transition: 'opacity 0.2s ease, width 0.2s ease'
              }}>Paramètres</span>
            </Link>
            <button
              onClick={handleMinimize}
              className="btn"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                marginTop: '8px',
                background: 'linear-gradient(135deg, var(--secondary), #3b82f6)',
                color: 'white',
                border: 'none',
                padding: '12px',
                minHeight: '44px'
              }}
              title={isCollapsed ? 'Minimiser' : ''}
            >
              <Minimize2 size={18} style={{ flexShrink: 0 }} />
              <span style={{ 
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? '0' : 'auto',
                overflow: 'hidden',
                transition: 'opacity 0.2s ease, width 0.2s ease'
              }}>Minimiser</span>
            </button>
            <button
              onClick={handleQuit}
              className="btn btn-danger"
              style={{ 
                width: '100%', 
                justifyContent: 'center',
                padding: '12px',
                minHeight: '44px'
              }}
              title={isCollapsed ? 'Fermer' : ''}
            >
              <LogOut size={18} style={{ flexShrink: 0 }} />
              <span style={{ 
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? '0' : 'auto',
                overflow: 'hidden',
                transition: 'opacity 0.2s ease, width 0.2s ease'
              }}>Fermer</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ 
        flex: 1, 
        marginLeft: isCollapsed ? '96px' : '260px',
        minHeight: '100vh',
        overflow: 'auto',
        transition: 'margin-left 0.3s ease'
      }}>
        {children}
      </main>
    </div>

    {isSaving && <SavingModal userName={currentUser} onComplete={handleSaveComplete} />}
    <ConfirmDialog />
    </>
  );
}
