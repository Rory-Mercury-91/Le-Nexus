import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Option {
  id: number;
  name: string;
  color: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder = 'Sélectionnez...',
  label,
  required = false
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(sid => sid !== id));
  };

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Bouton principal */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="input"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: '42px',
            padding: '8px 12px',
            textAlign: 'left',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <span style={{ color: selectedIds.length === 0 ? 'var(--text-secondary)' : 'var(--text)' }}>
            {selectedIds.length === 0 ? placeholder : `${selectedIds.length} propriétaire${selectedIds.length > 1 ? 's' : ''} sélectionné${selectedIds.length > 1 ? 's' : ''}`}
          </span>
          <ChevronDown
            size={16}
            style={{
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </button>

        {/* Badges des sélections */}
        {selectedOptions.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '8px'
          }}>
            {selectedOptions.map(option => (
              <div
                key={option.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  background: `${option.color}22`,
                  border: `1px solid ${option.color}44`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: option.color,
                  fontWeight: '500'
                }}
              >
                <span>{option.name}</span>
                <button
                  type="button"
                  onClick={(e) => removeOption(option.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: option.color,
                    opacity: 0.7
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Liste déroulante */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1000
            }}
          >
            {options.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}>
                Aucun utilisateur disponible
              </div>
            ) : (
              options.map(option => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      border: 'none',
                      background: isSelected ? `${option.color}11` : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: 'var(--text)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--surface-light)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `2px solid ${isSelected ? option.color : 'var(--border)'}`,
                      background: isSelected ? option.color : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s'
                    }}>
                      {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                    </div>

                    {/* Nom */}
                    <span style={{ flex: 1 }}>{option.name}</span>

                    {/* Pastille couleur */}
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: option.color,
                      flexShrink: 0
                    }} />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
