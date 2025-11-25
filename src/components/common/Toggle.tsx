import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: `1px solid ${checked ? 'var(--primary-light)' : 'var(--border)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: checked ? 'var(--primary)' : 'var(--surface-light)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        padding: '2px',
        flexShrink: 0,
        boxShadow: checked ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'inset 0 0 0 1px rgba(148, 163, 184, 0.25)'
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'white',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      />
    </button>
  );
};

export default Toggle;
