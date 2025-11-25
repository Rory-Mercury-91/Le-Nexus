import { Heart } from 'lucide-react';
import React from 'react';
import { formatStatusLabel, StatusCategory } from '../../utils/status';

interface DetailStatusSectionProps {
  isFavorite: boolean;
  currentStatus: string;
  availableStatuses: readonly string[];
  statusCategory: StatusCategory;
  onToggleFavorite: () => void;
  onStatusChange: (status: string) => void;
  togglingFavorite?: boolean;
  updatingStatus?: boolean;
  showLabel?: boolean;
}

/**
 * Composant commun pour afficher les badges de statut (favoris, statut) dans les pages de détails.
 * Utilisé par MovieCover, SeriesCover, AnimeCover, MangaCover, etc.
 */
export default function DetailStatusSection({
  isFavorite,
  currentStatus,
  availableStatuses,
  statusCategory,
  onToggleFavorite,
  onStatusChange,
  togglingFavorite = false,
  updatingStatus = false,
  showLabel = true
}: DetailStatusSectionProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    onStatusChange(newStatus);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Label "Mon Statut" */}
      {showLabel && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
          Mon Statut
        </div>
      )}

      {/* Bouton Favori */}
      <button
        type="button"
        onClick={onToggleFavorite}
        disabled={togglingFavorite}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '800',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          background: isFavorite ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
          color: isFavorite ? '#ffffff' : '#ef4444',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: isFavorite ? '0 3px 10px rgba(0, 0, 0, 0.5)' : 'none',
          cursor: togglingFavorite ? 'progress' : 'pointer',
          transition: 'all 0.2s',
          width: '100%',
          opacity: togglingFavorite ? 0.85 : 1
        }}
        onMouseEnter={(e) => {
          if (!isFavorite && !togglingFavorite) {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isFavorite && !togglingFavorite) {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <Heart size={14} fill={isFavorite ? '#ffffff' : '#ef4444'} />
        <span>{isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
      </button>

      {/* Sélecteur de statut */}
      <select
        className="select"
        value={currentStatus}
        onChange={handleStatusChange}
        disabled={updatingStatus}
        style={{
          width: '100%',
          fontWeight: 600
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        {availableStatuses.map((status) => {
          const label = formatStatusLabel(status, { category: statusCategory });
          return (
            <option key={status} value={status}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
