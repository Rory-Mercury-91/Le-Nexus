import { LogOut, Minimize2, Search, Settings, User } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfirm } from '../../hooks/common/useConfirm';
import type { AdulteGame, AnimeSerie, ContentPreferences } from '../../types';
import GlobalSearch from '../common/GlobalSearch';
import NexusLogo from '../common/NexusLogo';
import SavingModal from '../modals/common/SavingModal';
import GlobalProgressSidebar from './GlobalProgressSidebar';
import { NavLink } from './components';

interface LayoutProps {
  children: ReactNode;
  currentUser: string;
}

const defaultContentPrefs: ContentPreferences = {
  showMangas: true,
  showAnimes: true,
  showMovies: true,
  showSeries: true,
  showVideos: true,
  showAdulteGame: true,
  showBooks: true,
  showSubscriptions: true
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
    oneShot?: number;
    unclassified?: number;
  } | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<{
    animes: number;
    movies: number;
    series: number;
    adulteGames: number;
  } | null>(null);
  const [gameCounts, setGameCounts] = useState<{
    total: number;
    video: number;
    adulte: number;
  } | null>(null);

  useEffect(() => {
    loadUserData();
    loadContentPreferences();
    loadAvailableContentTypes();
    loadCollectionCounts();
    loadGameCounts();

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
    if (location.pathname.startsWith('/lectures') || location.pathname.startsWith('/books')) {
      loadAvailableContentTypes();
    }
  }, [location.pathname]);

  // Recharger les compteurs quand on navigue vers les différentes collections
  useEffect(() => {
    if (location.pathname.startsWith('/videos') || location.pathname.startsWith('/animes') || location.pathname.startsWith('/movies') || location.pathname.startsWith('/series')) {
      loadCollectionCounts();
    }
    if (location.pathname.startsWith('/games') || location.pathname.startsWith('/adulte-game')) {
      loadCollectionCounts();
      loadGameCounts();
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
      const mergedPrefs = { ...defaultContentPrefs, ...prefs };

      // Migration automatique : si showVideos n'existe pas, le calculer à partir des anciennes préférences
      if (mergedPrefs.showVideos === undefined) {
        mergedPrefs.showVideos = mergedPrefs.showAnimes || mergedPrefs.showMovies || mergedPrefs.showSeries;
        // Sauvegarder la migration
        if (mergedPrefs.showVideos !== undefined) {
          await window.electronAPI.setContentPreferences(currentUser, { showVideos: mergedPrefs.showVideos });
        }
      }

      setContentPrefs(mergedPrefs);
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

      // Filtrer les éléments masqués pour être cohérent avec l'affichage par défaut
      const visibleAnimes = animesData.success && animesData.animes
        ? animesData.animes.filter((anime: AnimeSerie) => !anime.is_masquee)
        : [];
      const visibleMovies = Array.isArray(moviesData)
        ? moviesData.filter((movie: any) => !movie.is_hidden)
        : [];
      const visibleSeries = Array.isArray(tvShowsData)
        ? tvShowsData.filter((series: any) => !series.is_hidden)
        : [];

      setCollectionCounts({
        animes: visibleAnimes.length,
        movies: visibleMovies.length,
        series: visibleSeries.length,
        adulteGames: Array.isArray(adulteGamesData) ? adulteGamesData.length : 0
      });
    } catch (error) {
      console.error('Erreur chargement compteurs collections:', error);
      setCollectionCounts(null);
    }
  };

  const loadGameCounts = async () => {
    try {
      const gamesData = await window.electronAPI.getAdulteGameGames?.({}) || [];
      if (Array.isArray(gamesData)) {
        const counts = {
          total: 0,
          video: 0,
          adulte: 0
        };

        // Filtrer les jeux masqués pour être cohérent avec l'affichage
        const visibleGames = gamesData.filter((game: AdulteGame) => !game.is_hidden || game.is_hidden === 0);
        counts.total = visibleGames.length;

        visibleGames.forEach((game: AdulteGame) => {
          const gameSite = game.game_site || game.plateforme || null;
          if (gameSite === 'RAWG') {
            counts.video++;
          } else {
            // Tout ce qui n'est pas RAWG = jeux adultes
            counts.adulte++;
          }
        });

        setGameCounts(counts);
      }
    } catch (error) {
      console.error('Erreur chargement compteurs de jeux:', error);
      setGameCounts(null);
    }
  };

  // Handlers pour l'expansion mutuellement exclusive
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
          padding: '24px 0 0 0',
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
            <NexusLogo height={36} style={{ whiteSpace: 'nowrap' }} />
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

            {contentPrefs.showSubscriptions && (
              <NavLink to="/subscriptions" icon="💳" isActive={isActive('/subscriptions')}>
                Abonnements
              </NavLink>
            )}

            {contentPrefs.showMangas && (
              <NavLink
                to="/lectures"
                icon="📚"
                isActive={location.pathname.startsWith('/lectures') || location.pathname.startsWith('/books') || location.pathname.startsWith('/bd') || location.pathname.startsWith('/comics')}
              >
                {availableContentTypes ? `Lectures (${(availableContentTypes.manga || 0) + (availableContentTypes.manhwa || 0) + (availableContentTypes.manhua || 0) + (availableContentTypes.lightNovel || 0) + (availableContentTypes.webtoon || 0) + (availableContentTypes.comics || 0) + (availableContentTypes.bd || 0) + (availableContentTypes.books || 0) + (availableContentTypes.oneShot || 0) + (availableContentTypes.unclassified || 0)})` : 'Lectures'}
              </NavLink>
            )}

            {((contentPrefs.showVideos !== undefined ? contentPrefs.showVideos : (contentPrefs.showAnimes || contentPrefs.showMovies || contentPrefs.showSeries))) && (
              <NavLink
                to="/videos/all"
                icon="🎬"
                isActive={location.pathname.startsWith('/videos') || location.pathname.startsWith('/animes') || location.pathname.startsWith('/movies') || location.pathname.startsWith('/series')}
              >
                {(() => {
                  const total = (collectionCounts?.animes || 0) + (collectionCounts?.movies || 0) + (collectionCounts?.series || 0);
                  return `Vidéos (${total})`;
                })()}
              </NavLink>
            )}

            {contentPrefs.showAdulteGame && (
              <NavLink to="/games/all" icon="🎮" isActive={location.pathname.startsWith('/games') || location.pathname.startsWith('/adulte-game')}>
                {gameCounts ? `Jeux (${gameCounts.total})` : 'Jeux'}
              </NavLink>
            )}
          </nav>

          {/* Barre de progression globale */}
          <GlobalProgressSidebar />

          <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'center' }}>
              <Link
                to="/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/settings') ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive('/settings') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s',
                  flex: 1,
                  minHeight: '40px'
                }}
                title="Paramètres"
              >
                <Settings size={18} />
              </Link>
              <button
                onClick={handleMinimize}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--secondary), #3b82f6)',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  flex: 1,
                  minHeight: '40px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                title="Minimiser"
              >
                <Minimize2 size={18} />
              </button>
              <button
                onClick={handleQuit}
                className="btn btn-danger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  borderRadius: '8px',
                  flex: 1,
                  minHeight: '40px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                title="Fermer"
              >
                <LogOut size={18} />
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
            overflowX: 'hidden'
          }}
        >
          {children}
        </main>
      </div>

      {isSaving && <SavingModal userName={currentUser} onComplete={handleSaveComplete} />}
      <ConfirmDialog />
    </>
  );
}
