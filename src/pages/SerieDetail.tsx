import { ArrowLeft, Ban, BookMarked, BookOpen, CheckCircle2, Edit, Heart, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AddTomeModal from '../components/modals/manga/AddTomeModal';
import CoverImage from '../components/common/CoverImage';
import EditSerieModal from '../components/modals/manga/EditSerieModal';
import EditTomeModal from '../components/modals/manga/EditTomeModal';
import { useConfirm } from '../hooks/useConfirm';
import { Serie, SerieTag } from '../types';

const TAG_CONFIG: Record<SerieTag, { label: string; icon: any; color: string; bg: string }> = {
  a_lire: { label: 'À lire', icon: BookMarked, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  en_cours: { label: 'En cours', icon: BookMarked, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  lu: { label: 'Lu', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  abandonne: { label: 'Abandonné', icon: Ban, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' }
};

// Tags manuels uniquement
const MANUAL_TAGS: SerieTag[] = ['a_lire', 'abandonne'];

export default function SerieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [serie, setSerie] = useState<Serie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTome, setShowAddTome] = useState(false);
  const [showEditSerie, setShowEditSerie] = useState(false);
  const [editingTome, setEditingTome] = useState<number | null>(null);
  const [draggingTomeId, setDraggingTomeId] = useState<number | null>(null);
  const [draggingSerie, setDraggingSerie] = useState(false);
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const [profileImages, setProfileImages] = useState<Record<number, string | null>>({});
  const [users, setUsers] = useState<Array<{ id: number; name: string; color: string; emoji: string }>>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    loadSerie();
    loadProfileImages();
    loadCurrentUser();
    window.electronAPI.getAllUsers().then(setUsers);
  }, [id]);

  const loadCurrentUser = async () => {
    const allUsers = await window.electronAPI.getAllUsers();
    const userName = await window.electronAPI.getCurrentUser();
    const user = allUsers.find(u => u.name === userName);
    setCurrentUser(user || null);
  };

  const loadProfileImages = async () => {
    const allUsers = await window.electronAPI.getAllUsers();
    const images: Record<string, string | null> = {};
    
    for (const user of allUsers) {
      const image = await window.electronAPI.getUserAvatar(user.id);
      images[user.id] = image;
    }
    
    setProfileImages(images);
  };

  useEffect(() => {
    // Restaurer la position de scroll après le chargement
    if (scrollPosition !== null && !loading) {
      window.scrollTo(0, scrollPosition);
      setScrollPosition(null);
    }
  }, [loading, scrollPosition]);

  const loadSerie = async (preserveScroll = false) => {
    // Sauvegarder la position de scroll avant de recharger
    if (preserveScroll) {
      setScrollPosition(window.scrollY);
    }
    
    // Ne pas afficher l'écran de chargement si on fait juste un refresh
    if (!preserveScroll) {
      setLoading(true);
    }
    
    const data = await window.electronAPI.getSerie(Number(id));
    if (!data) {
      navigate('/collection');
      return;
    }
    setSerie(data);
    setLoading(false);
  };

  const handleDeleteSerie = async () => {
    const confirmed = await confirm({
      title: 'Supprimer la série',
      message: `Êtes-vous sûr de vouloir supprimer "${serie?.titre}" et tous ses tomes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    await window.electronAPI.deleteSerie(Number(id));
    navigate('/collection');
  };

  const handleDeleteTome = async (tomeId: number) => {
    const confirmed = await confirm({
      title: 'Supprimer le tome',
      message: 'Êtes-vous sûr de vouloir supprimer ce tome ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    await window.electronAPI.deleteTome(tomeId);
    loadSerie(true);
  };

  const handleSetTag = async (tag: SerieTag) => {
    if (!currentUser || !serie) return;
    
    try {
      await window.electronAPI.setSerieTag(serie.id, currentUser.id, tag);
      loadSerie(true);
    } catch (error) {
      console.error('Erreur lors du changement de tag:', error);
    }
  };

  const handleRemoveTag = async () => {
    if (!currentUser || !serie) return;
    
    try {
      await window.electronAPI.removeSerieTag(serie.id, currentUser.id);
      loadSerie(true);
    } catch (error) {
      console.error('Erreur lors de la suppression du tag:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !serie) return;
    
    try {
      await window.electronAPI.toggleSerieFavorite(serie.id, currentUser.id);
      loadSerie(true);
    } catch (error) {
      console.error('Erreur lors du toggle favori:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent, tomeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(tomeId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(null);
  };

  const handleDrop = async (e: React.DragEvent, tome: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTomeId(null);

    // Récupérer le chemin du fichier droppé
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    // @ts-ignore - path est disponible dans Electron
    const filePath = file.path;

    if (!filePath) return;

    if (!serie) return;

    // Sauvegarder l'image via l'API Electron
    const result = await window.electronAPI.saveCoverFromPath(filePath, serie.titre, 'tome');
    
    if (result.success && result.localPath) {
      // Mettre à jour le tome avec la nouvelle couverture
      await window.electronAPI.updateTome(tome.id, {
        couverture_url: result.localPath
      });
      
      // Recharger la série pour afficher la nouvelle image (en préservant le scroll)
      loadSerie(true);
    }
  };

  const handleSerieDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSerie(true);
  };

  const handleSerieDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSerie(false);
  };

  const handleSerieDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSerie(false);

    if (!serie) return;

    // Récupérer le chemin du fichier droppé
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    // @ts-ignore - path est disponible dans Electron
    const filePath = file.path;

    if (!filePath) return;

    // Sauvegarder l'image via l'API Electron
    const result = await window.electronAPI.saveCoverFromPath(filePath, serie.titre, 'serie');
    
    if (result.success && result.localPath) {
      // Mettre à jour la série avec la nouvelle couverture
      await window.electronAPI.updateSerie(serie.id, {
        couverture_url: result.localPath
      });
      
      // Recharger la série pour afficher la nouvelle image (en préservant le scroll)
      loadSerie(true);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  if (!serie) return null;

  const tomes = serie.tomes || [];
  
  // Trouver le dernier tome ajouté (numéro le plus élevé)
  const lastTome = tomes.length > 0 
    ? tomes.reduce((max, tome) => tome.numero > max.numero ? tome : max, tomes[0])
    : null;

  // Total général = somme brute de tous les prix
  const totalPrix = tomes.reduce((sum, tome) => sum + tome.prix, 0);

  // Pour chaque utilisateur, calculer son coût total
  const costsByUser = users.map(user => {
    const userCost = tomes.reduce((sum, tome) => {
      if (!tome.proprietaires || tome.proprietaires.length === 0) return sum;
      const isOwner = tome.proprietaires.some(p => p.id === user.id);
      if (!isOwner) return sum;
      // Partager le coût entre tous les propriétaires
      return sum + (tome.prix / tome.proprietaires.length);
    }, 0);

    const tomesCount = tomes.filter(tome => 
      tome.proprietaires && tome.proprietaires.some(p => p.id === user.id)
    ).length;

    return { user, cost: userCost, tomesCount };
  }).filter(item => item.cost > 0 || item.tomesCount > 0);

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'var(--primary)';
      case 'Terminée': return 'var(--success)';
      case 'Abandonnée': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };


  return (
    <div style={{ padding: '40px' }} className="fade-in">
      <div className="container">
        {/* Bouton retour */}
        <Link
          to="/collection"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            marginBottom: '24px',
            transition: 'color 0.2s'
          }}
        >
          <ArrowLeft size={20} />
          Retour à la collection
        </Link>

        {/* En-tête de la série */}
        <div className="card" style={{ padding: 'clamp(16px, 3vw, 32px)', marginBottom: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap', flex: 1 }}>
            {/* Couverture */}
            <div 
              style={{
                width: 'clamp(180px, 20vw, 250px)',
                alignSelf: 'stretch',
                minHeight: '350px',
                borderRadius: '12px',
                overflow: 'hidden',
                flexShrink: 0,
                border: draggingSerie ? '3px dashed var(--primary)' : '2px solid var(--border)',
                position: 'relative',
                transition: 'border-color 0.2s',
                background: 'var(--surface)'
              }}
              onDragOver={handleSerieDragOver}
              onDragLeave={handleSerieDragLeave}
              onDrop={handleSerieDrop}
            >
              {draggingSerie ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--primary)22',
                  color: 'var(--primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center',
                  padding: '20px',
                  gap: '12px'
                }}>
                  📥
                  <div>Déposer l'image<br/>de la série</div>
                </div>
              ) : serie.couverture_url ? (
                <CoverImage
                  src={serie.couverture_url}
                  alt={serie.titre}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, var(--surface-light), var(--surface))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  gap: '12px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <BookOpen size={64} />
                  <div style={{ fontSize: '12px' }}>Glissez une image ici</div>
                </div>
              )}
            </div>

            {/* Informations */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px' }}>{serie.titre}</h1>
                  
                  {/* Interface de sélection de tag */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Bouton Favori */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleToggleFavorite}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          background: serie.is_favorite ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface)',
                          border: `2px solid ${serie.is_favorite ? '#ef4444' : 'var(--border)'}`,
                          borderRadius: '8px',
                          color: serie.is_favorite ? '#ef4444' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: serie.is_favorite ? '700' : '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = serie.is_favorite ? '#ef4444' : 'var(--border)';
                          e.currentTarget.style.background = serie.is_favorite ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Heart size={16} fill={serie.is_favorite ? '#ef4444' : 'none'} />
                        {serie.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      </button>
                    </div>

                    {/* Tags de statut */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Statut de lecture :
                      </span>
                      
                      {/* Afficher le tag automatique (en lecture seule) si présent */}
                      {serie.tag && !MANUAL_TAGS.includes(serie.tag) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          background: TAG_CONFIG[serie.tag].bg,
                          border: `2px solid ${TAG_CONFIG[serie.tag].color}`,
                          borderRadius: '8px',
                          color: TAG_CONFIG[serie.tag].color,
                          fontSize: '14px',
                          fontWeight: '700',
                          boxShadow: `0 2px 8px ${TAG_CONFIG[serie.tag].color}40`
                        }}>
                          {React.createElement(TAG_CONFIG[serie.tag].icon, { size: 16 })}
                          {TAG_CONFIG[serie.tag].label}
                          <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '4px' }}>(auto)</span>
                        </div>
                      )}
                      
                      {/* Boutons pour tags manuels */}
                      {MANUAL_TAGS.map((key) => {
                        const config = TAG_CONFIG[key];
                        return (
                          <button
                            key={key}
                            onClick={() => handleSetTag(key)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: serie.tag === key ? config.bg : 'var(--surface)',
                              border: `1px solid ${serie.tag === key ? config.color : 'var(--border)'}`,
                              borderRadius: '6px',
                              color: serie.tag === key ? config.color : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: serie.tag === key ? '600' : '400',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (serie.tag !== key) {
                                e.currentTarget.style.borderColor = config.color;
                                e.currentTarget.style.background = `${config.bg}66`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (serie.tag !== key) {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.background = 'var(--surface)';
                              }
                            }}
                          >
                            {React.createElement(config.icon, { size: 14 })}
                            {config.label}
                          </button>
                        );
                      })}
                      
                      {/* Bouton retirer (seulement pour tags manuels) */}
                      {serie.tag && MANUAL_TAGS.includes(serie.tag) && (
                        <button
                          onClick={handleRemoveTag}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--text-secondary)';
                            e.currentTarget.style.background = 'var(--surface-light)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowEditSerie(true)} className="btn btn-primary">
                    <Edit size={18} />
                    Modifier
                  </button>
                  <button onClick={handleDeleteSerie} className="btn btn-danger">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span
                  className="badge"
                  style={{ background: `${getStatutColor(serie.statut)}22`, color: getStatutColor(serie.statut) }}
                >
                  {serie.statut}
                </span>
                <span className="badge badge-primary">
                  {serie.type_volume}
                </span>
                {serie.demographie && (
                  <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: 'var(--secondary)' }}>
                    {serie.demographie}
                  </span>
                )}
                {serie.statut_publication && (
                  <span className="badge badge-success">
                    {serie.statut_publication}
                  </span>
                )}
                {serie.rating && (
                  <span className="badge badge-warning">
                    {serie.rating}
                  </span>
                )}
              </div>

              {serie.description && (
                <p style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  marginBottom: '16px',
                  maxHeight: '100px',
                  overflow: 'auto'
                }}>
                  {serie.description}
                </p>
              )}

              {serie.genres && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Genres : </span>
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>{serie.genres}</span>
                </div>
              )}

              {serie.editeur && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Éditeur VF : </span>
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>{serie.editeur}</span>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '20px',
                marginTop: '16px'
              }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                    Coût total
                  </p>
                  <p style={{ fontSize: '22px', fontWeight: '700' }}>{totalPrix.toFixed(2)}€</p>
                </div>
                {serie.annee_publication && (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                      Année VF
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: '700' }}>{serie.annee_publication}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Coûts et Progression */}
          <div style={{
            borderTop: '1px solid var(--border)',
            marginTop: '24px',
            paddingTop: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
            gap: '24px'
          }}>
            
            {/* Coûts par propriétaire */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Coûts par propriétaire
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px'
              }}>
                {costsByUser.map(({ user, cost, tomesCount }) => (
                  <div key={user.id} style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    background: 'var(--surface)',
                    border: `2px solid ${user.color}33`,
                    borderRadius: '12px'
                  }}>
                    {/* Avatar du propriétaire */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: `2px solid ${user.color}`,
                      background: `${user.color}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: user.color,
                      overflow: 'hidden'
                    }}>
                      {profileImages[user.id] ? (
                        <img 
                          src={profileImages[user.id]!} 
                          alt={user.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <span>{user.emoji}</span>
                      )}
                    </div>
                    
                    {/* Nom du propriétaire */}
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: user.color
                    }}>
                      {user.name}
                    </span>
                    
                    {/* Prix */}
                    <span style={{ 
                      fontSize: '20px',
                      fontWeight: '700',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--text)'
                    }}>
                      {cost.toFixed(2)}€
                    </span>
                    
                    {/* Nombre de tomes */}
                    <span style={{ 
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      {tomesCount} tome{tomesCount > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progression de lecture */}
            {tomes.length > 0 && (() => {
              const tomesLus = tomes.filter(t => t.lu === 1).length;
              const progression = (tomesLus / tomes.length) * 100;
              
              return (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📚 Votre progression
                  </h3>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                        {tomesLus} / {tomes.length} lus
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
                        {progression.toFixed(0)}%
                      </span>
                    </div>
                    
                    {/* Barre de progression */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--surface)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: `${progression}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    
                    {tomesLus === tomes.length && (
                      <div style={{
                        padding: '8px',
                        background: 'var(--success)22',
                        border: '1px solid var(--success)',
                        borderRadius: '6px',
                        color: 'var(--success)',
                        fontSize: '12px',
                        fontWeight: '600',
                        textAlign: 'center',
                        marginBottom: '12px'
                      }}>
                        🎉 Série complétée !
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={async () => {
                      await window.electronAPI.marquerSerieLue(serie.id);
                      loadSerie(true);
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '8px' }}
                  >
                    ✓ Tout marquer comme lu
                  </button>
                </div>
              );
            })()}

          </div>
        </div>

        {/* Liste des tomes - Pleine largeur */}
        <div className="card" style={{ padding: '24px', marginTop: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
              Tomes ({tomes.length})
            </h2>
            <button onClick={() => setShowAddTome(true)} className="btn btn-primary">
              <Plus size={18} />
              Ajouter un tome
            </button>
          </div>

          {tomes.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '16px'
            }}>
              {tomes.sort((a, b) => a.numero - b.numero).map((tome) => {
                const isDragging = draggingTomeId === tome.id;
                
                return (
                  <div
                    key={tome.id}
                    className="card"
                    style={{
                      padding: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                      cursor: 'pointer',
                      border: isDragging ? '3px dashed var(--primary)' : undefined,
                      background: isDragging ? 'var(--surface-light)' : undefined,
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }
                    }}
                    onDragOver={(e) => handleDragOver(e, tome.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, tome)}
                  >
                  {/* Header: [Avatar] Tome X | ✓ Lu + Checkbox */}
                  <div style={{
                    padding: '12px 16px',
                    background: tome.lu ? 'var(--success)22' : 'var(--surface-light)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    {/* Gauche: Avatars + Tome X + Lu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Avatars des propriétaires */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {tome.proprietaires && tome.proprietaires.length > 0 ? (
                          tome.proprietaires.map((proprietaire, idx) => (
                            <div key={`${tome.id}-${proprietaire.id}`} style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              border: `2px solid ${proprietaire.color}`,
                              background: `${proprietaire.color}22`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: '700',
                              color: proprietaire.color,
                              flexShrink: 0,
                              overflow: 'hidden',
                              marginLeft: idx > 0 ? '-8px' : '0',
                              zIndex: tome.proprietaires!.length - idx
                            }}>
                              {profileImages[proprietaire.id] ? (
                                <img 
                                  src={profileImages[proprietaire.id]!} 
                                  alt={proprietaire.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                <span>{users.find(u => u.id === proprietaire.id)?.emoji || proprietaire.name.charAt(0)}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid var(--border)',
                            background: 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: 'var(--text-secondary)'
                          }}>
                            ?
                          </div>
                        )}
                      </div>
                      
                      <span>Tome {tome.numero}</span>
                      
                      {tome.lu === 1 && (
                        <span style={{ color: 'var(--success)', fontSize: '14px' }}>
                          | ✓ Lu
                        </span>
                      )}
                    </div>

                    {/* Droite: Checkbox simple */}
                    <input
                      type="checkbox"
                      checked={tome.lu === 1}
                      onChange={async (e) => {
                        e.stopPropagation();
                        await window.electronAPI.toggleTomeLu(tome.id, e.target.checked);
                        loadSerie(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: 'var(--success)',
                        flexShrink: 0
                      }}
                      title={tome.lu === 1 ? 'Marquer comme non lu' : 'Marquer comme lu'}
                    />
                  </div>

                  {/* Layout: Image à gauche, infos à droite */}
                  <div style={{ display: 'flex', gap: '16px', padding: '16px', flexWrap: 'wrap' }}>
                    {/* Image du tome - Ratio manga fixe */}
                    <div style={{
                      width: 'clamp(120px, 15vw, 170px)',
                      height: 'clamp(168px, 21vw, 238px)',
                      flexShrink: 0,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: isDragging ? '3px dashed var(--primary)' : tome.couverture_url ? '2px solid var(--border)' : '2px dashed var(--border)',
                      position: 'relative',
                      background: 'var(--surface)'
                    }}>
                      {isDragging ? (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--primary)22',
                          color: 'var(--primary)',
                          fontSize: '12px',
                          fontWeight: '600',
                          textAlign: 'center',
                          padding: '10px',
                          gap: '6px'
                        }}>
                          📥
                          <div>Déposer<br/>l'image</div>
                        </div>
                      ) : tome.couverture_url ? (
                        <CoverImage
                          src={tome.couverture_url}
                          alt={`Tome ${tome.numero}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--surface-light)',
                          color: 'var(--text-secondary)',
                          fontSize: '11px',
                          textAlign: 'center',
                          padding: '6px'
                        }}>
                          Glissez une image ici
                        </div>
                      )}
                    </div>

                    {/* Colonne droite: Informations */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Prix :</p>
                        <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                          {tome.prix.toFixed(2)}€
                        </p>
                      </div>

                      {tome.date_sortie && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Sortie :</p>
                          <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                            {new Date(tome.date_sortie).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}

                      {tome.date_achat && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Acheté :</p>
                          <p style={{ fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                            {new Date(tome.date_achat).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'action en bas */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface)'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTome(tome.id);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '10px', fontSize: '13px', flex: 1 }}
                    >
                      <Edit size={16} />
                      Modifier
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTome(tome.id);
                      }}
                      className="btn btn-danger"
                      style={{ padding: '10px', fontSize: '13px', flex: 1 }}
                    >
                      <Trash2 size={16} />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-secondary)'
            }}>
              <BookOpen size={48} style={{ margin: '0 auto 16px' }} />
              <p>Aucun tome pour le moment</p>
              <button
                onClick={() => setShowAddTome(true)}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                <Plus size={18} />
                Ajouter le premier tome
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddTome && (
        <AddTomeModal
          serieId={serie.id}
          serieTitre={serie.titre}
          lastTome={lastTome}
          onClose={() => setShowAddTome(false)}
          onSuccess={() => {
            setShowAddTome(false);
            loadSerie(true);
          }}
        />
      )}

      {showEditSerie && (
        <EditSerieModal
          serie={serie}
          onClose={() => setShowEditSerie(false)}
          onSuccess={() => {
            setShowEditSerie(false);
            loadSerie(true);
          }}
        />
      )}

      {editingTome !== null && (
        <EditTomeModal
          tome={tomes.find(t => t.id === editingTome)!}
          serieTitre={serie.titre}
          onClose={() => setEditingTome(null)}
          onSuccess={() => {
            setEditingTome(null);
            loadSerie(true);
          }}
        />
      )}

      <ConfirmDialog />
    </div>
  );
}
