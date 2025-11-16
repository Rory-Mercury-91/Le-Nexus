import { Search } from 'lucide-react';
import { FormEvent } from 'react';

interface AddAdulteGameSearchTabProps {
  searchId: string;
  setSearchId: (id: string) => void;
  searchData: any;
  loading: boolean;
  onSearch: () => void;
  onAddFromSearch: (e: FormEvent) => void;
}

/**
 * Onglet de recherche par ID F95Zone pour AddAdulteGameModal
 */
export default function AddAdulteGameSearchTab({
  searchId,
  setSearchId,
  searchData,
  loading,
  onSearch,
  onAddFromSearch
}: AddAdulteGameSearchTabProps) {
  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Recherchez un jeu adulte directement depuis F95Zone en utilisant son ID de thread ou en collant l'URL complète.
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="ID (ex: 12345) ou URL complète (ex: https://f95zone.to/threads/...)"
          className="input"
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Search size={18} />
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      {searchData && (
        <form onSubmit={onAddFromSearch}>
          <div style={{
            padding: '20px',
            background: 'var(--surface-light)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--text)' }}>
              Jeu trouvé
            </h3>

            {searchData.cover && (
              <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                <img
                  src={searchData.cover}
                  alt={searchData.name}
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <strong>Titre :</strong> {searchData.name}
              </div>
              <div>
                <strong>Version :</strong> {searchData.version || 'Non définie'}
              </div>
              <div>
                <strong>Statut :</strong> {searchData.status || 'Non défini'}
              </div>
              <div>
                <strong>Moteur :</strong> {searchData.engine || 'Non défini'}
              </div>
              {searchData.tags && (
                <div>
                  <strong>Tags :</strong> {Array.isArray(searchData.tags) ? searchData.tags.join(', ') : searchData.tags}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Ajout en cours...' : 'Ajouter ce jeu'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
