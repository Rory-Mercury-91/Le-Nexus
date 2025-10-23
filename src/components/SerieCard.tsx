import { BookOpen, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import { Serie } from '../types';
import CoverImage from './CoverImage';

interface SerieCardProps {
  serie: Serie;
  onUpdate: () => void;
}

export default function SerieCard({ serie, onUpdate }: SerieCardProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [isMasquee, setIsMasquee] = useState(false);

  useEffect(() => {
    checkIfMasquee();
  }, [serie.id]);

  const checkIfMasquee = async () => {
    const masquee = await window.electronAPI.isSerieMasquee(serie.id);
    setIsMasquee(masquee);
  };

  const handleToggleMasquer = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isMasquee) {
      // Démasquer
      await window.electronAPI.demasquerSerie(serie.id);
      setIsMasquee(false);
    } else {
      // Masquer
      const confirmed = await confirm({
        title: 'Masquer la série',
        message: `Masquer "${serie.titre}" va supprimer vos données de lecture pour cette série. La série restera accessible aux autres utilisateurs.`,
        confirmText: 'Masquer',
        cancelText: 'Annuler',
        isDanger: false
      });

      if (!confirmed) return;

      await window.electronAPI.masquerSerie(serie.id);
      setIsMasquee(true);
    }
    
    onUpdate();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const confirmed = await confirm({
      title: 'Supprimer la série',
      message: `Êtes-vous sûr de vouloir supprimer "${serie.titre}" et tous ses tomes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    await window.electronAPI.deleteSerie(serie.id);
    onUpdate();
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'var(--primary)';
      case 'Terminée': return 'var(--success)';
      case 'Abandonnée': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'badge-primary';
      case 'Terminée': return 'badge-success';
      case 'Abandonnée': return 'badge-error';
      default: return 'badge-primary';
    }
  };

  return (
    <>
      <Link
        to={`/serie/${serie.id}`}
        className="card"
        style={{
          padding: '0',
          textDecoration: 'none',
          color: 'inherit',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
      {/* Couverture */}
      <div style={{
        width: '100%',
        height: '280px',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)'
      }}>
        {serie.couverture_url ? (
          <CoverImage
            src={serie.couverture_url}
            alt={serie.titre}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, var(--surface-light), var(--surface))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <BookOpen size={48} />
          </div>
        )}
        
        {/* Badge statut */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px'
        }}>
          <span className={`badge ${getStatutBadgeClass(serie.statut)}`}>
            {serie.statut}
          </span>
        </div>

        {/* Bouton masquer/démasquer */}
        <button
          onClick={handleToggleMasquer}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: isMasquee ? 'rgba(59, 130, 246, 0.9)' : 'rgba(249, 115, 22, 0.9)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          className="delete-btn"
          title={isMasquee ? 'Démasquer' : 'Masquer'}
        >
          {isMasquee ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        {/* Bouton supprimer */}
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(239, 68, 68, 0.9)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          className="delete-btn"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Informations */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {serie.titre}
        </h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          gap: '8px'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {serie.type_volume}
          </span>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: '600',
            color: 'var(--primary)',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '4px 8px',
            borderRadius: '6px'
          }}>
            {serie.tomes?.length || 0} tome{(serie.tomes?.length || 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <style>{`
        .card:hover .delete-btn {
          opacity: 1;
        }
      `}</style>
      </Link>
      
      <ConfirmDialog />
    </>
  );
}
