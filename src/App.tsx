import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ImportingOverlay from './components/ImportingOverlay';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import UserSelector from './components/UserSelector';
import AnimeDetail from './pages/AnimeDetail';
import Animes from './pages/Animes';
import Collection from './pages/Collection';
import Dashboard from './pages/Dashboard';
import SerieDetail from './pages/SerieDetail';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('Réception de données en cours...');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Étape 1: Sélection utilisateur
  if (!currentUser) {
    return <UserSelector onUserSelected={setCurrentUser} />;
  }

  // Étape 2: Chargement et fusion
  if (!isReady) {
    return <SplashScreen onComplete={() => setIsReady(true)} currentUser={currentUser} />;
  }

  // Étape 3: Application principale
  return (
    <>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout currentUser={currentUser}>
          <Routes>
            <Route path="/" element={<Dashboard key={refreshTrigger} />} />
            <Route path="/collection" element={<Collection key={refreshTrigger} />} />
            <Route path="/serie/:id" element={<SerieDetail key={refreshTrigger} />} />
            <Route path="/animes" element={<Animes key={refreshTrigger} />} />
            <Route path="/animes/:id" element={<AnimeDetail key={refreshTrigger} />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      
      {isImporting && <ImportingOverlay message={importMessage} />}
    </>
  );
}

export default App;
