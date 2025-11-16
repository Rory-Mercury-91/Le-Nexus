import { Plus, RefreshCw, Search, Users, X } from 'lucide-react';

interface AdulteGameTranslatorsSettingsProps {
  traducteurs: string[];
  traducteursList: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadingTraducteurs: boolean;
  onToggleTraducteur: (traducteur: string) => void;
  onRemoveTraducteur: (traducteur: string) => void;
  syncing: boolean;
  onSyncNow: () => void;
  lastSync: string | null;
  gamesCount: number;
  renderActions?: boolean;
}

/**
 * Section de gestion des traducteurs pour AdulteGameSettings
 */
export default function AdulteGameTranslatorsSettings({
  traducteurs,
  traducteursList,
  searchQuery,
  setSearchQuery,
  loadingTraducteurs,
  onToggleTraducteur,
  onRemoveTraducteur,
  syncing,
  onSyncNow,
  lastSync,
  gamesCount,
  renderActions = true
}: AdulteGameTranslatorsSettingsProps) {
  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Jamais';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  // Filtrer les traducteurs selon la recherche
  const filteredTraducteurs = traducteursList.filter(trad =>
    trad.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !traducteurs.includes(trad)
  );

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface-light)',
        borderRadius: '8px'
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text)',
          marginBottom: '12px'
        }}
      >
        <Users size={16} style={{ color: 'var(--primary)' }} />
        Traducteurs à suivre
        {loadingTraducteurs && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            (Chargement...)
          </span>
        )}
      </label>

      {/* Barre de recherche avec autocomplete */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un traducteur (ex: Rory)..."
            className="input"
            style={{
              width: '100%',
              paddingLeft: '40px',
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        {/* Suggestions autocomplete */}
        {searchQuery && filteredTraducteurs.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px var(--shadow)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000
            }}
          >
            {filteredTraducteurs.slice(0, 10).map((trad) => (
              <div
                key={trad}
                onClick={() => onToggleTraducteur(trad)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: 'var(--text)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Plus size={14} style={{ color: 'var(--primary)' }} />
                {trad}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liste des traducteurs sélectionnés */}
      {traducteurs.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '12px',
            background: 'var(--surface-light)',
            borderRadius: '8px',
            minHeight: '50px'
          }}
        >
          {traducteurs.map((trad) => (
            <span
              key={trad}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {trad}
              <X
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => onRemoveTraducteur(trad)}
              />
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            background: 'var(--surface-light)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}
        >
          Aucun traducteur sélectionné
        </div>
      )}

      {renderActions && (
        <>
          {/* Bouton sync + Dernière sync */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '16px'
            }}
          >
            {/* Bouton synchronisation */}
            <button
              onClick={onSyncNow}
              disabled={syncing || traducteurs.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </button>

            {/* Dernière synchronisation */}
            <div
              style={{
                padding: '12px',
                background: 'var(--surface-light)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}
            >
              {lastSync ? (
                <>
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
                    📊 {formatLastSync(lastSync)}
                  </strong>
                  {gamesCount > 0 && (
                    <div style={{ fontSize: '11px' }}>
                      {gamesCount} jeux
                    </div>
                  )}
                </>
              ) : (
                <span>Aucune sync</span>
              )}
            </div>
          </div>

          {/* Message d'avertissement */}
          {traducteurs.length === 0 && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: 'var(--warning)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '13px',
                textAlign: 'center'
              }}
            >
              ⚠️ Sélectionnez au moins un traducteur
            </div>
          )}
        </>
      )}
    </div>
  );
}
