import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import ImportingOverlay from './components/common/ImportingOverlay';
import ProtectedContent from './components/common/ProtectedContent';
import UserSelector from './components/common/UserSelector';
import Layout from './components/layout/Layout';
import OnboardingWizard from './components/layout/OnboardingWizard';
import SplashScreen from './components/layout/SplashScreen';
import { GlobalProgressProvider } from './contexts/GlobalProgressContext';
import { AdulteGameLockProvider, useAdulteGameLock } from './hooks/useAdulteGameLock';
import { useBackendLogger } from './hooks/useBackendLogger';
import AdulteGameDetail from './pages/AdulteGame/AdulteGameDetail';
import GamesAll from './pages/Games/All';
import GamesVideoGames from './pages/Games/VideoGames';
import GamesAdulteGames from './pages/Games/AdulteGames';
import RawgGameDetail from './pages/Games/RawgGameDetail';
import AnimeDetail from './pages/Animes/AnimeDetail';
import BookDetail from './pages/Books/BookDetail';
import Dashboard from './pages/Dashboard/Dashboard';
import Subscriptions from './pages/Subscriptions/Subscriptions';
import LecturesAll from './pages/Lectures/All';
import LecturesManga from './pages/Lectures/Manga';
import LecturesManhwa from './pages/Lectures/Manhwa';
import LecturesManhua from './pages/Lectures/Manhua';
import LecturesLightNovel from './pages/Lectures/LightNovel';
import LecturesWebtoon from './pages/Lectures/Webtoon';
import LecturesComics from './pages/Lectures/Comics';
import LecturesBd from './pages/Lectures/Bd';
import LecturesBooks from './pages/Lectures/Books';
import LecturesOneShot from './pages/Lectures/OneShot';
import LecturesUnclassified from './pages/Lectures/Unclassified';
import SerieDetail from './pages/Mangas/MangaDetail';
import MovieDetail from './pages/Movies/MovieDetail';
import SeriesDetail from './pages/Series/SeriesDetail';
import Settings from './pages/Settings/Settings';
import All from './pages/Videos/All';
import MovieAnime from './pages/Videos/MovieAnime';
import VideosMovies from './pages/Videos/Movies';
import ONA from './pages/Videos/ONA';
import OVA from './pages/Videos/OVA';
import VideosSeries from './pages/Videos/Series';
import Special from './pages/Videos/Special';
import TV from './pages/Videos/TV';
import Unclassified from './pages/Videos/Unclassified';

// Wrapper pour protéger les routes jeux adultes
function ProtectedAdulteGameRoute({ children }: { children: React.ReactNode }) {
  const { isLocked, hasPassword } = useAdulteGameLock();

  // La section Jeux adulte est toujours considérée comme sensible si verrouillée
  const isSensitive = hasPassword && isLocked;

  return (
    <ProtectedContent
      isSensitive={isSensitive}
      onCancel={() => {
        // Rediriger vers le dashboard si l'utilisateur annule
        window.location.hash = '#/';
      }}
    >
      {children}
    </ProtectedContent>
  );
}

