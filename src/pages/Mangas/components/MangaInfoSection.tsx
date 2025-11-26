import { BookOpen, Calendar, FileText, Globe, Layers, Tag, User, Users } from 'lucide-react';
import { useState } from 'react';
import LabelsCardContent from '../../../components/common/LabelsCardContent';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { Serie } from '../../../types';
import { organizeMangaTitles } from '../../../utils/manga-titles';
import { cleanMalRewriteText } from '../../../utils/text-utils';
import { translatePublicationStatus, translateRating } from '../../../utils/translations';
import MangaMalBlock from './MangaMalBlock';
import MangaRelationsSection from './MangaRelationsSection';

interface MangaInfoSectionProps {
  serie: Serie;
  shouldShow: (field: string) => boolean;
  onLabelsChange?: () => void;
}

export default function MangaInfoSection({ serie, shouldShow, onLabelsChange }: MangaInfoSectionProps) {
  // Organiser les titres : titre français en priorité, titre original et titres alternatifs
  const { mainTitle, originalTitle, romajiTitle, englishTitle, alternativeTitles } = organizeMangaTitles(serie);
  const { devMode } = useDevMode();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('manga', serie.id);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || "Erreur lors de l'export des données.");
      }
    } catch (error: any) {
      console.error('Erreur export données manga:', error);
      window.alert(error?.message || "Erreur inattendue lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

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
                ID: {serie.id}
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
        {originalTitle && (
          <p className="detail-page-subtitle">{originalTitle}</p>
        )}
        {(romajiTitle || englishTitle) && (
          <p className="detail-page-subtitle" style={{ marginTop: '4px' }}>
            {[romajiTitle, englishTitle].filter(Boolean).join(' // ')}
          </p>
        )}
        {shouldShow('titres_alternatifs') && alternativeTitles.length > 0 && (
          <p className="detail-page-subtitle" style={{ marginTop: '4px' }}>
            {alternativeTitles.join(' // ')}
          </p>
        )}
      </div>

      {/* Badges : Type, Media Type, Démographie, Statut, Rating */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px'
        }}
      >
        {shouldShow('type_volume') && serie.type_volume && (
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
            <BookOpen size={16} />
            {serie.type_volume}
          </span>
        )}
        {(() => {
          // Normaliser pour comparer (insensible à la casse)
          const normalizeForComparison = (str: string) => str.toLowerCase().trim();
          const mediaTypeNormalized = serie.media_type ? normalizeForComparison(serie.media_type) : '';
          const demographieNormalized = serie.demographie ? normalizeForComparison(serie.demographie) : '';
          const areEqual = mediaTypeNormalized && demographieNormalized && mediaTypeNormalized === demographieNormalized;

          // Afficher media_type ou demographie, mais pas les deux si identiques
          if (areEqual) {
            if (serie.media_type && shouldShow('media_type')) {
              return (
                <span
                  key="media_type"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(34, 197, 94, 0.18)',
                    border: '1px solid rgba(34, 197, 94, 0.32)',
                    color: '#86efac',
                    borderRadius: '999px',
                    padding: '8px 14px'
                  }}
                >
                  <Tag size={16} />
                  {serie.media_type}
                </span>
              );
            } else if (serie.demographie && shouldShow('demographie')) {
              return (
                <span
                  key="demographie"
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
                  {serie.demographie}
                </span>
              );
            }
          } else {
            return (
              <>
                {serie.media_type && shouldShow('media_type') && (
                  <span
                    key="media_type"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(34, 197, 94, 0.18)',
                      border: '1px solid rgba(34, 197, 94, 0.32)',
                      color: '#86efac',
                      borderRadius: '999px',
                      padding: '8px 14px'
                    }}
                  >
                    <Tag size={16} />
                    {serie.media_type}
                  </span>
                )}
                {serie.demographie && shouldShow('demographie') && (
                  <span
                    key="demographie"
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
                    {serie.demographie}
                  </span>
                )}
              </>
            );
          }
          return null;
        })()}
        {serie.rating && shouldShow('rating') && (() => {
          // Déterminer l'emote et le style selon le rating
          const getRatingStyle = (rating: string) => {
            const ratingLower = rating.toLowerCase();
            if (ratingLower === 'erotica' || ratingLower.includes('rx') || ratingLower.includes('hentai')) {
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

          const style = getRatingStyle(serie.rating);
          let displayText: string;
          if (serie.rating === 'erotica') {
            displayText = '18+';
          } else if (serie.rating === 'suggestive') {
            displayText = '13+';
          } else if (serie.rating === 'safe') {
            displayText = 'Tout public';
          } else {
            const ratingText = translateRating(serie.rating);
            const ageMatch = ratingText.match(/(\d+\+|\d+ ans|Tout public|Enfants|Adolescents)/i);
            displayText = ageMatch ? ageMatch[1] : ratingText.split(' - ')[0];
          }

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

      {/* Genres et Thèmes */}
      {(() => {
        // Extraire les genres et thèmes
        const genresList = serie.genres && shouldShow('genres')
          ? serie.genres.split(',').map(g => g.trim()).filter(g => g)
          : [];
        const themesList = serie.themes && shouldShow('themes')
          ? serie.themes.split(',').map(t => t.trim()).filter(t => t)
          : [];

        // Normaliser pour comparaison (insensible à la casse)
        const normalize = (str: string) => str.toLowerCase().trim();
        const genresNormalized = genresList.map(normalize);

        // Filtrer les thèmes qui sont déjà dans les genres
        const uniqueThemes = themesList.filter(theme =>
          !genresNormalized.includes(normalize(theme))
        );

        // Si rien à afficher, ne rien retourner
        if (genresList.length === 0 && uniqueThemes.length === 0) {
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
            {uniqueThemes.map((theme, index) => (
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
          </div>
        );
      })()}

      {/* Synopsis */}
      {serie.description && shouldShow('description') && (
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
            {cleanMalRewriteText(serie.description)}
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
          {/* Colonne 1 : Dates, Statut, Volumes, Chapitres */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {((serie.date_debut || serie.date_fin || serie.statut_publication || serie.annee_publication) && (shouldShow('date_debut') || shouldShow('date_fin') || shouldShow('statut_publication') || shouldShow('annee_publication'))) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Publication VO{serie.statut_publication ? ` (${translatePublicationStatus(serie.statut_publication)})` : ''}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {serie.date_debut ? new Date(serie.date_debut).getFullYear() : (serie.annee_publication || '?')}
                    {serie.date_fin || serie.statut_publication ? ' → ' : ''}
                    {serie.date_fin ? new Date(serie.date_fin).getFullYear() : (serie.statut_publication ? translatePublicationStatus(serie.statut_publication) : '')}
                  </div>
                </div>
              </div>
            )}
            {(serie.annee_vf || serie.statut_publication_vf) && (shouldShow('annee_vf') || shouldShow('statut_publication_vf')) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Publication VF{serie.statut_publication_vf ? ` (${translatePublicationStatus(serie.statut_publication_vf)})` : ''}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {serie.annee_vf || (serie.date_debut ? new Date(serie.date_debut).getFullYear() : (serie.annee_publication || '?'))}
                    {' → '}
                    {serie.statut_publication_vf ? translatePublicationStatus(serie.statut_publication_vf) : '?'}
                  </div>
                </div>
              </div>
            )}
            {((serie.nb_volumes && shouldShow('nb_volumes')) || (serie.nb_volumes_vf && shouldShow('nb_volumes_vf'))) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Layers size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Volumes
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {serie.nb_volumes && serie.nb_volumes_vf && serie.nb_volumes !== serie.nb_volumes_vf
                      ? `VO: ${serie.nb_volumes} | VF: ${serie.nb_volumes_vf}`
                      : (serie.nb_volumes && !serie.nb_volumes_vf)
                        ? serie.nb_volumes
                        : (serie.nb_volumes_vf || serie.nb_volumes || 0)}
                  </div>
                </div>
              </div>
            )}
            {(serie.nb_chapitres || serie.nb_chapitres_vf) && (shouldShow('nb_chapitres') || shouldShow('nb_chapitres_vf')) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Chapitres
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {serie.nb_chapitres && serie.nb_chapitres_vf && serie.nb_chapitres !== serie.nb_chapitres_vf
                      ? `VO: ${serie.nb_chapitres} | VF: ${serie.nb_chapitres_vf}`
                      : (serie.nb_chapitres_vf || serie.nb_chapitres || 0)}
                  </div>
                </div>
              </div>
            )}
            {serie.auteurs && shouldShow('auteurs') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Auteur(s)
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{serie.auteurs}</div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne 2 : Éditeurs, Prépublication, Langue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {serie.editeur_vo && shouldShow('editeur_vo') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <BookOpen size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Éditeur VO
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{serie.editeur_vo}</div>
                </div>
              </div>
            )}
            {serie.editeur && shouldShow('editeur') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <BookOpen size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Éditeur VF
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{serie.editeur}</div>
                </div>
              </div>
            )}
            {serie.serialization && shouldShow('serialization') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Prépublié dans
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{serie.serialization}</div>
                </div>
              </div>
            )}
            {serie.langue_originale && shouldShow('langue_originale') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Globe size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Langue originale
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {serie.langue_originale.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Informations MyAnimeList */}
      <MangaMalBlock serie={serie} shouldShow={shouldShow} />

      {/* Relations et Labels côte à côte */}
      {(shouldShow('relations') || shouldShow('labels')) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: shouldShow('relations') && shouldShow('labels') ? '1fr 1fr' : '1fr',
            gap: '20px',
            marginTop: '16px'
          }}
        >
          {shouldShow('relations') && (
            <MangaRelationsSection serie={serie} shouldShow={shouldShow} />
          )}
          {shouldShow('labels') && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '16px' }}>
                Labels personnalisés
              </div>
              <LabelsCardContent
                itemId={serie.id}
                onLabelsChange={onLabelsChange}
                getLabels={window.electronAPI.getMangaLabels}
                getAllLabels={window.electronAPI.getAllMangaLabels}
                addLabel={window.electronAPI.addMangaLabel}
                removeLabel={window.electronAPI.removeMangaLabel}
                noCard={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
