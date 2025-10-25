import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CoverImage from '../components/common/CoverImage';
import AddAvnModal from '../components/modals/avn/AddAvnModal';
import '../index.css';
import type { AvnFilters, AvnGame, AvnMoteur, AvnStatutPerso } from '../types';

export default function AVN() {
  const [games, setGames] = useState<AvnGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatutPerso, setSelectedStatutPerso] = useState<AvnStatutPerso | 'all'>('all');
  const [selectedMoteur, setSelectedMoteur] = useState<AvnMoteur | 'all'>('all');
  const [showMajOnly, setShowMajOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

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
      await window.electronAPI.checkAvnUpdates();
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
    <div style={{ padding: '40px' }} className="fade-in">
      <div className="container">
        {/* En-tête */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🎮</span>
            AVN (Adult Visual Novels)
            <span style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>
              ({filteredGames.length} jeu{filteredGames.length > 1 ? 'x' : ''})
            </span>
          </h1>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleCheckUpdates}
              disabled={loading}
              className="btn btn-secondary"
            >
              <RefreshCw size={20} />
              Vérifier MAJ
            </button>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus size={20} />
              Ajouter un jeu
            </button>
          </div>
        </div>

        {/* Recherche et filtres */}
        <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
          <form onSubmit={(e) => e.preventDefault()} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Rechercher un jeu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </form>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Statut personnel */}
            <select
              value={selectedStatutPerso}
              onChange={(e) => setSelectedStatutPerso(e.target.value as AvnStatutPerso | 'all')}
              className="select"
              style={{ width: 'auto', minWidth: '180px' }}
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
              style={{ width: 'auto', minWidth: '150px' }}
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
                style={{ cursor: 'pointer', width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>MAJ disponible uniquement</span>
            </label>
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          marginBottom: '32px', 
          padding: '12px 16px', 
          background: 'var(--surface)', 
          borderRadius: '8px',
          display: 'flex',
          gap: '16px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          <span><strong style={{ color: 'var(--text)' }}>{filteredGames.length}</strong> jeu(x) affiché(s)</span>
          <span>•</span>
          <span><strong style={{ color: 'var(--text)' }}>{games.filter(g => g.maj_disponible).length}</strong> mise(s) à jour</span>
          <span>•</span>
          <span><strong style={{ color: 'var(--text)' }}>{games.filter(g => g.statut_perso === 'En cours').length}</strong> en cours</span>
          <span>•</span>
          <span><strong style={{ color: 'var(--text)' }}>{games.filter(g => g.statut_perso === 'Complété').length}</strong> complété(s)</span>
        </div>

        {/* Liste des jeux */}
        {filteredGames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.3 }}>🎮</span>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              Aucun jeu trouvé
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {games.length === 0 ? 'Ajoutez votre premier jeu AVN !' : 'Essayez de modifier vos filtres'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filteredGames.map((game) => (
              <Link
                key={game.id}
                to={`/avn/${game.id}`}
                className="card"
                style={{
                  padding: 0,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
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
                    zIndex: 2
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
                    zIndex: 2
                  }}>
                    {game.statut_perso}
                  </div>
                )}

                {/* Image de couverture */}
                <div style={{
                  width: '100%',
                  height: '200px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {game.couverture_url ? (
                    <CoverImage
                      src={game.couverture_url}
                      alt={game.titre}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border)'
                    }}>
                      <span style={{ fontSize: '48px', opacity: 0.3 }}>🎮</span>
                    </div>
                  )}
                </div>

                {/* Contenu de la carte */}
                <div style={{ padding: '16px', flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', lineHeight: '1.4' }}>
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
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Modal d'ajout */}
        {showAddModal && (
          <AddAvnModal
            onClose={() => setShowAddModal(false)}
            onSuccess={loadGames}
          />
        )}
      </div>
    </div>
  );
}
