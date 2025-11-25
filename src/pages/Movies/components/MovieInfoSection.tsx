import { Calendar, Clapperboard, Clock, Globe2, Link2, MapPin, Star } from 'lucide-react';
import { useState } from 'react';
import ExternalLinkIcon from '../../../components/common/ExternalLinkIcon';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { MovieDetail } from '../../../types';
import { formatAirDate, formatRuntime, formatVoteAverage, translateTmdbStatus } from '../../../utils/tmdb';

interface MovieInfoSectionProps {
  movie: MovieDetail;
  shouldShow: (field: string) => boolean;
}

export default function MovieInfoSection({ movie, shouldShow }: MovieInfoSectionProps) {
  const { devMode } = useDevMode();
  const [exporting, setExporting] = useState(false);
  const score = movie.note_moyenne ? formatVoteAverage(movie.note_moyenne) : null;
  const releaseDate = movie.date_sortie ? formatAirDate(movie.date_sortie) : null;
  const runtime = movie.duree ? formatRuntime(movie.duree) : null;

  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('movie', movie.id);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || 'Erreur lors de l\'export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données film:', error);
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
          <h1 className="detail-page-title" style={{ flex: 1 }}>
            {movie.titre}
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
                ID: {movie.id}
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
          {movie.titre_original && movie.titre_original !== movie.titre && (
            <p className="detail-page-subtitle">
              {movie.titre_original}
            </p>
          )}
          {movie.tagline && (
            <p className="detail-page-tagline">
              « {movie.tagline} »
            </p>
          )}
        </div>

        {/* Score */}
        {score && shouldShow('metadata') && (
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#34d399',
                borderRadius: '999px',
                padding: '8px 14px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontSize: '14px'
              }}
            >
              <Star size={16} />
              {score} / 10
            </span>
          </div>
        )}

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && shouldShow('metadata') && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {movie.genres.map((genre) => (
              <span
                key={genre.id}
                style={{
                  fontSize: '13px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#bfdbfe'
                }}
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        {movie.synopsis && shouldShow('synopsis') && (
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
              {movie.synopsis}
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
              {releaseDate && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                      Date de sortie
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{releaseDate}</div>
                  </div>
                </div>
              )}
              {runtime && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                      Durée
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{runtime}</div>
                  </div>
                </div>
              )}
              {movie.statut && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Clapperboard size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                      Statut
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {translateTmdbStatus(movie.statut, 'movie')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Colonne 2 : Pays, Langues, Studios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {movie.pays_production && movie.pays_production.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                      Pays
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {movie.pays_production.map((country) => country.name || country.iso_3166_1).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {movie.langues_parlees && movie.langues_parlees.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Globe2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                      Langues
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {movie.langues_parlees.map((lang) => lang.name || lang.iso_639_1?.toUpperCase()).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {movie.compagnies && movie.compagnies.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Clapperboard size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                      Studios
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {movie.compagnies.map((comp) => comp.name).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Liens externes */}
              {shouldShow('externalLinks') && (movie.ids_externes?.imdb_id || movie.site_officiel || movie.tmdb_id) && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Link2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '8px' }}>
                      Liens externes
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {movie.tmdb_id && (
                        <ExternalLinkIcon
                          href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                          type="tmdb"
                          size={48}
                          title="Voir sur TMDb"
                        />
                      )}
                      {movie.ids_externes?.imdb_id && (
                        <ExternalLinkIcon
                          href={`https://www.imdb.com/title/${movie.ids_externes.imdb_id}`}
                          type="imdb"
                          size={48}
                          title="Voir sur IMDb"
                        />
                      )}
                      {movie.site_officiel && (
                        <ExternalLinkIcon
                          href={movie.site_officiel}
                          size={48}
                          title="Site officiel"
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
