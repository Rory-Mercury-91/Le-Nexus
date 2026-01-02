import { ArrowLeft, Edit, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CheckUpdateButton from '../../../components/common/CheckUpdateButton';
import { useGlobalProgress } from '../../../contexts/GlobalProgressContext';

interface GameVersion {
  version: string;
  path: string;
  label?: string;
}

interface AdulteGameHeaderProps {
  onBack: () => void;
  onCheckUpdate?: () => void;
  onForceCheckUpdate?: () => void;
  onPlay?: () => void;
  onPlayVersion?: (version: string) => void;
  availableVersions?: GameVersion[];
  onEdit: () => void;
  onDelete: () => void;
  isUpdating?: boolean;
  canPlay?: boolean;
  statut_perso?: string | null;
  onStatusChange?: (nextStatus: string) => void;
}

const STATUSES = [
  { value: 'À lire', label: '🎮 À jouer', color: 'var(--warning)' },
  { value: 'En cours', label: '🎮 En cours', color: 'var(--primary)' },
  { value: 'En pause', label: '⏸️ En pause', color: 'var(--warning)' },
  { value: 'Terminé', label: '✅ Terminé', color: 'var(--success)' },
  { value: 'Abandonné', label: '❌ Abandonné', color: 'var(--error)' }
];

export default function AdulteGameHeader({
  onBack,
  onCheckUpdate,
  onForceCheckUpdate,
  onPlay,
  onPlayVersion,
  availableVersions = [],
  onEdit,
  onDelete,
  isUpdating = false,
  canPlay = false,
  statut_perso,
  onStatusChange
}: AdulteGameHeaderProps) {
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const hasMultipleVersions = availableVersions.length > 1;

  const getStatusColor = (status?: string | null) => {
    return STATUSES.find((s) => s.value === status)?.color || 'var(--text-secondary)';
  };

  // Calculer la hauteur de la barre de progression pour ajuster le top du header
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
  
  // Calculer le top en fonction de l'état collapsed (60px si réduit, 200px si étendu)
  const progressHeaderHeight = hasActiveProgress ? (isProgressCollapsed ? 60 : 200) : 0;

  return (
    <div
      className="adulte-game-detail-header"
      style={{
        position: 'fixed',
        top: `${progressHeaderHeight}px`,
        left: '260px',
        right: 0,
        zIndex: 1000,
        background: 'var(--background)',
        padding: '16px 40px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'top 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {/* Bouton Retour */}
        <button
          onClick={onBack}
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            border: 'none',
            color: 'white',
            textDecoration: 'none',
            transition: 'box-shadow 0.2s ease',
            borderRadius: '8px'
          }}
          title="Retour à la liste"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Actions à droite */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
        {/* Statut de completion */}
        {statut_perso && onStatusChange && (
          <select
            value={statut_perso || 'À lire'}
            onChange={(e) => onStatusChange(e.target.value)}
            className="select"
            style={{
              border: `2px solid ${getStatusColor(statut_perso)}`,
              fontSize: '14px',
              padding: '8px 12px',
              fontWeight: '600',
              background: `${getStatusColor(statut_perso)}15`,
              color: getStatusColor(statut_perso),
              height: '40px',
              width: 'auto',
              minWidth: '150px'
            }}
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        )}

        {/* Bouton Vérifier MAJ */}
        {onCheckUpdate && (
          <CheckUpdateButton
            onCheckUpdate={onCheckUpdate}
            onForceCheckUpdate={onForceCheckUpdate}
            isUpdating={isUpdating}
          />
        )}

        {/* Bouton Jouer */}
        {(onPlay || onPlayVersion) && (
          <div style={{ position: 'relative' }}>
            {hasMultipleVersions ? (
              <>
                {/* Dropdown pour plusieurs versions */}
                <button
                  onClick={() => setShowVersionMenu(!showVersionMenu)}
                  disabled={!canPlay}
                  className="btn btn-success"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    opacity: canPlay ? 1 : 0.5
                  }}
                  title="Jouer"
                >
                  <Play size={18} />
                </button>

                {showVersionMenu && canPlay && (
                  <>
                    {/* Overlay pour fermer le menu */}
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999
                      }}
                      onClick={() => setShowVersionMenu(false)}
                    />
                    
                    {/* Menu dropdown */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        minWidth: '200px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow)',
                        zIndex: 1000,
                        overflow: 'hidden'
                      }}
                    >
                      {availableVersions.map((version, index) => (
                        <button
                          key={version.version}
                          onClick={() => {
                            if (onPlayVersion) onPlayVersion(version.version);
                            setShowVersionMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: index < availableVersions.length - 1 ? '1px solid var(--border)' : 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text)',
                            fontSize: '14px',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-light)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <Play size={14} style={{ color: 'var(--success)' }} />
                          <span>{version.label || `Version ${version.version}`}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Bouton simple pour une seule version */
              <button
                onClick={onPlay}
                disabled={!canPlay}
                className="btn btn-success"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  opacity: canPlay ? 1 : 0.5
                }}
                title="Jouer"
              >
                <Play size={18} />
              </button>
            )}
          </div>
        )}

        {/* Bouton Éditer */}
        <button
          onClick={onEdit}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0
          }}
          title="Modifier"
        >
          <Edit size={18} />
        </button>

        {/* Bouton Supprimer */}
        <button
          onClick={onDelete}
          className="btn btn-danger"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0
          }}
          title="Supprimer"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
