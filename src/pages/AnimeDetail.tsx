import { ArrowLeft, Calendar, Check, Clock, Edit, ExternalLink, Globe, Play, Star, Trash2, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CoverImage from '../components/common/CoverImage';
import PlatformLogo from '../components/common/PlatformLogo';
import AnimeEditModal from '../components/modals/anime/AnimeEditModal';
import ConfirmModal from '../components/modals/common/ConfirmModal';
import { AnimeSerie } from '../types';

interface Episode {
  numero: number;
  vu: boolean;
  date_visionnage: string | null;
}

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<AnimeSerie | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
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
        setEpisodes(result.episodes || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEpisode = async (episodeNumero: number, currentVu: boolean) => {
    try {
      await window.electronAPI.toggleEpisodeVu(parseInt(id!), episodeNumero, !currentVu);
      loadAnime();
    } catch (error) {
      console.error('Erreur toggle episode:', error);
    }
  };

  const handleMarquerToutVu = async () => {
    try {
      await window.electronAPI.marquerAnimeComplet(parseInt(id!));
      loadAnime();
    } catch (error) {
      console.error('Erreur marquer tout vu:', error);
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

  const handleChangeStatutVisionnage = async (nouveauStatut: 'En cours' | 'Terminé' | 'Abandonné' | 'En attente') => {
    try {
      await window.electronAPI.setAnimeStatutVisionnage(parseInt(id!), nouveauStatut);
      loadAnime();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
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

  // Parse JSON fields
  const liensStreaming = anime.liens_streaming ? JSON.parse(anime.liens_streaming) : [];
  const liensExternes = anime.liens_externes ? JSON.parse(anime.liens_externes) : [];
  const episodesVus = episodes.filter(ep => ep.vu).length;

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }} className="fade-in">
      {/* Header avec bouton retour */}
      <button
        onClick={() => navigate('/animes')}
        className="btn btn-outline"
        style={{ marginBottom: '20px' }}
      >
        <ArrowLeft size={18} />
        Retour aux animes
      </button>

      {/* Layout principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Colonne gauche : Couverture */}
        <div>
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            {anime.couverture_url ? (
              <CoverImage
                src={anime.couverture_url}
                alt={anime.titre}
                style={{
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '2/3',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                aspectRatio: '2/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)'
              }}>
                <Tv size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
              </div>
            )}
          </div>

          {/* Liens de streaming */}
          {liensStreaming.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Play size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Regarder sur
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {liensStreaming.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <span>{link.name}</span>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Liens externes */}
          {liensExternes.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Globe size={16} style={{ display: 'inline', marginRight: '6px' }} />
                En savoir plus
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {liensExternes.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <span>📖 {link.name}</span>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Lien MyAnimeList */}
          {anime.mal_url && (
            <a
              href={anime.mal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{
                width: '100%',
                marginTop: '12px',
                justifyContent: 'space-between',
                fontSize: '13px'
              }}
            >
              <span>MyAnimeList</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {/* Colonne droite : Informations */}
        <div>
          {/* Titre et badges */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, flex: 1 }}>
                {anime.titre}
              </h1>
              
              {/* Boutons d'action */}
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

            {/* Titres alternatifs */}
            {anime.titre_anglais && anime.titre_anglais !== anime.titre && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '4px' }}>
                {anime.titre_anglais}
              </p>
            )}
            {anime.titre_natif && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                {anime.titre_natif}
              </p>
            )}
            {anime.titres_alternatifs && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                Aussi connu sous : {anime.titres_alternatifs}
              </p>
            )}

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {/* Type */}
              <span style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--primary)'
              }}>
                {anime.type}
              </span>

              {/* Score */}
              {anime.score && (
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Star size={14} style={{ fill: '#f59e0b' }} />
                  {anime.score}/10
                </span>
              )}

              {/* Source */}
              {anime.source && (
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6'
                }}>
                  {anime.source}
                </span>
              )}

              {/* En cours de diffusion */}
              {anime.en_cours_diffusion && (
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  ● En cours
                </span>
              )}

              {/* Logo source d'import */}
              {anime.source_import && anime.source_import !== 'manual' && (
                <div style={{
                  height: '28px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: anime.source_import === 'adn' ? '#1E3A8A' : 
                             anime.source_import === 'adkami' ? '#8B5CF6' : 
                             anime.source_import === 'crunchyroll' ? '#F47521' :
                             'rgba(139, 92, 246, 0.15)',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <PlatformLogo platform={anime.source_import} height={24} />
                </div>
              )}
            </div>
          </div>

          {/* Cartes d'informations */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Épisodes */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Épisodes</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {episodesVus}/{anime.nb_episodes}
              </div>
              {anime.duree && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  {anime.duree}
                </div>
              )}
            </div>

            {/* Année et saison */}
            {(anime.annee || anime.saison_diffusion) && (
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Diffusion</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>
                  {anime.saison_diffusion && `${anime.saison_diffusion} `}
                  {anime.annee}
                </div>
                {anime.date_debut && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />
                    {new Date(anime.date_debut).toLocaleDateString('fr-FR')}
                    {anime.date_fin && ` - ${new Date(anime.date_fin).toLocaleDateString('fr-FR')}`}
                  </div>
                )}
              </div>
            )}

            {/* Statut */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Statut</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {anime.statut_diffusion}
              </div>
            </div>

            {/* Mon statut */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mon statut</div>
              <select
                value={anime.statut_visionnage || 'En cours'}
                onChange={(e) => handleChangeStatutVisionnage(e.target.value as any)}
                className="select"
                style={{
                  padding: '6px 10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <option value="En cours">📺 En cours</option>
                <option value="Terminé">✅ Terminé</option>
                <option value="Abandonné">❌ Abandonné</option>
                <option value="En attente">⏸️ En attente</option>
              </select>
            </div>
          </div>

          {/* Synopsis */}
          {anime.description && (
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Synopsis</h3>
              <p style={{
                color: 'var(--text-primary)',
                lineHeight: '1.7',
                fontSize: '14px'
              }}>
                {anime.description}
              </p>
            </div>
          )}

          {/* Informations détaillées */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Informations</h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Genres */}
              {anime.genres && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Genres : </strong>
                  <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
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

              {/* Thèmes */}
              {anime.themes && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Thèmes : </strong>
                  <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {anime.themes.split(',').map((theme, index) => (
                      <span
                        key={index}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#3b82f6',
                          fontWeight: '500'
                        }}
                      >
                        {theme.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Demographics */}
              {anime.demographics && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Démographie : </strong>
                  <span style={{ fontSize: '14px' }}>{anime.demographics}</span>
                </div>
              )}

              {/* Studios */}
              {anime.studios && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Studios : </strong>
                  <span style={{ fontSize: '14px' }}>{anime.studios}</span>
                </div>
              )}

              {/* Producteurs */}
              {anime.producteurs && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Producteurs : </strong>
                  <span style={{ fontSize: '14px' }}>{anime.producteurs}</span>
                </div>
              )}

              {/* Diffuseurs */}
              {anime.diffuseurs && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Diffuseurs : </strong>
                  <span style={{ fontSize: '14px' }}>{anime.diffuseurs}</span>
                </div>
              )}

              {/* Rating */}
              {anime.rating && (
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Classification : </strong>
                  <span style={{ fontSize: '14px' }}>{anime.rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section épisodes */}
      {anime.nb_episodes > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Play size={24} style={{ color: 'var(--primary)' }} />
              Épisodes
              <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                ({episodesVus}/{anime.nb_episodes})
              </span>
            </h2>

            <button
              onClick={handleMarquerToutVu}
              className="btn btn-outline"
              disabled={episodesVus === anime.nb_episodes}
            >
              <Check size={16} />
              Tout marquer comme vu
            </button>
          </div>

          {/* Barre de progression */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'var(--background)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <div style={{
              width: `${(episodesVus / anime.nb_episodes) * 100}%`,
              height: '100%',
              background: episodesVus === anime.nb_episodes ? 'var(--success)' : 'var(--primary)',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Grille d'épisodes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
            gap: '8px'
          }}>
            {episodes.map((episode) => {
              const isVu = episode.vu;
              return (
                <button
                  key={episode.numero}
                  onClick={() => handleToggleEpisode(episode.numero, isVu)}
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
                  {episode.numero}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <ConfirmModal
          title="Supprimer cet anime ?"
          message={`Êtes-vous sûr de vouloir supprimer "${anime.titre}" ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Modal d'édition */}
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
