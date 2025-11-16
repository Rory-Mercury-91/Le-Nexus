import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import ImportingOverlay from './components/common/ImportingOverlay';
import ProtectedContent from './components/common/ProtectedContent';
import UserSelector from './components/common/UserSelector';
import Layout from './components/layout/Layout';
import OnboardingWizard from './components/layout/OnboardingWizard';
import SplashScreen from './components/layout/SplashScreen';
import { AdulteGameLockProvider, useAdulteGameLock } from './hooks/useAdulteGameLock';
import { useBackendLogger } from './hooks/useBackendLogger';
import AdulteGame from './pages/AdulteGame/AdulteGame';
import AdulteGameDetail from './pages/AdulteGame/AdulteGameDetail';
import AnimeDetail from './pages/Animes/AnimeDetail';
import Animes from './pages/Animes/Animes';
import Dashboard from './pages/Dashboard/Dashboard';
import Collection from './pages/Mangas/Mangas';
import SerieDetail from './pages/Mangas/MangaDetail';
import MovieDetail from './pages/Movies/MovieDetail';
import Movies from './pages/Movies/Movies';
import SeriesDetail from './pages/Series/SeriesDetail';
import Series from './pages/Series/Series';
import Settings from './pages/Settings/Settings';

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

        // Si plusieurs utilisateurs existent, toujours afficher le sélecteur
        // Si un seul utilisateur existe, charger automatiquement
        if (effectiveUsers.length > 1) {
          localStorage.removeItem('currentUser');
          await window.electronAPI.setCurrentUser('');
          setCurrentUser(null);
        } else if (effectiveUsers.length === 1) {
          // Un seul utilisateur : charger automatiquement (même s'il y a un utilisateur sauvegardé différent)
          const singleUser = effectiveUsers[0].name;
          void handleUserSelected(singleUser);
        } else if (effectiveUsers.length > 0) {
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser && effectiveUsers.some(u => u.name === savedUser)) {
            setCurrentUser(savedUser);
          } else {
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
        onComplete={() => {
          setNeedsOnboarding(false);
          // Forcer un rechargement pour afficher le UserSelector avec les nouveaux utilisateurs
          window.location.reload();
        }}
      />
    );
  }

  // Étape 2: Sélection utilisateur
  if (!currentUser) {
    return <UserSelector onUserSelected={handleUserSelected} />;
  }

  // Étape 3: Chargement et fusion
  if (!isReady) {
    return <SplashScreen onComplete={() => setIsReady(true)} currentUser={currentUser} />;
  }

  // Étape 4: Application principale
  return (
    <>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdulteGameLockProvider>
          <Layout currentUser={currentUser}>
            <Routes>
              <Route path="/" element={<Dashboard key={refreshTrigger} />} />
              <Route path="/collection" element={<Collection key={refreshTrigger} />} />
              <Route path="/serie/:id" element={<SerieDetail key={refreshTrigger} />} />
              <Route path="/animes" element={<Animes key={refreshTrigger} />} />
              <Route path="/animes/:id" element={<AnimeDetail key={refreshTrigger} />} />
              <Route path="/movies" element={<Movies key={refreshTrigger} />} />
              <Route path="/movies/:tmdbId" element={<MovieDetail key={refreshTrigger} />} />
              <Route path="/series" element={<Series key={refreshTrigger} />} />
              <Route path="/series/:tmdbId" element={<SeriesDetail key={refreshTrigger} />} />
              <Route
                path="/adulte-game"
                element={
                  <ProtectedAdulteGameRoute>
                    <AdulteGame key={refreshTrigger} />
                  </ProtectedAdulteGameRoute>
                }
              />
              <Route
                path="/adulte-game/:id"
                element={
                  <ProtectedAdulteGameRoute>
                    <AdulteGameDetail key={refreshTrigger} />
                  </ProtectedAdulteGameRoute>
                }
              />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </AdulteGameLockProvider>
      </HashRouter>

      {isImporting && <ImportingOverlay message={importMessage} />}
    </>
  );
}

export default App;
