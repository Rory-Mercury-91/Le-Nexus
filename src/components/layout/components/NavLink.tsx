import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  isActive: boolean;
  isSubCategory?: boolean; // Pour les sous-catégories avec indentation supplémentaire
}

/**
 * Lien de navigation réutilisable pour la sidebar
 */
export default function NavLink({ to, icon, children, isActive, isSubCategory = false }: NavLinkProps) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        textDecoration: 'none',
        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
        background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
        fontWeight: isActive ? '600' : '400',
        transition: 'all 0.2s',
        minHeight: '44px',
        marginLeft: isSubCategory ? '24px' : '0' // Indentation supplémentaire pour les sous-catégories
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
    </Link>
  );
}
