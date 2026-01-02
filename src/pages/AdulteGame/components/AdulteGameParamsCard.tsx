import { Folder, FolderOpen, Plus, Settings, Tag, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface ExecutablePath {
  version: string;
  path: string;
  label?: string;
}

interface AdulteGameParamsCardProps {
  gameId: number;
  chemin_executable?: string | null;
  version_jouee?: string | null;
  derniere_session?: string | null;
  onExecutableChange: () => void;
  onLabelsChange?: () => void;
}

const AdulteGameParamsCard: React.FC<AdulteGameParamsCardProps> = ({
  gameId,
  chemin_executable,
  version_jouee,
  derniere_session,
  onExecutableChange,
  onLabelsChange
}) => {
  const [isSelectingExecutable, setIsSelectingExecutable] = useState(false);
  const [executables, setExecutables] = useState<ExecutablePath[]>([]);
  const [isSavingExecutables, setIsSavingExecutables] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  
  // États pour les labels
  const [labels, setLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [allLabels, setAllLabels] = useState<Array<{ label: string; color: string }>>([]);
  const [showAddLabelForm, setShowAddLabelForm] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#8b5cf6');
  const [filteredSuggestions, setFilteredSuggestions] = useState<Array<{ label: string; color: string }>>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [selectedExistingLabel, setSelectedExistingLabel] = useState<string>('');

  const PRESET_COLORS = [
    '#8b5cf6', // Violet
    '#ec4899', // Rose
    '#f59e0b', // Orange
    '#10b981', // Vert
    '#3b82f6', // Bleu
    '#ef4444', // Rouge
    '#f97316', // Orange vif
    '#14b8a6', // Teal
  ];

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

  // Charger les labels
  useEffect(() => {
    loadLabels();
    loadAllLabels();
  }, [gameId]);

  useEffect(() => {
    // Filtrer les suggestions en fonction du texte saisi
    if (newLabelText.trim()) {
      const filtered = allLabels.filter(
        (l) =>
          l.label.toLowerCase().includes(newLabelText.toLowerCase()) &&
          !labels.some((existing) => existing.label.toLowerCase() === l.label.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [newLabelText, allLabels, labels]);

  const loadLabels = async () => {
    try {
      const data = await window.electronAPI.getAdulteGameLabels(gameId);
      setLabels(data);
    } catch (error) {
      console.error('Erreur chargement labels:', error);
    }
  };

  const loadAllLabels = async () => {
    try {
      const data = await window.electronAPI.getAllAdulteGameLabels();
      setAllLabels(data);
    } catch (error) {
      console.error('Erreur chargement tous les labels:', error);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelText.trim() || labelsLoading) return;

    setLabelsLoading(true);
    try {
      await window.electronAPI.addAdulteGameLabel(gameId, newLabelText.trim(), newLabelColor);
      await loadLabels();
      await loadAllLabels();
      setNewLabelText('');
      setNewLabelColor('#8b5cf6');
      setShowAddLabelForm(false);
      
      if (onLabelsChange) {
        onLabelsChange();
      }
    } catch (error) {
      console.error('Erreur ajout label:', error);
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleRemoveLabel = async (label: string) => {
    if (labelsLoading) return;

    setLabelsLoading(true);
    try {
      await window.electronAPI.removeAdulteGameLabel(gameId, label);
      await loadLabels();
      
      if (onLabelsChange) {
        onLabelsChange();
      }
    } catch (error) {
      console.error('Erreur suppression label:', error);
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: { label: string; color: string }) => {
    setNewLabelText(suggestion.label);
    setNewLabelColor(suggestion.color);
    setFilteredSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSelectSuggestion(filteredSuggestions[0]);
      } else {
        handleAddLabel();
      }
    } else if (e.key === 'Escape') {
      setShowAddLabelForm(false);
      setNewLabelText('');
      setFilteredSuggestions([]);
    }
  };

  const handleAddExistingLabel = async (labelName: string) => {
    if (!labelName || labelsLoading) return;

    const labelToAdd = allLabels.find(l => l.label === labelName);
    if (!labelToAdd) return;

    setLabelsLoading(true);
    try {
      await window.electronAPI.addAdulteGameLabel(gameId, labelToAdd.label, labelToAdd.color);
      await loadLabels();
      setSelectedExistingLabel('');
      
      if (onLabelsChange) {
        onLabelsChange();
      }
    } catch (error) {
      console.error('Erreur ajout label existant:', error);
    } finally {
      setLabelsLoading(false);
    }
  };

  // Filtrer les labels disponibles (ceux qui ne sont pas déjà ajoutés)
  const availableLabels = allLabels.filter(
    (l) => !labels.some((existing) => existing.label.toLowerCase() === l.label.toLowerCase())
  );

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
        const selectedPath = result.path;
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

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Jamais';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <div className="card">
      {/* <h2
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
      </h2> */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Labels personnalisés */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tag size={14} />
            Labels personnalisés
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Liste des labels existants */}
            {labels.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {labels.map((label, index) => (
                  <div
                    key={`${label.label}-${index}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: `${label.color}20`,
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: label.color,
                      border: `1.5px solid ${label.color}40`
                    }}
                  >
                    <Tag size={14} />
                    {label.label}
                    <button
                      onClick={() => handleRemoveLabel(label.label)}
                      disabled={labelsLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: labelsLoading ? 'not-allowed' : 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: labelsLoading ? 0.5 : 1,
                        color: label.color,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = labelsLoading ? '0.5' : '1')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Boutons d'ajout/sélection */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Bouton pour créer un nouveau label */}
              <button
                onClick={() => setShowAddLabelForm(true)}
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                Ajouter un label
              </button>
              
              {/* Select pour labels existants */}
              {availableLabels.length > 0 && (
                <select
                  value={selectedExistingLabel}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedExistingLabel(value);
                    if (value) {
                      handleAddExistingLabel(value);
                    }
                  }}
                  disabled={labelsLoading}
                  className="select"
                  style={{
                    width: 'auto',
                    minWidth: '200px',
                    maxWidth: '300px',
                    cursor: labelsLoading ? 'not-allowed' : 'pointer',
                    opacity: labelsLoading ? 0.5 : 1
                  }}
                >
                  <option value="">Sélectionner un label existant...</option>
                  {availableLabels.map((label, index) => (
                    <option key={index} value={label.label}>
                      {label.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Modal d'ajout de label */}
          {showAddLabelForm && createPortal(
            <>
              {/* Overlay */}
              <div
                onClick={() => {
                  setShowAddLabelForm(false);
                  setNewLabelText('');
                  setFilteredSuggestions([]);
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                  backdropFilter: 'blur(4px)'
                }}
              />
              
              {/* Modal */}
              <div
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                  width: '90%',
                  maxWidth: '500px',
                  background: 'var(--surface)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  padding: '24px'
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--text)',
                    marginBottom: '20px'
                  }}
                >
                  Créer un nouveau label
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Nom du label */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}
                    >
                      Nom du label
                    </label>
                    <input
                      type="text"
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Entrez le nom du label..."
                      autoFocus
                      className="input"
                      style={{
                        width: '100%'
                      }}
                    />
                  </div>

                  {/* Couleur */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}
                    >
                      Couleur
                    </label>
                    
                    {/* Couleurs prédéfinies */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewLabelColor(color)}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: color,
                            border: newLabelColor === color ? '3px solid var(--text)' : '2px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: newLabelColor === color ? 'scale(1.1)' : 'scale(1)',
                            boxShadow: newLabelColor === color ? '0 4px 8px rgba(0, 0, 0, 0.3)' : 'none'
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                    
                    {/* Color picker personnalisé */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        style={{
                          width: '80px',
                          height: '36px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: 'transparent'
                        }}
                      />
                      <span style={{ 
                        fontSize: '13px', 
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace'
                      }}>
                        ou choisir une couleur personnalisée
                      </span>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {filteredSuggestions.length > 0 && (
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                          marginBottom: '8px'
                        }}
                      >
                        Suggestions
                      </label>
                      <div
                        style={{
                          background: 'var(--surface-light)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}
                      >
                        {filteredSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'none',
                              border: 'none',
                              borderBottom:
                                index < filteredSuggestions.length - 1
                                  ? '1px solid var(--border)'
                                  : 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: 'var(--text)',
                              fontSize: '14px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'var(--surface)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'none')
                            }
                          >
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: suggestion.color
                              }}
                            />
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        setShowAddLabelForm(false);
                        setNewLabelText('');
                        setFilteredSuggestions([]);
                      }}
                      className="btn"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAddLabel}
                      disabled={!newLabelText.trim() || labelsLoading}
                      className="btn btn-primary"
                      style={{
                        opacity: !newLabelText.trim() || labelsLoading ? 0.5 : 1,
                        cursor: !newLabelText.trim() || labelsLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
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
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderOpen size={14} />
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
                padding: '6px 12px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedExecutables.map((exe, index) => (
                <div
                  key={exe.version}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'transparent',
                    borderRadius: '8px'
                  }}
                >
                  {/* Icône dossier avec tooltip */}
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={() => setTooltipVisible(exe.version)}
                    onMouseLeave={() => setTooltipVisible(null)}
                  >
                    <Folder size={20} style={{ color: 'var(--text-secondary)' }} />
                    {tooltipVisible === exe.version && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 'calc(100% + 12px)',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--border)',
                          zIndex: 1000,
                          pointerEvents: 'none'
                        }}
                      >
                        {exe.path}
                      </div>
                    )}
                  </div>

                  {/* Champs de saisie pour le nom */}
                  <div style={{ flex: 1 }}>
                    <input
                      value={exe.label || ''}
                      onChange={(e) => handleLabelChange(exe.version, e.target.value)}
                      onBlur={() => handleLabelBlur(exe.version)}
                      placeholder={`Nom de l'exécutable (ex: Version ${index + 1})`}
                      className="input"
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    />
                  </div>

                  {/* Bouton parcourir */}
                  <button
                    onClick={() => handleBrowseExecutable(exe.version)}
                    className="btn btn-outline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minWidth: 'auto',
                      padding: '8px 12px'
                    }}
                    disabled={isSelectingExecutable}
                    title="Parcourir"
                  >
                    <FolderOpen size={16} />
                  </button>

                  {/* Bouton supprimer */}
                  <button
                    onClick={() => handleRemoveExecutable(exe.version)}
                    className="btn"
                    style={{
                      padding: '8px',
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
                padding: '16px',
                background: 'transparent',
                borderRadius: '8px',
                border: '1px dashed var(--border)',
                textAlign: 'center'
              }}
            >
              Aucun exécutable configuré pour le moment. Utilisez le bouton « Ajouter » pour choisir un fichier.
            </div>
          )}

          {isSavingExecutables && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--primary)',
                marginTop: '8px'
              }}
            >
              Sauvegarde des chemins...
            </div>
          )}
        </div>

        {/* Version jouée | Dernière session */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px 24px' }}>
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Version jouée
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--text)'
              }}
            >
              {version_jouee || 'Non définie'}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Dernière session
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--text)'
              }}
            >
              {formatDateTime(derniere_session)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdulteGameParamsCard;
