import { Database } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  currentUser: string;
}

export default function SplashScreen({ onComplete, currentUser }: SplashScreenProps) {
  const [status, setStatus] = useState('Démarrage...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    performMerge();
  }, []);

  const performMerge = async () => {
    try {
      setStatus(`Bienvenue ${currentUser} !`);
      setProgress(10);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStatus('Recherche des bases de données...');
      setProgress(30);
      
      await window.electronAPI.setCurrentUser(currentUser);
      
      setStatus('Fusion des collections...');
      setProgress(60);
      
      const result = await window.electronAPI.mergeDatabase();
      
      if (result.merged) {
        setStatus(`Fusion terminée : ${result.seriesCount} séries, ${result.tomesCount} tomes`);
        setProgress(100);
      } else {
        setStatus('Chargement...');
        setProgress(100);
      }
      
      // Attendre un peu pour que l'utilisateur voie le message
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (error) {
      console.error('Erreur lors de la fusion:', error);
      setStatus('Erreur lors de la fusion, démarrage normal...');
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, var(--background) 0%, #1a1f35 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      {/* Logo/Icône */}
      <div style={{
        marginBottom: '32px',
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        <Database size={80} style={{ color: 'var(--primary)' }} />
      </div>

      {/* Titre */}
      <h1 style={{
        fontSize: '36px',
        fontWeight: '700',
        marginBottom: '16px',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Ma Mangathèque
      </h1>

      {/* Statut */}
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '16px',
        marginBottom: '32px'
      }}>
        {status}
      </p>

      {/* Barre de progression */}
      <div style={{
        width: '300px',
        height: '4px',
        background: 'var(--surface)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
          transition: 'width 0.3s ease',
          borderRadius: '2px'
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
