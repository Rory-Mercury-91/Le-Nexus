import { AlertTriangle, Book } from 'lucide-react';
import Modal from './Modal';
import ModalHeader from './ModalHeader';

type Candidate = {
  id: number;
  titre: string;
  media_type?: string | null;
  type_volume?: string | null;
  source_donnees?: string | null;
  statut?: string | null;
  mal_id?: number | null;
};

interface MalCandidateSelectionModalProps {
  malId: number;
  candidates: Candidate[];
  loading?: boolean;
  onSelect: (candidateId: number) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export default function MalCandidateSelectionModal({
  malId,
  candidates,
  loading = false,
  onSelect,
  onCreateNew,
  onClose
}: MalCandidateSelectionModalProps) {
  return (
    <Modal maxWidth="680px">
      <ModalHeader
        title="Fusionner avec une entrée existante ?"
        onClose={loading ? () => { } : onClose}
      />

      <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--primary)' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Nous avons détecté {candidates.length} entrée{candidates.length > 1 ? 's' : ''} pouvant correspondre à l’ID MAL <strong>{malId}</strong>.
            Choisissez celle à fusionner ou créez une nouvelle entrée.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {candidates.map(candidate => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelect(candidate.id)}
              disabled={loading}
              style={{
                textAlign: 'left',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'border 0.2s, transform 0.2s'
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(var(--primary-rgb), 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <Book size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  {candidate.titre}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {candidate.media_type && (
                    <span style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}>
                      {candidate.media_type}
                    </span>
                  )}
                  {candidate.type_volume && (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}>
                      {candidate.type_volume}
                    </span>
                  )}
                  {candidate.statut && (
                    <span style={{
                      background: 'rgba(250, 204, 21, 0.18)',
                      color: '#ca8a04',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}>
                      {candidate.statut}
                    </span>
                  )}
                  {candidate.source_donnees && (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      Source: {candidate.source_donnees}
                    </span>
                  )}
                  {candidate.mal_id && (
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                      MAL ID déjà lié: {candidate.mal_id}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCreateNew}
            disabled={loading}
          >
            Créer une nouvelle entrée
          </button>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  );
}
