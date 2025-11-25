import { Calendar, Clapperboard, Layers, Link2, MapPin, Play, Star } from 'lucide-react';
import { useState } from 'react';
import ExternalLinkIcon from '../../../components/common/ExternalLinkIcon';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { TvShowDetail } from '../../../types';
import { formatAirDate, formatRuntime, formatVoteAverage, translateTmdbStatus } from '../../../utils/tmdb';

interface SeriesInfoSectionProps {
  show: TvShowDetail;
  shouldShow: (field: string) => boolean;
}

export default function SeriesInfoSection({ show, shouldShow }: SeriesInfoSectionProps) {
  const { devMode } = useDevMode();
  const [exporting, setExporting] = useState(false);
  const score = show.note_moyenne ? formatVoteAverage(show.note_moyenne) : null;
  const firstAirDate = show.date_premiere ? formatAirDate(show.date_premiere) : null;

  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('serie', show.id);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || 'Erreur lors de l\'export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données série:', error);
      window.alert(error?.message || 'Erreur inattendue lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ flex: 1, minWidth: '320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
      {/* Titre et métadonnées principales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <h1 className="detail-page-title" style={{ flex: 1 }}>{show.titre}</h1>
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
                ID: {show.id}
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
        {show.titre_original && show.titre_original !== show.titre && (
          <p className="detail-page-subtitle">{show.titre_original}</p>
        )}
      </div>

      {/* Badges : Score, Date, Saisons, Épisodes */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px'
        }}
      >
        {score && shouldShow('metadata') && (
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
            <Star size={16} />
            {score} / 10
          </span>
        )}
        {firstAirDate && shouldShow('metadata') && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
            <Calendar size={16} />
            {firstAirDate}
          </span>
        )}
        {show.nb_saisons != null && shouldShow('metadata') && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
            <Layers size={16} />
            {show.nb_saisons} saison{show.nb_saisons > 1 ? 's' : ''}
          </span>
        )}
        {show.nb_episodes != null && shouldShow('metadata') && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
            <Play size={16} />
            {show.nb_episodes} épisode{show.nb_episodes > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Genres */}
      {show.genres && show.genres.length > 0 && shouldShow('metadata') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {show.genres.map((genre) => (
            <span
              key={genre.id}
              style={{
                fontSize: '13px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(34, 197, 94, 0.18)',
                border: '1px solid rgba(34, 197, 94, 0.32)',
                color: '#86efac'
              }}
            >
              {genre.name}
            </span>
          ))}
        </div>
      )}

      {/* Synopsis */}
      {show.synopsis && shouldShow('synopsis') && (
        <div style={{ marginBottom: '16px' }}>
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
            {show.synopsis}
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
          {/* Colonne 1 : Date, Durée, Statut */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {firstAirDate && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Date de première diffusion
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{firstAirDate}</div>
                </div>
              </div>
            )}
            {show.duree_episode && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Play size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Durée épisode
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{formatRuntime(show.duree_episode)}</div>
                </div>
              </div>
            )}
            {show.statut && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Clapperboard size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Statut
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {translateTmdbStatus(show.statut, 'tv')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne 2 : Pays, Studios, Liens externes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {show.pays_production && show.pays_production.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Pays
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {show.pays_production.map((country) => country.name || country.iso_3166_1).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {show.compagnies && show.compagnies.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Clapperboard size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Studios
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {show.compagnies.map((comp) => comp.name).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Liens externes */}
            {shouldShow('externalLinks') && (show.ids_externes?.imdb_id || show.tmdb_id) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Link2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '8px' }}>
                    Liens externes
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {show.tmdb_id && (
                      <ExternalLinkIcon
                        href={`https://www.themoviedb.org/tv/${show.tmdb_id}`}
                        type="tmdb"
                        size={48}
                        title="Voir sur TMDb"
                      />
                    )}
                    {show.ids_externes?.imdb_id && (
                      <ExternalLinkIcon
                        href={`https://www.imdb.com/title/${show.ids_externes.imdb_id}`}
                        type="imdb"
                        size={48}
                        title="Voir sur IMDb"
                      />
                    )}
                    {show.ids_externes?.facebook_id && (
                      <ExternalLinkIcon
                        href={`https://www.facebook.com/${show.ids_externes.facebook_id}`}
                        type="facebook"
                        size={48}
                        title="Facebook"
                      />
                    )}
                    {show.ids_externes?.instagram_id && (
                      <ExternalLinkIcon
                        href={`https://www.instagram.com/${show.ids_externes.instagram_id}`}
                        type="instagram"
                        size={48}
                        title="Instagram"
                      />
                    )}
                    {show.ids_externes?.twitter_id && (
                      <ExternalLinkIcon
                        href={`https://twitter.com/${show.ids_externes.twitter_id}`}
                        type="x"
                        size={48}
                        title="Twitter / X"
                      />
                    )}
                    {show.ids_externes?.wikidata_id && (
                      <ExternalLinkIcon
                        href={`https://www.wikidata.org/wiki/${show.ids_externes.wikidata_id}`}
                        type="wikipedia"
                        size={48}
                        title="Wikidata"
                      />
                    )}
                    {show.ids_externes?.tvdb_id && (
                      <ExternalLinkIcon
                        href={`https://thetvdb.com/?tab=series&id=${show.ids_externes.tvdb_id}`}
                        type="tvdb"
                        size={48}
                        title="TVDB"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
