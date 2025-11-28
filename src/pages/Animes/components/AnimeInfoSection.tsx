import { Calendar, FileText, Globe, Tag, Tv, User, Users } from 'lucide-react';
import { useState } from 'react';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { AnimeSerie } from '../../../types';
import { cleanMalRewriteText } from '../../../utils/text-utils';
import { translateDemographic, translateGenres, translateRating, translateSeason, translateSource, translateStatus, translateThemes } from '../../../utils/translations';
import AnimeMalBlock from './AnimeMalBlock';
import AnimeRelationsSection from './AnimeRelationsSection';

interface AnimeInfoSectionProps {
  anime: AnimeSerie;
  shouldShow: (field: string) => boolean;
}

export default function AnimeInfoSection({ anime, shouldShow }: AnimeInfoSectionProps) {
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
        window.alert(result?.error || 'Erreur lors de l\'export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données anime:', error);
      window.alert(error?.message || 'Erreur inattendue lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  // Organiser les titres
  const mainTitle = anime.titre;
  const originalTitle = anime.titre_romaji || anime.titre_natif || anime.titre_anglais || null;
  const alternativeTitles: string[] = [];
  if (anime.titre_romaji && anime.titre_romaji !== mainTitle) alternativeTitles.push(anime.titre_romaji);
  if (anime.titre_natif && anime.titre_natif !== mainTitle && !alternativeTitles.includes(anime.titre_natif)) alternativeTitles.push(anime.titre_natif);
  if (anime.titre_anglais && anime.titre_anglais !== mainTitle && !alternativeTitles.includes(anime.titre_anglais)) alternativeTitles.push(anime.titre_anglais);
  if (anime.titres_alternatifs) {
    try {
      const parsed = typeof anime.titres_alternatifs === 'string'
        ? JSON.parse(anime.titres_alternatifs)
        : anime.titres_alternatifs;
      if (Array.isArray(parsed)) {
        parsed.forEach((title: string) => {
          if (title && title !== mainTitle && !alternativeTitles.includes(title)) {
            alternativeTitles.push(title);
          }
        });
      } else if (typeof parsed === 'string' && parsed.trim() && parsed !== mainTitle) {
        alternativeTitles.push(parsed);
      }
    } catch {
      if (typeof anime.titres_alternatifs === 'string' && anime.titres_alternatifs.trim() && anime.titres_alternatifs !== mainTitle) {
        alternativeTitles.push(anime.titres_alternatifs);
      }
    }
  }

  return (
    <div style={{ flex: 1, minWidth: '320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
      {/* Titre et métadonnées principales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <h1 className="detail-page-title" style={{ flex: 1 }}>{mainTitle}</h1>
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
        {originalTitle && originalTitle !== mainTitle && (
          <p className="detail-page-subtitle">{originalTitle}</p>
        )}
        {shouldShow('titres_alternatifs') && alternativeTitles.length > 0 && (
          <p className="detail-page-subtitle" style={{ marginTop: '4px' }}>
            {alternativeTitles.join(' // ')}
          </p>
        )}
      </div>

      {/* Badges : Statut, Type, Démographie, Rating */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px'
        }}
      >
        {anime.statut_diffusion && shouldShow('statut_diffusion') && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: anime.en_cours_diffusion
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(139, 92, 246, 0.15)',
              color: anime.en_cours_diffusion
                ? '#ef4444'
                : 'var(--primary)',
              borderRadius: '999px',
              padding: '8px 14px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              animation: anime.en_cours_diffusion
                ? 'pulse 2s ease-in-out infinite'
                : 'none'
            }}
          >
            <Tv size={16} />
            {translateStatus(anime.statut_diffusion)}
          </span>
        )}
        {anime.type && shouldShow('type') && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              borderRadius: '999px',
              padding: '8px 14px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <Tv size={16} />
            {anime.type}
          </span>
        )}
        {anime.demographics && shouldShow('demographie') && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(236, 72, 153, 0.18)',
              border: '1px solid rgba(236, 72, 153, 0.32)',
              color: '#f9a8d4',
              borderRadius: '999px',
              padding: '8px 14px'
            }}
          >
            <Users size={16} />
            {translateDemographic(anime.demographics)}
          </span>
        )}
        {anime.rating && shouldShow('rating') && (() => {
          // Déterminer l'emote et le style selon le rating
          const getRatingStyle = (rating: string) => {
            const ratingLower = rating.toLowerCase();
            if (ratingLower.includes('rx') || ratingLower.includes('hentai')) {
              return { emote: '🔞', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' };
            } else if (ratingLower.includes('r+') || ratingLower.includes('mild nudity')) {
              return { emote: '🔴', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
            } else if (ratingLower.includes('r - 17') || ratingLower.includes('17+')) {
              return { emote: '⚠️', background: 'rgba(251, 191, 36, 0.2)', color: '#f59e0b', border: '1px solid rgba(251, 191, 36, 0.4)' };
            } else if (ratingLower.includes('pg-13') || ratingLower.includes('13')) {
              return { emote: '🔶', background: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b', border: '1px solid rgba(251, 191, 36, 0.3)' };
            } else if (ratingLower.includes('pg') || ratingLower.includes('children')) {
              return { emote: '🟡', background: 'rgba(251, 191, 36, 0.1)', color: '#f59e0b', border: '1px solid rgba(251, 191, 36, 0.25)' };
            } else {
              return { emote: '✅', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
            }
          };

          const style = getRatingStyle(anime.rating);
          const ratingText = translateRating(anime.rating);
          const ageMatch = ratingText.match(/(\d+\+|\d+ ans|Tout public|Enfants|Adolescents)/i);
          const displayText = ageMatch ? ageMatch[1] : ratingText.split(' - ')[0];

          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: style.background,
                color: style.color,
                border: style.border,
                borderRadius: '999px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <span style={{ fontSize: '14px' }}>{style.emote}</span>
              <span>{displayText}</span>
            </span>
          );
        })()}
      </div>

      {/* Genres, Thèmes et Source */}
      {(() => {
        // Traduire et dédupliquer les genres et thèmes
        const translatedGenres = anime.genres && shouldShow('genres') ? translateGenres(anime.genres) : '';
        const translatedThemes = anime.themes && shouldShow('themes') ? translateThemes(anime.themes) : '';
        
        const genresList = translatedGenres
          ? translatedGenres.split(',').map(g => g.trim()).filter(g => g)
          : [];
        const themesList = translatedThemes
          ? translatedThemes.split(',').map(t => t.trim()).filter(t => t)
          : [];
        const source = anime.source && shouldShow('source') ? translateSource(anime.source) : null;

        if (genresList.length === 0 && themesList.length === 0 && !source) {
          return null;
        }

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {genresList.map((genre, index) => (
              <span
                key={`genre-${index}`}
                style={{
                  fontSize: '13px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(34, 197, 94, 0.18)',
                  border: '1px solid rgba(34, 197, 94, 0.32)',
                  color: '#86efac'
                }}
              >
                {genre}
              </span>
            ))}
            {themesList.map((theme, index) => (
              <span
                key={`theme-${index}`}
                style={{
                  fontSize: '13px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(168, 85, 247, 0.18)',
                  border: '1px solid rgba(168, 85, 247, 0.32)',
                  color: '#c4b5fd'
                }}
              >
                {theme}
              </span>
            ))}
            {source && (
              <span
                style={{
                  fontSize: '13px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(59, 130, 246, 0.18)',
                  border: '1px solid rgba(59, 130, 246, 0.32)',
                  color: '#93c5fd'
                }}
              >
                {source}
              </span>
            )}
          </div>
        );
      })()}

      {/* Synopsis */}
      {anime.description && shouldShow('description') && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}
          >
            Synopsis
          </div>
          <div
            style={{
              color: 'var(--text)',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              fontSize: '15px'
            }}
          >
            {cleanMalRewriteText(anime.description)}
          </div>
        </div>
      )}

      {/* Métadonnées en deux colonnes */}
      {shouldShow('metadata') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}
        >
          {/* Colonne 1 : Dates, Statut, Épisodes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {((anime.date_debut || anime.date_fin || anime.statut_diffusion) && (shouldShow('date_debut') || shouldShow('date_fin') || shouldShow('statut_diffusion'))) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Diffusion{anime.statut_diffusion ? ` (${translateStatus(anime.statut_diffusion)})` : ''}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {anime.date_debut ? new Date(anime.date_debut).toLocaleDateString('fr-FR') : (anime.annee || '?')}
                    {anime.date_fin || anime.statut_diffusion ? ' → ' : ''}
                    {anime.date_fin ? new Date(anime.date_fin).toLocaleDateString('fr-FR') : (anime.statut_diffusion ? translateStatus(anime.statut_diffusion) : '')}
                  </div>
                </div>
              </div>
            )}
            {anime.date_sortie_vf && shouldShow('date_sortie_vf') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Disponibilité VF
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {new Date(anime.date_sortie_vf).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            )}
            {anime.saison_diffusion && shouldShow('saison_diffusion') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Saison de diffusion
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {translateSeason(anime.saison_diffusion)}
                  </div>
                </div>
              </div>
            )}
            {anime.nb_episodes && shouldShow('nb_episodes') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Épisodes
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {anime.nb_episodes}
                  </div>
                </div>
              </div>
            )}
            {anime.duree && shouldShow('duree') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Tv size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Durée
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {typeof anime.duree === 'string' ? anime.duree : `${anime.duree} min`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne 2 : Studios, Producteurs, Diffuseurs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {anime.studios && shouldShow('studios') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Tv size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Studios
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{anime.studios}</div>
                </div>
              </div>
            )}
            {anime.producteurs && shouldShow('producteurs') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Producteurs
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{anime.producteurs}</div>
                </div>
              </div>
            )}
            {anime.diffuseurs && shouldShow('diffuseurs') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Globe size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Diffuseurs
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{anime.diffuseurs}</div>
                </div>
              </div>
            )}
            {anime.age_conseille && shouldShow('age_conseille') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Tag size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Âge conseillé
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{anime.age_conseille}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Informations MyAnimeList */}
      <AnimeMalBlock anime={anime} shouldShow={shouldShow} />

      {/* Relations */}
      <AnimeRelationsSection anime={anime} shouldShow={shouldShow} />
    </div>
  );
}
