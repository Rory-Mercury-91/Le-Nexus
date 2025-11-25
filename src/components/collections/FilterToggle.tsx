import { ReactNode } from 'react';
import Toggle from '../common/Toggle';

interface FilterToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  labelActive?: string;
  icon?: string | ReactNode;
  activeColor?: string;
  minWidth?: string;
}

/**
 * Composant réutilisable pour les toggles de filtres (Favoris, MAJ, Masqués)
 */
export default function FilterToggle({
  checked,
  onChange,
  label,
  labelActive,
  icon,
  activeColor = 'var(--primary)',
  minWidth = '140px'
}: FilterToggleProps) {
  const displayLabel = checked && labelActive ? labelActive : label;

  // Convertir la couleur en RGB pour l'opacité du background
  const rgbColor = getRgbFromColor(activeColor);

  // Rendre l'icône (emoji ou image React)
  const renderIcon = () => {
    if (!icon) return null;

    // Afficher l'icône (emoji ou image) séparément
    return (
      <div style={{
        width: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: typeof icon === 'string' ? '16px' : undefined
      }}>
        {icon}
      </div>
    );
  };

  // Retirer l'emoji du début du label si l'icône est une string (emoji)
  const cleanLabel = (text: string): string => {
    if (typeof icon === 'string' && icon && text.startsWith(icon)) {
      // Retirer l'emoji du début du label s'il correspond à l'icône
      return text.slice(icon.length).trim();
    }
    return text;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: checked ? `rgba(${rgbColor}, 0.1)` : 'transparent',
      transition: 'background 0.2s',
      width: 'auto',
      minWidth: minWidth,
      flex: '0 0 auto'
    }}>
      {renderIcon()}
      <span style={{
        fontSize: '14px',
        color: checked ? activeColor : 'var(--text)',
        fontWeight: checked ? '600' : '400',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: icon ? '6px' : '0'
      }}>
        {cleanLabel(displayLabel)}
      </span>
      <Toggle
        checked={checked}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * Helper pour convertir une couleur hex ou CSS variable en RGB
 */
function getRgbFromColor(color: string): string {
  // Si c'est une variable CSS, retourner les valeurs par défaut basées sur la variable
  if (color.startsWith('var(--')) {
    // Mapping des variables CSS communes
    if (color.includes('error')) return '239, 68, 68';
    if (color.includes('primary')) return '139, 92, 246';
    if (color.includes('success')) return '34, 197, 94';
    if (color.includes('warning')) return '245, 158, 11';
    return '139, 92, 246'; // Par défaut : primary
  }

  // Si c'est une couleur hex
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  return '139, 92, 246';
}
