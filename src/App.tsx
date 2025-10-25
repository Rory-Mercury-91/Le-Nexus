import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import ImportingOverlay from './components/common/ImportingOverlay';
import Layout from './components/layout/Layout';
import OnboardingWizard from './components/layout/OnboardingWizard';
import SplashScreen from './components/layout/SplashScreen';
import UserSelector from './components/common/UserSelector';
import AnimeDetail from './pages/AnimeDetail';
import Animes from './pages/Animes';
import AVN from './pages/AVN';
import Collection from './pages/Collection';
import Dashboard from './pages/Dashboard';
import SerieDetail from './pages/SerieDetail';
import Settings from './pages/Settings';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('Réception de données en cours...');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [checkingUsers, setCheckingUsers] = useState(true);

  // Vérifier si des utilisateurs existent
  useEffect(() => {
    const checkUsers = async () => {
      try {
        const users = await window.electronAPI.getAllUsers();
        setNeedsOnboarding(users.length === 0);
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
    const unsubscribeStart = window.electronAPI.onMangaImportStart?.((data) => {
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
    return <UserSelector onUserSelected={setCurrentUser} />;
  }

  // Étape 3: Chargement et fusion
  if (!isReady) {
    return <SplashScreen onComplete={() => setIsReady(true)} currentUser={currentUser} />;
  }

  // Étape 4: Application principale
  return (
    <>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout currentUser={currentUser}>
          <Routes>
            <Route path="/" element={<Dashboard key={refreshTrigger} />} />
            <Route path="/collection" element={<Collection key={refreshTrigger} />} />
            <Route path="/serie/:id" element={<SerieDetail key={refreshTrigger} />} />
            <Route path="/animes" element={<Animes key={refreshTrigger} />} />
            <Route path="/animes/:id" element={<AnimeDetail key={refreshTrigger} />} />
            <Route path="/avn" element={<AVN key={refreshTrigger} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </HashRouter>
      
      {isImporting && <ImportingOverlay message={importMessage} />}
    </>
  );
}

export default App;
