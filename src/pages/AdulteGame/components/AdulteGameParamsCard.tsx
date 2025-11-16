import { FileText, FolderOpen, Plus, Settings, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

interface ExecutablePath {
  version: string;
  path: string;
  label?: string;
}

interface AdulteGameParamsCardProps {
  gameId: number;
  statut_perso?: string | null;
  notes_privees?: string | null;
  chemin_executable?: string | null;
  onStatusChange: (nextStatus: string) => void;
  onNotesChange: (nextNotes: string) => void;
  onExecutableChange: () => void;
}

const AdulteGameParamsCard: React.FC<AdulteGameParamsCardProps> = ({
  gameId,
  statut_perso,
  notes_privees,
  chemin_executable,
  onStatusChange,
  onNotesChange,
  onExecutableChange
}) => {
  const [notes, setNotes] = useState(notes_privees || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSelectingExecutable, setIsSelectingExecutable] = useState(false);
  const [executables, setExecutables] = useState<ExecutablePath[]>([]);
  const [isSavingExecutables, setIsSavingExecutables] = useState(false);

  const STATUSES = [
    { value: 'À lire', label: '📋 À lire', color: 'var(--warning)' },
    { value: 'En cours', label: '🎮 En cours', color: 'var(--primary)' },
    { value: 'En pause', label: '⏸️ En pause', color: 'var(--warning)' },
    { value: 'Terminé', label: '✅ Terminé', color: 'var(--success)' },
    { value: 'Abandonné', label: '❌ Abandonné', color: 'var(--error)' }
  ];

  useEffect(() => {
    setNotes(notes_privees || '');
  }, [notes_privees]);

  useEffect(() => {
    // Parser les chemins d'exécutables (rétrocompatibilité avec string simple)
    try {
      if (chemin_executable) {
        const parsed = JSON.parse(chemin_executable);
        if (Array.isArray(parsed)) {
          setExecutables(parsed);
        } else {
          // Ancien format (string simple), convertir en array
          setExecutables([{ version: 'default', path: chemin_executable, label: 'Version unique' }]);
        }
      } else {
        setExecutables([]);
      }
    } catch (_error) {
      // Si ce n'est pas du JSON, c'est l'ancien format (string simple)
      if (chemin_executable) {
        setExecutables([{ version: 'default', path: chemin_executable, label: 'Version unique' }]);
      } else {
        setExecutables([]);
      }
    }

  }, [chemin_executable]);

  const handleNotesBlur = async () => {
    if (notes === notes_privees) return;

    setIsSavingNotes(true);
    try {
      await window.electronAPI.updateAdulteGameNotes(gameId, notes);
      onNotesChange(notes);
    } catch (error) {
      console.error('Erreur sauvegarde notes:', error);
      setNotes(notes_privees || '');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.color || 'var(--text-secondary)';
  };

  const persistExecutables = async (nextExecutables: ExecutablePath[]) => {
    setIsSavingExecutables(true);
    try {
      await window.electronAPI.updateAdulteGameGame(gameId, {
        chemin_executable: nextExecutables.length > 0 ? JSON.stringify(nextExecutables) : null
      });
      onExecutableChange();
    } catch (error) {
      console.error('Erreur sauvegarde exécutables:', error);
    } finally {
      setIsSavingExecutables(false);
    }
  };

  const handleAddExecutable = async () => {
    setIsSelectingExecutable(true);
    try {
      const result = await window.electronAPI.selectAdulteGameExecutable();
      if (result.success && result.path) {
        const uniqueVersion = `custom-${Date.now()}`;
        const newExecutable: ExecutablePath = {
          version: uniqueVersion,
          path: result.path,
          label: `Chemin ${executables.length + 1}`
        };
        const nextExecutables = [...executables, newExecutable];
        setExecutables(nextExecutables);
        await persistExecutables(nextExecutables);
      }
    } catch (error) {
      console.error('Erreur sélection exécutable:', error);
    } finally {
      setIsSelectingExecutable(false);
    }
  };

  const handleBrowseExecutable = async (version: string) => {
    setIsSelectingExecutable(true);
    try {
      const result = await window.electronAPI.selectAdulteGameExecutable();
      if (result.success && result.path) {
        const selectedPath = result.path; // Extraire pour garantir le type
        const nextExecutables = executables.map((exe) =>
          exe.version === version ? { ...exe, path: selectedPath } : exe
        );
        setExecutables(nextExecutables);
        await persistExecutables(nextExecutables);
      }
    } catch (error) {
      console.error('Erreur mise à jour exécutable:', error);
    } finally {
      setIsSelectingExecutable(false);
    }
  };

  const handleRemoveExecutable = async (version: string) => {
    try {
      const newExecutables = executables.filter(e => e.version !== version);
      setExecutables(newExecutables);
      await persistExecutables(newExecutables);
    } catch (error) {
      console.error('Erreur suppression exécutable:', error);
    }
  };

  const handleLabelChange = (version: string, label: string) => {
    setExecutables(prev =>
      prev.map((exe) =>
        exe.version === version ? { ...exe, label } : exe
      )
    );
  };

  const handleLabelBlur = async (version: string) => {
    const nextExecutables = executables.map((exe) => {
      if (exe.version !== version) return exe;
      const finalLabel = (exe.label || '').trim() || 'Chemin';
      return { ...exe, label: finalLabel };
    });
    setExecutables(nextExecutables);
    await persistExecutables(nextExecutables);
  };

  const sortedExecutables = useMemo(
    () => executables.slice().sort((a, b) => (a.label || a.version).localeCompare(b.label || b.version)),
    [executables]
  );

  return (
    <div className="card">
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <Settings size={24} style={{ color: 'var(--secondary)' }} />
        Paramètres personnels
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Statut et Notes sur la même ligne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Statut */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Statut de complétion
            </label>
            <select
              value={statut_perso || 'À lire'}
              onChange={(e) => onStatusChange(e.target.value)}
              className="select"
              style={{
                border: `2px solid ${getStatusColor(statut_perso || 'À lire')}`
              }}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes privées */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Notes privées
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Vos notes personnelles..."
              rows={3}
              className="input"
              style={{
                width: '100%',
                resize: 'vertical',
                fontFamily: 'inherit',
                minHeight: '60px'
              }}
            />
            {isSavingNotes && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--primary)',
                  marginTop: '6px'
                }}
              >
                Sauvegarde en cours...
              </div>
            )}
          </div>
        </div>

        {/* Chemins des exécutables */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <span>
              <FolderOpen size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Chemins des exécutables
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddExecutable}
              disabled={isSelectingExecutable}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '4px 10px',
                minWidth: 'auto',
                opacity: isSelectingExecutable ? 0.6 : 1
              }}
              title="Ajouter un nouvel exécutable"
            >
              <Plus size={14} />
              Ajouter
            </button>
          </label>

          {/* Liste des exécutables configurés */}
          {sortedExecutables.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
              {sortedExecutables.map((exe, index) => (
                <div
                  key={exe.version}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '10px',
                    background: 'var(--surface-light)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      value={exe.label || ''}
                      onChange={(e) => handleLabelChange(exe.version, e.target.value)}
                      onBlur={() => handleLabelBlur(exe.version)}
                      placeholder={`Libellé (ex: Version ${index + 1})`}
                      className="input"
                      style={{ fontSize: '13px', fontWeight: 600 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                        title={exe.path}
                      >
                        {exe.path}
                      </div>
                      <button
                        onClick={() => handleBrowseExecutable(exe.version)}
                        className="btn btn-outline"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          minWidth: 'auto',
                          padding: '6px 10px'
                        }}
                        disabled={isSelectingExecutable}
                      >
                        <FolderOpen size={14} />
                        Parcourir
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveExecutable(exe.version)}
                    className="btn"
                    style={{
                      padding: '6px',
                      minWidth: 'auto',
                      color: 'var(--error)',
                      border: '1px solid var(--error)',
                      background: 'transparent'
                    }}
                    title="Supprimer ce chemin"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {sortedExecutables.length === 0 && (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                padding: '12px',
                background: 'var(--surface-light)',
                borderRadius: '6px',
                textAlign: 'center'
              }}
            >
              Aucun exécutable configuré pour le moment. Utilisez le bouton « Ajouter » pour choisir un fichier.
            </div>
          )}

          {sortedExecutables.length > 0 && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--success)',
                marginTop: '8px'
              }}
            >
              ✓ {sortedExecutables.length} exécutable{sortedExecutables.length > 1 ? 's' : ''} configuré{sortedExecutables.length > 1 ? 's' : ''}
            </div>
          )}

          {isSavingExecutables && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--primary)',
                marginTop: '6px'
              }}
            >
              Sauvegarde des chemins...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdulteGameParamsCard;
