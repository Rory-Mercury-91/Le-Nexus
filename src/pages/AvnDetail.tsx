import { ArrowLeft, Ban, CheckCircle2, Clock, Download, Edit, ExternalLink, FileText, Flag, Info, Languages, Link2, Play, PlayCircle, Settings, Tag, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CoverImage from '../components/common/CoverImage';
import EditAvnModal from '../components/modals/avn/EditAvnModal';
import ConfirmModal from '../components/modals/common/ConfirmModal';
import { useToast } from '../hooks/useToast';
import '../index.css';
import type { AvnGame } from '../types';

export default function AvnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [game, setGame] = useState<AvnGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatutDropdown, setShowStatutDropdown] = useState(false);

  useEffect(() => {
    loadGame();
  }, [id]);

  const loadGame = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAvnGame(Number(id));
      setGame(data);
    } catch (error) {
      console.error('Erreur chargement jeu AVN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!game?.id) return;

    try {
      await window.electronAPI.launchAvnGame(game.id);
      showToast({
        title: 'Jeu lancé',
        message: 'Le jeu a été lancé avec succès',
        type: 'success'
      });
      // Recharger pour mettre à jour la dernière session
      await loadGame();
    } catch (error: any) {
      console.error('Erreur lancement jeu:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible de lancer le jeu',
        type: 'error'
      });
    }
  };

  const handleDelete = async () => {
    if (!game?.id) return;

    try {
      await window.electronAPI.deleteAvnGame(game.id);
      showToast({
        title: 'Jeu supprimé',
        type: 'success'
      });
      navigate('/avn');
    } catch (error) {
      console.error('Erreur suppression jeu:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la suppression du jeu',
        type: 'error'
      });
    }
  };

  const handleChangeStatut = async (newStatut: 'Complété' | 'En cours' | 'À jouer' | 'Abandonné') => {
    if (!game?.id) return;

    try {
      await window.electronAPI.updateAvnGame(game.id, { statut_perso: newStatut });
      setShowStatutDropdown(false);
      await loadGame();
      showToast({
        title: 'Statut modifié',
        type: 'success'
      });
    } catch (error) {
      console.error('Erreur changement statut:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors du changement de statut',
        type: 'error'
      });
    }
  };

  const getStatutColor = (statut?: string | null) => {
    switch (statut) {
      case 'Complété': return '#10b981';
      case 'En cours': return '#f59e0b';
      case 'À jouer': return '#3b82f6';
      case 'Abandonné': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Jeu non trouvé
        </p>
        <button onClick={() => navigate('/avn')} className="btn btn-primary">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <div style={{ padding: '0 32px 32px 32px' }}>
        {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '24px 0 16px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => navigate('/avn')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, flex: 1 }}>
          {game.titre}
        </h1>

        <div style={{ display: 'flex', gap: '8px' }}>
          {game.chemin_executable && (
            <button
              onClick={handleLaunch}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Play size={16} />
              Lancer le jeu
            </button>
          )}

          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Edit size={16} />
            Éditer
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn"
            style={{ 
              background: '#ef4444', 
              color: 'white',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </div>

      {/* Couverture pleine largeur */}
      {game.couverture_url ? (
        <CoverImage
          src={game.couverture_url}
          alt={game.titre}
          style={{
            width: '100%',
            maxHeight: '400px',
            objectFit: 'cover',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            marginBottom: '24px'
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '300px',
          background: 'var(--surface)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          border: '2px solid var(--border)'
        }}>
          <span style={{ fontSize: '64px' }}>🎮</span>
        </div>
      )}

      {/* Badges en haut */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {game.statut_perso && (
          <div style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: getStatutColor(game.statut_perso) + '22',
            border: `2px solid ${getStatutColor(game.statut_perso)}`,
            fontSize: '14px',
            fontWeight: '700',
            color: getStatutColor(game.statut_perso)
          }}>
            {game.statut_perso}
          </div>
        )}

        {game.maj_disponible && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
            border: '2px solid #a855f7'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#a855f7',
              flex: 1
            }}>
              🔄 Mise à jour disponible !
            </div>
            <button
              onClick={async () => {
                await window.electronAPI.markAvnUpdateSeen(game.id);
                await loadGame();
              }}
              className="btn"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: 'rgba(168, 85, 247, 0.3)',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#fff',
                fontWeight: '600'
              }}
            >
              Marquer comme vu
            </button>
          </div>
        )}

        {/* Sélecteur de statut rapide */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowStatutDropdown(!showStatutDropdown)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px'
            }}
          >
            <Flag size={14} />
            Changer statut
          </button>

          {showStatutDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              minWidth: '200px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => handleChangeStatut('À jouer')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: game.statut_perso === 'À jouer' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = game.statut_perso === 'À jouer' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
              >
                <PlayCircle size={16} style={{ color: '#3b82f6' }} />
                À jouer
              </button>

              <button
                onClick={() => handleChangeStatut('En cours')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: game.statut_perso === 'En cours' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = game.statut_perso === 'En cours' ? 'rgba(245, 158, 11, 0.1)' : 'transparent'}
              >
                <Clock size={16} style={{ color: '#f59e0b' }} />
                En cours
              </button>

              <button
                onClick={() => handleChangeStatut('Complété')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: game.statut_perso === 'Complété' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = game.statut_perso === 'Complété' ? 'rgba(16, 185, 129, 0.1)' : 'transparent'}
              >
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                Complété
              </button>

              <button
                onClick={() => handleChangeStatut('Abandonné')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: game.statut_perso === 'Abandonné' ? 'rgba(107, 114, 128, 0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = game.statut_perso === 'Abandonné' ? 'rgba(107, 114, 128, 0.1)' : 'transparent'}
              >
                <Ban size={16} style={{ color: '#6b7280' }} />
                Abandonné
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal : Informations et Liens côte à côte */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Infos principales */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} />
              Informations
            </h2>

            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Version */}
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Version actuelle
                </span>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginTop: '4px' }}>
                  {game.version || 'N/A'}
                  {game.version_disponible && game.version_disponible !== game.version && (
                    <span style={{ color: '#a855f7', marginLeft: '12px' }}>
                      → {game.version_disponible}
                    </span>
                  )}
                </p>
              </div>

              {/* Moteur */}
              {game.moteur && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} />
                    Moteur
                  </span>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginTop: '4px' }}>
                    {game.moteur}
                  </p>
                </div>
              )}

              {/* Statut du jeu */}
              {game.statut_jeu && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flag size={14} />
                    Statut du jeu
                  </span>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginTop: '4px' }}>
                    {game.statut_jeu}
                  </p>
                </div>
              )}

              {/* Traduction française */}
              {game.traduction_fr_disponible && (
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  borderRadius: '12px',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Badge FR */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px',
                    fontSize: '28px',
                    opacity: 0.3
                  }}>
                    🇫🇷
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Languages size={18} />
                    Traduction Française Disponible
                  </div>

                  <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                    {/* Version traduite */}
                    {game.version_traduite && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '100px' }}>
                          Version traduite :
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                          {game.version_traduite}
                          {game.version && game.version_traduite !== game.version && (
                            <span style={{ 
                              marginLeft: '8px', 
                              fontSize: '11px', 
                              padding: '2px 6px', 
                              background: 'rgba(251, 146, 60, 0.2)', 
                              color: '#fb923c', 
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              ⚠️ Jeu en v{game.version}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Statut */}
                    {game.statut_trad_fr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '100px' }}>
                          Statut :
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background:
                            game.statut_trad_fr === 'TERMINÉ' ? 'rgba(16, 185, 129, 0.15)' :
                            game.statut_trad_fr === 'EN COURS' ? 'rgba(59, 130, 246, 0.15)' :
                            'rgba(156, 163, 175, 0.15)',
                          color:
                            game.statut_trad_fr === 'TERMINÉ' ? '#10b981' :
                            game.statut_trad_fr === 'EN COURS' ? '#3b82f6' :
                            '#9ca3af',
                          border: `1px solid ${
                            game.statut_trad_fr === 'TERMINÉ' ? '#10b981' :
                            game.statut_trad_fr === 'EN COURS' ? '#3b82f6' :
                            '#9ca3af'
                          }`
                        }}>
                          {game.statut_trad_fr === 'TERMINÉ' && '✅ '}
                          {game.statut_trad_fr === 'EN COURS' && '⏳ '}
                          {game.statut_trad_fr === 'ABANDONNÉ' && '❌ '}
                          {game.statut_trad_fr}
                        </span>
                      </div>
                    )}

                    {/* Type de traduction */}
                    {game.type_trad_fr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '100px' }}>
                          Type :
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                          {game.type_trad_fr === 'Traduction Humaine' && '👤 '}
                          {game.type_trad_fr === 'Traduction Semi-Automatique' && '🤖👤 '}
                          {game.type_trad_fr === 'Traduction Automatique' && '🤖 '}
                          {game.type_trad_fr}
                        </span>
                      </div>
                    )}

                    {/* Traducteur */}
                    {game.traducteur && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '100px' }}>
                          Traducteur :
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                          {game.traducteur}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bouton téléchargement */}
                  {game.lien_traduction && (
                    <button
                      onClick={() => window.electronAPI.openExternal(game.lien_traduction)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        padding: '10px'
                      }}
                    >
                      <Download size={16} />
                      Télécharger la traduction
                    </button>
                  )}
                </div>
              )}

              {/* Dernière session */}
              {game.derniere_session && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    Dernière session
                  </span>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginTop: '4px' }}>
                    {new Date(game.derniere_session).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}

              {/* Propriétaires */}
              {game.proprietaires && game.proprietaires.length > 0 && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} />
                    Propriétaire(s)
                  </span>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginTop: '4px' }}>
                    {game.proprietaires.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Liens */}
          {(game.lien_f95 || game.lien_traduction || game.lien_jeu) && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={18} />
                Liens
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {game.lien_f95 && (
                  <a
                    href={game.lien_f95}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ExternalLink size={16} />
                    {game.lien_f95.includes('lewdcorner') ? 'Page LewdCorner' : 'Page F95Zone'}
                  </a>
                )}

                {game.lien_traduction && (
                  <button
                    onClick={() => window.electronAPI.openExternal(game.lien_traduction)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Languages size={16} />
                      Traduction française
                    </span>
                    <ExternalLink size={14} />
                  </button>
                )}

                {game.lien_jeu && (
                  <button
                    onClick={() => window.electronAPI.openExternal(game.lien_jeu)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Download size={16} />
                      Télécharger le jeu
                    </span>
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Tags */}
      {game.tags && Array.isArray(game.tags) && game.tags.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} />
            Tags
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {game.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  padding: '6px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes privées */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} />
          Notes privées
        </h2>

        {game.notes_privees ? (
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text)', 
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap' 
          }}>
            {game.notes_privees}
          </p>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Aucune note pour ce jeu
          </p>
        )}
      </div>

      {/* Modals */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Supprimer ce jeu ?"
          message={`Êtes-vous sûr de vouloir supprimer "${game.titre}" ?\n\nCette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Supprimer"
          isDanger={true}
        />
      )}

      {/* Modal d'édition */}
      {showEditModal && game && (
        <EditAvnModal
          game={game}
          onClose={() => setShowEditModal(false)}
          onSave={loadGame}
        />
      )}
    </div>
    </>
  );
}
