import { useState } from 'react';
import PlatformLogo from '../../../components/common/PlatformLogo';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { AnimeSerie } from '../../../types';
import { translateDemographic, translateRating, translateSource, translateStatus } from '../../../utils/translations';

interface AnimeHeaderProps {
  anime: AnimeSerie;
  shouldShow: (field: string) => boolean;
}

export default function AnimeHeader({ anime, shouldShow }: AnimeHeaderProps) {
  const { devMode } = useDevMode();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('anime', anime.id);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || 'Erreur lors de l’export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données anime:', error);
      window.alert(error?.message || 'Erreur inattendue lors de l’export.');
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, flex: 1 }}>
          {anime.titre}
        </h1>
        {devMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              background: 'var(--surface)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontFamily: 'monospace'
            }}>
              ID: {anime.id}
            </span>
            <button
              onClick={handleExport}
              className="btn btn-outline"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px'
              }}
              disabled={exporting}
            >
              {exporting ? 'Extraction...' : 'Extraire données'}
            </button>
          </div>
        )}
      </div>

      {/* Statut de diffusion, Type, Démographie et Classification */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {anime.statut_diffusion && shouldShow('statut_diffusion') && (
          <span style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            background: 'rgba(139, 92, 246, 0.15)',
            color: 'var(--primary)'
          }}>
            {translateStatus(anime.statut_diffusion)}
          </span>
        )}
        {anime.type && shouldShow('type') && (
          <span style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            background: 'rgba(139, 92, 246, 0.15)',
            color: 'var(--primary)'
          }}>
            {anime.type}
          </span>
        )}
        {anime.demographics && shouldShow('demographie') && (
          <span style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            background: 'rgba(236, 72, 153, 0.15)',
            color: 'var(--secondary)'
          }}>
            {translateDemographic(anime.demographics)}
          </span>
        )}
        {anime.rating && shouldShow('rating') && (() => {
          // Déterminer l'emote et le style selon le rating
          const getRatingStyle = (rating: string) => {
            const ratingLower = rating.toLowerCase();
            if (ratingLower.includes('rx') || ratingLower.includes('hentai')) {
              return { emote: '🔞', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '2px solid #ef4444' };
            } else if (ratingLower.includes('r+') || ratingLower.includes('mild nudity')) {
              return { emote: '🔴', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '2px solid rgba(239, 68, 68, 0.4)' };
            } else if (ratingLower.includes('r - 17') || ratingLower.includes('17+')) {
              return { emote: '⚠️', background: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b', border: '2px solid rgba(251, 191, 36, 0.5)' };
            } else if (ratingLower.includes('pg-13') || ratingLower.includes('13')) {
              return { emote: '🔶', background: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b', border: '2px solid rgba(251, 191, 36, 0.4)' };
            } else if (ratingLower.includes('pg') || ratingLower.includes('children')) {
              return { emote: '🟡', background: 'rgba(251, 191, 36, 0.1)', color: '#f59e0b', border: '2px solid rgba(251, 191, 36, 0.3)' };
            } else {
              return { emote: '✅', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '2px solid rgba(16, 185, 129, 0.3)' };
            }
          };
          
          const style = getRatingStyle(anime.rating);
          const ratingText = translateRating(anime.rating);
          // Extraire juste l'âge ou la partie importante
          const ageMatch = ratingText.match(/(\d+\+|\d+ ans|Tout public|Enfants|Adolescents)/i);
          const displayText = ageMatch ? ageMatch[1] : ratingText.split(' - ')[0];
          
          return (
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              background: style.background,
              color: style.color,
              border: style.border,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '14px' }}>{style.emote}</span>
              <span>{displayText}</span>
            </span>
          );
        })()}
      </div>

      {/* Titres alternatifs */}
      {shouldShow('titres_alternatifs') && (anime.titre_romaji || anime.titre_natif || anime.titre_anglais || anime.titres_alternatifs) && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: 'var(--text-secondary)', 
            marginBottom: '4px'
          }}>
            Titres alternatifs
          </div>
          <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: '1.6' }}>
            {[
              anime.titre_romaji,
              anime.titre_natif,
              anime.titre_anglais,
              anime.titres_alternatifs ? (() => {
                // Parser les titres alternatifs (peuvent être JSON array ou string)
                try {
                  const parsed = typeof anime.titres_alternatifs === 'string' 
                    ? JSON.parse(anime.titres_alternatifs) 
                    : anime.titres_alternatifs;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    return `["${parsed.join('", "')}"]`;
                  } else if (typeof parsed === 'string' && parsed.trim()) {
                    return `["${parsed}"]`;
                  }
                } catch {
                  // Si ce n'est pas du JSON, traiter comme string simple
                  if (anime.titres_alternatifs.trim()) {
                    return `["${anime.titres_alternatifs}"]`;
                  }
                }
                return null;
              })() : null
            ].filter(Boolean).join(' / ')}
          </p>
        </div>
      )}

      {/* Synopsis */}
      {anime.description && shouldShow('description') && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: 'var(--text-secondary)', 
            marginBottom: '4px'
          }}>
            Synopsis
          </div>
          <p style={{
            color: 'var(--text)',
            lineHeight: '1.6',
            marginBottom: '16px',
            maxHeight: '100px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {anime.description}
          </p>
        </div>
      )}

      {/* Encadré genres, thèmes et source */}
      {(
        (anime.genres && shouldShow('genres')) ||
        (anime.themes && shouldShow('themes')) ||
        (anime.source && shouldShow('source'))
      ) && (
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: (anime.source && shouldShow('source')) ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '16px',
          alignItems: 'start'
        }}>
          {anime.genres && shouldShow('genres') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Genres : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{anime.genres}</span>
            </div>
          )}
          {anime.themes && shouldShow('themes') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Thèmes : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{anime.themes}</span>
            </div>
          )}
          {anime.source && shouldShow('source') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Source : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{translateSource(anime.source)}</span>
            </div>
          )}
        </div>
      )}

      {/* Encadré informations (Studios, Producteurs, Diffuseurs, Rating) */}
      {(
        (anime.studios && shouldShow('studios')) ||
        (anime.producteurs && shouldShow('producteurs')) ||
        (anime.diffuseurs && shouldShow('diffuseurs'))
      ) && (
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          alignItems: 'start'
        }}>
          {anime.studios && shouldShow('studios') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Studios : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{anime.studios}</span>
            </div>
          )}
          {anime.producteurs && shouldShow('producteurs') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Producteurs : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{anime.producteurs}</span>
            </div>
          )}
          {anime.diffuseurs && shouldShow('diffuseurs') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Diffuseurs : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{anime.diffuseurs}</span>
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      {(shouldShow('badges') && (anime.en_cours_diffusion || anime.source_import)) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          {/* En cours de diffusion */}
          {Boolean(anime.en_cours_diffusion) && (
            <span style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              ● En cours
            </span>
          )}

          {/* Logo source d'import */}
          {anime.source_import && anime.source_import !== 'manual' && (
            <div style={{
              height: '28px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: anime.source_import === 'adn' ? '#1E3A8A' : 
                         anime.source_import === 'adkami' ? '#8B5CF6' : 
                         anime.source_import === 'crunchyroll' ? '#F47521' :
                         'rgba(139, 92, 246, 0.15)',
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <PlatformLogo platform={anime.source_import} height={24} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