function App() {
  // Activer le système de logging backend vers frontend
  useBackendLogger();

  // Ne plus charger automatiquement l'utilisateur au démarrage
  // Le UserSelector sera toujours affiché pour choisir qui utilise l'app
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('Réception de données en cours...');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [checkingUsers, setCheckingUsers] = useState(true);

  // Pour l'onboarding : récupérer le baseDirectory et l'étape initiale
  const [onboardingBaseDir, setOnboardingBaseDir] = useState<string | null>(null);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(1);

  // Charger le baseDirectory quand l'onboarding est activé
  useEffect(() => {
    if (needsOnboarding) {
      const loadBaseDirectory = async () => {
        try {
          const baseDir = await window.electronAPI.getBaseDirectory();
          if (baseDir) {
            setOnboardingBaseDir(baseDir);
            // Si on vient du UserSelector, démarrer directement à l'étape 3
            const fromUserSelector = sessionStorage.getItem('createNewProfileFromSelector');
            if (fromUserSelector === 'true') {
              setOnboardingInitialStep(3);
              sessionStorage.removeItem('createNewProfileFromSelector');
            } else {
              setOnboardingInitialStep(1);
            }
          } else {
            setOnboardingBaseDir(null);
            setOnboardingInitialStep(1);
          }
        } catch (error) {
          console.error('Erreur lors du chargement du baseDirectory:', error);
          setOnboardingBaseDir(null);
          setOnboardingInitialStep(1);
        }
      };
      loadBaseDirectory();
    }
  }, [needsOnboarding]);

  // Ne plus charger automatiquement l'utilisateur au démarrage
  // Le UserSelector sera toujours affiché pour choisir qui utilise l'app

  // Fonction pour sélectionner un utilisateur et le sauvegarder
  const handleUserSelected = async (userName: string) => {
    localStorage.setItem('currentUser', userName);
    // Sauvegarder aussi dans le store Electron
    await window.electronAPI.setCurrentUser(userName);
    setCurrentUser(userName);
  };

  // Vérifier si des utilisateurs existent et charger l'utilisateur sauvegardé
  useEffect(() => {
    const checkUsers = async () => {
      try {
        if (!window.electronAPI) {
          console.warn('Electron API not ready yet');
          setCheckingUsers(false);
          return;
        }

        const users = await window.electronAPI.getAllUsers();

        let effectiveUsers = users;

        if (users.length === 0 && window.electronAPI.getBaseDirectory) {
          const baseDir = await window.electronAPI.getBaseDirectory();
          if (baseDir) {
            await new Promise(resolve => setTimeout(resolve, 200));
            effectiveUsers = await window.electronAPI.getAllUsers();
          }
        }

        setNeedsOnboarding(effectiveUsers.length === 0);

        // Vérifier si on vient d'un changement d'utilisateur depuis les paramètres
        // (détecté par la présence d'un flag dans sessionStorage)
        const fromUserSwitch = sessionStorage.getItem('userSwitchFromSettings');

        if (effectiveUsers.length === 1) {
          // Un seul utilisateur : charger automatiquement
          const singleUser = effectiveUsers[0].name;
          void handleUserSelected(singleUser);
        } else if (effectiveUsers.length > 1) {
          // Plusieurs utilisateurs
          if (fromUserSwitch) {
            // On vient d'un changement depuis les paramètres : charger l'utilisateur sauvegardé
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser && effectiveUsers.some(u => u.name === savedUser)) {
              await handleUserSelected(savedUser);
              sessionStorage.removeItem('userSwitchFromSettings');
            } else {
              // Utilisateur sauvegardé invalide : afficher le sélecteur
              localStorage.removeItem('currentUser');
              await window.electronAPI.setCurrentUser('');
              setCurrentUser(null);
              sessionStorage.removeItem('userSwitchFromSettings');
            }
          } else {
            // Démarrage normal : toujours afficher le sélecteur (ne pas charger automatiquement)
            localStorage.removeItem('currentUser');
            await window.electronAPI.setCurrentUser('');
            setCurrentUser(null);
          }
        } else if (effectiveUsers.length > 0) {
          // Cas par défaut : afficher le sélecteur au démarrage
          if (!fromUserSwitch) {
            localStorage.removeItem('currentUser');
            await window.electronAPI.setCurrentUser('');
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des utilisateurs:', error);
        setNeedsOnboarding(true);
      } finally {
        setCheckingUsers(false);
      }
    };

    checkUsers();
  }, []);

  // Charger et appliquer le thème au démarrage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (!window.electronAPI) {
          console.warn('Electron API not ready yet');
          return;
        }
        const savedTheme = await window.electronAPI.getTheme();
        document.documentElement.setAttribute('data-theme', savedTheme || 'dark');
      } catch (error) {
        console.error('Erreur chargement thème:', error);
      }
    };

    loadTheme();
  }, []);

  // Écouter les événements d'import depuis les scripts Tampermonkey
  useEffect(() => {
    if (!window.electronAPI) {
      console.warn('Electron API not ready yet');
      return;
    }

    const unsubscribeStart = window.electronAPI.onMangaImportStart?.((data: { message?: string }) => {
      setImportMessage(data.message || 'Réception de données en cours...');
      setIsImporting(true);
    });

    const unsubscribeComplete = window.electronAPI.onMangaImportComplete?.(() => {
      // Déclencher un rafraîchissement des données sans recharger la page
      setTimeout(() => {
        setIsImporting(false);
        setRefreshTrigger(prev => prev + 1); // Incrémenter pour déclencher un re-fetch
      }, 500);
    });

    return () => {
      unsubscribeStart?.();
      unsubscribeComplete?.();
    };
  }, []);

  // Étape 0: Vérification des utilisateurs
  if (checkingUsers) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, var(--background) 0%, #1a1f35 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="loading" />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  // Étape 1: Onboarding si nécessaire
  if (needsOnboarding) {
    return (
      <OnboardingWizard
        onComplete={async () => {
          // Vérifier si un utilisateur a été sélectionné dans l'onboarding
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            // Charger directement l'utilisateur sélectionné
            await handleUserSelected(savedUser);
            // Marquer l'onboarding comme terminé APRÈS avoir chargé l'utilisateur
            setNeedsOnboarding(false);
          } else {
            // Sinon, marquer l'onboarding comme terminé et recharger pour afficher le UserSelector
            setNeedsOnboarding(false);
            window.location.reload();
          }
        }}
        initialStep={onboardingInitialStep}
        initialBaseDirectory={onboardingBaseDir}
      />
    );
  }

  // Étape 2: Sélection utilisateur
  if (!currentUser) {
    return (
      <UserSelector
        onUserSelected={handleUserSelected}
        onCreateNewProfile={async () => {
          // Vérifier si le baseDirectory est déjà configuré
          const baseDir = await window.electronAPI.getBaseDirectory?.();
          if (baseDir) {
            // BaseDirectory déjà configuré : passer directement à l'étape 3
            sessionStorage.setItem('createNewProfileFromSelector', 'true');
            setOnboardingBaseDir(baseDir);
            setOnboardingInitialStep(3);
            setNeedsOnboarding(true);
          } else {
            // Pas de baseDirectory : passer à l'étape 2 pour le choisir
            sessionStorage.setItem('createNewProfileFromSelector', 'true');
            setNeedsOnboarding(true);
          }
        }}
        showCreateButton={true}
      />
    );
  }

  // Étape 3: Chargement et fusion
  if (!isReady) {
    return <SplashScreen onComplete={() => setIsReady(true)} currentUser={currentUser} />;
  }

  // Étape 4: Application principale
  return (
    <ErrorBoundary>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GlobalProgressProvider>
          <AdulteGameLockProvider>
            <Layout currentUser={currentUser}>
              <Routes>
                <Route path="/" element={<Dashboard key={refreshTrigger} />} />
                <Route path="/subscriptions" element={<Subscriptions key={refreshTrigger} />} />
                <Route path="/lectures" element={<LecturesAll key={refreshTrigger} />} />
                <Route path="/lectures/manga" element={<LecturesManga key={refreshTrigger} />} />
                <Route path="/lectures/manhwa" element={<LecturesManhwa key={refreshTrigger} />} />
                <Route path="/lectures/manhua" element={<LecturesManhua key={refreshTrigger} />} />
                <Route path="/lectures/light-novel" element={<LecturesLightNovel key={refreshTrigger} />} />
                <Route path="/lectures/webtoon" element={<LecturesWebtoon key={refreshTrigger} />} />
                <Route path="/lectures/comics" element={<LecturesComics key={refreshTrigger} />} />
                <Route path="/lectures/bd" element={<LecturesBd key={refreshTrigger} />} />
                <Route path="/lectures/books" element={<LecturesBooks key={refreshTrigger} />} />
                <Route path="/lectures/one-shot" element={<LecturesOneShot key={refreshTrigger} />} />
                <Route path="/lectures/unclassified" element={<LecturesUnclassified key={refreshTrigger} />} />
                <Route path="/collection" element={<Navigate to="/lectures" replace />} />
                <Route path="/serie/:id" element={<SerieDetail key={refreshTrigger} />} />
                <Route path="/videos" element={<All key={refreshTrigger} />} />
                <Route path="/videos/tv" element={<TV key={refreshTrigger} />} />
                <Route path="/videos/ona" element={<ONA key={refreshTrigger} />} />
                <Route path="/videos/ova" element={<OVA key={refreshTrigger} />} />
                <Route path="/videos/movie-anime" element={<MovieAnime key={refreshTrigger} />} />
                <Route path="/videos/special" element={<Special key={refreshTrigger} />} />
                <Route path="/videos/unclassified" element={<Unclassified key={refreshTrigger} />} />
                <Route path="/videos/movies" element={<VideosMovies key={refreshTrigger} />} />
                <Route path="/videos/series" element={<VideosSeries key={refreshTrigger} />} />
                <Route path="/videos/all" element={<All key={refreshTrigger} />} />
                <Route path="/animes/:id" element={<AnimeDetail key={refreshTrigger} />} />
                <Route path="/movies/:tmdbId" element={<MovieDetail key={refreshTrigger} />} />
                <Route path="/series/:tmdbId" element={<SeriesDetail key={refreshTrigger} />} />
                <Route path="/books/:id" element={<BookDetail key={refreshTrigger} />} />
                {/* Redirections vers les nouvelles routes */}
                <Route path="/books" element={<Navigate to="/lectures/books" replace />} />
                <Route path="/comics" element={<Navigate to="/lectures/comics" replace />} />
                <Route path="/bd" element={<Navigate to="/lectures/bd" replace />} />
                <Route
                  path="/adulte-game"
                  element={<Navigate to="/games/all" replace />}
                />
                <Route
                  path="/adulte-game/:id"
                  element={
                    <ProtectedAdulteGameRoute>
                      <AdulteGameDetail key={refreshTrigger} />
                    </ProtectedAdulteGameRoute>
                  }
                />
                {/* Routes Games */}
                <Route
                  path="/games"
                  element={<GamesAll key={refreshTrigger} />}
                />
                <Route
                  path="/games/all"
                  element={<GamesAll key={refreshTrigger} />}
                />
                <Route
                  path="/games/video"
                  element={
                    <ProtectedAdulteGameRoute>
                      <GamesVideoGames key={refreshTrigger} />
                    </ProtectedAdulteGameRoute>
                  }
                />
                <Route
                  path="/games/adulte"
                  element={
                    <ProtectedAdulteGameRoute>
                      <GamesAdulteGames key={refreshTrigger} />
                    </ProtectedAdulteGameRoute>
                  }
                />
                <Route
                  path="/games/rawg/:id"
                  element={
                    <ProtectedAdulteGameRoute>
                      <RawgGameDetail key={refreshTrigger} />
                    </ProtectedAdulteGameRoute>
                  }
                />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </AdulteGameLockProvider>
        </GlobalProgressProvider>
      </HashRouter>

      {isImporting && <ImportingOverlay message={importMessage} />}
    </ErrorBoundary>
  );
}

export default App;
