import { ArrowLeft, Check, CheckCircle, Edit, Play, Star, Trash2, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimeEditModal from '../components/modals/anime/AnimeEditModal';
import ConfirmModal from '../components/modals/common/ConfirmModal';
import CoverImage from '../components/common/CoverImage';
import PlatformLogo from '../components/common/PlatformLogo';
import { AnimeSerie } from '../types';

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<AnimeSerie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadAnime();
    }
  }, [id]);

  const loadAnime = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getAnimeDetail(parseInt(id!));
      if (result.success) {
        setAnime(result.anime);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEpisode = async (saisonId: number, episodeNumero: number, currentVu: boolean) => {
    try {
      await window.electronAPI.toggleEpisodeVu(saisonId, episodeNumero, !currentVu);
      loadAnime();
    } catch (error) {
      console.error('Erreur toggle episode:', error);
    }
  };

  const handleMarquerSaisonVue = async (saisonId: number) => {
    try {
      await window.electronAPI.marquerSaisonVue(saisonId);
      loadAnime();
    } catch (error) {
      console.error('Erreur marquer saison:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await window.electronAPI.deleteAnime(parseInt(id!));
      navigate('/animes');
    } catch (error) {
      console.error('Erreur suppression anime:', error);
    }
  };

  const handleChangeStatutVisionnage = async (nouveauStatut: 'En cours' | 'Terminé' | 'Abandonné') => {
    try {
      await window.electronAPI.setAnimeStatutVisionnage(parseInt(id!), nouveauStatut);
      loadAnime();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'watching': 'En cours',
      'completed': 'Terminé',
      'on_hold': 'En pause',
      'dropped': 'Abandonné',
      'plan_to_watch': 'Prévu'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'watching': '#3b82f6',
      'completed': '#10b981',
      'on_hold': '#f59e0b',
      'dropped': '#ef4444',
      'plan_to_watch': '#6366f1'
    };
    return colorMap[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div className="loading" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
          Chargement de l'anime...
        </p>
      </div>
    );
  }

  if (!anime) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Anime non trouvé</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header avec bouton retour */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/animes')}
          className="btn btn-outline"
          style={{ marginBottom: '20px' }}
        >
          <ArrowLeft size={18} />
          Retour aux animes
        </button>
      </div>

      {/* Layout principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Carte principale de l'anime */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(139, 92, 246, 0.15)'
        }}>
          {/* Layout conditionnel selon la source */}
          {anime.source_import === 'crunchyroll' ? (
            // Layout Crunchyroll : bannière pleine largeur en haut
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Bannière pleine largeur */}
              {anime.couverture_url && (
            <div style={{
                  width: '100%',
                  height: '300px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid var(--border)',
              position: 'relative',
              background: 'var(--surface)'
            }}>
                <CoverImage
                  src={anime.couverture_url}
                  alt={anime.titre}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                </div>
              )}

              {/* Informations en dessous */}
              <div style={{ flex: 1 }}>
              {/* Titre, badges et boutons d'action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                      {anime.titre}
                    </h1>
                    <div style={{
                      background: getStatusColor(anime.statut),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {getStatusLabel(anime.statut)}
                    </div>
                    {anime.source_import && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '28px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: anime.source_import === 'adn' ? '#1E3A8A' : 
                                   anime.source_import === 'adkami' ? '#8B5CF6' : 
                                   '#F47521',
                        padding: '0 8px'
                      }}>
                        <PlatformLogo platform={anime.source_import} height={24} />
                      </div>
                    )}
                  </div>

                  {anime.titre_en && anime.titre_en !== anime.titre && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                      {anime.titre_en}
                    </p>
                  )}
                </div>

                {/* Boutons d'action en haut à droite */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowEditModal(true)} className="btn btn-primary">
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Statistiques */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Type</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>{anime.type}</div>
                </div>

                {anime.score && (
                  <div style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Note</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={16} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                      {anime.score}/10
                    </div>
                  </div>
                )}

                {anime.annee && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Année</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{anime.annee}</div>
                  </div>
                )}

                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Épisodes</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {anime.saisons?.reduce((acc, s) => acc + (s.episodes_vus || 0), 0) || 0}/{anime.nb_episodes_total || '?'}
                  </div>
                </div>
              </div>

              {/* Statut de visionnage */}
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Mon statut</h3>
                <select
                  value={anime.statut_visionnage || 'En cours'}
                  onChange={(e) => handleChangeStatutVisionnage(e.target.value as 'En cours' | 'Terminé' | 'Abandonné')}
                  className="input"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    maxWidth: '200px'
                  }}
                >
                  <option value="En cours">📺 En cours</option>
                  <option value="Terminé">✅ Terminé</option>
                  <option value="Abandonné">❌ Abandonné</option>
                </select>
              </div>

              {/* Genres */}
              {anime.genres && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>Genres</h3>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {anime.genres.split(',').map((genre, index) => (
                      <span
                        key={index}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: 'var(--primary)',
                          fontWeight: '500'
                        }}
                      >
                        {genre.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {anime.description && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Synopsis</h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {anime.description}
                  </p>
                </div>
              )}

            </div>
            </div>
          ) : (
            // Layout par défaut (ADN, ADKami, etc.) : image à gauche, infos à droite
            <div style={{ display: 'flex', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap', flex: 1 }}>
              {/* Image portrait */}
              <div style={{
                width: 'clamp(180px, 20vw, 250px)',
                height: 'fit-content',
                maxHeight: '450px',
                borderRadius: '12px',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid var(--border)',
                position: 'relative',
                background: 'var(--surface)'
              }}>
                {anime.couverture_url ? (
                  <CoverImage
                    src={anime.couverture_url}
                    alt={anime.titre}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    minHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    gap: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <Tv size={64} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: '13px' }}>Aucune image</div>
                  </div>
                )}
              </div>

              {/* Informations à droite */}
              <div style={{ flex: 1, minWidth: '300px' }}>
              {/* Titre, badges et boutons d'action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                      {anime.titre}
                    </h1>
                    <div style={{
                      background: getStatusColor(anime.statut),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {getStatusLabel(anime.statut)}
                    </div>
                    {anime.source_import && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '28px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: anime.source_import === 'adn' ? '#1E3A8A' : 
                                   anime.source_import === 'adkami' ? '#8B5CF6' : 
                                   '#F47521',
                        padding: '0 8px'
                      }}>
                        <PlatformLogo platform={anime.source_import} height={24} />
                      </div>
                    )}
                  </div>

                  {anime.titre_en && anime.titre_en !== anime.titre && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                      {anime.titre_en}
                    </p>
                  )}
                </div>

                {/* Boutons d'action en haut à droite */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowEditModal(true)} className="btn btn-primary">
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Statistiques */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Type</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>{anime.type}</div>
                </div>

                {anime.score && (
                  <div style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Note</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={16} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                      {anime.score}/10
                    </div>
                  </div>
                )}

                {anime.annee && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Année</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{anime.annee}</div>
                  </div>
                )}

                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Épisodes</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {(() => {
                      const totalEpisodes = anime.saisons?.reduce((acc, s) => acc + (s.nb_episodes || 0), 0) || 0;
                      const episodesVus = anime.saisons?.reduce((acc, s) => acc + (s.episodes_vus || 0), 0) || 0;
                      return `${episodesVus}/${totalEpisodes}`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Statut de visionnage */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Mon statut
                </label>
                <select
                  value={anime.statut_visionnage || 'En cours'}
                  onChange={(e) => handleChangeStatutVisionnage(e.target.value as any)}
                  className="select"
                  style={{
                    width: '100%',
                    maxWidth: '300px'
                  }}
                >
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Abandonné">Abandonné</option>
                </select>
              </div>

              {/* Genres */}
              {anime.genres && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Genres
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {anime.genres.split(',').map((genre, index) => (
                      <span
                        key={index}
                        style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: 'var(--primary)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        {genre.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {anime.description && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Synopsis
                  </div>
                  <p style={{
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    fontSize: '14px'
                  }}>
                    {anime.description}
                  </p>
                </div>
              )}

          </div>
            </div>
          )}
        </div>

        {/* Saisons et épisodes */}
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Play size={24} style={{ color: 'var(--primary)' }} />
            Saisons et Épisodes
          </h2>

          {anime.saisons && anime.saisons.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {anime.saisons.map((saison) => (
                <div
                  key={saison.id}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(139, 92, 246, 0.15)'
                  }}
                >
                  {/* Header de la saison */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Saison {saison.numero_saison} {saison.titre && `- ${saison.titre}`}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {saison.episodes_vus || 0}/{saison.nb_episodes} épisodes vus
                      </span>
                      <button
                        onClick={() => handleMarquerSaisonVue(saison.id)}
                        className="btn btn-outline"
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        <CheckCircle size={16} />
                        Tout marquer
                      </button>
                    </div>
                  </div>

                  {/* Grille d'épisodes */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                    gap: '8px'
                  }}>
                    {Array.from({ length: saison.nb_episodes }, (_, i) => {
                      const episodeNum = i + 1;
                      const isVu = saison.episodes_vus_details?.some(
                        ep => ep.episode_numero === episodeNum && ep.vu
                      );

                      return (
                        <button
                          key={episodeNum}
                          onClick={() => handleToggleEpisode(saison.id, episodeNum, isVu || false)}
                          style={{
                            padding: '12px 8px',
                            background: isVu ? 'var(--primary)' : 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            color: isVu ? 'white' : 'var(--text)',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                          onMouseOver={(e) => {
                            if (!isVu) {
                              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isVu) {
                              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                            }
                          }}
                        >
                          {isVu && <Check size={14} />}
                          {episodeNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              border: '2px dashed rgba(139, 92, 246, 0.3)'
            }}>
              <Tv size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Aucune saison disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <ConfirmModal
          title="Supprimer cet anime ?"
          message={`Êtes-vous sûr de vouloir supprimer "${anime.titre}" ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Modal d'édition de l'anime */}
      {showEditModal && anime && (
        <AnimeEditModal
          anime={anime}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadAnime();
          }}
        />
      )}
    </div>
  );
}
