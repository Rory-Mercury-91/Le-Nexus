import { BookOpen, Heart } from 'lucide-react';
import React, { useMemo } from 'react';
import CoverImage from '../../../components/common/CoverImage';
import { Serie, Tome } from '../../../types';
import { COMMON_STATUSES, formatStatusLabel } from '../../../utils/status';

const MANGA_STATUS_OPTIONS = COMMON_STATUSES.MANGA;
type MangaStatus = (typeof MANGA_STATUS_OPTIONS)[number];

interface MangaCoverProps {
  serie: Serie;
  tomes: Tome[];
  draggingSerie: boolean;
  shouldShow: (field: string) => boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onToggleFavorite: () => void;
  onImportFromNautiljon?: () => void;
  onStatusChange: (status: MangaStatus) => void;
}

export default function MangaCover({
  serie,
  tomes,
  draggingSerie,
  shouldShow,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleFavorite,
  onImportFromNautiljon,
  onStatusChange
}: MangaCoverProps) {
  // Calculer le statut actuel selon la progression
  const currentStatus = useMemo(() => {
    // Si un statut manuel est défini, l'utiliser
    if (serie.tag === 'a_lire') return 'À lire';
    if (serie.tag === 'abandonne') return 'Abandonné';
    if (serie.tag === 'en_pause') return 'En pause';

    // Sinon, calculer selon la progression
    const tomesLus = tomes.filter(t => t.lu === 1).length;
    const tousTomesLus = tomes.length > 0 && tomesLus === tomes.length;

    const chapitresLus = serie.chapitres_lus || 0;
    const chapitresTotal = serie.nb_chapitres || 0;
    const tousChapitresLus = chapitresTotal > 0 && chapitresLus >= chapitresTotal;

    // Vérifier aussi volumes_lus depuis serie_statut_utilisateur
    const volumesLus = serie.volumes_lus || 0;

    // Si aucune progression (tomes = 0 ET chapitres = 0 ET volumes = 0) → "À lire"
    if (tomesLus === 0 && chapitresLus === 0 && volumesLus === 0) {
      return 'À lire';
    }

    // Si l'œuvre est terminée (tous les tomes OU tous les chapitres lus)
    if (tousTomesLus || tousChapitresLus) {
      return 'Terminé';
    }

    // Si progression >= 1 → "En cours"
    if (tomesLus >= 1 || chapitresLus >= 1 || volumesLus >= 1) {
      return 'En cours';
    }

    // Par défaut, "À lire"
    return 'À lire';
  }, [serie, tomes]);

  if (!shouldShow('couverture')) return null;

  return (
    <div style={{ width: 'clamp(180px, 20vw, 250px)', flexShrink: 0 }}>
      <div
        style={{
          width: '100%',
          height: '350px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: draggingSerie ? '3px dashed var(--primary)' : '2px solid var(--border)',
          position: 'relative',
          transition: 'border-color 0.2s',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {draggingSerie ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)22',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            padding: '20px',
            gap: '12px'
          }}>
            📥
            <div>Déposer l'image<br />de la série</div>
          </div>
        ) : serie.couverture_url ? (
          <CoverImage
            src={serie.couverture_url}
            alt={serie.titre}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, var(--surface-light), var(--surface))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            gap: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <BookOpen size={64} />
            <div style={{ fontSize: '12px' }}>Glissez une image ici</div>
          </div>
        )}
      </div>

      {/* Boutons liens externes sous la couverture */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        {serie.mal_id && (
          <button
            onClick={() => window.electronAPI.openExternal?.(`https://myanimelist.net/manga/${serie.mal_id}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px 14px',
              background: '#2E51A2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e3a8a';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2E51A2';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>🔗</span>
            Voir sur MyAnimeList
          </button>
        )}

        {serie.nautiljon_url && (
          <>
            <button
              onClick={() => window.electronAPI.openExternal?.(serie.nautiljon_url!)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '8px 14px',
                background: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d97706';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>📚</span>
              Voir sur Nautiljon
            </button>

            {onImportFromNautiljon && (
              <button
                onClick={onImportFromNautiljon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '8px 14px',
                  background: '#10b981',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>🔄</span>
                Mettre à jour depuis Nautiljon
              </button>
            )}
          </>
        )}
      </div>

      {/* Badges : Favori + Sélecteur de statut */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', width: '100%' }}>
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
            background: serie.is_favorite ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
            color: serie.is_favorite ? '#ffffff' : '#ef4444',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: serie.is_favorite ? '0 3px 10px rgba(0, 0, 0, 0.5)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            if (!serie.is_favorite) {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!serie.is_favorite) {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <Heart size={14} fill={serie.is_favorite ? '#ffffff' : '#ef4444'} />
          <span>{serie.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
        </button>

        {/* Sélecteur de statut */}
        <select
          value={currentStatus as MangaStatus}
          onChange={(event) => onStatusChange(event.target.value as MangaStatus)}
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
          {MANGA_STATUS_OPTIONS.map((status) => {
            const label = formatStatusLabel(status, { category: 'manga' });
            return (
              <option key={status} value={status}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
