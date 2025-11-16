import { useState } from 'react';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { Serie } from '../../../types';
import { organizeMangaTitles } from '../../../utils/manga-titles';
import { translatePublicationStatus, translateRating } from '../../../utils/translations';
import MangaRelationsSection from './MangaRelationsSection';

interface MangaInfoSectionProps {
  serie: Serie;
  shouldShow: (field: string) => boolean;
}

export default function MangaInfoSection({ serie, shouldShow }: MangaInfoSectionProps) {
  // Organiser les titres : titre français en priorité, titre original et titres alternatifs
  const { mainTitle, alternativeTitles } = organizeMangaTitles(serie);
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
        window.alert(result?.error || 'Erreur lors de l’export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données manga:', error);
      window.alert(error?.message || 'Erreur inattendue lors de l’export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px', flex: 1 }}>{mainTitle}</h1>
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

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {shouldShow('type_volume') && (
          <div>
            <span className="badge badge-primary">
              {serie.type_volume}
            </span>
          </div>
        )}
        {(() => {
          // Normaliser pour comparer (insensible à la casse)
          const normalizeForComparison = (str: string) => str.toLowerCase().trim();
          const mediaTypeNormalized = serie.media_type ? normalizeForComparison(serie.media_type) : '';
          const demographieNormalized = serie.demographie ? normalizeForComparison(serie.demographie) : '';
          const areEqual = mediaTypeNormalized && demographieNormalized && mediaTypeNormalized === demographieNormalized;

          // Afficher media_type ou demographie, mais pas les deux si identiques
          if (areEqual) {
            // Si identiques, afficher media_type en priorité (ou demographie si media_type n'est pas visible)
            if (serie.media_type && shouldShow('media_type')) {
              return (
                <div>
                  <span key="media_type" className="badge badge-primary">
                    {serie.media_type}
                  </span>
                </div>
              );
            } else if (serie.demographie && shouldShow('demographie')) {
              return (
                <div>
                  <span key="demographie" className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: 'var(--secondary)' }}>
                    {serie.demographie}
                  </span>
                </div>
              );
            }
          } else {
            // Si différents ou si un seul est présent, afficher les deux
            return (
              <>
                {serie.media_type && shouldShow('media_type') && (
                  <div>
                    <span key="media_type" className="badge badge-primary">
                      {serie.media_type}
                    </span>
                  </div>
                )}
                {serie.demographie && shouldShow('demographie') && (
                  <div>
                    <span key="demographie" className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: 'var(--secondary)' }}>
                      {serie.demographie}
                    </span>
                  </div>
                )}
              </>
            );
          }
          return null;
        })()}
        {(serie.statut_publication || serie.statut_publication_vf) && (shouldShow('statut_publication') || shouldShow('statut_publication_vf')) && (
          <div>
            <span className="badge badge-success">
              {serie.statut_publication && serie.statut_publication_vf && serie.statut_publication !== serie.statut_publication_vf
                ? `VO: ${translatePublicationStatus(serie.statut_publication)} | VF: ${translatePublicationStatus(serie.statut_publication_vf)}`
                : translatePublicationStatus(serie.statut_publication || serie.statut_publication_vf)}
            </span>
          </div>
        )}
        {serie.rating && shouldShow('rating') && (() => {
          // Déterminer l'emote et le style selon le rating
          const getRatingStyle = (rating: string) => {
            const ratingLower = rating.toLowerCase();
            if (ratingLower === 'erotica' || ratingLower.includes('rx') || ratingLower.includes('hentai')) {
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

          const style = getRatingStyle(serie.rating);
          // Pour les ratings standardisés (erotica, suggestive, safe), utiliser directement
          let displayText: string;
          if (serie.rating === 'erotica') {
            displayText = '18+';
          } else if (serie.rating === 'suggestive') {
            displayText = '13+';
          } else if (serie.rating === 'safe') {
            displayText = 'Tout public';
          } else {
            // Pour les formats MAL, utiliser translateRating et extraire l'âge
            const ratingText = translateRating(serie.rating);
            const ageMatch = ratingText.match(/(\d+\+|\d+ ans|Tout public|Enfants|Adolescents)/i);
            displayText = ageMatch ? ageMatch[1] : ratingText.split(' - ')[0];
          }

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
      {shouldShow('titres_alternatifs') && alternativeTitles.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--surface)'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            Titres alternatifs
          </div>
          <div style={{ fontSize: '16px', color: 'var(--text)' }}>
            {alternativeTitles.join(' // ')}
          </div>
        </div>
      )}

      {/* Synopsis */}
      {serie.description && shouldShow('description') && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--surface)'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            Synopsis
          </div>
          <div style={{
            color: 'var(--text)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap', // Préserver les sauts de ligne
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {serie.description}
          </div>
        </div>
      )}

      {/* Encadré genres et thèmes */}
      {((serie.genres && shouldShow('genres')) || (serie.themes && shouldShow('themes'))) && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          alignItems: 'start'
        }}>
          {serie.genres && shouldShow('genres') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Genres : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{serie.genres}</span>
            </div>
          )}
          {serie.themes && shouldShow('themes') && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Thèmes : </span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{serie.themes}</span>
            </div>
          )}
        </div>
      )}

      {/* Encadré éditeurs, prépublication et auteurs */}
      {((serie.editeur && shouldShow('editeur')) ||
        (serie.editeur_vo && shouldShow('editeur_vo')) ||
        (serie.serialization && shouldShow('serialization')) ||
        (serie.auteurs && shouldShow('auteurs'))) && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            alignItems: 'start'
          }}>
            {serie.editeur && shouldShow('editeur') && (
              <div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Éditeur VF : </span>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{serie.editeur}</span>
              </div>
            )}
            {serie.editeur_vo && shouldShow('editeur_vo') && (
              <div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Éditeur VO : </span>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{serie.editeur_vo}</span>
              </div>
            )}
            {serie.serialization && shouldShow('serialization') && (
              <div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Prépublié dans : </span>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{serie.serialization}</span>
              </div>
            )}
            {serie.langue_originale && shouldShow('langue_originale') && (
              <div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Langue originale : </span>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {serie.langue_originale.toUpperCase()}
                </span>
              </div>
            )}
            {serie.auteurs && shouldShow('auteurs') && (
              <div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Auteur(s) : </span>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{serie.auteurs}</span>
              </div>
            )}
          </div>
        )}

      {/* Encadré publication, volumes et chapitres */}
      {(((serie.date_debut || serie.date_fin || serie.statut_publication || serie.annee_publication) && (shouldShow('date_debut') || shouldShow('date_fin') || shouldShow('statut_publication') || shouldShow('annee_publication'))) ||
        (serie.annee_vf || serie.statut_publication_vf) && (shouldShow('annee_vf') || shouldShow('statut_publication_vf')) ||
        ((serie.nb_volumes && shouldShow('nb_volumes')) || (serie.nb_volumes_vf && shouldShow('nb_volumes_vf'))) ||
        ((serie.nb_chapitres || serie.nb_chapitres_vf) && (shouldShow('nb_chapitres') || shouldShow('nb_chapitres_vf')))) && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            alignItems: 'start'
          }}>
            {((serie.date_debut || serie.date_fin || serie.statut_publication || serie.annee_publication) && (shouldShow('date_debut') || shouldShow('date_fin') || shouldShow('statut_publication') || shouldShow('annee_publication'))) && (
              <div>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Publication VO :{' '}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)' }}>
                  {serie.date_debut ? new Date(serie.date_debut).getFullYear() : (serie.annee_publication || '?')}
                  {' → '}
                  {serie.date_fin ? new Date(serie.date_fin).getFullYear() : (serie.statut_publication ? translatePublicationStatus(serie.statut_publication) : '?')}
                </span>
              </div>
            )}
            {(serie.annee_vf || serie.statut_publication_vf) && (shouldShow('annee_vf') || shouldShow('statut_publication_vf')) && (
              <div>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Publication VF :{' '}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)' }}>
                  {serie.annee_vf || (serie.date_debut ? new Date(serie.date_debut).getFullYear() : (serie.annee_publication || '?'))}
                  {' → '}
                  {translatePublicationStatus(serie.statut_publication_vf)}
                </span>
              </div>
            )}
            {((serie.nb_volumes && shouldShow('nb_volumes')) || (serie.nb_volumes_vf && shouldShow('nb_volumes_vf'))) && (
              <div>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {((serie.nb_volumes && serie.nb_volumes_vf && serie.nb_volumes !== serie.nb_volumes_vf) ? 'Volumes VO/VF' :
                    (serie.nb_volumes && !serie.nb_volumes_vf) ? 'Volumes VO' :
                      (!serie.nb_volumes && serie.nb_volumes_vf) ? 'Volumes VF' : 'Volumes')} :{' '}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)' }}>
                  {serie.nb_volumes && serie.nb_volumes_vf && serie.nb_volumes !== serie.nb_volumes_vf
                    ? `VO: ${serie.nb_volumes} | VF: ${serie.nb_volumes_vf}`
                    : (serie.nb_volumes && !serie.nb_volumes_vf)
                      ? serie.nb_volumes
                      : (serie.nb_volumes_vf || serie.nb_volumes || 0)}
                </span>
              </div>
            )}
            {(serie.nb_chapitres || serie.nb_chapitres_vf) && (shouldShow('nb_chapitres') || shouldShow('nb_chapitres_vf')) && (
              <div>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {(serie.nb_chapitres && serie.nb_chapitres_vf && serie.nb_chapitres !== serie.nb_chapitres_vf) ? 'Chapitres VO/VF' : 'Chapitres'} :{' '}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text)' }}>
                  {serie.nb_chapitres && serie.nb_chapitres_vf && serie.nb_chapitres !== serie.nb_chapitres_vf
                    ? `VO: ${serie.nb_chapitres} | VF: ${serie.nb_chapitres_vf}`
                    : (serie.nb_chapitres_vf || serie.nb_chapitres || 0)}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Relations */}
      <MangaRelationsSection serie={serie} shouldShow={shouldShow} />
    </div>
  );
}
