import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { rememberScrollTarget } from '../../../hooks/common/useScrollRestoration';
import { AnimeSerie } from '../../../types';

interface AnimeRelationsSectionProps {
  anime: AnimeSerie;
  shouldShow: (field: string) => boolean;
}

interface RelatedManga {
  id: number;
  titre: string;
  mal_id: number | null;
}

interface MovieRelationEntry {
  relation?: string;
  mal_id?: number | null;
  name?: string | null;
  type?: string | null;
}

interface MovieDisplay {
  id?: number;
  titre: string;
  mal_id?: number | null;
  relation?: string;
}

export default function AnimeRelationsSection({ anime, shouldShow }: AnimeRelationsSectionProps) {
  const [prequel, setPrequel] = useState<AnimeSerie | null>(null);
  const [sequel, setSequel] = useState<AnimeSerie | null>(null);
  const [mangaSource, setMangaSource] = useState<RelatedManga | null>(null);
  const [lightNovelSource, setLightNovelSource] = useState<RelatedManga | null>(null);
  const [movies, setMovies] = useState<MovieDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  const rememberAnimeTarget = (id?: number | null) => {
    if (id) {
      rememberScrollTarget('collection.animes.scroll', id);
    }
  };

  const rememberMangaTarget = (id?: number | null) => {
    if (id) {
      rememberScrollTarget('collection.mangas.scroll', id);
    }
  };

  const movieRelationEntries = useMemo((): MovieRelationEntry[] => {
    const results: MovieRelationEntry[] = [];

    const parseJsonArray = (raw?: string | null): any[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const directMovieRelations = parseJsonArray(anime.movie_relations);
    if (directMovieRelations.length > 0) {
      directMovieRelations.forEach((entry: any) => {
        if (entry && (entry.name || entry.mal_id)) {
          results.push({
            relation: entry.relation,
            mal_id: entry.mal_id,
            name: entry.name,
            type: entry.type
          });
        }
      });
      return results;
    }

    const generalRelations = parseJsonArray(anime.relations);
    generalRelations.forEach((rel: any) => {
      if (!rel || typeof rel.relation !== 'string' || !Array.isArray(rel.entries)) {
        return;
      }
      if (rel.relation.toLowerCase().includes('movie')) {
        rel.entries.forEach((entry: any) => {
          results.push({
            relation: rel.relation,
            mal_id: entry?.mal_id,
            name: entry?.name,
            type: entry?.type
          });
        });
      }
    });

    return results;
  }, [anime.movie_relations, anime.relations]);

  useEffect(() => {
    const loadRelations = async () => {
      if (
        !anime.prequel_mal_id &&
        !anime.sequel_mal_id &&
        !anime.manga_source_mal_id &&
        !anime.light_novel_source_mal_id &&
        movieRelationEntries.length === 0
      ) {
        setMovies([]);
        return;
      }

      setLoading(true);
      try {
        if (anime.prequel_mal_id) {
          const prequelData = await window.electronAPI.getAnimeByMalId(anime.prequel_mal_id);
          if (prequelData) {
            setPrequel({ id: prequelData.id, titre: prequelData.titre, mal_id: prequelData.mal_id } as AnimeSerie);
          }
        }
        if (anime.sequel_mal_id) {
          const sequelData = await window.electronAPI.getAnimeByMalId(anime.sequel_mal_id);
          if (sequelData) {
            setSequel({ id: sequelData.id, titre: sequelData.titre, mal_id: sequelData.mal_id } as AnimeSerie);
          }
        }
        if (anime.manga_source_mal_id) {
          const mangaData = await window.electronAPI.getMangaByMalId(anime.manga_source_mal_id);
          if (mangaData) {
            setMangaSource(mangaData);
          }
        }
        if (anime.light_novel_source_mal_id) {
          const lnData = await window.electronAPI.getMangaByMalId(anime.light_novel_source_mal_id);
          if (lnData) {
            setLightNovelSource(lnData);
          }
        }

        if (movieRelationEntries.length > 0) {
          const resolvedMovies = await Promise.all(
            movieRelationEntries.map(async (movie) => {
              if (movie.mal_id) {
                const movieData = await window.electronAPI.getAnimeByMalId(movie.mal_id);
                if (movieData) {
                  return {
                    id: movieData.id,
                    titre: movieData.titre,
                    mal_id: movieData.mal_id,
                    relation: movie.relation
                  } as MovieDisplay;
                }
              }

              return {
                titre: movie.name || 'Film',
                mal_id: movie.mal_id || undefined,
                relation: movie.relation
              } as MovieDisplay;
            })
          );

          setMovies(resolvedMovies.filter(Boolean));
        } else {
          setMovies([]);
        }
      } catch (error) {
        console.error('Erreur chargement relations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRelations();
  }, [
    anime.prequel_mal_id,
    anime.sequel_mal_id,
    anime.manga_source_mal_id,
    anime.light_novel_source_mal_id,
    movieRelationEntries
  ]);

  const hasNumericRelations =
    !!anime.prequel_mal_id ||
    !!anime.sequel_mal_id ||
    !!anime.manga_source_mal_id ||
    !!anime.light_novel_source_mal_id;

  const hasMovieRelations = movieRelationEntries.length > 0 || movies.length > 0;

  if (!hasNumericRelations && !hasMovieRelations) {
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
                to={`/animes/${prequel.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberAnimeTarget(prequel.id)}
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
                  href={`https://myanimelist.net/anime/${prequel.mal_id}`}
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
                to={`/animes/${sequel.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberAnimeTarget(sequel.id)}
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
                  href={`https://myanimelist.net/anime/${sequel.mal_id}`}
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
          
          {mangaSource && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Source manga :
              </span>
              <Link
                to={`/serie/${mangaSource.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberMangaTarget(mangaSource.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {mangaSource.titre}
              </Link>
              {mangaSource.mal_id && (
                <a
                  href={`https://myanimelist.net/manga/${mangaSource.mal_id}`}
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
          
          {lightNovelSource && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Source light novel :
              </span>
              <Link
                to={`/serie/${lightNovelSource.id}`}
                style={{
                  fontSize: '14px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onClick={() => rememberMangaTarget(lightNovelSource.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {lightNovelSource.titre}
              </Link>
              {lightNovelSource.mal_id && (
                <a
                  href={`https://myanimelist.net/manga/${lightNovelSource.mal_id}`}
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
          
          {movies.length > 0 && (
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                Films :
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {movies.map((movie) => (
                  <div key={`${movie.mal_id || movie.titre}-${movie.relation || 'movie'}`}>
                    {movie.relation && (
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '8px' }}>
                        {movie.relation} :
                      </span>
                    )}
                    {movie.id ? (
                      <Link
                        to={`/animes/${movie.id}`}
                        style={{
                          fontSize: '14px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                        onClick={() => rememberAnimeTarget(movie.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {movie.titre}
                      </Link>
                    ) : movie.mal_id ? (
                      <a
                        href={`https://myanimelist.net/anime/${movie.mal_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '14px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {movie.titre}
                      </a>
                    ) : (
                      <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                        {movie.titre}
                      </span>
                    )}
                    {movie.id && movie.mal_id && (
                      <a
                        href={`https://myanimelist.net/anime/${movie.mal_id}`}
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
                ))}
              </div>
            </div>
          )}
          
          {!prequel &&
            !sequel &&
            !mangaSource &&
            !lightNovelSource &&
            movies.length === 0 &&
            hasNumericRelations && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Relations disponibles mais contenus non trouvés dans la base de données
            </div>
          )}
        </div>
      )}
    </div>
  );
}
