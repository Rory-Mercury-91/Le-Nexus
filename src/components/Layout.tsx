import { BookOpen, Home, LogOut, Minimize2, Settings, Tv, User } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import SavingModal from './SavingModal';
import SettingsModal from './SettingsModal';

interface LayoutProps {
  children: ReactNode;
  currentUser: string;
}

export default function Layout({ children, currentUser }: LayoutProps) {
  const location = useLocation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadProfileImage();
  }, [currentUser]);

  const loadProfileImage = async () => {
    const image = await window.electronAPI.getUserProfileImage(currentUser);
    setProfileImage(image);
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '260px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        zIndex: 100
      }}>
        <div style={{ padding: '0 24px', marginBottom: '16px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Ma Mangathèque
          </h1>
        </div>

        {/* Utilisateur connecté */}
        <div style={{
          padding: '12px 24px',
          marginBottom: '24px',
          background: 'var(--surface-light)',
          borderLeft: '4px solid var(--primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--primary)',
              flexShrink: 0,
              background: 'var(--surface)'
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
                  color: 'var(--primary)'
                }}>
                  <User size={20} />
                </div>
              )}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
              {currentUser}
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive('/') ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive('/') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              fontWeight: isActive('/') ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            <Home size={20} />
            Tableau de bord
          </Link>

          <Link
            to="/collection"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive('/collection') ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive('/collection') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              fontWeight: isActive('/collection') ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            <BookOpen size={20} />
            Mangas
          </Link>

          <Link
            to="/animes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive('/animes') ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive('/animes') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              fontWeight: isActive('/animes') ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            <Tv size={20} />
            Animes
          </Link>
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Settings size={18} />
              Paramètres
            </button>
            <button
              onClick={handleMinimize}
              className="btn"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                marginTop: '8px',
                background: 'linear-gradient(135deg, var(--secondary), #3b82f6)',
                color: 'white',
                border: 'none'
              }}
            >
              <Minimize2 size={18} />
              Minimiser
            </button>
            <button
              onClick={handleQuit}
              className="btn btn-danger"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <LogOut size={18} />
              Fermer
            </button>
          </div>
        </div>
      {showSettings && <SettingsModal currentUser={currentUser} onClose={() => { setShowSettings(false); loadProfileImage(); }} />}
      {isSaving && <SavingModal userName={currentUser} onComplete={handleSaveComplete} />}
      <ConfirmDialog />
      </aside>

      {/* Main content */}
      <main style={{ 
        flex: 1, 
        marginLeft: '260px',
        minHeight: '100vh',
        overflow: 'auto'
      }}>
        {children}
      </main>
    </div>
  );
}
