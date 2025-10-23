import { BookOpen, Filter, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import AddSerieModal from '../components/AddSerieModal';
import SerieCard from '../components/SerieCard';
import SerieListItem from '../components/SerieListItem';
import CollectionView from '../components/CollectionView';
import { LectureStatistics, Serie, SerieFilters } from '../types';

export default function Collection() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState<SerieFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const [lectureStats, setLectureStats] = useState<LectureStatistics | null>(null);

  useEffect(() => {
    loadSeries();
    loadLectureStats();
  }, [filters]);

  useEffect(() => {
    // Restaurer la position de scroll après le chargement
    if (scrollPosition !== null && !loading) {
      window.scrollTo(0, scrollPosition);
      setScrollPosition(null);
    }
  }, [loading, scrollPosition]);

  const loadSeries = async (preserveScroll = false) => {
    // Sauvegarder la position de scroll avant de recharger
    if (preserveScroll) {
      setScrollPosition(window.scrollY);
    }
    
    // Ne pas afficher l'écran de chargement si on fait juste un refresh
    if (!preserveScroll) {
      setLoading(true);
    }
    
    const data = await window.electronAPI.getSeries(filters);
    setSeries(data);
    setLoading(false);
  };

  const loadLectureStats = async () => {
    const stats = await window.electronAPI.getLectureStatistics();
    setLectureStats(stats);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchTerm });
  };

  const handleFilterChange = (key: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key as keyof SerieFilters];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

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
            <BookOpen size={32} style={{ color: 'var(--primary)' }} />
            Ma collection Mangas
            <span style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>
              ({series.length} {series.length > 1 ? 'séries' : 'série'})
            </span>
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus size={20} />
            Ajouter une série
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
                  placeholder="Rechercher une série..."
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
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="">Tous les statuts</option>
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
              <option value="Abandonnée">Abandonnée</option>
            </select>

            <select
              className="select"
              value={filters.type_volume || ''}
              onChange={(e) => handleFilterChange('type_volume', e.target.value)}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="">Tous les types</option>
              <option value="Broché">Broché</option>
              <option value="Kindle">Kindle</option>
              <option value="Webtoon">Webtoon</option>
              <option value="Broché Collector">Broché Collector</option>
            </select>

            <select
              className="select"
              value={filters.tag || ''}
              onChange={(e) => handleFilterChange('tag', e.target.value)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="">Tous les tags</option>
              <option value="favori">❤️ Favoris</option>
              <option value="a_lire">📚 À lire</option>
              <option value="en_cours">🔵 En cours</option>
              <option value="lu">✅ Lu</option>
              <option value="abandonne">🚫 Abandonné</option>
              <option value="aucun">Sans tag</option>
            </select>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <input
                type="checkbox"
                checked={filters.afficherMasquees || false}
                onChange={(e) => setFilters({ ...filters, afficherMasquees: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              Afficher les séries masquées
            </label>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn btn-outline"
                style={{ marginLeft: 'auto' }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Message de collection complétée */}
        {lectureStats && lectureStats.tomesLus === lectureStats.tomesTotal && lectureStats.tomesTotal > 0 && (
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
            🎉 Collection complétée !
          </div>
        )}

        {/* Liste des séries */}
        <CollectionView
          items={series}
          loading={loading}
          renderCard={(serie) => (
            <SerieCard 
              key={serie.id} 
              serie={serie} 
              onUpdate={() => { loadSeries(true); loadLectureStats(); }} 
            />
          )}
          renderListItem={(serie) => (
            <SerieListItem
              key={serie.id}
              serie={serie}
              onUpdate={() => { loadSeries(true); loadLectureStats(); }}
            />
          )}
          onUpdate={() => { loadSeries(true); loadLectureStats(); }}
          emptyMessage={
            hasActiveFilters 
              ? 'Aucune série trouvée. Essayez de modifier vos filtres de recherche.' 
              : 'Aucune série dans votre collection. Commencez par ajouter votre première série !'
          }
          emptyIcon={<BookOpen size={64} style={{ color: 'var(--text-secondary)', margin: '0 auto 24px' }} />}
          gridColumns={4}
        />
      </div>

      {showAddModal && (
        <AddSerieModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSeries();
            loadLectureStats();
          }}
        />
      )}
    </div>
  );
}
