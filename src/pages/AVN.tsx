import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Grid3x3, List, Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { AvnGame, AvnFilters, AvnStatutPerso, AvnStatutJeu, AvnMoteur } from '../types';
import '../index.css';

type ViewMode = 'grid' | 'list' | 'images';

export default function AVN() {
  const [games, setGames] = useState<AvnGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('avnViewMode');
    return (saved as ViewMode) || 'grid';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatutPerso, setSelectedStatutPerso] = useState<AvnStatutPerso | 'all'>('all');
  const [selectedMoteur, setSelectedMoteur] = useState<AvnMoteur | 'all'>('all');
  const [showMajOnly, setShowMajOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    localStorage.setItem('avnViewMode', viewMode);
  }, [viewMode]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const filters: AvnFilters = {};
      
      if (searchTerm) filters.search = searchTerm;
      if (selectedStatutPerso !== 'all') filters.statut_perso = selectedStatutPerso;
      if (selectedMoteur !== 'all') filters.moteur = selectedMoteur;
      if (showMajOnly) filters.maj_disponible = true;

      const data = await window.electronAPI.getAvnGames(filters);
      setGames(data);
    } catch (error) {
      console.error('Erreur chargement jeux AVN:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.checkAvnUpdates();
      
      if (result.updated > 0) {
        alert(`✅ ${result.updated} mise(s) à jour détectée(s) sur ${result.checked} jeux !`);
      } else {
        alert(`✅ Aucune mise à jour. ${result.checked} jeux vérifiés.`);
      }
      
      await loadGames();
    } catch (error) {
      console.error('Erreur vérification MAJ:', error);
      alert('❌ Erreur lors de la vérification des mises à jour');
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut?: AvnStatutPerso | null) => {
    switch (statut) {
      case 'Complété': return '#10b981';
      case 'En cours': return '#f59e0b';
      case 'À jouer': return '#3b82f6';
      case 'Abandonné': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const filteredGames = games.filter(game => {
    if (searchTerm && !game.titre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedStatutPerso !== 'all' && game.statut_perso !== selectedStatutPerso) return false;
    if (selectedMoteur !== 'all' && game.moteur !== selectedMoteur) return false;
    if (showMajOnly && !game.maj_disponible) return false;
    return true;
  });

  if (loading && games.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 32px 32px 32px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        padding: '24px 0 16px 0',
        borderBottom: '1px solid var(--border)'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>
          🎮 AVN (Adult Visual Novels)
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleCheckUpdates}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Vérifier MAJ
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            Ajouter un jeu
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Recherche */}
        <input
          type="text"
          placeholder="🔍 Rechercher un jeu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
          style={{ flex: '1', minWidth: '200px' }}
        />

        {/* Statut personnel */}
        <select
          value={selectedStatutPerso}
          onChange={(e) => setSelectedStatutPerso(e.target.value as AvnStatutPerso | 'all')}
          className="select"
          style={{ minWidth: '150px' }}
        >
          <option value="all">Tous les statuts</option>
          <option value="À jouer">À jouer</option>
          <option value="En cours">En cours</option>
          <option value="Complété">Complété</option>
          <option value="Abandonné">Abandonné</option>
        </select>

        {/* Moteur */}
        <select
          value={selectedMoteur}
          onChange={(e) => setSelectedMoteur(e.target.value as AvnMoteur | 'all')}
          className="select"
          style={{ minWidth: '120px' }}
        >
          <option value="all">Tous les moteurs</option>
          <option value="RenPy">RenPy</option>
          <option value="Unity">Unity</option>
          <option value="RPGM">RPGM</option>
          <option value="Unreal">Unreal</option>
          <option value="HTML">HTML</option>
          <option value="Flash">Flash</option>
          <option value="QSP">QSP</option>
          <option value="Autre">Autre</option>
        </select>

        {/* MAJ disponible */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showMajOnly}
            onChange={(e) => setShowMajOnly(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>MAJ disponible uniquement</span>
        </label>

        {/* Vues */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginLeft: 'auto',
          background: 'var(--surface)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'view-btn active' : 'view-btn'}
            title="Grille"
          >
            <Grid3x3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'view-btn active' : 'view-btn'}
            title="Liste"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('images')}
            className={viewMode === 'images' ? 'view-btn active' : 'view-btn'}
            title="Images"
          >
            <ImageIcon size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '12px 16px', 
        background: 'var(--surface)', 
        borderRadius: '8px',
        display: 'flex',
        gap: '16px',
        fontSize: '13px'
      }}>
        <span><strong>{filteredGames.length}</strong> jeu(x) affiché(s)</span>
        <span>•</span>
        <span><strong>{games.filter(g => g.maj_disponible).length}</strong> mise(s) à jour</span>
        <span>•</span>
        <span><strong>{games.filter(g => g.statut_perso === 'En cours').length}</strong> en cours</span>
        <span>•</span>
        <span><strong>{games.filter(g => g.statut_perso === 'Complété').length}</strong> complété(s)</span>
      </div>

      {/* Liste des jeux */}
      {filteredGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Aucun jeu trouvé
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Ajoutez votre premier jeu AVN !
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
          gap: '16px'
        }}>
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              to={`/avn/${game.id}`}
              className="card"
              style={{
                padding: '16px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              {/* Badge MAJ disponible */}
              {game.maj_disponible && (
                <div style={{
                  position: 'absolute',
                  top: '-32px',
                  right: '-32px',
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  transform: 'rotate(45deg)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '8px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'white',
                  zIndex: 1
                }}>
                  🔄 MAJ
                </div>
              )}

              {/* Bannière statut */}
              {game.statut_perso && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '-40px',
                  width: '150px',
                  background: getStatutColor(game.statut_perso),
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '6px 8px',
                  textAlign: 'center',
                  transform: 'rotate(-45deg)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  zIndex: 1
                }}>
                  {game.statut_perso}
                </div>
              )}

              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                {game.titre}
              </h3>
              
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                📦 {game.version || 'N/A'}
                {game.version_disponible && game.version_disponible !== game.version && (
                  <span style={{ color: '#a855f7', fontWeight: '600', marginLeft: '8px' }}>
                    → {game.version_disponible}
                  </span>
                )}
              </div>
              
              {game.moteur && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  🛠️ {game.moteur}
                </div>
              )}
              
              {game.statut_jeu && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  📊 {game.statut_jeu}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* TODO: Modals AddAvnModal et EditAvnModal */}
    </div>
  );
}

