import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rememberScrollTarget } from '../../../hooks/common/useScrollRestoration';
import { Serie } from '../../../types';

interface MangaRelationsSectionProps {
  serie: Serie;
  shouldShow: (field: string) => boolean;
}

interface RelatedManga {
  id: number;
  titre: string;
  mal_id: number | null;
}

export default function MangaRelationsSection({ serie, shouldShow }: MangaRelationsSectionProps) {
  const [prequel, setPrequel] = useState<RelatedManga | null>(null);
  const [sequel, setSequel] = useState<RelatedManga | null>(null);
  const [animeAdaptation, setAnimeAdaptation] = useState<{ id: number; titre: string; mal_id: number } | null>(null);
  const [lightNovel, setLightNovel] = useState<RelatedManga | null>(null);
  const [mangaAdaptation, setMangaAdaptation] = useState<RelatedManga | null>(null);
  const [loading, setLoading] = useState(false);

  const rememberMangaTarget = (id?: number | null) => {
    if (id) {
      rememberScrollTarget('collection.mangas.scroll', id);
    }
  };

  const rememberAnimeTarget = (id?: number | null) => {
    if (id) {
      rememberScrollTarget('collection.animes.scroll', id);
    }
  };

  useEffect(() => {
    const loadRelations = async () => {
      if (!serie.prequel_mal_id && !serie.sequel_mal_id && !serie.anime_adaptation_mal_id && !serie.light_novel_mal_id && !serie.manga_adaptation_mal_id) {
        return;
      }

      setLoading(true);
      try {
        if (serie.prequel_mal_id) {
          const prequelData = await window.electronAPI.getMangaByMalId(serie.prequel_mal_id);
          if (prequelData) {
            setPrequel(prequelData);
          }
        }
        if (serie.sequel_mal_id) {
          const sequelData = await window.electronAPI.getMangaByMalId(serie.sequel_mal_id);
          if (sequelData) {
            setSequel(sequelData);
          }
        }
        if (serie.anime_adaptation_mal_id) {
          const animeData = await window.electronAPI.getAnimeByMalId(serie.anime_adaptation_mal_id);
          if (animeData) {
            setAnimeAdaptation(animeData);
          }
        }
        if (serie.light_novel_mal_id) {
          const lnData = await window.electronAPI.getMangaByMalId(serie.light_novel_mal_id);
          if (lnData) {
            setLightNovel(lnData);
          }
        }
        if (serie.manga_adaptation_mal_id) {
          const mangaData = await window.electronAPI.getMangaByMalId(serie.manga_adaptation_mal_id);
          if (mangaData) {
            setMangaAdaptation(mangaData);
          }
        }
      } catch (error) {
        console.error('Erreur chargement relations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRelations();
  }, [serie.prequel_mal_id, serie.sequel_mal_id, serie.anime_adaptation_mal_id, serie.light_novel_mal_id, serie.manga_adaptation_mal_id]);

  if (!serie.prequel_mal_id && !serie.sequel_mal_id && !serie.anime_adaptation_mal_id && !serie.light_novel_mal_id && !serie.manga_adaptation_mal_id) {
    return null;
  }

  if (!shouldShow('relations')) {
    return null;
  }

  return (
    <div style={{
      marginBottom: '20px',
      padding: '16px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: 'var(--surface)'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        marginBottom: '12px'
      }}>
        Relations
      </div>
      
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Chargement des relations...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {prequel && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Prequel :
              </span>
              <Link
                to={`/serie/${prequel.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberMangaTarget(prequel.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {prequel.titre}
              </Link>
              {prequel.mal_id && (
                <a
                  href={`https://myanimelist.net/manga/${prequel.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  (MAL)
                </a>
              )}
            </div>
          )}
          
          {sequel && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Sequel :
              </span>
              <Link
                to={`/serie/${sequel.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberMangaTarget(sequel.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {sequel.titre}
              </Link>
              {sequel.mal_id && (
                <a
                  href={`https://myanimelist.net/manga/${sequel.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  (MAL)
                </a>
              )}
            </div>
          )}
          
          {animeAdaptation && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Adaptation anime :
              </span>
              <Link
                to={`/animes/${animeAdaptation.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberAnimeTarget(animeAdaptation.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {animeAdaptation.titre}
              </Link>
              {animeAdaptation.mal_id && (
                <a
                  href={`https://myanimelist.net/anime/${animeAdaptation.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  (MAL)
                </a>
              )}
            </div>
          )}
          
          {lightNovel && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Source light novel :
              </span>
              <Link
                to={`/serie/${lightNovel.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberMangaTarget(lightNovel.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {lightNovel.titre}
              </Link>
              {lightNovel.mal_id && (
                <a
                  href={`https://myanimelist.net/manga/${lightNovel.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  (MAL)
                </a>
              )}
            </div>
          )}
          
          {mangaAdaptation && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Adaptation manga :
              </span>
              <Link
                to={`/serie/${mangaAdaptation.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberMangaTarget(mangaAdaptation.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {mangaAdaptation.titre}
              </Link>
              {mangaAdaptation.mal_id && (
                <a
                  href={`https://myanimelist.net/manga/${mangaAdaptation.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  (MAL)
                </a>
              )}
            </div>
          )}
          
          {!prequel && !sequel && !animeAdaptation && !lightNovel && !mangaAdaptation && (serie.prequel_mal_id || serie.sequel_mal_id || serie.anime_adaptation_mal_id || serie.light_novel_mal_id || serie.manga_adaptation_mal_id) && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Relations disponibles mais contenus non trouvés dans la base de données
            </div>
          )}
        </div>
      )}
    </div>
  );
}
