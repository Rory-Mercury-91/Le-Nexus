import { FileJson, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CoverImage from '../components/common/CoverImage';
import AddAvnModal from '../components/modals/avn/AddAvnModal';
import ImportAvnJsonModal from '../components/modals/avn/ImportAvnJsonModal';
import '../index.css';
import type { AvnFilters, AvnGame, AvnMoteur, AvnStatutPerso } from '../types';

type SortOption = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc';

export default function AVN() {
  const [games, setGames] = useState<AvnGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatutPerso, setSelectedStatutPerso] = useState<AvnStatutPerso | 'all'>('all');
  const [selectedMoteur, setSelectedMoteur] = useState<AvnMoteur | 'all'>('all');
  const [showMajOnly, setShowMajOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('title-asc');

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
      setMessage(null);
      const result = await window.electronAPI.checkAvnUpdates();
      await loadGames();
      
      if (result.updated > 0) {
        setMessage({ type: 'success', text: `${result.updated} mise(s) à jour détectée(s) !` });
      } else {
        setMessage({ type: 'success', text: 'Aucune mise à jour disponible' });
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Erreur vérification MAJ:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la vérification des mises à jour' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async (jsonData: any) => {
    try {
      const result = await window.electronAPI.importAvnFromJson(jsonData);
      
      if (result.success) {
        if (result.created) {
          setMessage({ type: 'success', text: 'Jeu ajouté avec succès !' });
        } else if (result.updated) {
          setMessage({ type: 'success', text: 'Jeu mis à jour avec succès !' });
        }
        setTimeout(() => setMessage(null), 5000);
        await loadGames();
      }
    } catch (error: any) {
      console.error('Erreur import JSON:', error);
      setMessage({ type: 'error', text: `Erreur lors de l'import: ${error.message || 'Erreur inconnue'}` });
      setTimeout(() => setMessage(null), 5000);
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

  // Extraire tous les tags uniques
  const allTags = Array.from(
    new Set(
      games
        .filter(game => game.tags && game.tags.length > 0)
        .flatMap(game => game.tags || [])
    )
  ).sort();

  const filteredGames = games.filter(game => {
    if (searchTerm && !game.titre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedStatutPerso !== 'all' && game.statut_perso !== selectedStatutPerso) return false;
    if (selectedMoteur !== 'all' && game.moteur !== selectedMoteur) return false;
    if (showMajOnly && !game.maj_disponible) return false;
    
    // Filtre par tags (doit avoir TOUS les tags sélectionnés)
    if (selectedTags.length > 0) {
      if (!game.tags || game.tags.length === 0) return false;
      const hasAllTags = selectedTags.every(tag => game.tags?.includes(tag));
      if (!hasAllTags) return false;
    }
    
    return true;
  });

  const sortGames = (gamesToSort: AvnGame[]) => {
    const sorted = [...gamesToSort];
    
    switch (sortBy) {
      case 'title-asc':
        return sorted.sort((a, b) => a.titre.localeCompare(b.titre));
      case 'title-desc':
        return sorted.sort((a, b) => b.titre.localeCompare(a.titre));
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        });
      default:
        return sorted;
    }
  };

  const sortedGames = sortGames(filteredGames);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

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
            Collection AVN
            <span style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>
              ({filteredGames.length} jeu{filteredGames.length > 1 ? 'x' : ''})
            </span>
          </h1>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleCheckUpdates}
              disabled={loading}
              className="btn btn-primary"
            >
              <RefreshCw size={20} />
              Vérifier MAJ
            </button>
            
            <button
              onClick={() => setShowImportJsonModal(true)}
              className="btn btn-primary"
            >
              <FileJson size={20} />
              Import JSON
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

        {/* Message de feedback */}
        {message && (
          <div style={{
            padding: '16px 20px',
            marginBottom: '24px',
            borderRadius: '12px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '15px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            {message.text}
          </div>
        )}

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
            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="select"
              style={{ minWidth: '200px' }}
            >
              <option value="title-asc">📖 Titre (A → Z)</option>
              <option value="title-desc">📖 Titre (Z → A)</option>
              <option value="date-desc">🆕 Ajout récent</option>
              <option value="date-asc">🕐 Ajout ancien</option>
            </select>

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

          {/* Filtre par tags */}
          {allTags.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '12px' 
              }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🏷️ Filtrer par tags
                  {selectedTags.length > 0 && (
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'var(--primary)',
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {selectedTags.length}
                    </span>
                  )}
                </h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    style={{
                      fontSize: '12px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '4px'
              }}>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: selectedTags.includes(tag) 
                        ? '2px solid var(--primary)' 
                        : '2px solid var(--border)',
                      background: selectedTags.includes(tag) 
                        ? 'var(--primary)' 
                        : 'var(--surface)',
                      color: selectedTags.includes(tag) 
                        ? 'white' 
                        : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedTags.includes(tag)) {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedTags.includes(tag)) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            {sortedGames.map((game) => (
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

        {/* Modal d'import JSON */}
        {showImportJsonModal && (
          <ImportAvnJsonModal
            onClose={() => setShowImportJsonModal(false)}
            onImport={handleImportJson}
          />
        )}
      </div>
    </div>
  );
}
