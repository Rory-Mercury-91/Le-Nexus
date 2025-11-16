import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MangaHeaderProps {
  loading: boolean;
  onEdit: () => void;
  onCustomize: () => void;
  onEnrich: () => void;
  onDelete: () => void;
  enriching: boolean;
}

export default function MangaHeader({
  loading,
  onEdit,
  onCustomize,
  onEnrich,
  onDelete,
  enriching
}: MangaHeaderProps) {
  return (
    <div 
      className="manga-detail-header"
      style={{
        position: 'fixed',
        top: 0,
        left: '260px',
        right: 0,
        zIndex: 1000,
        background: 'var(--background)',
        padding: '16px 40px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Link
        to="/collection"
        className="btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          border: 'none',
          color: 'white',
          textDecoration: 'none',
          transition: 'box-shadow 0.2s ease'
        }}
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
        Retour à la collection
      </Link>

      {/* Boutons d'action */}
      {!loading && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={onEdit} className="btn btn-primary">
            <Edit size={18} />
            Modifier
          </button>
          <button onClick={onCustomize} className="btn btn-primary">
            ⚙️ Affichage
          </button>
          <button
            onClick={onEnrich}
            className="btn btn-primary"
            disabled={enriching}
          >
            {enriching ? '⏳ Enrichissement...' : '🚀 Enrichir'}
          </button>
          <button onClick={onDelete} className="btn btn-danger">
            <Trash2 size={18} />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
