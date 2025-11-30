import { LogOut, Minimize2, Search, Settings, User } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';
import { useConfirm } from '../../hooks/common/useConfirm';
import type { ContentPreferences } from '../../types';
import GlobalProgressFooter from '../common/GlobalProgressFooter';
import GlobalSearch from '../common/GlobalSearch';
import GradientTitle from '../common/GradientTitle';
import SavingModal from '../modals/common/SavingModal';
import { NavGroup, NavLink } from './components';

interface LayoutProps {
  children: ReactNode;
  currentUser: string;
}

const defaultContentPrefs: ContentPreferences = {
  showMangas: true,
  showAnimes: true,
  showMovies: true,
  showSeries: true,
  showAdulteGame: true,
  showBooks: true
};

export default function Layout({ children, currentUser }: LayoutProps) {
  const location = useLocation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userColor, setUserColor] = useState('#6366f1');
  const [contentPrefs, setContentPrefs] = useState<ContentPreferences>({ ...defaultContentPrefs });
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [availableContentTypes, setAvailableContentTypes] = useState<{
    manga: number;
    manhwa: number;
    manhua: number;
    lightNovel: number;
    webtoon: number;
    comics: number;
    bd: number;
    books: number;
  } | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<{
    animes: number;
    movies: number;
    series: number;
    adulteGames: number;
  } | null>(null);

  // Vérifier si le footer de progression est visible pour ajuster le padding
  const {
    malSyncing,
    animeProgress,
    mangaProgress,
    translating,
    adulteGameUpdating,
    adulteGameProgress,
    isProgressCollapsed
  } = useGlobalProgress();

  const hasActiveProgress = malSyncing ||
    animeProgress !== null ||
    mangaProgress !== null ||
    translating ||
    adulteGameUpdating ||
    adulteGameProgress !== null;

  // Calculer le padding en fonction de l'état collapsed (60px si réduit, 200px si étendu)
  const progressHeaderHeight = hasActiveProgress ? (isProgressCollapsed ? 60 : 200) : 0;

  useEffect(() => {
    loadUserData();
    loadContentPreferences();
    loadAvailableContentTypes();
    loadCollectionCounts();

    // Écouter les changements de préférences en temps réel
    const unsubscribe = window.electronAPI.onContentPreferencesChanged((userName: string, preferences: Partial<ContentPreferences>) => {
      // Mettre à jour uniquement si c'est pour l'utilisateur actuel
      if (userName === currentUser) {
        setContentPrefs(prev => ({ ...defaultContentPrefs, ...prev, ...preferences }));
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

  // Recharger les types de contenu quand on navigue vers /lectures
  useEffect(() => {
    if (location.pathname.startsWith('/lectures') || location.pathname.startsWith('/collection') || location.pathname.startsWith('/books')) {
      loadAvailableContentTypes();
    }
  }, [location.pathname]);

  // Recharger les compteurs quand on navigue vers les différentes collections
  useEffect(() => {
    if (location.pathname.startsWith('/animes') || location.pathname.startsWith('/movies') || location.pathname.startsWith('/series') || location.pathname.startsWith('/adulte-game')) {
      loadCollectionCounts();
    }
  }, [location.pathname]);

  const loadUserData = async () => {
    const image = await window.electronAPI.getUserProfileImage(currentUser);
    setProfileImage(image);

    // Charger la couleur de l'utilisateur
    const users = await window.electronAPI.getAllUsers();
    const user = users.find((u: { name: string; color: string }) => u.name === currentUser);
    if (user) {
      setUserColor(user.color);
    }
  };

  const loadContentPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getContentPreferences(currentUser);
      setContentPrefs({ ...defaultContentPrefs, ...prefs });
    } catch (error) {
      console.error('Erreur chargement préférences de contenu:', error);
      setContentPrefs({ ...defaultContentPrefs });
    }
  };

  const loadAvailableContentTypes = async () => {
    try {
      const types = await window.electronAPI.getAvailableContentTypes?.();
      if (types) {
        setAvailableContentTypes(types);
      }
    } catch (error) {
      console.error('Erreur chargement types de contenu:', error);
      setAvailableContentTypes(null);
    }
  };

  const loadCollectionCounts = async () => {
    try {
      const [animesData, moviesData, tvShowsData, adulteGamesData] = await Promise.all([
        window.electronAPI.getAnimeSeries?.({}) || Promise.resolve({ success: false, animes: [] }),
        window.electronAPI.getMovies?.({}) || Promise.resolve([]),
        window.electronAPI.getTvShows?.({}) || Promise.resolve([]),
        window.electronAPI.getAdulteGameGames?.({}) || Promise.resolve([])
      ]);

      setCollectionCounts({
        animes: animesData.success ? animesData.animes?.length || 0 : 0,
        movies: Array.isArray(moviesData) ? moviesData.length : 0,
        series: Array.isArray(tvShowsData) ? tvShowsData.length : 0,
        adulteGames: Array.isArray(adulteGamesData) ? adulteGamesData.length : 0
      });
    } catch (error) {
      console.error('Erreur chargement compteurs collections:', error);
      setCollectionCounts(null);
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
          width: '260px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 100
        }}>
          <div style={{
            padding: '12px 24px',
            marginBottom: '8px',
            height: '56px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <GradientTitle fontSize="24px" style={{ whiteSpace: 'nowrap' }}>
              Nexus
            </GradientTitle>
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
              display: 'flex',
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
            padding: '16px 24px',
            marginBottom: '24px',
            background: 'var(--surface-light)',
            borderLeft: `4px solid ${userColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
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
                whiteSpace: 'nowrap'
              }}>
                {currentUser}
              </span>
            </div>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
            <NavLink to="/" icon="🏠" isActive={isActive('/')}>
              Tableau de bord
            </NavLink>

            {contentPrefs.showMangas && (
              <NavGroup
                icon="📚"
                label={availableContentTypes ? `Lectures (${(availableContentTypes.manga || 0) + (availableContentTypes.manhwa || 0) + (availableContentTypes.manhua || 0) + (availableContentTypes.lightNovel || 0) + (availableContentTypes.webtoon || 0) + (availableContentTypes.comics || 0) + (availableContentTypes.bd || 0) + (availableContentTypes.books || 0)})` : 'Lectures'}
                defaultExpanded={location.pathname.startsWith('/lectures') || location.pathname.startsWith('/collection') || location.pathname.startsWith('/books')}
              >
                <NavLink to="/lectures" icon="📚" isActive={isActive('/lectures')}>
                  {availableContentTypes ? `Tout (${(availableContentTypes.manga || 0) + (availableContentTypes.manhwa || 0) + (availableContentTypes.manhua || 0) + (availableContentTypes.lightNovel || 0) + (availableContentTypes.webtoon || 0) + (availableContentTypes.comics || 0) + (availableContentTypes.bd || 0) + (availableContentTypes.books || 0)})` : 'Tout'}
                </NavLink>
                {availableContentTypes && availableContentTypes.manga > 0 && (
                  <NavLink to="/collection?media_type=Manga" icon="📘" isActive={location.pathname === '/collection' && location.search.includes('media_type=Manga')}>
                    Manga ({availableContentTypes.manga})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.manhwa > 0 && (
                  <NavLink to="/collection?media_type=Manhwa" icon="📙" isActive={location.pathname === '/collection' && location.search.includes('media_type=Manhwa')}>
                    Manhwa ({availableContentTypes.manhwa})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.manhua > 0 && (
                  <NavLink to="/collection?media_type=Manhua" icon="📕" isActive={location.pathname === '/collection' && location.search.includes('media_type=Manhua')}>
                    Manhua ({availableContentTypes.manhua})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.lightNovel > 0 && (
                  <NavLink to="/collection?media_type=Light Novel" icon="📓" isActive={location.pathname === '/collection' && (location.search.includes('media_type=Light+Novel') || location.search.includes('media_type=Light%20Novel'))}>
                    Light Novel ({availableContentTypes.lightNovel})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.webtoon > 0 && (
                  <NavLink to="/collection?media_type=Webtoon" icon="📱" isActive={location.pathname === '/collection' && location.search.includes('media_type=Webtoon')}>
                    Webtoon ({availableContentTypes.webtoon})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.comics > 0 && (
                  <NavLink to="/comics" icon="🦸" isActive={isActive('/comics')}>
                    Comics ({availableContentTypes.comics})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.bd > 0 && (
                  <NavLink to="/bd" icon="📗" isActive={isActive('/bd')}>
                    BD ({availableContentTypes.bd})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.books > 0 && (
                  <NavLink to="/books" icon="📖" isActive={isActive('/books')}>
                    Livres ({availableContentTypes.books})
                  </NavLink>
                )}
              </NavGroup>
            )}

            {contentPrefs.showAnimes && (
              <NavLink to="/animes" icon="🎬" isActive={isActive('/animes')}>
                {collectionCounts ? `Animes (${collectionCounts.animes})` : 'Animes'}
              </NavLink>
            )}

            {contentPrefs.showMovies && (
              <NavLink to="/movies" icon="🎞️" isActive={isActive('/movies')}>
                {collectionCounts ? `Films (${collectionCounts.movies})` : 'Films'}
              </NavLink>
            )}

            {contentPrefs.showSeries && (
              <NavLink to="/series" icon="📺" isActive={isActive('/series')}>
                {collectionCounts ? `Séries (${collectionCounts.series})` : 'Séries'}
              </NavLink>
            )}

            {contentPrefs.showAdulteGame && (
              <NavLink to="/adulte-game" icon="🎮" isActive={isActive('/adulte-game')}>
                {collectionCounts ? `Jeux adulte (${collectionCounts.adulteGames})` : 'Jeux adulte'}
              </NavLink>
            )}
          </nav>

          <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
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
                  justifyContent: 'flex-start',
                  minHeight: '44px'
                }}
              >
                <Settings size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>Paramètres</span>
              </Link>
              <button
                onClick={handleMinimize}
                className="btn"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  marginTop: '8px',
                  background: 'linear-gradient(135deg, var(--secondary), #3b82f6)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  minHeight: '44px',
                  gap: '12px'
                }}
              >
                <Minimize2 size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>Minimiser</span>
              </button>
              <button
                onClick={handleQuit}
                className="btn btn-danger"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '12px',
                  minHeight: '44px',
                  gap: '12px'
                }}
              >
                <LogOut size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>Fermer</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          id="app-scroll-container"
          style={{
            flex: 1,
            marginLeft: '260px',
            minHeight: '100vh',
            overflowY: 'scroll',
            overflowX: 'hidden',
            paddingTop: `${progressHeaderHeight}px` // Espace pour le header de progression qui s'adapte à l'état collapsed
          }}
        >
          {children}
        </main>
      </div>

      {/* Header de progression global (en haut de la page) */}
      <GlobalProgressFooter />

      {isSaving && <SavingModal userName={currentUser} onComplete={handleSaveComplete} />}
      <ConfirmDialog />
    </>
  );
}
