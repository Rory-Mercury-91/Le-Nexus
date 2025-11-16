import { Heart } from 'lucide-react';
import React from 'react';
import { AnimeSerie } from '../../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../../utils/status';

const ANIME_STATUS_OPTIONS = COMMON_STATUSES.ANIME;
type AnimeStatus = (typeof ANIME_STATUS_OPTIONS)[number];

interface AnimeStatusSectionProps {
  anime: AnimeSerie;
  currentStatus: AnimeStatus;
  onStatusChange: (status: AnimeStatus) => void;
  onToggleFavorite: () => void;
}

export default function AnimeStatusSection({ 
  anime, 
  currentStatus, 
  onStatusChange, 
  onToggleFavorite 
}: AnimeStatusSectionProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as AnimeStatus;
    onStatusChange(newStatus);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Titre "Mon Statut" */}
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
        Mon Statut
      </div>

      {/* Badge Favori */}
      <button
        onClick={onToggleFavorite}
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
          background: anime.is_favorite ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
          color: anime.is_favorite ? '#ffffff' : '#ef4444',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: anime.is_favorite ? '0 3px 10px rgba(0, 0, 0, 0.5)' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          width: '100%'
        }}
        onMouseEnter={(e) => {
          if (!anime.is_favorite) {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!anime.is_favorite) {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <Heart size={14} fill={anime.is_favorite ? '#ffffff' : '#ef4444'} />
        <span>{anime.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
      </button>

      {/* Sélecteur de statut */}
      <select
        value={currentStatus}
        onChange={handleStatusChange}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '2px solid var(--border)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        {ANIME_STATUS_OPTIONS.map((status) => {
          const label = formatStatusLabel(status, { category: 'anime' });
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
