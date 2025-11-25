import { ArrowLeftRight, BookOpen, Film } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CoverImage from '../../../components/common/CoverImage';
import { rememberScrollTarget } from '../../../hooks/common/useScrollRestoration';
import { AnimeSerie } from '../../../types';

interface AnimeRelationsSectionProps {
  anime: AnimeSerie;
  shouldShow: (field: string) => boolean;
}

interface RelatedAnime {
  id: number;
  titre: string;
  mal_id: number;
  couverture_url?: string | null;
}

interface RelatedManga {
  id: number;
  titre: string;
  mal_id: number | null;
  couverture_url?: string | null;
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
  couverture_url?: string | null;
}

export default function AnimeRelationsSection({ anime, shouldShow }: AnimeRelationsSectionProps) {
  const [prequel, setPrequel] = useState<RelatedAnime | null>(null);
  const [sequel, setSequel] = useState<RelatedAnime | null>(null);
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
            setPrequel(prequelData);
          }
        }
        if (anime.sequel_mal_id) {
          const sequelData = await window.electronAPI.getAnimeByMalId(anime.sequel_mal_id);
          if (sequelData) {
            setSequel(sequelData);
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
                    relation: movie.relation,
                    couverture_url: undefined // getAnimeByMalId ne retourne pas couverture_url
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

  const relations = [
    prequel ? { type: 'Prequel', item: prequel, icon: ArrowLeftRight, isAnime: true } : null,
    sequel ? { type: 'Sequel', item: sequel, icon: ArrowLeftRight, isAnime: true } : null,
    mangaSource ? { type: 'Source manga', item: mangaSource, icon: BookOpen, isAnime: false } : null,
    lightNovelSource ? { type: 'Source light novel', item: lightNovelSource, icon: BookOpen, isAnime: false } : null,
    ...movies.map(movie => ({
      type: movie.relation || 'Film',
      item: movie,
      icon: Film,
      isAnime: true
    }))
  ].filter(Boolean) as Array<{
    type: string;
    item: RelatedAnime | RelatedManga | MovieDisplay;
    icon: any;
    isAnime: boolean;
  }>;

  if (loading) {
    return (
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '16px' }}>
          Relations
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Chargement des relations...
        </div>
      </div>
    );
  }

  if (relations.length === 0 && (hasNumericRelations || hasMovieRelations)) {
    return (
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '16px' }}>
          Relations
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
          Relations disponibles mais contenus non trouvés dans la base de données
        </div>
      </div>
    );
  }

  if (relations.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '16px' }}>
        Relations
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}
      >
        {relations.map((relation, index) => {
          const Icon = relation.icon;
          const route = relation.isAnime
            ? `/animes/${relation.item.id}`
            : `/serie/${relation.item.id}`;
          const rememberTarget = relation.isAnime ? rememberAnimeTarget : rememberMangaTarget;
          const malUrl = relation.isAnime
            ? `https://myanimelist.net/anime/${relation.item.mal_id}`
            : `https://myanimelist.net/manga/${relation.item.mal_id}`;
          const coverUrl = relation.item.couverture_url;
          const hasId = 'id' in relation.item && relation.item.id;

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                {relation.type}
              </div>
              {hasId ? (
                <Link
                  to={route}
                  onClick={() => rememberTarget(relation.item.id)}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    const cover = e.currentTarget.querySelector('div[style*="transform"]') as HTMLElement;
                    if (cover) {
                      cover.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const cover = e.currentTarget.querySelector('div[style*="transform"]') as HTMLElement;
                    if (cover) {
                      cover.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <div
                    style={{
                      width: '80px',
                      height: '120px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s ease',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {coverUrl ? (
                      <CoverImage
                        src={coverUrl}
                        alt={relation.item.titre}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <Icon size={24} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500', lineHeight: '1.4' }}>
                      {relation.item.titre}
                    </div>
                    {relation.item.mal_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.electronAPI?.openExternal?.(malUrl);
                        }}
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          textDecoration: 'none',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        (MAL)
                      </button>
                    )}
                  </div>
                </Link>
              ) : relation.item.mal_id ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    style={{
                      width: '80px',
                      height: '120px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={24} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <a
                      href={malUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        color: 'var(--text)',
                        fontWeight: '500',
                        lineHeight: '1.4',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {relation.item.titre}
                    </a>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      (MAL)
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    style={{
                      width: '80px',
                      height: '120px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={24} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500', lineHeight: '1.4' }}>
                      {relation.item.titre}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
