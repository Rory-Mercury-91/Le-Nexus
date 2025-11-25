import { CheckCircle, Database } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDisableBodyScroll } from '../../../hooks/common/useDisableBodyScroll';

interface SavingModalProps {
  userName: string;
  onComplete: () => void;
}

export default function SavingModal({ userName, onComplete }: SavingModalProps) {
  const [status, setStatus] = useState('Sauvegarde en cours...');
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Désactiver le scroll du body quand la modale est ouverte
  useDisableBodyScroll(true);

  useEffect(() => {
    performSave();
  }, []);

  const performSave = async () => {
    try {
      setStatus(`Sauvegarde de vos modifications, ${userName}...`);
      setProgress(30);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress(60);
      await window.electronAPI.saveUserDatabase();
      
      setStatus('Sauvegarde terminée !');
      setProgress(100);
      setIsDone(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onComplete();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setStatus('Erreur lors de la sauvegarde, fermeture...');
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
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      {/* Icône */}
      <div style={{
        marginBottom: '32px',
        animation: isDone ? 'none' : 'pulse 2s ease-in-out infinite'
      }}>
        {isDone ? (
          <CheckCircle size={80} style={{ color: 'var(--success)' }} />
        ) : (
          <Database size={80} style={{ color: 'var(--primary)' }} />
        )}
      </div>

      {/* Statut */}
      <p style={{
        color: 'var(--text)',
        fontSize: '18px',
        marginBottom: '32px',
        fontWeight: '600'
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
          background: isDone 
            ? 'var(--success)' 
            : 'linear-gradient(90deg, var(--primary), var(--secondary))',
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
