import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../common/Toggle';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';
import { ADULTE_GAME_DISPLAY_CATEGORIES, ADULTE_GAME_DISPLAY_DEFAULTS, AdulteGameFieldKey } from './displayConfig';

interface AdulteGameDisplaySettingsModalProps {
  onClose: () => void;
  showToast: (options: { title: string; message?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

export default function AdulteGameDisplaySettingsModal({ onClose, showToast }: AdulteGameDisplaySettingsModalProps) {
  const [prefs, setPrefs] = useState<Record<AdulteGameFieldKey, boolean>>(ADULTE_GAME_DISPLAY_DEFAULTS);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useModalEscape(onClose, false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.getAdulteGameDisplaySettings?.();
        if (stored) {
          setPrefs({ ...ADULTE_GAME_DISPLAY_DEFAULTS, ...stored });
        }
      } catch (error) {
        console.error('Erreur chargement préférences jeux adultes:', error);
      }
      setTimeout(() => setIsInitialLoad(false), 120);
    })();
  }, []);

  useEffect(() => {
    if (isInitialLoad || !hasUserInteracted) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await window.electronAPI.saveAdulteGameDisplaySettings?.(prefs);
        window.dispatchEvent(new CustomEvent('adulte-game-display-settings-updated'));
        showToast({
          title: 'Préférences enregistrées',
          message: 'Les sections visibles par défaut ont été mises à jour.',
          type: 'success',
          duration: 2500,
        });
      } catch (error) {
        console.error('Erreur sauvegarde préférences jeux adultes:', error);
        showToast({
          title: 'Erreur',
          message: 'Impossible de sauvegarder les préférences.',
          type: 'error',
          duration: 3000,
        });
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [prefs, isInitialLoad, hasUserInteracted, showToast]);

  const handleToggle = (key: AdulteGameFieldKey) => {
    setHasUserInteracted(true);
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setHasUserInteracted(true);
    const updated: Record<AdulteGameFieldKey, boolean> = { ...ADULTE_GAME_DISPLAY_DEFAULTS };
    Object.keys(updated).forEach((k) => {
      updated[k as AdulteGameFieldKey] = true;
    });
    setPrefs(updated);
  };

  const handleDeselectAll = () => {
    setHasUserInteracted(true);
    const updated: Record<AdulteGameFieldKey, boolean> = { ...ADULTE_GAME_DISPLAY_DEFAULTS };
    Object.keys(updated).forEach((k) => {
      updated[k as AdulteGameFieldKey] = false;
    });
    setPrefs(updated);
  };

  return createPortal(
    <Modal
      maxWidth="780px"
      maxHeight="85vh"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onClickOverlay={onClose}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 26px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            🎮 Affichage des jeux adultes
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Configurez les sections visibles par défaut sur toutes les fiches de jeux adultes.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div
          style={{
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid rgba(var(--primary-rgb), 0.3)',
            background: 'rgba(var(--primary-rgb), 0.08)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            lineHeight: 1.6
          }}
        >
          💡 Les réglages locaux d’une fiche (bouton « ⚙️ Affichage ») ont priorité sur ces options globales.
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleSelectAll} className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px' }}>
            ✓ Tout sélectionner
          </button>
          <button onClick={handleDeselectAll} className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px' }}>
            ✗ Tout désélectionner
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ADULTE_GAME_DISPLAY_CATEGORIES.map((category) => (
            <div
              key={category.title}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '18px',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{category.icon}</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{category.title}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {category.fields.map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      background: 'var(--surface-light)'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                    <Toggle checked={!!prefs[key]} onChange={() => handleToggle(key)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>,
    document.body
  );
}
