import { X } from 'lucide-react';
import { SearchHelpConfig } from './search-help-configs';

interface SearchHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SearchHelpConfig;
}

export default function SearchHelpModal({ isOpen, onClose, config }: SearchHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '32px',
          backgroundColor: 'var(--surface)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            Aide - Recherche et filtres {config.collectionName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-light)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', 
          gap: '32px'
        }}>
          {/* Colonne gauche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Section Recherche */}
            <section>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 Recherche
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
                {config.searchDescription}
              </p>
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
                  Exemples de recherche :
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {config.searchExamples.map((example, index) => (
                    <li
                      key={index}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--surface-light)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: 'var(--text)'
                      }}
                    >
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section Tri */}
            <section>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Tri
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {config.sortOptions.map((option) => (
                  <div
                    key={option.value}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--surface-light)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>{option.label}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, marginTop: '4px' }}>
                      {option.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section Filtres de statut */}
            <section>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📂 Filtres de statut
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {config.statusOptions.map((option) => (
                  <div
                    key={option.value}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--surface-light)',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{option.label}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      {option.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Colonne droite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Section Toggles */}
            <section>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔘 Toggles de filtres
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {config.filterToggles.map((toggle) => (
                  <div
                    key={toggle.name}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--surface-light)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px' }}>{toggle.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{toggle.name}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, marginTop: '4px' }}>
                      {toggle.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section Filtres personnalisés */}
            {config.customFilters && config.customFilters.length > 0 && (
              <section>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎯 Filtres personnalisés
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {config.customFilters.map((filter) => (
                    <div
                      key={filter.name}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--surface-light)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{filter.name}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        {filter.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section Filtres additionnels */}
            {config.additionalFilters && config.additionalFilters.length > 0 && (
              <section>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚙️ Autres filtres
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {config.additionalFilters.map((filter) => (
                    <div
                      key={filter.name}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--surface-light)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{filter.name}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        {filter.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ minWidth: '120px' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
