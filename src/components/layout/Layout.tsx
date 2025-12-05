import { LogOut, Minimize2, Search, Settings, User } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';
import { useConfirm } from '../../hooks/common/useConfirm';
import type { AdulteGame, AnimeSerie, ContentPreferences } from '../../types';
import GlobalProgressFooter from '../common/GlobalProgressFooter';
import GlobalSearch from '../common/GlobalSearch';
import NexusLogo from '../common/NexusLogo';
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
  showVideos: true,
  showAdulteGame: true,
  showBooks: true
};

export default function Layout({ children, currentUser }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [animeTypeCounts, setAnimeTypeCounts] = useState<{
    TV: number;
    OVA: number;
    ONA: number;
    Movie: number;
    Special: number;
    Unclassified: number;
    total: number;
  } | null>(null);
  const [gameCounts, setGameCounts] = useState<{
    total: number;
    video: number;
    adulte: number;
  } | null>(null);

  // États pour gérer l'expansion mutuellement exclusive
  const [lecturesExpanded, setLecturesExpanded] = useState(
    location.pathname.startsWith('/lectures') ||
    location.pathname.startsWith('/books')
  );
  const [videosExpanded, setVideosExpanded] = useState(
    location.pathname.startsWith('/videos') ||
    location.pathname.startsWith('/animes') ||
    location.pathname.startsWith('/movies') ||
    location.pathname.startsWith('/series')
  );
  const [gamesExpanded, setGamesExpanded] = useState(
    location.pathname.startsWith('/games') ||
    location.pathname.startsWith('/adulte-game')
  );

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
      loadAnimeTypeCounts();
    }
    if (location.pathname.startsWith('/games') || location.pathname.startsWith('/adulte-game')) {
      loadCollectionCounts();
      loadGameCounts();
    }
  }, [location.pathname]);

  // Mettre à jour l'expansion basée sur la route actuelle
  useEffect(() => {
    const isLectures = location.pathname.startsWith('/lectures') ||
      location.pathname.startsWith('/books') ||
      location.pathname.startsWith('/bd') ||
      location.pathname.startsWith('/comics');
    const isVideos = location.pathname.startsWith('/videos') ||
      location.pathname.startsWith('/animes') ||
      location.pathname.startsWith('/movies') ||
      location.pathname.startsWith('/series');
    const isGames = location.pathname.startsWith('/games') ||
      location.pathname.startsWith('/adulte-game');

    setLecturesExpanded(isLectures);
    setVideosExpanded(isVideos);
    setGamesExpanded(isGames);
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

  /**
   * Normalise le type d'anime pour gérer les variantes (tv_special -> Special, TV Special -> Special, etc.)
   */
  const normalizeAnimeType = (type: string | null | undefined): string => {
    if (!type) return '';

    const trimmed = type.trim();

    // Si c'est déjà un type reconnu (avec majuscules), le retourner tel quel
    const recognizedTypes = ['TV', 'OVA', 'ONA', 'Movie', 'Special', 'Music'];
    if (recognizedTypes.includes(trimmed)) {
      return trimmed;
    }

    // Normaliser en minuscules et remplacer underscores/tirets par espaces
    const normalized = trimmed.toLowerCase().replace(/[_-]/g, ' ').trim();

    // Mapping des variantes vers les types standardisés (ordre important : plus spécifique d'abord)
    // Vérifier d'abord les types contenant "special" (tv special, tv_special, etc.)
    if (normalized.includes('special')) {
      return 'Special';
    }
    // Vérifier ensuite les types TV simples (mais pas "tv special" qui a déjà été capturé)
    if (normalized === 'tv') {
      return 'TV';
    }
    if (normalized === 'ova') {
      return 'OVA';
    }
    if (normalized === 'ona') {
      return 'ONA';
    }
    if (normalized === 'movie' || normalized === 'film') {
      return 'Movie';
    }
    if (normalized === 'music') {
      return 'Music';
    }

    // Vérifier aussi les variantes avec majuscules directement (TV Special, TV_Special, etc.)
    const upperNormalized = trimmed.replace(/[_-]/g, ' ').trim();
    if (upperNormalized === 'TV Special' || upperNormalized === 'TV SPECIAL' || upperNormalized.toLowerCase().includes('special')) {
      return 'Special';
    }

    // Si aucune correspondance, retourner le type original (sera classé comme "Non classé")
    return trimmed;
  };

  const loadAnimeTypeCounts = async () => {
    try {
      const animesData = await window.electronAPI.getAnimeSeries?.({}) || { success: false, animes: [] };
      if (animesData.success && animesData.animes) {
        const counts = {
          TV: 0,
          OVA: 0,
          ONA: 0,
          Movie: 0,
          Special: 0,
          Unclassified: 0,
          total: 0
        };

        // Filtrer les animes masqués pour être cohérent avec l'affichage
        const visibleAnimes = animesData.animes.filter((anime: AnimeSerie) => !anime.is_masquee);
        counts.total = visibleAnimes.length;

        visibleAnimes.forEach((anime: AnimeSerie) => {
          // Normaliser le type pour gérer les variantes
          const normalizedType = normalizeAnimeType(anime.type);

          if (normalizedType === 'TV') counts.TV++;
          else if (normalizedType === 'OVA') counts.OVA++;
          else if (normalizedType === 'ONA') counts.ONA++;
          else if (normalizedType === 'Movie') counts.Movie++;
          else if (normalizedType === 'Special') counts.Special++;
          else counts.Unclassified++; // Tous les autres cas (null, '', ou types non reconnus)
        });

        setAnimeTypeCounts(counts);
      }
    } catch (error) {
      console.error('Erreur chargement compteurs types animes:', error);
      setAnimeTypeCounts(null);
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
  const handleLecturesToggle = () => {
    if (!lecturesExpanded) {
      setLecturesExpanded(true);
      setVideosExpanded(false);
      setGamesExpanded(false);
    } else {
      setLecturesExpanded(false);
    }
  };

  const handleVideosToggle = () => {
    if (!videosExpanded) {
      setVideosExpanded(true);
      setLecturesExpanded(false);
      setGamesExpanded(false);
      // Rediriger automatiquement vers /videos si on n'est pas déjà dans une section Vidéos
      if (!location.pathname.startsWith('/videos') &&
        !location.pathname.startsWith('/animes') &&
        !location.pathname.startsWith('/movies') &&
        !location.pathname.startsWith('/series')) {
        navigate('/videos/all');
      }
    } else {
      setVideosExpanded(false);
    }
  };

  const handleGamesToggle = () => {
    if (!gamesExpanded) {
      setGamesExpanded(true);
      setLecturesExpanded(false);
      setVideosExpanded(false);
      // Rediriger automatiquement vers /games/all si on n'est pas déjà dans une section Games
      if (!location.pathname.startsWith('/games') && !location.pathname.startsWith('/adulte-game')) {
        navigate('/games/all');
      }
    } else {
      setGamesExpanded(false);
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

            <NavLink to="/subscriptions" icon="💳" isActive={isActive('/subscriptions')}>
              Abonnements
            </NavLink>

            {contentPrefs.showMangas && (
              <NavGroup
                icon="📚"
                label={availableContentTypes ? `Lectures (${(availableContentTypes.manga || 0) + (availableContentTypes.manhwa || 0) + (availableContentTypes.manhua || 0) + (availableContentTypes.lightNovel || 0) + (availableContentTypes.webtoon || 0) + (availableContentTypes.comics || 0) + (availableContentTypes.bd || 0) + (availableContentTypes.books || 0) + (availableContentTypes.oneShot || 0) + (availableContentTypes.unclassified || 0)})` : 'Lectures'}
                isExpanded={lecturesExpanded}
                onToggle={handleLecturesToggle}
                to="/lectures"
              >
                <NavLink to="/lectures" icon="📚" isActive={isActive('/lectures')}>
                  {availableContentTypes ? `Tout (${(availableContentTypes.manga || 0) + (availableContentTypes.manhwa || 0) + (availableContentTypes.manhua || 0) + (availableContentTypes.lightNovel || 0) + (availableContentTypes.webtoon || 0) + (availableContentTypes.comics || 0) + (availableContentTypes.bd || 0) + (availableContentTypes.books || 0) + (availableContentTypes.oneShot || 0) + (availableContentTypes.unclassified || 0)})` : 'Tout'}
                </NavLink>
                {availableContentTypes && availableContentTypes.manga > 0 && (
                  <NavLink to="/lectures/manga" icon="📘" isActive={isActive('/lectures/manga')} isSubCategory>
                    Manga ({availableContentTypes.manga})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.manhwa > 0 && (
                  <NavLink to="/lectures/manhwa" icon="📙" isActive={isActive('/lectures/manhwa')} isSubCategory>
                    Manhwa ({availableContentTypes.manhwa})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.manhua > 0 && (
                  <NavLink to="/lectures/manhua" icon="📕" isActive={isActive('/lectures/manhua')} isSubCategory>
                    Manhua ({availableContentTypes.manhua})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.lightNovel > 0 && (
                  <NavLink to="/lectures/light-novel" icon="📓" isActive={isActive('/lectures/light-novel')} isSubCategory>
                    Light Novel ({availableContentTypes.lightNovel})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.webtoon > 0 && (
                  <NavLink to="/lectures/webtoon" icon="📱" isActive={isActive('/lectures/webtoon')} isSubCategory>
                    Webtoon ({availableContentTypes.webtoon})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.comics > 0 && (
                  <NavLink to="/lectures/comics" icon="🦸" isActive={isActive('/lectures/comics')} isSubCategory>
                    Comics ({availableContentTypes.comics})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.bd > 0 && (
                  <NavLink to="/lectures/bd" icon="📗" isActive={isActive('/lectures/bd')} isSubCategory>
                    BD ({availableContentTypes.bd})
                  </NavLink>
                )}
                {availableContentTypes && availableContentTypes.books > 0 && (
                  <NavLink to="/lectures/books" icon="📖" isActive={isActive('/lectures/books')} isSubCategory>
                    Livres ({availableContentTypes.books})
                  </NavLink>
                )}
                {availableContentTypes && (availableContentTypes.oneShot || 0) > 0 && (
                  <NavLink to="/lectures/one-shot" icon="📄" isActive={isActive('/lectures/one-shot')} isSubCategory>
                    One-shot ({(availableContentTypes.oneShot || 0)})
                  </NavLink>
                )}
                {availableContentTypes && (availableContentTypes.unclassified || 0) > 0 && (
                  <NavLink to="/lectures/unclassified" icon="❓" isActive={isActive('/lectures/unclassified')} isSubCategory>
                    Non classé ({(availableContentTypes.unclassified || 0)})
                  </NavLink>
                )}
              </NavGroup>
            )}

            {((contentPrefs.showVideos !== undefined ? contentPrefs.showVideos : (contentPrefs.showAnimes || contentPrefs.showMovies || contentPrefs.showSeries))) && (
              <NavGroup
                icon="🎬"
                label={(() => {
                  const total = (collectionCounts?.animes || 0) + (collectionCounts?.movies || 0) + (collectionCounts?.series || 0);
                  return `Vidéos (${total})`;
                })()}
                isExpanded={videosExpanded}
                onToggle={handleVideosToggle}
                to="/videos/all"
              >
                {/* Catégorie "Tout" - affiche toutes les vidéos */}
                <NavLink
                  to="/videos/all"
                  icon="🎬"
                  isActive={location.pathname === '/videos/all'}
                >
                  {(() => {
                    const total = (collectionCounts?.animes || 0) + (collectionCounts?.movies || 0) + (collectionCounts?.series || 0);
                    return `Tout (${total})`;
                  })()}
                </NavLink>

                {/* Sous-catégories d'animes - affichées uniquement si elles ont au moins une entrée */}
                {((contentPrefs.showVideos !== undefined ? contentPrefs.showVideos : (contentPrefs.showAnimes || contentPrefs.showMovies || contentPrefs.showSeries))) && (
                  <>
                    {(animeTypeCounts?.TV || 0) > 0 && (
                      <NavLink
                        to="/videos/tv"
                        icon="📺"
                        isActive={location.pathname === '/videos/tv'}
                        isSubCategory={true}
                      >
                        TV ({animeTypeCounts?.TV || 0})
                      </NavLink>
                    )}
                    {(animeTypeCounts?.ONA || 0) > 0 && (
                      <NavLink
                        to="/videos/ona"
                        icon="🌐"
                        isActive={location.pathname === '/videos/ona'}
                        isSubCategory={true}
                      >
                        ONA ({animeTypeCounts?.ONA || 0})
                      </NavLink>
                    )}
                    {(animeTypeCounts?.OVA || 0) > 0 && (
                      <NavLink
                        to="/videos/ova"
                        icon="💿"
                        isActive={location.pathname === '/videos/ova'}
                        isSubCategory={true}
                      >
                        OVA ({animeTypeCounts?.OVA || 0})
                      </NavLink>
                    )}
                    {(animeTypeCounts?.Movie || 0) > 0 && (
                      <NavLink
                        to="/videos/movie-anime"
                        icon="🎞️"
                        isActive={location.pathname === '/videos/movie-anime'}
                        isSubCategory={true}
                      >
                        Films animé ({animeTypeCounts?.Movie || 0})
                      </NavLink>
                    )}
                    {(animeTypeCounts?.Special || 0) > 0 && (
                      <NavLink
                        to="/videos/special"
                        icon="⭐"
                        isActive={location.pathname === '/videos/special'}
                        isSubCategory={true}
                      >
                        Spécial ({animeTypeCounts?.Special || 0})
                      </NavLink>
                    )}
                    {(animeTypeCounts?.Unclassified || 0) > 0 && (
                      <NavLink
                        to="/videos/unclassified"
                        icon="❓"
                        isActive={location.pathname === '/videos/unclassified'}
                        isSubCategory={true}
                      >
                        Non classé ({animeTypeCounts?.Unclassified || 0})
                      </NavLink>
                    )}
                  </>
                )}

                {/* Films et Séries comme sous-catégories - affichées uniquement si elles ont au moins une entrée */}
                {(collectionCounts?.movies || 0) > 0 && (
                  <NavLink
                    to="/videos/movies"
                    icon="🎞️"
                    isActive={location.pathname === '/videos/movies'}
                    isSubCategory={true}
                  >
                    Films ({collectionCounts?.movies || 0})
                  </NavLink>
                )}

                {(collectionCounts?.series || 0) > 0 && (
                  <NavLink
                    to="/videos/series"
                    icon="📺"
                    isActive={location.pathname === '/videos/series'}
                    isSubCategory={true}
                  >
                    Séries ({collectionCounts?.series || 0})
                  </NavLink>
                )}
              </NavGroup>
            )}

            {contentPrefs.showAdulteGame && (
              <NavGroup
                icon="🎮"
                label={gameCounts ? `Jeux (${gameCounts.total})` : 'Jeux'}
                isExpanded={gamesExpanded}
                onToggle={handleGamesToggle}
                to="/games/all"
              >
                <NavLink to="/games/all" icon="🎮" isActive={location.pathname === '/games/all' || location.pathname === '/games'}>
                  {gameCounts ? `Tout (${gameCounts.total})` : 'Tout'}
                </NavLink>
                {gameCounts && gameCounts.video > 0 && (
                  <NavLink to="/games/video" icon="🎮" isActive={location.pathname === '/games/video'} isSubCategory>
                    Jeux vidéo ({gameCounts.video})
                  </NavLink>
                )}
                {gameCounts && gameCounts.adulte > 0 && (
                  <NavLink to="/games/adulte" icon="🎮" isActive={location.pathname === '/games/adulte'} isSubCategory>
                    Jeux adulte ({gameCounts.adulte})
                  </NavLink>
                )}
              </NavGroup>
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
