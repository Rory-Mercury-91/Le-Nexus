import { Plus, Tag, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AdulteGameLabelsModalProps {
  gameId: number;
  onClose: () => void;
  onLabelsChange?: () => void;
}

interface Label {
  id: number;
  game_id: number;
  user_id: number;
  label: string;
  color: string;
}

interface LabelSuggestion {
  label: string;
  color: string;
}

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

const AdulteGameLabelsModal: React.FC<AdulteGameLabelsModalProps> = ({ gameId, onClose, onLabelsChange }) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [allLabels, setAllLabels] = useState<LabelSuggestion[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#8b5cf6');
  const [filteredSuggestions, setFilteredSuggestions] = useState<LabelSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExistingLabel, setSelectedExistingLabel] = useState<string>('');

  useEffect(() => {
    loadLabels();
    loadAllLabels();
  }, [gameId]);

  useEffect(() => {
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
    if (!newLabelText.trim() || loading) return;

    setLoading(true);
    try {
      await window.electronAPI.addAdulteGameLabel(gameId, newLabelText.trim(), newLabelColor);
      await loadLabels();
      await loadAllLabels();
      setNewLabelText('');
      setNewLabelColor('#8b5cf6');
      setShowAddForm(false);
      
      if (onLabelsChange) {
        onLabelsChange();
      }
    } catch (error) {
      console.error('Erreur ajout label:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabel = async (label: string) => {
    if (loading) return;

    setLoading(true);
    try {
      await window.electronAPI.removeAdulteGameLabel(gameId, label);
      await loadLabels();
      
      if (onLabelsChange) {
        onLabelsChange();
      }
    } catch (error) {
      console.error('Erreur suppression label:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: LabelSuggestion) => {
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
      setShowAddForm(false);
      setNewLabelText('');
      setFilteredSuggestions([]);
    }
  };

  const handleAddExistingLabel = async (labelName: string) => {
    if (!labelName || loading) return;

    const labelToAdd = allLabels.find(l => l.label === labelName);
    if (!labelToAdd) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  const availableLabels = allLabels.filter(
    (l) => !labels.some((existing) => existing.label.toLowerCase() === l.label.toLowerCase())
  );

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          background: 'var(--surface)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
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
          <Tag size={24} style={{ color: 'var(--primary)' }} />
          Labels personnalisés
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
          {/* Liste des labels existants */}
          {labels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {labels.map((label) => (
                <div
                  key={label.id}
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
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: loading ? 0.5 : 1,
                      color: label.color,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = loading ? '0.5' : '1')}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Boutons d'ajout/sélection */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowAddForm(true)}
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
                disabled={loading}
                className="select"
                style={{
                  width: 'auto',
                  minWidth: '200px',
                  maxWidth: '300px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
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

          {/* Form d'ajout de label (inline) */}
          {showAddForm && (
            <div
              style={{
                background: 'var(--surface-light)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        background: 'var(--surface)',
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
                            (e.currentTarget.style.background = 'var(--surface-light)')
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

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewLabelText('');
                      setFilteredSuggestions([]);
                    }}
                    className="btn"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddLabel}
                    disabled={!newLabelText.trim() || loading}
                    className="btn btn-primary"
                    style={{
                      opacity: !newLabelText.trim() || loading ? 0.5 : 1,
                      cursor: !newLabelText.trim() || loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bouton fermer */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Fermer
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default AdulteGameLabelsModal;
