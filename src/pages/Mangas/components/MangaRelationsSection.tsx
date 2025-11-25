import { ArrowLeftRight, BookOpen, Film, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CoverImage from '../../../components/common/CoverImage';
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
  couverture_url?: string | null;
}

export default function MangaRelationsSection({ serie, shouldShow }: MangaRelationsSectionProps) {
  const [prequel, setPrequel] = useState<RelatedManga | null>(null);
  const [sequel, setSequel] = useState<RelatedManga | null>(null);
  const [animeAdaptation, setAnimeAdaptation] = useState<{ id: number; titre: string; mal_id: number; couverture_url?: string | null } | null>(null);
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

  const relations = [
    prequel ? { type: 'Prequel', item: prequel, icon: ArrowLeftRight, isManga: true } : null,
    sequel ? { type: 'Sequel', item: sequel, icon: ArrowLeftRight, isManga: true } : null,
    animeAdaptation ? { type: 'Adaptation anime', item: animeAdaptation, icon: Film, isManga: false } : null,
    lightNovel ? { type: 'Source light novel', item: lightNovel, icon: BookOpen, isManga: true } : null,
    mangaAdaptation ? { type: 'Adaptation manga', item: mangaAdaptation, icon: Layers, isManga: true } : null
  ].filter(Boolean) as Array<{ type: string; item: RelatedManga | { id: number; titre: string; mal_id: number; couverture_url?: string | null }; icon: any; isManga: boolean }>;

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

  if (relations.length === 0 && (serie.prequel_mal_id || serie.sequel_mal_id || serie.anime_adaptation_mal_id || serie.light_novel_mal_id || serie.manga_adaptation_mal_id)) {
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
          const route = relation.isManga ? `/serie/${relation.item.id}` : `/animes/${relation.item.id}`;
          const rememberTarget = relation.isManga ? rememberMangaTarget : rememberAnimeTarget;
          const malUrl = relation.isManga 
            ? `https://myanimelist.net/manga/${relation.item.mal_id}` 
            : `https://myanimelist.net/anime/${relation.item.mal_id}`;
          const coverUrl = relation.item.couverture_url;

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                {relation.type}
              </div>
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
                  <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500', lineHeight: '1.4' }}>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
