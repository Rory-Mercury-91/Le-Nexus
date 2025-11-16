import { Code } from 'lucide-react';
import { useEffect, useState } from 'react';
import Toggle from '../../../components/common/Toggle';

interface DevSettingsProps {
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

export default function DevSettings({ showToast }: DevSettingsProps) {
  const [devMode, setDevMode] = useState(false);
  const [verboseLogging, setVerboseLogging] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [devModeEnabled, verboseEnabled] = await Promise.all([
        window.electronAPI.getDevMode?.(),
        window.electronAPI.getVerboseLogging?.()
      ]);
      setDevMode(devModeEnabled || false);
      setVerboseLogging(verboseEnabled || false);
    } catch (error) {
      console.error('Erreur chargement paramètres dev:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevModeChange = async (enabled: boolean) => {
    try {
      await window.electronAPI.setDevMode?.(enabled);
      setDevMode(enabled);
      showToast({
        title: enabled ? 'Mode développeur activé' : 'Mode développeur désactivé',
        message: enabled ? 'Les DevTools sont ouverts et les IDs sont affichés' : 'Les DevTools sont fermés et les IDs sont masqués',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Erreur changement mode dev:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier le mode développeur',
        type: 'error'
      });
    }
  };

  const handleVerboseLoggingChange = async (enabled: boolean) => {
    try {
      await window.electronAPI.setVerboseLogging?.(enabled);
      setVerboseLogging(enabled);
      showToast({
        title: enabled ? 'Logs verbose activés' : 'Logs verbose désactivés',
        message: enabled ? 'Les logs du backend seront affichés dans la console DevTools' : 'Les logs du backend ne seront plus affichés',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Erreur changement logs verbose:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de modifier les logs verbose',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '20px',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(var(--primary-rgb), 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Code size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>
              Mode développeur
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Active les outils de développement et affiche les IDs sur les pages de détails
            </div>
          </div>
        </div>
        <Toggle
          checked={devMode}
          onChange={handleDevModeChange}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '20px',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginTop: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(var(--primary-rgb), 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Code size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>
              Logs verbose (backend)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Affiche tous les logs du backend dans la console DevTools (F12)
            </div>
          </div>
        </div>
        <Toggle
          checked={verboseLogging}
          onChange={handleVerboseLoggingChange}
        />
      </div>

      {devMode && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(var(--primary-rgb), 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(var(--primary-rgb), 0.2)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
              ✨ Fonctionnalités activées :
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>DevTools ouverts automatiquement</li>
              <li>ID affiché à droite du titre sur les pages de détails (mangas, animes, jeux adulte)</li>
              <li>Accès aux fonctions de débogage dans la console</li>
            </ul>
          </div>
        </div>
      )}

      {verboseLogging && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(var(--primary-rgb), 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(var(--primary-rgb), 0.2)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
              📋 Logs backend activés :
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Tous les logs du backend sont affichés dans la console DevTools (F12)</li>
              <li>Les logs sont préfixés avec <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>[BACKEND]</code></li>
              <li>Les logs incluent les informations sur les cookies, les chemins, les erreurs, etc.</li>
            </ul>
          </div>
        </div>
      )}

      <p style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginTop: '12px',
        fontStyle: 'italic'
      }}>
        💡 Utilisez <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>await window.electronAPI.debugGetSerieData(ID)</code> dans la console pour voir toutes les données d'une série
      </p>
    </div>
  );
}
