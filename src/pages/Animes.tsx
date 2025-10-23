import { Filter, Plus, Search, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddAnimeModal from '../components/AddAnimeModal';
import AnimeCard from '../components/AnimeCard';
import { AnimeFilters, AnimeSerie } from '../types';

export default function Animes() {
  const navigate = useNavigate();
  const [animes, setAnimes] = useState<AnimeSerie[]>([]);
  const [filters, setFilters] = useState<AnimeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadAnimes();
  }, [filters]);

  const loadAnimes = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getAnimeSeries(filters);
      setAnimes(data);
    } catch (error) {
      console.error('Erreur lors du chargement des animes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // La recherche se fait côté client pour l'instant
    // On pourrait l'ajouter au backend plus tard
  };

  const handleFilterChange = (key: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key as keyof AnimeFilters];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm.length > 0;

  const filteredAnimes = animes.filter(anime => {
    // Filtre par terme de recherche
    if (!anime.titre.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtre par progression de visionnage
    if (filters.visionnage) {
      const episodesVus = anime.nb_episodes_vus || 0;
      const episodesTotal = anime.nb_episodes_total || 0;
      
      if (filters.visionnage === 'completed' && !(episodesTotal > 0 && episodesVus === episodesTotal)) {
        return false;
      }
      if (filters.visionnage === 'watching' && !(episodesVus > 0 && episodesVus < episodesTotal)) {
        return false;
      }
      if (filters.visionnage === 'not_started' && episodesVus > 0) {
        return false;
      }
    }
    
    return true;
  });

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'watching', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'on_hold', label: 'En pause' },
    { value: 'dropped', label: 'Abandonné' },
    { value: 'plan_to_watch', label: 'Prévu' }
  ];

  const typeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'TV', label: 'TV' },
    { value: 'Movie', label: 'Film' },
    { value: 'OVA', label: 'OVA' },
    { value: 'ONA', label: 'ONA' },
    { value: 'Special', label: 'Spécial' }
  ];

  const watchingOptions = [
    { value: '', label: 'Tous les visionnages' },
    { value: 'completed', label: 'Terminé' },
    { value: 'watching', label: 'En cours' },
    { value: 'not_started', label: 'Non commencé' }
  ];

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
            <Tv size={32} style={{ color: 'var(--primary)' }} />
            Ma collection Animes
            <span style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>
              ({filteredAnimes.length} anime{filteredAnimes.length > 1 ? 's' : ''})
            </span>
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus size={20} />
            Ajouter un anime
          </button>
        </div>

        {/* Recherche et filtres */}
        <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
          <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Rechercher un anime..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '48px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Rechercher
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={20} style={{ color: 'var(--text-secondary)' }} />
            
            <select
              className="select"
              value={filters.statut || ''}
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={filters.visionnage || ''}
              onChange={(e) => handleFilterChange('visionnage', e.target.value)}
              style={{ width: 'auto', minWidth: '200px' }}
            >
              {watchingOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn btn-outline"
                style={{ fontSize: '14px' }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Message de tous les épisodes visionnés */}
        {(() => {
          const episodesVus = animes.reduce((acc, a) => acc + (a.nb_episodes_vus || 0), 0);
          const episodesTotal = animes.reduce((acc, a) => acc + (a.nb_episodes_total || 0), 0);
          return episodesVus === episodesTotal && episodesTotal > 0 && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--success)22',
              border: '1px solid var(--success)',
              borderRadius: '8px',
              color: 'var(--success)',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              🎉 Tous les épisodes visionnés !
            </div>
          );
        })()}

        {/* Liste des animes */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="loading" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
              Chargement des animes...
            </p>
          </div>
        ) : filteredAnimes.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '2px dashed rgba(139, 92, 246, 0.3)'
          }}>
            <Tv size={64} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>
              {animes.length === 0 ? 'Aucun anime dans votre collection' : 'Aucun anime trouvé'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {animes.length === 0 
                ? 'Commencez par ajouter votre premier anime !' 
                : 'Essayez de modifier vos filtres'}
            </p>
            {animes.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
                style={{ fontSize: '16px', padding: '14px 28px' }}
              >
                <Plus size={24} />
                Ajouter un anime
              </button>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
            gap: '20px',
            justifyContent: 'center'
          }}>
            {filteredAnimes.map(anime => (
              <AnimeCard 
                key={anime.id} 
                anime={anime}
                onClick={() => navigate(`/animes/${anime.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale d'ajout d'anime */}
      {showAddModal && (
        <AddAnimeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadAnimes();
          }}
        />
      )}
    </div>
  );
}
